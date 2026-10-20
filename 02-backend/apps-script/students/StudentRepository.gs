/**
 * StudentRepository: CRUD persistence for the Students sheet.
 */

var _stuRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords, findRecordById: findRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);
var _stuRowWriter = typeof appendRecord === 'function' ? { appendRecord: appendRecord, updateRecordById: updateRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowWriter.gs') : null);
function _resolveStuRepoSheetNames() {
  if (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) return SHEET_NAMES;
  if (typeof require !== 'undefined') return require('../sheets/SheetRegistry.gs').SHEET_NAMES;
  return {};
}

function _resolveStuRepoHeaders(sheetName) {
  if (typeof getExpectedHeaders === 'function') return getExpectedHeaders(sheetName);
  if (typeof require !== 'undefined') return require('../sheets/SheetRegistry.gs').getExpectedHeaders(sheetName);
  return null;
}

var _stuRegistry = {
  get SHEET_NAMES() { return _resolveStuRepoSheetNames(); },
  getExpectedHeaders: function(name) { return _resolveStuRepoHeaders(name); }
};
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

function Students_repoUpdate(spreadsheet, studentId, updates) {
  var sheet = spreadsheet.getSheetByName(_stuRegistry.SHEET_NAMES.STUDENTS);
  var headers = _stuRegistry.getExpectedHeaders(_stuRegistry.SHEET_NAMES.STUDENTS);
  return _stuRowWriter.updateRecordById(sheet, _stuMapper, headers, 'student_id', studentId, updates);
}

function Students_update(spreadsheet, studentId, updates) {
  return Students_repoUpdate(spreadsheet, studentId, updates);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Students_getAll: Students_getAll,
    Students_getById: Students_getById,
    Students_insert: Students_insert,
    Students_update: Students_repoUpdate,
    Students_repoUpdate: Students_repoUpdate
  };
}
