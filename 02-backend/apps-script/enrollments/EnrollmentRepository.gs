/**
 * EnrollmentRepository: CRUD persistence for the Enrollments sheet.
 */

var _enrRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords, findRecordById: findRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);
var _enrRowWriter = typeof appendRecord === 'function' ? { appendRecord: appendRecord, updateRecordById: updateRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowWriter.gs') : null);
var _enrRegistry = typeof SHEET_NAMES !== 'undefined' ? { SHEET_NAMES: SHEET_NAMES, getExpectedHeaders: getExpectedHeaders } : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs') : null);
var _enrMapper = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function Enrollments_getAll(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(_enrRegistry.SHEET_NAMES.ENROLLMENTS);
  return _enrRowReader.readAllRecords(sheet, _enrMapper);
}

function Enrollments_getById(spreadsheet, enrollmentId) {
  var sheet = spreadsheet.getSheetByName(_enrRegistry.SHEET_NAMES.ENROLLMENTS);
  return _enrRowReader.findRecordById(sheet, _enrMapper, 'enrollment_id', enrollmentId);
}

function Enrollments_getByStudentId(spreadsheet, studentId) {
  var all = Enrollments_getAll(spreadsheet);
  return all.filter(function(e) { return e.student_id === studentId; });
}

function Enrollments_insert(spreadsheet, record) {
  var sheet = spreadsheet.getSheetByName(_enrRegistry.SHEET_NAMES.ENROLLMENTS);
  var headers = _enrRegistry.getExpectedHeaders(_enrRegistry.SHEET_NAMES.ENROLLMENTS);
  return _enrRowWriter.appendRecord(sheet, _enrMapper, headers, record);
}

function Enrollments_update(spreadsheet, enrollmentId, updates) {
  var sheet = spreadsheet.getSheetByName(_enrRegistry.SHEET_NAMES.ENROLLMENTS);
  var headers = _enrRegistry.getExpectedHeaders(_enrRegistry.SHEET_NAMES.ENROLLMENTS);
  return _enrRowWriter.updateRecordById(sheet, _enrMapper, headers, 'enrollment_id', enrollmentId, updates);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Enrollments_getAll: Enrollments_getAll,
    Enrollments_getById: Enrollments_getById,
    Enrollments_getByStudentId: Enrollments_getByStudentId,
    Enrollments_insert: Enrollments_insert,
    Enrollments_update: Enrollments_update
  };
}
