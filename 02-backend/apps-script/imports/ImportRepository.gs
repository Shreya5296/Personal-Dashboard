/**
 * ImportRepository: Persists import batches and row-level reconciliation records.
 */

var _regImpR = typeof SHEET_NAMES !== 'undefined' ? { SHEET_NAMES: SHEET_NAMES, getExpectedHeaders: getExpectedHeaders } : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs') : null);
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
