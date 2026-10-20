/**
 * PaymentService: Business rules, idempotency deduplication, and payment voiding.
 */

var _payIdGen = typeof generatePaymentId === 'function' ? { generatePaymentId: generatePaymentId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _payVal = typeof validatePaymentRecordInput === 'function' ? { validatePaymentRecordInput: validatePaymentRecordInput, validatePaymentVoidInput: validatePaymentVoidInput } : (typeof require !== 'undefined' ? require('./PaymentValidation.gs') : null);
var _payRepo = typeof Payments_getAll === 'function' ? { Payments_getAll: Payments_getAll, Payments_getById: Payments_getById, Payments_findByIdempotencyKey: Payments_findByIdempotencyKey, Payments_insert: Payments_insert, Payments_update: Payments_update } : (typeof require !== 'undefined' ? require('./PaymentRepository.gs') : null);
var _payFeeRepo = typeof FeeObligations_getById === 'function' ? { FeeObligations_getById: FeeObligations_getById } : (typeof require !== 'undefined' ? require('../fees/FeeRepository.gs') : null);
var _payFeeSvc = typeof FeeObligations_enrichWithBalances === 'function' ? { FeeObligations_enrichWithBalances: FeeObligations_enrichWithBalances } : (typeof require !== 'undefined' ? require('../fees/FeeService.gs') : null);
var _payLock = typeof withLock === 'function' ? { withLock: withLock } : (typeof require !== 'undefined' ? require('../sheets/LockManager.gs') : null);
var _payAudit = typeof recordAuditEvent === 'function' ? { recordAuditEvent: recordAuditEvent } : (typeof require !== 'undefined' ? require('../audit/AuditService.gs') : null);
var _payReg = typeof SHEET_NAMES !== 'undefined' ? { SHEET_NAMES: SHEET_NAMES, getExpectedHeaders: getExpectedHeaders } : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs') : null);
var _payMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function Payments_record(spreadsheet, data, actor) {
  var v = _payVal.validatePaymentRecordInput(data);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Payment validation failed', details: v.errors };
  }

  var feeObId = data.fee_obligation_id || data.fee_id || data.feeId;
  var transRef = (data.transaction_reference !== undefined && data.transaction_reference !== null)
    ? String(data.transaction_reference).trim()
    : ((data.reference_number !== undefined && data.reference_number !== null) ? String(data.reference_number).trim() : '');

  // Execute within concurrency lock for transaction serialization
  var lockRes = _payLock.withLock(10000, function() {
    // 1. Check idempotency
    var existingKeyPayment = _payRepo.Payments_findByIdempotencyKey(spreadsheet, data.idempotency_key);
    if (existingKeyPayment) {
      if (existingKeyPayment.student_id === data.student_id &&
          existingKeyPayment.fee_obligation_id === feeObId &&
          Number(existingKeyPayment.amount) === Number(data.amount)) {
        return { success: true, data: existingKeyPayment, meta: { idempotentRetry: true } };
      }
      return {
        success: false,
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Idempotency key has already been used for a materially different payment request'
      };
    }

    // 2. Validate obligation
    var obligation = _payFeeRepo.FeeObligations_getById(spreadsheet, feeObId);
    if (!obligation) {
      return { success: false, code: 'RECORD_NOT_FOUND', message: 'Referenced fee obligation not found' };
    }
    if (obligation.student_id !== data.student_id) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Obligation belongs to another student' };
    }
    if (obligation.obligation_status === 'VOID') {
      return { success: false, code: 'CONFLICT', message: 'Cannot allocate payment to a void fee obligation' };
    }

    // 3. Check remaining balance (no-overpayment rule)
    var enrichedObligation = _payFeeSvc.FeeObligations_enrichWithBalances(spreadsheet, obligation);
    var payAmount = Math.round(Number(data.amount) * 100) / 100;
    if (payAmount > enrichedObligation.outstanding_amount) {
      return {
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Payment amount (' + payAmount + ') exceeds outstanding obligation balance (' + enrichedObligation.outstanding_amount + ')'
      };
    }

    // 4. Insert payment
    var now = new Date().toISOString();
    var paymentId = _payIdGen.generatePaymentId();
    var record = {
      payment_id: paymentId,
      student_id: data.student_id,
      fee_obligation_id: feeObId,
      payment_date: data.payment_date || now.split('T')[0],
      amount: payAmount,
      currency: 'INR',
      payment_method: data.payment_method,
      transaction_reference: transRef,
      idempotency_key: String(data.idempotency_key).trim(),
      payment_status: 'RECORDED',
      notes: data.notes ? String(data.notes).trim() : '',
      created_at: now,
      updated_at: now,
      voided_at: '',
      void_reason: ''
    };

    _payRepo.Payments_insert(spreadsheet, record);

    // 5. Audit log
    _payAudit.recordAuditEvent(spreadsheet, _payReg, _payMap, {
      actor_id: actor.actorId,
      actor_email: actor.email,
      entity_type: 'PAYMENT',
      entity_id: paymentId,
      action: 'RECORD',
      after_summary: { payment_id: paymentId, amount: payAmount, fee_obligation_id: data.fee_obligation_id },
      request_id: actor.requestId
    });

    return { success: true, data: record };
  });

  return lockRes.success ? lockRes.result : lockRes;
}

function Payments_void(spreadsheet, data, actor) {
  var v = _payVal.validatePaymentVoidInput(data);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };
  }

  var existing = _payRepo.Payments_getById(spreadsheet, data.payment_id);
  if (!existing) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Payment not found: ' + data.payment_id };
  }
  if (existing.payment_status === 'VOID') {
    return { success: false, code: 'CONFLICT', message: 'Payment is already void' };
  }

  var now = new Date().toISOString();
  var updated = _payRepo.Payments_update(spreadsheet, data.payment_id, {
    payment_status: 'VOID',
    voided_at: now,
    void_reason: String(data.void_reason).trim(),
    updated_at: now
  });

  _payAudit.recordAuditEvent(spreadsheet, _payReg, _payMap, {
    actor_id: actor.actorId,
    actor_email: actor.email,
    entity_type: 'PAYMENT',
    entity_id: data.payment_id,
    action: 'VOID',
    before_summary: { payment_status: existing.payment_status },
    after_summary: { payment_status: 'VOID', void_reason: data.void_reason },
    request_id: actor.requestId
  });

  return { success: true, data: updated };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Payments_record: Payments_record,
    Payments_void: Payments_void
  };
}
