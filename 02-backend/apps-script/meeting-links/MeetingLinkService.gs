/**
 * MeetingLinkService: Business rules for Meeting Links (Flat 4-column schema: student_id, student_name, meeting_link_1, meeting_link_2).
 */

var _mlIdGen = typeof generateMeetingLinkId === 'function' ? { generateMeetingLinkId: generateMeetingLinkId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _mlVal = typeof validateMeetingLinkInput === 'function' ? { validateMeetingLinkInput: validateMeetingLinkInput } : (typeof require !== 'undefined' ? require('./MeetingLinkValidation.gs') : null);
var _mlRepo = typeof MeetingLinks_getAll === 'function' ? { MeetingLinks_getAll: MeetingLinks_getAll, MeetingLinks_getById: MeetingLinks_getById, MeetingLinks_getByStudentId: MeetingLinks_getByStudentId, MeetingLinks_insert: MeetingLinks_insert, MeetingLinks_update: MeetingLinks_update } : (typeof require !== 'undefined' ? require('./MeetingLinkRepository.gs') : null);
var _mlStuRepo = typeof Students_getById === 'function' ? { Students_getById: Students_getById, Students_getAll: typeof Students_getAll === 'function' ? Students_getAll : null } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);
var _mlAudit = typeof recordAuditEvent === 'function' ? { recordAuditEvent: recordAuditEvent } : (typeof require !== 'undefined' ? require('../audit/AuditService.gs') : null);
var _mlReg = {
  get SHEET_NAMES() { return (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) || (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').SHEET_NAMES : {}); },
  getExpectedHeaders: function(name) { return typeof getExpectedHeaders === 'function' ? getExpectedHeaders(name) : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').getExpectedHeaders(name) : null); }
};
var _mlMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);
var _mlCl = typeof MeetingLinks_cleanupInactiveStudents === 'function' ? { MeetingLinks_cleanupInactiveStudents: MeetingLinks_cleanupInactiveStudents, _calcOneMonthAgoInIst: _calcOneMonthAgoInIst } : (typeof require !== 'undefined' ? require('./MeetingLinkCleanup.gs') : null);

function MeetingLinks_create(spreadsheet, data, actor) {
  var v = _mlVal.validateMeetingLinkInput(data);
  if (!v.valid) return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };

  var student = _mlStuRepo.Students_getById(spreadsheet, data.student_id);
  var studentName = data.student_name || (student ? (student.student_name || student.full_name || '') : '');
  var l1 = data.meeting_link_1 !== undefined ? String(data.meeting_link_1).trim() : (data.meeting_url !== undefined ? String(data.meeting_url).trim() : undefined);
  var l2 = data.meeting_link_2 !== undefined ? String(data.meeting_link_2).trim() : undefined;
  var existing = _mlRepo.MeetingLinks_getByStudentId(spreadsheet, data.student_id);

  var finalL1 = l1 !== undefined ? l1 : (existing ? (existing.meeting_link_1 || existing.meeting_url || '') : '');
  var finalL2 = l2 !== undefined ? l2 : (existing ? (existing.meeting_link_2 || '') : '');
  var record = { student_id: data.student_id, student_name: studentName, meeting_link_1: finalL1, meeting_link_2: finalL2 };

  if (existing) { _mlRepo.MeetingLinks_update(spreadsheet, data.student_id, record); }
  else { _mlRepo.MeetingLinks_insert(spreadsheet, record); }

  var linkId = _mlIdGen ? _mlIdGen.generateMeetingLinkId() : ('ml_' + data.student_id);
  if (_mlAudit && _mlAudit.recordAuditEvent) {
    _mlAudit.recordAuditEvent(spreadsheet, _mlReg, _mlMap, {
      actor_id: actor ? actor.actorId : 'SYSTEM', actor_email: actor ? actor.email : '',
      entity_type: 'MEETING_LINK', entity_id: data.student_id, action: existing ? 'UPDATE' : 'CREATE',
      after_summary: { student_id: data.student_id, link1: record.meeting_link_1, link2: record.meeting_link_2 },
      request_id: actor ? actor.requestId : ''
    });
  }
  return { success: true, data: Object.assign({}, record, { meeting_link_id: linkId, meeting_url: record.meeting_link_1, link_label: 'Primary Link', provider: 'Google Meet', is_preferred: true, link_status: 'ACTIVE' }) };
}

function MeetingLinks_deleteSlot(spreadsheet, payload, actor) {
  if (!payload || !payload.student_id || !String(payload.student_id).trim()) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Student ID is required' };
  }
  var studentId = String(payload.student_id).trim();
  var ALLOWED_FIELDS = ['meeting_link_1', 'meeting_link_2'];
  var field = payload.field;
  if (!field && payload.slot !== undefined) {
    if (payload.slot === 1 || payload.slot === 'primary' || payload.slot === '1') field = 'meeting_link_1';
    else if (payload.slot === 2 || payload.slot === 'secondary' || payload.slot === '2') field = 'meeting_link_2';
  }
  if (!field || ALLOWED_FIELDS.indexOf(field) === -1) {
    return { success: false, code: 'INVALID_FIELD', message: 'Invalid meeting link field: ' + field + '. Allowed: meeting_link_1, meeting_link_2' };
  }

  var existing = _mlRepo.MeetingLinks_getByStudentId(spreadsheet, studentId);
  if (!existing) {
    return { success: true, message: 'No meeting link record found for student', data: { student_id: studentId, meeting_link_1: '', meeting_link_2: '' } };
  }

  var updates = {};
  updates[field] = '';
  var updated = _mlRepo.MeetingLinks_update(spreadsheet, studentId, updates);
  if (!updated) {
    return { success: false, code: 'UPDATE_FAILED', message: 'Failed to update meeting link in spreadsheet' };
  }

  if (_mlAudit && _mlAudit.recordAuditEvent) {
    _mlAudit.recordAuditEvent(spreadsheet, _mlReg, _mlMap, {
      actor_id: actor ? actor.actorId : 'SYSTEM', actor_email: actor ? actor.email : '',
      entity_type: 'MEETING_LINK', entity_id: studentId, action: 'DELETE_SLOT',
      after_summary: { student_id: studentId, cleared_field: field }, request_id: actor ? actor.requestId : ''
    });
  }

  var refreshed = _mlRepo.MeetingLinks_getByStudentId(spreadsheet, studentId) || updated;
  return {
    success: true,
    data: Object.assign({}, refreshed, {
      meeting_link_id: 'ml_' + studentId,
      meeting_url: refreshed.meeting_link_1 || refreshed.meeting_link_2 || '',
      link_label: 'Primary Link', provider: 'Google Meet', is_preferred: true, link_status: 'ACTIVE'
    })
  };
}

function MeetingLinks_deactivate(spreadsheet, idOrPayload, actor) {
  var studentId = '';
  var slotField = '';
  if (typeof idOrPayload === 'object' && idOrPayload !== null) {
    studentId = idOrPayload.student_id || idOrPayload.studentId || idOrPayload.id || '';
    if (idOrPayload.field) slotField = idOrPayload.field;
    else if (idOrPayload.slot === 1 || idOrPayload.slot === '1' || idOrPayload.slot === 'primary') slotField = 'meeting_link_1';
    else if (idOrPayload.slot === 2 || idOrPayload.slot === '2' || idOrPayload.slot === 'secondary') slotField = 'meeting_link_2';
  } else {
    studentId = String(idOrPayload || '').trim().replace(/^ml_/, '');
  }

  if (slotField) return MeetingLinks_deleteSlot(spreadsheet, { student_id: studentId, field: slotField }, actor);
  if (!studentId) return { success: false, code: 'VALIDATION_ERROR', message: 'Student ID is required' };

  var existing = _mlRepo.MeetingLinks_getByStudentId(spreadsheet, studentId);
  if (!existing) return { success: false, code: 'RECORD_NOT_FOUND', message: 'Meeting link not found for student: ' + studentId };

  var updated = _mlRepo.MeetingLinks_update(spreadsheet, studentId, { meeting_link_1: '', meeting_link_2: '' });
  return { success: true, data: updated };
}

function MeetingLinks_cleanupInactiveStudents(spreadsheet, actor) {
  return _mlCl.MeetingLinks_cleanupInactiveStudents(spreadsheet, actor);
}

function _calcOneMonthAgoInIst(refDateStr) {
  return _mlCl._calcOneMonthAgoInIst(refDateStr);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MeetingLinks_create: MeetingLinks_create,
    MeetingLinks_deleteSlot: MeetingLinks_deleteSlot,
    MeetingLinks_deactivate: MeetingLinks_deactivate,
    MeetingLinks_cleanupInactiveStudents: MeetingLinks_cleanupInactiveStudents,
    _calcOneMonthAgoInIst: _calcOneMonthAgoInIst
  };
}
