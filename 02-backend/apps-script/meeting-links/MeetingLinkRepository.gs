/**
 * MeetingLinkRepository: CRUD persistence for the MeetingLinks sheet (Flat 4 columns: student_id, student_name, meeting_link_1, meeting_link_2).
 */

var _mlRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords, findRecordById: findRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);
var _mlRowWriter = typeof appendRecord === 'function' ? { appendRecord: appendRecord, updateRecordById: updateRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowWriter.gs') : null);

function _resolveMlRepoSheetNames() {
  if (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) return SHEET_NAMES;
  if (typeof require !== 'undefined') return require('../sheets/SheetRegistry.gs').SHEET_NAMES;
  return {};
}

function _resolveMlRepoHeaders(sheetName) {
  if (typeof getExpectedHeaders === 'function') return getExpectedHeaders(sheetName);
  if (typeof require !== 'undefined') return require('../sheets/SheetRegistry.gs').getExpectedHeaders(sheetName);
  return null;
}

var _mlRegistry = {
  get SHEET_NAMES() { return _resolveMlRepoSheetNames(); },
  getExpectedHeaders: function(name) { return _resolveMlRepoHeaders(name); }
};
var _mlMapper = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function MeetingLinks_getAll(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(_mlRegistry.SHEET_NAMES.MEETING_LINKS);
  return _mlRowReader.readAllRecords(sheet, _mlMapper);
}

function MeetingLinks_getByStudentId(spreadsheet, studentId) {
  var all = MeetingLinks_getAll(spreadsheet);
  for (var i = 0; i < all.length; i++) {
    if (all[i].student_id === studentId) {
      return all[i];
    }
  }
  return null;
}

function MeetingLinks_getById(spreadsheet, id) {
  return MeetingLinks_getByStudentId(spreadsheet, id);
}

function MeetingLinks_insert(spreadsheet, record) {
  var sheet = spreadsheet.getSheetByName(_mlRegistry.SHEET_NAMES.MEETING_LINKS);
  var headers = _mlRegistry.getExpectedHeaders(_mlRegistry.SHEET_NAMES.MEETING_LINKS);
  return _mlRowWriter.appendRecord(sheet, _mlMapper, headers, record);
}

function MeetingLinks_update(spreadsheet, studentId, updates) {
  var sheet = spreadsheet.getSheetByName(_mlRegistry.SHEET_NAMES.MEETING_LINKS);
  var headers = _mlRegistry.getExpectedHeaders(_mlRegistry.SHEET_NAMES.MEETING_LINKS);
  return _mlRowWriter.updateRecordById(sheet, _mlMapper, headers, 'student_id', studentId, updates);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MeetingLinks_getAll: MeetingLinks_getAll,
    MeetingLinks_getById: MeetingLinks_getById,
    MeetingLinks_getByStudentId: MeetingLinks_getByStudentId,
    MeetingLinks_insert: MeetingLinks_insert,
    MeetingLinks_update: MeetingLinks_update
  };
}
