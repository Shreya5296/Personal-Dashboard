/**
 * ImportRepository: Persists import batches and row-level reconciliation records.
 */

function _resolveImpRepoSheetNames() {
  if (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) return SHEET_NAMES;
  if (typeof require !== 'undefined') return require('../sheets/SheetRegistry.gs').SHEET_NAMES;
  return {};
}

function _resolveImpRepoHeaders(sheetName) {
  if (typeof getExpectedHeaders === 'function') return getExpectedHeaders(sheetName);
  if (typeof require !== 'undefined') return require('../sheets/SheetRegistry.gs').getExpectedHeaders(sheetName);
  return null;
}

var _regImpR = {
  get SHEET_NAMES() { return _resolveImpRepoSheetNames(); },
  getExpectedHeaders: function(name) { return _resolveImpRepoHeaders(name); }
};
var _mapImpR = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);
var _writerImpR = typeof appendRecord === 'function' ? { appendRecord: appendRecord, updateRecordById: updateRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowWriter.gs') : null);

function ImportBatches_insert(spreadsheet, record) {
  var sheet = spreadsheet.getSheetByName(_regImpR.SHEET_NAMES.IMPORT_BATCHES);
  var headers = _regImpR.getExpectedHeaders(_regImpR.SHEET_NAMES.IMPORT_BATCHES);
  return _writerImpR.appendRecord(sheet, _mapImpR, headers, record);
}

function ImportBatches_update(spreadsheet, batchId, updates) {
  var sheet = spreadsheet.getSheetByName(_regImpR.SHEET_NAMES.IMPORT_BATCHES);
  var headers = _regImpR.getExpectedHeaders(_regImpR.SHEET_NAMES.IMPORT_BATCHES);
  return _writerImpR.updateRecordById(sheet, _mapImpR, headers, 'import_batch_id', batchId, updates);
}

function ImportRowResults_insert(spreadsheet, record) {
  var sheet = spreadsheet.getSheetByName(_regImpR.SHEET_NAMES.IMPORT_ROW_RESULTS);
  var headers = _regImpR.getExpectedHeaders(_regImpR.SHEET_NAMES.IMPORT_ROW_RESULTS);
  return _writerImpR.appendRecord(sheet, _mapImpR, headers, record);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ImportBatches_insert: ImportBatches_insert,
    ImportBatches_update: ImportBatches_update,
    ImportRowResults_insert: ImportRowResults_insert
  };
}
