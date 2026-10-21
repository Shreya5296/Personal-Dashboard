/**
 * FeeService: Business rules, balance derivation, and fee obligation lifecycle.
 */

var _feeIdGen = typeof generateFeeObligationId === 'function' ? { generateFeeObligationId: generateFeeObligationId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _feeVal = typeof validateFeeObligationInput === 'function' ? { validateFeeObligationInput: validateFeeObligationInput, validateFeeVoidInput: validateFeeVoidInput } : (typeof require !== 'undefined' ? require('./FeeValidation.gs') : null);
var _feeRepo = typeof FeeObligations_getAll === 'function' ? { FeeObligations_getAll: FeeObligations_getAll, FeeObligations_getById: FeeObligations_getById, FeeObligations_getByStudentId: FeeObligations_getByStudentId, FeeObligations_findByStudentAndPeriodOrIdempotency: typeof FeeObligations_findByStudentAndPeriodOrIdempotency === 'function' ? FeeObligations_findByStudentAndPeriodOrIdempotency : null, FeeObligations_insert: FeeObligations_insert, FeeObligations_update: FeeObligations_update } : (typeof require !== 'undefined' ? require('./FeeRepository.gs') : null);
var _feeStuRepo = typeof Students_getById === 'function' ? { Students_getById: Students_getById } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);
var _feeAudit = typeof recordAuditEvent === 'function' ? { recordAuditEvent: recordAuditEvent } : (typeof require !== 'undefined' ? require('../audit/AuditService.gs') : null);
var _feeLock = typeof withLock === 'function' ? { withLock: withLock } : (typeof require !== 'undefined' ? require('../sheets/LockManager.gs') : null);
var _feeReg = {
  get SHEET_NAMES() {
    return (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) || (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').SHEET_NAMES : {});
  },
  getExpectedHeaders: function(name) {
    return typeof getExpectedHeaders === 'function' ? getExpectedHeaders(name) : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').getExpectedHeaders(name) : null);
  }
};
var _feeMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);
var _feeSvcRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords, findRecordById: findRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);

function FeeObligations_create(spreadsheet, data, actor) {
  var v = _feeVal.validateFeeObligationInput(data);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };
  }

  var student = _feeStuRepo.Students_getById(spreadsheet, data.student_id);
  if (!student) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + data.student_id };
  }

  var lockFn = _feeLock && _feeLock.withLock ? _feeLock.withLock : function(timeout, fn) { return { success: true, result: fn() }; };
  var lockRes = lockFn(10000, function() {
    var desc = String(data.obligation_description || data.description).trim();
    var idemp = data.idempotency_key || data.idempotencyKey;

    if (_feeRepo && _feeRepo.FeeObligations_findByStudentAndPeriodOrIdempotency) {
      var existing = _feeRepo.FeeObligations_findByStudentAndPeriodOrIdempotency(spreadsheet, data.student_id, desc, idemp);
      if (existing) {
        return {
          success: true,
          data: FeeObligations_enrichWithBalances(spreadsheet, existing),
          meta: { idempotentRetry: true, alreadyExists: true }
        };
      }
    }

    var now = new Date().toISOString();
    var id = _feeIdGen.generateFeeObligationId();
    var record = {
      fee_obligation_id: id,
      student_id: data.student_id,
      enrollment_id: data.enrollment_id || '',
      package_id: data.package_id || '',
      obligation_description: desc,
      amount_due: Math.round(Number(data.amount_due) * 100) / 100,
      currency: 'INR',
      issue_date: data.issue_date || now.split('T')[0],
      due_date: data.due_date || '',
      obligation_status: 'OPEN',
      notes: data.notes ? String(data.notes).trim() : '',
      created_at: now,
      updated_at: now,
      voided_at: '',
      void_reason: ''
    };

    _feeRepo.FeeObligations_insert(spreadsheet, record);

    _feeAudit.recordAuditEvent(spreadsheet, _feeReg, _feeMap, {
      actor_id: actor.actorId,
      actor_email: actor.email,
      entity_type: 'FEE_OBLIGATION',
      entity_id: id,
      action: 'CREATE',
      after_summary: { fee_obligation_id: id, student_id: data.student_id, amount: record.amount_due },
      request_id: actor.requestId
    });

    return { success: true, data: record };
  });

  return lockRes.success ? lockRes.result : lockRes;
}

function FeeObligations_void(spreadsheet, data, actor) {
  var v = _feeVal.validateFeeVoidInput(data);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };
  }

  var existing = _feeRepo.FeeObligations_getById(spreadsheet, data.fee_obligation_id);
  if (!existing) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Fee obligation not found' };
  }
  if (existing.obligation_status === 'VOID') {
    return { success: false, code: 'CONFLICT', message: 'Fee obligation is already void' };
  }

  var now = new Date().toISOString();
  var updated = _feeRepo.FeeObligations_update(spreadsheet, data.fee_obligation_id, {
    obligation_status: 'VOID',
    voided_at: now,
    void_reason: String(data.void_reason).trim(),
    updated_at: now
  });

  _feeAudit.recordAuditEvent(spreadsheet, _feeReg, _feeMap, {
    actor_id: actor.actorId,
    actor_email: actor.email,
    entity_type: 'FEE_OBLIGATION',
    entity_id: data.fee_obligation_id,
    action: 'VOID',
    before_summary: { obligation_status: existing.obligation_status },
    after_summary: { obligation_status: 'VOID', void_reason: data.void_reason },
    request_id: actor.requestId
  });

  return { success: true, data: updated };
}

function FeeObligations_enrichWithBalances(spreadsheet, feeRecord) {
  var paySheet = spreadsheet.getSheetByName(_feeReg.SHEET_NAMES.PAYMENTS);
  var payments = _feeSvcRowReader.readAllRecords(paySheet, _feeMap);

  var rawPaid = 0;
  for (var i = 0; i < payments.length; i++) {
    var p = payments[i];
    if (p.fee_obligation_id === feeRecord.fee_obligation_id && p.payment_status !== 'VOID') {
      rawPaid += Number(p.amount) || 0;
    }
  }

  rawPaid = Math.round(rawPaid * 100) / 100;
  var due = Number(feeRecord.amount_due) || 0;
  var applied = Math.min(rawPaid, due);
  var outstanding = feeRecord.obligation_status === 'VOID' ? 0 : Math.max(0, Math.round((due - applied) * 100) / 100);

  var todayStr = new Date().toISOString().split('T')[0];
  var isOverdue = Boolean(feeRecord.due_date && feeRecord.due_date < todayStr && outstanding > 0 && feeRecord.obligation_status !== 'VOID');

  var derivedStatus = feeRecord.obligation_status;
  if (derivedStatus !== 'VOID') {
    if (applied >= due && due > 0) {
      derivedStatus = 'PAID';
    } else if (applied > 0) {
      derivedStatus = 'PARTIALLY_PAID';
    } else {
      derivedStatus = 'OPEN';
    }
  }

  var enriched = Object.assign({}, feeRecord);
  enriched.paid_amount = applied;
  enriched.raw_paid_amount = rawPaid;
  enriched.outstanding_amount = outstanding;
  enriched.is_overdue = isOverdue;
  enriched.obligation_status = derivedStatus;

  // UI convenience aliases
  enriched.fee_id = feeRecord.fee_obligation_id;
  enriched.description = feeRecord.obligation_description;
  enriched.amount_paid = applied;
  enriched.outstanding_balance = outstanding;
  enriched.status = derivedStatus;

  return enriched;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FeeObligations_create: FeeObligations_create,
    FeeObligations_void: FeeObligations_void,
    FeeObligations_enrichWithBalances: FeeObligations_enrichWithBalances
  };
}
