/**
 * NoteRepository: CRUD persistence for the StudentNotes sheet.
 */

var _noteRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords, findRecordById: findRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);
var _noteRowWriter = typeof appendRecord === 'function' ? { appendRecord: appendRecord, updateRecordById: updateRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowWriter.gs') : null);
var _noteRegistry = typeof SHEET_NAMES !== 'undefined' ? { SHEET_NAMES: SHEET_NAMES, getExpectedHeaders: getExpectedHeaders } : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs') : null);
var _noteMapper = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function Notes_getAll(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(_noteRegistry.SHEET_NAMES.STUDENT_NOTES);
  return _noteRowReader.readAllRecords(sheet, _noteMapper);
}

function Notes_getById(spreadsheet, id) {
  var sheet = spreadsheet.getSheetByName(_noteRegistry.SHEET_NAMES.STUDENT_NOTES);
  return _noteRowReader.findRecordById(sheet, _noteMapper, 'note_id', id);
}

function Notes_getByStudentId(spreadsheet, studentId) {
  var all = Notes_getAll(spreadsheet);
  return all.filter(function(n) { return n.student_id === studentId; });
}

function Notes_insert(spreadsheet, record) {
  var sheet = spreadsheet.getSheetByName(_noteRegistry.SHEET_NAMES.STUDENT_NOTES);
  var headers = _noteRegistry.getExpectedHeaders(_noteRegistry.SHEET_NAMES.STUDENT_NOTES);
  return _noteRowWriter.appendRecord(sheet, _noteMapper, headers, record);
}

function Notes_update(spreadsheet, id, updates) {
  var sheet = spreadsheet.getSheetByName(_noteRegistry.SHEET_NAMES.STUDENT_NOTES);
  var headers = _noteRegistry.getExpectedHeaders(_noteRegistry.SHEET_NAMES.STUDENT_NOTES);
  return _noteRowWriter.updateRecordById(sheet, _noteMapper, headers, 'note_id', id, updates);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Notes_getAll: Notes_getAll,
    Notes_getById: Notes_getById,
    Notes_getByStudentId: Notes_getByStudentId,
    Notes_insert: Notes_insert,
    Notes_update: Notes_update
  };
}
