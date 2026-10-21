/**
 * PaymentService: Business rules for Payment Details (6-column schema: student_id, student_name, payment_date, amount, currency, in_inr).
 */

var _payIdGen = typeof generatePaymentId === 'function' ? { generatePaymentId: generatePaymentId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _payVal = typeof validatePaymentRecordInput === 'function' ? { validatePaymentRecordInput: validatePaymentRecordInput, validatePaymentVoidInput: validatePaymentVoidInput } : (typeof require !== 'undefined' ? require('./PaymentValidation.gs') : null);
var _payRepo = typeof Payments_getAll === 'function' ? {
  Payments_getAll: Payments_getAll,
  Payments_getById: Payments_getById,
  Payments_findByIdempotencyKey: Payments_findByIdempotencyKey,
  Payments_insert: Payments_insert,
  Payments_update: Payments_update,
  Payments_cacheRecord: typeof Payments_cacheRecord === 'function' ? Payments_cacheRecord : null
} : (typeof require !== 'undefined' ? require('./PaymentRepository.gs') : null);
var _payFeeRepo = typeof FeeObligations_getById === 'function' ? { FeeObligations_getById: FeeObligations_getById } : (typeof require !== 'undefined' ? require('../fees/FeeRepository.gs') : null);
var _payFeeSvc = typeof FeeObligations_enrichWithBalances === 'function' ? { FeeObligations_enrichWithBalances: FeeObligations_enrichWithBalances } : (typeof require !== 'undefined' ? require('../fees/FeeService.gs') : null);
var _payStuRepo = typeof Students_getById === 'function' ? { Students_getById: Students_getById } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);
var _payLock = typeof withLock === 'function' ? { withLock: withLock } : (typeof require !== 'undefined' ? require('../sheets/LockManager.gs') : null);
var _payAudit = typeof recordAuditEvent === 'function' ? { recordAuditEvent: recordAuditEvent } : (typeof require !== 'undefined' ? require('../audit/AuditService.gs') : null);
var _payReg = {
  get SHEET_NAMES() {
    return (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) || (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').SHEET_NAMES : {});
  },
  getExpectedHeaders: function(name) {
    return typeof getExpectedHeaders === 'function' ? getExpectedHeaders(name) : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').getExpectedHeaders(name) : null);
  }
};
var _payMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

var _idempotencyCache = {};
var _voidedPaymentIds = {};
var _paymentMemoryCache = (typeof globalThis !== 'undefined' && globalThis.__paymentMemoryCache)
  ? globalThis.__paymentMemoryCache
  : ((typeof globalThis !== 'undefined') ? (globalThis.__paymentMemoryCache = {}) : {});
var _paymentIdMap = _paymentMemoryCache;

function Payments_isVoid(paymentId) {
  return Boolean(_voidedPaymentIds[paymentId]);
}

function getPaymentById(paymentId) {
  return _paymentIdMap[paymentId] || null;
}

function Payments_record(spreadsheet, data, actor) {
  var v = _payVal.validatePaymentRecordInput(data);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Payment validation failed', details: v.errors };
  }

  var payAmount = Math.round(Number(data.amount) * 100) / 100;

  // 1. Idempotency check
  if (data.idempotency_key) {
    var cached = _idempotencyCache[data.idempotency_key];
    if (cached) {
      if (cached.student_id === data.student_id && Number(cached.amount) === payAmount) {
        return { success: true, data: cached, meta: { idempotentRetry: true } };
      }
      return {
        success: false,
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Idempotency key has already been used for a materially different payment request'
      };
    }
  }

  // 2. Overpayment boundary check if tied to fee obligation
  var feeId = data.fee_obligation_id || data.fee_id;
  var feeSvc = (typeof FeeObligations_enrichWithBalances === 'function')
    ? { FeeObligations_enrichWithBalances: FeeObligations_enrichWithBalances }
    : (typeof require !== 'undefined' ? require('../fees/FeeService.gs') : null);

  if (feeId && _payFeeRepo && feeSvc && typeof feeSvc.FeeObligations_enrichWithBalances === 'function') {
    var obligation = _payFeeRepo.FeeObligations_getById(spreadsheet, feeId);
    if (obligation) {
      var enrichedObligation = feeSvc.FeeObligations_enrichWithBalances(spreadsheet, obligation);
      if (!data.allow_overpayment && payAmount > enrichedObligation.outstanding_amount) {
        return {
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Payment amount (' + payAmount + ') exceeds outstanding obligation balance (' + enrichedObligation.outstanding_amount + ')'
        };
      }
    }
  }

  var studentName = data.student_name || '';
  if (!studentName && _payStuRepo && _payStuRepo.Students_getById) {
    var stu = _payStuRepo.Students_getById(spreadsheet, data.student_id);
    if (stu) {
      studentName = stu.student_name || stu.full_name || (stu.first_name ? (stu.first_name + ' ' + (stu.last_name || '')).trim() : '');
    }
  }

  var now = new Date().toISOString();
  var currency = data.currency ? String(data.currency).trim().toUpperCase() : 'INR';
  var inInr = (data.in_inr !== undefined && data.in_inr !== null && data.in_inr !== '')
    ? Number(data.in_inr)
    : (currency === 'INR' ? payAmount : 0);

  var paymentDate = data.payment_date || now.split('T')[0];

  var record = {
    student_id: String(data.student_id).trim(),
    student_name: studentName,
    payment_date: paymentDate,
    amount: payAmount,
    currency: currency,
    in_inr: inInr
  };

  _payRepo.Payments_insert(spreadsheet, record);

  var paymentId = _payIdGen ? _payIdGen.generatePaymentId() : ('pay_' + Date.now());

  if (_payAudit && _payAudit.recordAuditEvent) {
    _payAudit.recordAuditEvent(spreadsheet, _payReg, _payMap, {
      actor_id: actor ? actor.actorId : 'SYSTEM',
      actor_email: actor ? actor.email : '',
      entity_type: 'PAYMENT',
      entity_id: paymentId,
      action: 'RECORD',
      after_summary: { student_id: record.student_id, amount: payAmount, currency: currency, in_inr: inInr },
      request_id: actor ? actor.requestId : ''
    });
  }

  var returnRecord = Object.assign({}, record, {
    payment_id: paymentId,
    status: 'RECORDED',
    payment_status: 'RECORDED',
    fee_obligation_id: feeId || '',
    transaction_reference: data.transaction_reference || data.reference_number || '',
    reference_number: data.transaction_reference || data.reference_number || '',
    idempotency_key: data.idempotency_key || ''
  });

  _paymentIdMap[paymentId] = returnRecord;
  _paymentIdMap[record.student_id + '_' + record.payment_date + '_' + payAmount] = returnRecord;
  if (typeof Payments_cacheRecord === 'function') {
    Payments_cacheRecord(paymentId, returnRecord);
    Payments_cacheRecord(record.student_id + '_' + record.payment_date + '_' + payAmount, returnRecord);
  }
  if (_payRepo && _payRepo.Payments_cacheRecord) {
    _payRepo.Payments_cacheRecord(paymentId, returnRecord);
    _payRepo.Payments_cacheRecord(record.student_id + '_' + record.payment_date + '_' + payAmount, returnRecord);
  }

  if (data.idempotency_key) {
    _idempotencyCache[data.idempotency_key] = returnRecord;
  }

  return { success: true, data: returnRecord };
}

function Payments_void(spreadsheet, data, actor) {
  var v = _payVal.validatePaymentVoidInput(data);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };
  }

  var payId = data.payment_id || data.paymentId;
  _voidedPaymentIds[payId] = true;

  var payRecord = _paymentIdMap[payId];
  var sheet = spreadsheet.getSheetByName(_payReg.SHEET_NAMES.PAYMENTS);
  if (sheet) {
    var allRows = sheet.getData ? sheet.getData() : (sheet.getDataRange ? sheet.getDataRange().getValues() : []);
    for (var r = 1; r < allRows.length; r++) {
      var row = allRows[r];
      if (payRecord && row[0] === payRecord.student_id && Number(row[3]) === Number(payRecord.amount)) {
        if (typeof sheet.deleteRow === 'function') {
          sheet.deleteRow(r);
        }
        break;
      }
    }
  }

  if (_payAudit && _payAudit.recordAuditEvent) {
    _payAudit.recordAuditEvent(spreadsheet, _payReg, _payMap, {
      actor_id: actor ? actor.actorId : 'SYSTEM',
      actor_email: actor ? actor.email : '',
      entity_type: 'PAYMENT',
      entity_id: payId,
      action: 'VOID',
      before_summary: { payment_id: payId },
      after_summary: { payment_id: payId, status: 'VOID', reason: data.void_reason },
      request_id: actor ? actor.requestId : ''
    });
  }

  return {
    success: true,
    data: {
      payment_id: payId,
      status: 'VOID',
      payment_status: 'VOID',
      void_reason: data.void_reason || ''
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Payments_record: Payments_record,
    Payments_void: Payments_void,
    Payments_isVoid: Payments_isVoid,
    getPaymentById: getPaymentById
  };
}
