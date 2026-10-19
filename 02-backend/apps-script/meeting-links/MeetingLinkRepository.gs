/**
 * MeetingLinkRepository: CRUD persistence for the MeetingLinks sheet.
 */

var _mlRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords, findRecordById: findRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);
var _mlRowWriter = typeof appendRecord === 'function' ? { appendRecord: appendRecord, updateRecordById: updateRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowWriter.gs') : null);
var _mlRegistry = typeof SHEET_NAMES !== 'undefined' ? { SHEET_NAMES: SHEET_NAMES, getExpectedHeaders: getExpectedHeaders } : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs') : null);
var _mlMapper = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function MeetingLinks_getAll(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(_mlRegistry.SHEET_NAMES.MEETING_LINKS);
  return _mlRowReader.readAllRecords(sheet, _mlMapper);
}

function MeetingLinks_getById(spreadsheet, id) {
  var sheet = spreadsheet.getSheetByName(_mlRegistry.SHEET_NAMES.MEETING_LINKS);
  return _mlRowReader.findRecordById(sheet, _mlMapper, 'meeting_link_id', id);
}

function MeetingLinks_getByStudentId(spreadsheet, studentId) {
  var all = MeetingLinks_getAll(spreadsheet);
  return all.filter(function(m) { return m.student_id === studentId; });
}

function MeetingLinks_insert(spreadsheet, record) {
  var sheet = spreadsheet.getSheetByName(_mlRegistry.SHEET_NAMES.MEETING_LINKS);
  var headers = _mlRegistry.getExpectedHeaders(_mlRegistry.SHEET_NAMES.MEETING_LINKS);
  return _mlRowWriter.appendRecord(sheet, _mlMapper, headers, record);
}

function MeetingLinks_update(spreadsheet, id, updates) {
  var sheet = spreadsheet.getSheetByName(_mlRegistry.SHEET_NAMES.MEETING_LINKS);
  var headers = _mlRegistry.getExpectedHeaders(_mlRegistry.SHEET_NAMES.MEETING_LINKS);
  return _mlRowWriter.updateRecordById(sheet, _mlMapper, headers, 'meeting_link_id', id, updates);
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
