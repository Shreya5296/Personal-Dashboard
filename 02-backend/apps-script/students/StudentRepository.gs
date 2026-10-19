/**
 * StudentRepository: CRUD persistence for the Students sheet.
 */

var _stuRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords, findRecordById: findRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);
var _stuRowWriter = typeof appendRecord === 'function' ? { appendRecord: appendRecord, updateRecordById: updateRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowWriter.gs') : null);
var _stuRegistry = typeof SHEET_NAMES !== 'undefined' ? { SHEET_NAMES: SHEET_NAMES, getExpectedHeaders: getExpectedHeaders } : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs') : null);
var _stuMapper = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function Students_getAll(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(_stuRegistry.SHEET_NAMES.STUDENTS);
  return _stuRowReader.readAllRecords(sheet, _stuMapper);
}

function Students_getById(spreadsheet, studentId) {
  var sheet = spreadsheet.getSheetByName(_stuRegistry.SHEET_NAMES.STUDENTS);
  return _stuRowReader.findRecordById(sheet, _stuMapper, 'student_id', studentId);
}

function Students_insert(spreadsheet, studentRecord) {
  var sheet = spreadsheet.getSheetByName(_stuRegistry.SHEET_NAMES.STUDENTS);
  var headers = _stuRegistry.getExpectedHeaders(_stuRegistry.SHEET_NAMES.STUDENTS);
  return _stuRowWriter.appendRecord(sheet, _stuMapper, headers, studentRecord);
}

function Students_update(spreadsheet, studentId, updates) {
  var sheet = spreadsheet.getSheetByName(_stuRegistry.SHEET_NAMES.STUDENTS);
  var headers = _stuRegistry.getExpectedHeaders(_stuRegistry.SHEET_NAMES.STUDENTS);
  return _stuRowWriter.updateRecordById(sheet, _stuMapper, headers, 'student_id', studentId, updates);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Students_getAll: Students_getAll,
    Students_getById: Students_getById,
    Students_insert: Students_insert,
    Students_update: Students_update
  };
}
