/**
 * PaymentRepository: CRUD persistence for the Payments sheet (Payment Details: 6 columns).
 */

var _payRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords, findRecordById: findRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);
var _payRowWriter = typeof appendRecord === 'function' ? { appendRecord: appendRecord, updateRecordById: updateRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowWriter.gs') : null);

function _resolvePayRepoSheetNames() {
  if (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) return SHEET_NAMES;
  if (typeof require !== 'undefined') return require('../sheets/SheetRegistry.gs').SHEET_NAMES;
  return {};
}

function _resolvePayRepoHeaders(sheetName) {
  if (typeof getExpectedHeaders === 'function') return getExpectedHeaders(sheetName);
  if (typeof require !== 'undefined') return require('../sheets/SheetRegistry.gs').getExpectedHeaders(sheetName);
  return null;
}

var _payRegistry = {
  get SHEET_NAMES() { return _resolvePayRepoSheetNames(); },
  getExpectedHeaders: function(name) { return _resolvePayRepoHeaders(name); }
};
var _payMapper = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

var _paymentMemoryCache = (typeof globalThis !== 'undefined' && globalThis.__paymentMemoryCache)
  ? globalThis.__paymentMemoryCache
  : ((typeof globalThis !== 'undefined') ? (globalThis.__paymentMemoryCache = {}) : {});

function Payments_cacheRecord(paymentId, record) {
  _paymentMemoryCache[paymentId] = record;
}

function Payments_getAll(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(_payRegistry.SHEET_NAMES.PAYMENTS);
  return _payRowReader.readAllRecords(sheet, _payMapper);
}

function Payments_getByStudentId(spreadsheet, studentId) {
  var all = Payments_getAll(spreadsheet);
  return all.filter(function(p) { return p.student_id === studentId; });
}

function Payments_getById(spreadsheet, paymentId) {
  if (_paymentMemoryCache[paymentId]) {
    return _paymentMemoryCache[paymentId];
  }
  var all = Payments_getAll(spreadsheet);
  for (var i = 0; i < all.length; i++) {
    var p = all[i];
    var synId = p.payment_id || (p.student_id + '_' + (p.payment_date || '') + '_' + (p.amount || ''));
    if (synId === paymentId || p.payment_id === paymentId) {
      return p;
    }
  }
  return null;
}

function Payments_findByIdempotencyKey(spreadsheet, key) {
  var all = Payments_getAll(spreadsheet);
  for (var i = 0; i < all.length; i++) {
    if (all[i].idempotency_key === key) {
      return all[i];
    }
  }
  return null;
}

function Payments_insert(spreadsheet, record) {
  var sheet = spreadsheet.getSheetByName(_payRegistry.SHEET_NAMES.PAYMENTS);
  var headers = _payRegistry.getExpectedHeaders(_payRegistry.SHEET_NAMES.PAYMENTS);
  return _payRowWriter.appendRecord(sheet, _payMapper, headers, record);
}

function Payments_update(spreadsheet, target, updates) {
  var sheet = spreadsheet.getSheetByName(_payRegistry.SHEET_NAMES.PAYMENTS);
  if (!sheet) return null;
  var headers = _payRegistry.getExpectedHeaders(_payRegistry.SHEET_NAMES.PAYMENTS);
  var allRows = sheet.getDataRange ? sheet.getDataRange().getValues() : (sheet.getData ? sheet.getData() : []);

  var targetStuId = (typeof target === 'object' && target) ? target.student_id : target;
  var targetAmt = (typeof target === 'object' && target && target.amount !== undefined) ? Number(target.amount) : null;
  var targetDate = (typeof target === 'object' && target && target.payment_date) ? target.payment_date : null;

  // Support synthetic ID string: studentId_date_amount only if date pattern exists
  if (typeof target === 'string' && /\d{4}-\d{2}-\d{2}/.test(target)) {
    var parts = target.split('_');
    if (parts.length >= 3) {
      targetStuId = parts[0];
      targetDate = parts[1];
      targetAmt = Number(parts[2]);
    }
  }

  var matches = [];
  for (var r = 1; r < allRows.length; r++) {
    var row = allRows[r];
    var sMatch = (row[0] === targetStuId);
    var aMatch = (targetAmt === null || isNaN(targetAmt) || Number(row[3]) === targetAmt);
    var dMatch = (!targetDate || String(row[2]).slice(0, 10) === String(targetDate).slice(0, 10));
    if (sMatch && aMatch && dMatch) {
      matches.push(r + 1);
    }
  }

  if (matches.length === 0) {
    return null;
  }

  if (matches.length > 1) {
    throw new Error('Ambiguous payment update rejected: multiple payments match criteria without a unique identifier in the 6-column schema.');
  }

  var targetRow = matches[0];
  if (targetRow <= 1) {
    throw new Error('Safety guard: attempted to update header row');
  }

  var headerRow = allRows[0];
  var map = _payMapper.createHeaderMap(headerRow);
  var currentRow = allRows[targetRow - 1];
  var record = _payMapper.rowToRecord(map, currentRow);
  var updatedRecord = Object.assign({}, record, updates);
  var newRowVals = _payMapper.recordToRow(map, headers, updatedRecord);
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([newRowVals]);
  if (typeof sheet.setRow === 'function') {
    sheet.setRow(targetRow - 1, newRowVals);
  }
  return updatedRecord;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Payments_getAll: Payments_getAll,
    Payments_getByStudentId: Payments_getByStudentId,
    Payments_getById: Payments_getById,
    Payments_findByIdempotencyKey: Payments_findByIdempotencyKey,
    Payments_insert: Payments_insert,
    Payments_update: Payments_update,
    Payments_cacheRecord: Payments_cacheRecord
  };
}
