/**
 * MeetingLinkService: Business rules for Meeting Links (Flat 4-column schema: student_id, student_name, meeting_link_1, meeting_link_2).
 */

var _mlIdGen = typeof generateMeetingLinkId === 'function' ? { generateMeetingLinkId: generateMeetingLinkId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _mlVal = typeof validateMeetingLinkInput === 'function' ? { validateMeetingLinkInput: validateMeetingLinkInput } : (typeof require !== 'undefined' ? require('./MeetingLinkValidation.gs') : null);
var _mlRepo = typeof MeetingLinks_getAll === 'function' ? { MeetingLinks_getAll: MeetingLinks_getAll, MeetingLinks_getById: MeetingLinks_getById, MeetingLinks_getByStudentId: MeetingLinks_getByStudentId, MeetingLinks_insert: MeetingLinks_insert, MeetingLinks_update: MeetingLinks_update } : (typeof require !== 'undefined' ? require('./MeetingLinkRepository.gs') : null);
var _mlStuRepo = typeof Students_getById === 'function' ? { Students_getById: Students_getById } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);
var _mlAudit = typeof recordAuditEvent === 'function' ? { recordAuditEvent: recordAuditEvent } : (typeof require !== 'undefined' ? require('../audit/AuditService.gs') : null);
var _mlReg = {
  get SHEET_NAMES() {
    return (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) || (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').SHEET_NAMES : {});
  },
  getExpectedHeaders: function(name) {
    return typeof getExpectedHeaders === 'function' ? getExpectedHeaders(name) : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').getExpectedHeaders(name) : null);
  }
};
var _mlMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function MeetingLinks_create(spreadsheet, data, actor) {
  var v = _mlVal.validateMeetingLinkInput(data);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };
  }

  var student = _mlStuRepo.Students_getById(spreadsheet, data.student_id);
  var studentName = data.student_name || (student ? (student.student_name || student.full_name || '') : '');

  var l1 = data.meeting_link_1 !== undefined ? String(data.meeting_link_1).trim() : (data.meeting_url ? String(data.meeting_url).trim() : '');
  var l2 = data.meeting_link_2 !== undefined ? String(data.meeting_link_2).trim() : '';

  var existing = _mlRepo.MeetingLinks_getByStudentId(spreadsheet, data.student_id);

  var record = {
    student_id: data.student_id,
    student_name: studentName,
    meeting_link_1: l1 || (existing ? existing.meeting_link_1 : ''),
    meeting_link_2: l2 || (existing ? existing.meeting_link_2 : '')
  };

  if (existing) {
    _mlRepo.MeetingLinks_update(spreadsheet, data.student_id, record);
  } else {
    _mlRepo.MeetingLinks_insert(spreadsheet, record);
  }

  var linkId = _mlIdGen ? _mlIdGen.generateMeetingLinkId() : ('ml_' + data.student_id);

  if (_mlAudit && _mlAudit.recordAuditEvent) {
    _mlAudit.recordAuditEvent(spreadsheet, _mlReg, _mlMap, {
      actor_id: actor ? actor.actorId : 'SYSTEM',
      actor_email: actor ? actor.email : '',
      entity_type: 'MEETING_LINK',
      entity_id: data.student_id,
      action: existing ? 'UPDATE' : 'CREATE',
      after_summary: { student_id: data.student_id, link1: record.meeting_link_1, link2: record.meeting_link_2 },
      request_id: actor ? actor.requestId : ''
    });
  }

  var returnData = Object.assign({}, record, {
    meeting_link_id: linkId,
    meeting_url: record.meeting_link_1,
    link_label: 'Primary Link',
    provider: 'Google Meet',
    is_preferred: true,
    link_status: 'ACTIVE'
  });

  return { success: true, data: returnData };
}

function MeetingLinks_deactivate(spreadsheet, linkId, actor) {
  var existing = _mlRepo.MeetingLinks_getById(spreadsheet, linkId);
  if (!existing) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Meeting link not found: ' + linkId };
  }

  var updated = _mlRepo.MeetingLinks_update(spreadsheet, existing.student_id, {
    meeting_link_1: '',
    meeting_link_2: ''
  });

  return { success: true, data: updated };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MeetingLinks_create: MeetingLinks_create,
    MeetingLinks_deactivate: MeetingLinks_deactivate
  };
}
