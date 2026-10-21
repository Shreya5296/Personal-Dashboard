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

function Payments_update(spreadsheet, paymentId, updates) {
  var sheet = spreadsheet.getSheetByName(_payRegistry.SHEET_NAMES.PAYMENTS);
  var headers = _payRegistry.getExpectedHeaders(_payRegistry.SHEET_NAMES.PAYMENTS);
  return _payRowWriter.updateRecordById(sheet, _payMapper, headers, 'student_id', paymentId, updates);
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
