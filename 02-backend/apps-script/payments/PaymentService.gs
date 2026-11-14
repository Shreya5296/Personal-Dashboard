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

function _getPayDurableStore() {
  if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
    try {
      var sp = PropertiesService.getScriptProperties();
      if (sp) return sp;
    } catch (e) {}
  }
  if (typeof globalThis !== 'undefined') {
    if (!globalThis.__mockPropertiesStore) globalThis.__mockPropertiesStore = {};
    if (!globalThis.__payDurableStore) {
      globalThis.__payDurableStore = {
        _d: globalThis.__mockPropertiesStore,
        getProperty: function(k) { return globalThis.__mockPropertiesStore[k] || null; },
        setProperty: function(k, v) { globalThis.__mockPropertiesStore[k] = String(v); },
        deleteProperty: function(k) { delete globalThis.__mockPropertiesStore[k]; },
        getProperties: function() { return Object.assign({}, globalThis.__mockPropertiesStore); }
      };
    }
    return globalThis.__payDurableStore;
  }
  return null;
}

function _getMatchingPaymentRows(spreadsheet, studentId, paymentDate, amount) {
  if (!spreadsheet || typeof spreadsheet.getSheetByName !== 'function') return [];
  var sheet = spreadsheet.getSheetByName(_payReg.SHEET_NAMES.PAYMENTS);
  if (!sheet) return [];
  var rows = sheet.getDataRange ? sheet.getDataRange().getValues() : (sheet.getData ? sheet.getData() : []);
  var matches = [];
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    var rStu = String(row[0] || '').trim();
    var rDate = String(row[2] || '').trim().split('T')[0];
    var rAmt = Number(row[3]);
    if (rStu === studentId && (!paymentDate || rDate === paymentDate) && Math.abs(rAmt - amount) < 0.001) {
      matches.push({
        matchIndex: matches.length,
        sheetRow: r + 1,
        student_id: rStu,
        student_name: String(row[1] || ''),
        payment_date: rDate,
        amount: rAmt,
        currency: String(row[4] || 'INR').trim().toUpperCase(),
        in_inr: Number(row[5] !== undefined ? row[5] : rAmt),
        status: 'RECORDED',
        payment_status: 'RECORDED'
      });
    }
  }
  return matches;
}

function _findExistingPaymentRow(spreadsheet, studentId, paymentDate, amount, preInsertCount) {
  var matches = _getMatchingPaymentRows(spreadsheet, studentId, paymentDate, amount);
  if (matches.length === 0) return null;
  if (typeof preInsertCount === 'number') {
    if (matches.length <= preInsertCount) return null;
    return matches[preInsertCount] || null;
  }
  // If no preInsertCount specified: unambiguous match if exactly 1 row exists
  if (matches.length === 1) return matches[0];
  // If multiple exist without index tracking, return the latest matching row
  return matches[matches.length - 1];
}

function _checkIdempotencyAcrossExecutions(spreadsheet, key, studentId, amount, paymentDate) {
  if (!key) return null;
  var durableStore = _getPayDurableStore();
  if (!durableStore || typeof durableStore.getProperty !== 'function') {
    return { error: 'DURABLE_STORE_UNAVAILABLE' };
  }

  var durableRecord = null;
  try {
    var propVal = durableStore.getProperty('payment_idemp_' + key);
    if (propVal) durableRecord = JSON.parse(propVal);
  } catch (e) {
    return { error: 'DURABLE_STORE_ERROR', message: e.message || String(e) };
  }

  // Never rely exclusively on memory cache or CacheService if durable storage does not confirm
  if (!durableRecord) {
    delete _idempotencyCache[key];
    return null;
  }

  if (durableRecord.tombstone) {
    return {
      student_id: durableRecord.student_id,
      amount: durableRecord.amount,
      currency: durableRecord.currency,
      payment_date: durableRecord.payment_date,
      status: 'RECORDED',
      payment_status: 'RECORDED',
      outcome: 'SUCCESS',
      tombstone: true
    };
  }

  // If durable record was marked 'STARTED', check if payment was already inserted into the sheet
  if (durableRecord.status === 'STARTED') {
    var targetDate = paymentDate || durableRecord.payment_date || '';
    var preCount = (typeof durableRecord.pre_insert_count === 'number') ? durableRecord.pre_insert_count : null;
    var matches = _getMatchingPaymentRows(spreadsheet, studentId, targetDate, amount);

    // Cross-verify with all registered transactions in durable store for this student/date/amount
    var allProps = (durableStore && typeof durableStore.getProperties === 'function') ? durableStore.getProperties() : {};
    var totalTransactionsForTuple = 0;
    var claimedIndices = {};

    for (var propKey in allProps) {
      if (!allProps.hasOwnProperty(propKey)) continue;
      if (propKey.indexOf('payment_idemp_') !== 0) continue;
      try {
        var otherRecord = JSON.parse(allProps[propKey]);
        if (otherRecord && otherRecord.student_id === studentId && Math.abs(Number(otherRecord.amount) - amount) < 0.001) {
          var otherDate = (otherRecord.payment_date || '').split('T')[0];
          if (!targetDate || otherDate === targetDate) {
            totalTransactionsForTuple++;
            if (otherRecord.claimed_match_index !== undefined) {
              claimedIndices[otherRecord.claimed_match_index] = propKey;
            }
          }
        }
      } catch (e) {}
    }

    if (preCount !== null) {
      if (matches.length <= preCount) {
        // Row was never inserted before failure; operation must proceed to insert
        return null;
      }
      // If sheet has fewer rows than total transactions registered, rows were deleted out-of-band!
      if (matches.length < totalTransactionsForTuple) {
        return {
          error: 'AMBIGUOUS_RECOVERY',
          message: 'Payment recovery is ambiguous: matching sheet rows were deleted or reordered out-of-band. Manual reconciliation required.'
        };
      }
      // If this index is already claimed by another completed key
      if (claimedIndices[preCount] && claimedIndices[preCount] !== ('payment_idemp_' + key)) {
        return {
          error: 'AMBIGUOUS_RECOVERY',
          message: 'Payment recovery index ' + preCount + ' is already claimed by transaction ' + claimedIndices[preCount]
        };
      }
      var exactRow = matches[preCount];
      if (exactRow) {
        var recoveredRecord = Object.assign({}, exactRow, {
          payment_id: durableRecord.payment_id || ('pay_' + Date.now()),
          idempotency_key: key,
          status: 'RECORDED',
          payment_status: 'RECORDED',
          pre_insert_count: preCount,
          claimed_match_index: preCount
        });
        _saveIdempotencyAcrossExecutions(key, recoveredRecord);
        return recoveredRecord;
      }
    } else {
      if (matches.length === 1 && totalTransactionsForTuple <= 1) {
        var recoveredRecordSingle = Object.assign({}, matches[0], {
          payment_id: durableRecord.payment_id || ('pay_' + Date.now()),
          idempotency_key: key,
          status: 'RECORDED',
          payment_status: 'RECORDED'
        });
        _saveIdempotencyAcrossExecutions(key, recoveredRecordSingle);
        return recoveredRecordSingle;
      }
      return {
        error: 'AMBIGUOUS_RECOVERY',
        message: 'Multiple identical payments exist and cannot be uniquely recovered without index tracking'
      };
    }
    return null;
  }

  if (durableRecord.status === 'RECORDED' || durableRecord.outcome === 'SUCCESS') {
    _idempotencyCache[key] = durableRecord;
    return durableRecord;
  }

  return null;
}

function _saveIdempotencyAcrossExecutions(key, record) {
  if (!key) return { success: true };
  var durableStore = _getPayDurableStore();
  if (!durableStore || typeof durableStore.setProperty !== 'function') {
    return { success: false, code: 'DURABLE_PERSIST_FAILED', message: 'Durable property store unavailable' };
  }
  var entry = Object.assign({}, record, { status: 'RECORDED', outcome: 'SUCCESS', completed_at: new Date().toISOString() });
  try {
    durableStore.setProperty('payment_idemp_' + key, JSON.stringify(entry));
  } catch (e) {
    return { success: false, code: 'DURABLE_PERSIST_FAILED', message: e.message || String(e) };
  }
  _idempotencyCache[key] = entry;
  if (typeof CacheService !== 'undefined' && CacheService.getScriptCache) {
    try {
      CacheService.getScriptCache().put('idemp_' + key, JSON.stringify(entry), 21600);
    } catch (e) {}
  }
  return { success: true };
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

  var lockFn = (_payLock && typeof _payLock.withLock === 'function') ? _payLock.withLock : function(t, fn) { return { success: true, result: fn() }; };
  var lockRes = lockFn(10000, function() {
    return _executePaymentRecordCore(spreadsheet, data, actor);
  });

  if (!lockRes.success) {
    return { success: false, code: lockRes.code || 'CONFLICT', message: lockRes.message || 'Could not acquire payment lock' };
  }
  return lockRes.result;
}

function _executePaymentRecordCore(spreadsheet, data, actor) {
  var now = new Date().toISOString();
  var payAmount = Math.round(Number(data.amount) * 100) / 100;
  var paymentDate = data.payment_date || now.split('T')[0];
  var stuId = String(data.student_id).trim();

  // 1. Idempotency check (durable store first, never unbacked cache)
  if (data.idempotency_key) {
    var cached = _checkIdempotencyAcrossExecutions(spreadsheet, data.idempotency_key, stuId, payAmount, paymentDate);
    if (cached && cached.error) {
      var errCode = cached.error === 'AMBIGUOUS_RECOVERY' ? 'AMBIGUOUS_RECOVERY' : 'DURABLE_STORE_FAILED';
      return { success: false, code: errCode, message: 'Payment idempotency check failed: ' + (cached.message || cached.error) };
    }
    if (cached) {
      var sameStu = cached.student_id === stuId;
      var sameAmt = Math.abs(Number(cached.amount) - payAmount) < 0.001;
      var sameCur = String(cached.currency || 'INR').trim().toUpperCase() === String(data.currency || 'INR').trim().toUpperCase();
      var sameDate = !cached.payment_date || cached.payment_date === paymentDate;
      if (sameStu && sameAmt && sameCur && sameDate) {
        return { success: true, data: cached, meta: { idempotentRetry: true, tombstone: Boolean(cached.tombstone) } };
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

  var currency = data.currency ? String(data.currency).trim().toUpperCase() : 'INR';
  var inInr = (data.in_inr !== undefined && data.in_inr !== null && data.in_inr !== '')
    ? Number(data.in_inr)
    : (currency === 'INR' ? payAmount : 0);

  // Count existing identical rows for exact sequence recovery disambiguation
  var preInsertCount = _getMatchingPaymentRows(spreadsheet, stuId, paymentDate, payAmount).length;
  var paymentId = _payIdGen ? _payIdGen.generatePaymentId() : ('pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));

  // Durable intent save before payment row insertion
  var durableStore = _getPayDurableStore();
  if (data.idempotency_key) {
    if (!durableStore || typeof durableStore.setProperty !== 'function') {
      return { success: false, code: 'DURABLE_INTENT_FAILED', message: 'Durable payment store unavailable' };
    }
    var intentRecord = {
      payment_id: paymentId,
      student_id: stuId,
      amount: payAmount,
      currency: currency,
      payment_date: paymentDate,
      status: 'STARTED',
      created_at: now,
      pre_insert_count: preInsertCount
    };
    try {
      durableStore.setProperty('payment_idemp_' + data.idempotency_key, JSON.stringify(intentRecord));
    } catch (err) {
      return {
        success: false,
        code: 'DURABLE_INTENT_FAILED',
        message: 'Failed persisting durable payment intent before insertion: ' + (err.message || String(err))
      };
    }
  }

  var record = {
    student_id: stuId,
    student_name: studentName,
    payment_date: paymentDate,
    amount: payAmount,
    currency: currency,
    in_inr: inInr
  };

  _payRepo.Payments_insert(spreadsheet, record);

  var returnRecord = Object.assign({}, record, {
    payment_id: paymentId,
    status: 'RECORDED',
    payment_status: 'RECORDED',
    fee_obligation_id: feeId || '',
    transaction_reference: data.transaction_reference || data.reference_number || '',
    reference_number: data.transaction_reference || data.reference_number || '',
    idempotency_key: data.idempotency_key || '',
    pre_insert_count: preInsertCount,
    claimed_match_index: preInsertCount
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
    var saveRes = _saveIdempotencyAcrossExecutions(data.idempotency_key, returnRecord);
    if (!saveRes || !saveRes.success) {
      return {
        success: false,
        code: 'DURABLE_PERSIST_FAILED',
        message: 'Payment recorded in sheet but durable completion persistence failed: ' + (saveRes ? saveRes.message : 'Unknown error')
      };
    }
  }

  return { success: true, data: returnRecord };
}

function Payments_void(spreadsheet, data, actor) {
  var v = _payVal.validatePaymentVoidInput(data);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };
  }

  var payId = data.payment_id || data.paymentId;
  var durableStore = _getPayDurableStore();

  // Check if already voided in durable store or memory
  if (payId) {
    if (durableStore && typeof durableStore.getProperty === 'function') {
      try {
        var voidProp = durableStore.getProperty('payment_void_' + payId);
        if (voidProp) {
          var parsedVoid = JSON.parse(voidProp);
          return {
            success: true,
            data: {
              payment_id: payId,
              status: 'VOID',
              payment_status: 'VOID',
              void_reason: parsedVoid.void_reason || data.void_reason || ''
            },
            meta: { idempotentRetry: true }
          };
        }
      } catch (e) {}
    }
    if (_voidedPaymentIds[payId]) {
      return {
        success: true,
        data: {
          payment_id: payId,
          status: 'VOID',
          payment_status: 'VOID',
          void_reason: data.void_reason || ''
        },
        meta: { idempotentRetry: true }
      };
    }
  }
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

  if (payId) {
    _voidedPaymentIds[payId] = true;
    delete _paymentIdMap[payId];

    if (durableStore && typeof durableStore.setProperty === 'function') {
      try {
        durableStore.setProperty('payment_void_' + payId, JSON.stringify({
          status: 'VOID',
          void_reason: data.void_reason || '',
          voided_at: new Date().toISOString()
        }));
      } catch (e) {}
    }
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
    getPaymentById: getPaymentById,
    _getPayDurableStore: _getPayDurableStore,
    _getMatchingPaymentRows: _getMatchingPaymentRows,
    _findExistingPaymentRow: _findExistingPaymentRow
  };
}
