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

function _checkIdempotencyAcrossExecutions(spreadsheet, key, studentId, amount) {
  if (!key) return null;
  if (_idempotencyCache[key]) return _idempotencyCache[key];

  // Check ScriptCache
  if (typeof CacheService !== 'undefined' && CacheService.getScriptCache) {
    try {
      var cachedStr = CacheService.getScriptCache().get('idemp_' + key);
      if (cachedStr) {
        var parsed = JSON.parse(cachedStr);
        _idempotencyCache[key] = parsed;
        return parsed;
      }
    } catch (e) {}
  }

  // Check AuditLog sheet for prior request_id
  if (spreadsheet && typeof spreadsheet.getSheetByName === 'function') {
    try {
      var auditSheet = spreadsheet.getSheetByName('AuditLog');
      if (auditSheet && auditSheet.getLastRow() > 1) {
        var rows = auditSheet.getDataRange ? auditSheet.getDataRange().getValues() : [];
        for (var r = rows.length - 1; r >= 1; r--) {
          var reqId = rows[r][9]; // col 10: request_id
          if (reqId === key) {
            var afterSummary = rows[r][8];
            var sumObj = typeof afterSummary === 'string' ? JSON.parse(afterSummary) : afterSummary;
            var reconstructed = {
              student_id: sumObj.student_id,
              amount: Number(sumObj.amount),
              currency: sumObj.currency,
              in_inr: Number(sumObj.in_inr),
              payment_id: rows[r][5], // entity_id
              status: 'RECORDED'
            };
            _idempotencyCache[key] = reconstructed;
            return reconstructed;
          }
        }
      }
    } catch (e) {}
  }
  return null;
}

function _saveIdempotencyAcrossExecutions(key, record) {
  if (!key) return;
  _idempotencyCache[key] = record;
  if (typeof CacheService !== 'undefined' && CacheService.getScriptCache) {
    try {
      CacheService.getScriptCache().put('idemp_' + key, JSON.stringify(record), 21600);
    } catch (e) {}
  }
}

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

  // 1. Idempotency check (in-memory, ScriptCache, and AuditLog)
  if (data.idempotency_key) {
    var cached = _checkIdempotencyAcrossExecutions(spreadsheet, data.idempotency_key, data.student_id, payAmount);
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
    _saveIdempotencyAcrossExecutions(data.idempotency_key, returnRecord);
  }

  return { success: true, data: returnRecord };
}

function Payments_void(spreadsheet, data, actor) {
  var v = _payVal.validatePaymentVoidInput(data);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };
  }

  var payId = data.payment_id || data.paymentId;
  var payRecord = _paymentIdMap[payId];

  var targetStudentId = data.student_id || (payRecord ? payRecord.student_id : '');
  var targetAmount = (data.amount !== undefined && data.amount !== null) ? Number(data.amount) : (payRecord ? Number(payRecord.amount) : null);
  var targetDate = data.payment_date || (payRecord ? payRecord.payment_date : '');

  // If payId has format stuId_date_amount:
  if ((!targetStudentId || targetAmount === null) && payId && typeof payId === 'string' && payId.indexOf('_') !== -1) {
    var parts = payId.split('_');
    if (parts.length >= 3) {
      targetStudentId = targetStudentId || parts[0];
      targetDate = targetDate || parts[1];
      targetAmount = targetAmount !== null ? targetAmount : Number(parts[2]);
    }
  }

  var sheet = spreadsheet.getSheetByName(_payReg.SHEET_NAMES.PAYMENTS);
  if (!sheet) {
    return { success: false, code: 'SHEET_NOT_FOUND', message: 'Payments sheet not found' };
  }

  var allRows = sheet.getDataRange ? sheet.getDataRange().getValues() : (sheet.getData ? sheet.getData() : []);
  var matchingIndices = [];

  // Search data rows only (r >= 1; row 0 is header row 1)
  for (var r = 1; r < allRows.length; r++) {
    var row = allRows[r];
    var rowStu = String(row[0] || '').trim();
    var rowDate = String(row[2] || '').trim().split('T')[0];
    var rowAmt = Number(row[3]);

    var stuMatch = (!targetStudentId || rowStu === targetStudentId);
    var amtMatch = (targetAmount === null || isNaN(targetAmount) || rowAmt === targetAmount);
    var dateMatch = (!targetDate || rowDate === targetDate || rowDate.indexOf(targetDate) === 0);

    if (stuMatch && amtMatch && dateMatch) {
      // In Google Apps Script, deleteRow is 1-based: row index r in 0-based array is sheet row r + 1
      matchingIndices.push(r + 1);
    }
  }

  if (matchingIndices.length === 0) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'No matching payment record found to void' };
  }

  if (matchingIndices.length > 1) {
    return {
      success: false,
      code: 'AMBIGUOUS_RECORD',
      message: 'Cannot safely void payment: multiple identical payment records exist without a unique identifier in the 6-column schema. Operation rejected to prevent deleting the wrong payment.'
    };
  }

  var targetSheetRow = matchingIndices[0];
  // Absolute safety check: Never delete header row (row 1)
  if (targetSheetRow <= 1) {
    throw new Error('Critical safety guard: attempted to delete header row (row 1)');
  }

  if (typeof sheet.deleteRow === 'function') {
    sheet.deleteRow(targetSheetRow);
  }

  _voidedPaymentIds[payId] = true;
  delete _paymentIdMap[payId];

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
