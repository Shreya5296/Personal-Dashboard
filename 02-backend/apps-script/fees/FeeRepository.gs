/**
 * FeeRepository: CRUD persistence for the FeeObligations sheet.
 */

var _feeRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords, findRecordById: findRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);
var _feeRowWriter = typeof appendRecord === 'function' ? { appendRecord: appendRecord, updateRecordById: updateRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowWriter.gs') : null);
var _feeRegistry = typeof SHEET_NAMES !== 'undefined' ? { SHEET_NAMES: SHEET_NAMES, getExpectedHeaders: getExpectedHeaders } : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs') : null);
var _feeMapper = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function FeeObligations_getAll(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(_feeRegistry.SHEET_NAMES.FEE_OBLIGATIONS);
  return _feeRowReader.readAllRecords(sheet, _feeMapper);
}

function FeeObligations_getById(spreadsheet, id) {
  var sheet = spreadsheet.getSheetByName(_feeRegistry.SHEET_NAMES.FEE_OBLIGATIONS);
  return _feeRowReader.findRecordById(sheet, _feeMapper, 'fee_obligation_id', id);
}

function FeeObligations_getByStudentId(spreadsheet, studentId) {
  var all = FeeObligations_getAll(spreadsheet);
  return all.filter(function(f) { return f.student_id === studentId; });
}

function FeeObligations_insert(spreadsheet, record) {
  var sheet = spreadsheet.getSheetByName(_feeRegistry.SHEET_NAMES.FEE_OBLIGATIONS);
  var headers = _feeRegistry.getExpectedHeaders(_feeRegistry.SHEET_NAMES.FEE_OBLIGATIONS);
  return _feeRowWriter.appendRecord(sheet, _feeMapper, headers, record);
}

function FeeObligations_update(spreadsheet, id, updates) {
  var sheet = spreadsheet.getSheetByName(_feeRegistry.SHEET_NAMES.FEE_OBLIGATIONS);
  var headers = _feeRegistry.getExpectedHeaders(_feeRegistry.SHEET_NAMES.FEE_OBLIGATIONS);
  return _feeRowWriter.updateRecordById(sheet, _feeMapper, headers, 'fee_obligation_id', id, updates);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FeeObligations_getAll: FeeObligations_getAll,
    FeeObligations_getById: FeeObligations_getById,
    FeeObligations_getByStudentId: FeeObligations_getByStudentId,
    FeeObligations_insert: FeeObligations_insert,
    FeeObligations_update: FeeObligations_update
  };
}
