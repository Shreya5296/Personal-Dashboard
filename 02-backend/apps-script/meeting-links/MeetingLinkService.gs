/**
 * MeetingLinkService: Enforces preferred link uniqueness, safe URLs, and lifecycle.
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
  if (!student) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + data.student_id };
  }

  var isPreferred = Boolean(data.is_preferred);

  // If marked preferred, unmark previous preferred links for this student
  if (isPreferred) {
    var studentLinks = _mlRepo.MeetingLinks_getByStudentId(spreadsheet, data.student_id);
    for (var i = 0; i < studentLinks.length; i++) {
      if (studentLinks[i].is_preferred && studentLinks[i].link_status === 'ACTIVE') {
        _mlRepo.MeetingLinks_update(spreadsheet, studentLinks[i].meeting_link_id, {
          is_preferred: false,
          updated_at: new Date().toISOString()
        });
      }
    }
  }

  var now = new Date().toISOString();
  var id = _mlIdGen.generateMeetingLinkId();
  var record = {
    meeting_link_id: id,
    student_id: data.student_id,
    provider: data.provider,
    link_label: String(data.link_label).trim(),
    meeting_url: String(data.meeting_url).trim(),
    is_preferred: isPreferred,
    link_status: 'ACTIVE',
    valid_from: data.valid_from || '',
    valid_until: data.valid_until || '',
    notes: data.notes ? String(data.notes).trim() : '',
    created_at: now,
    updated_at: now,
    deactivated_at: ''
  };

  _mlRepo.MeetingLinks_insert(spreadsheet, record);

  _mlAudit.recordAuditEvent(spreadsheet, _mlReg, _mlMap, {
    actor_id: actor.actorId,
    actor_email: actor.email,
    entity_type: 'MEETING_LINK',
    entity_id: id,
    action: 'CREATE',
    after_summary: { meeting_link_id: id, student_id: data.student_id, provider: data.provider },
    request_id: actor.requestId
  });

  return { success: true, data: record };
}

function MeetingLinks_deactivate(spreadsheet, linkId, actor) {
  var existing = _mlRepo.MeetingLinks_getById(spreadsheet, linkId);
  if (!existing) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Meeting link not found: ' + linkId };
  }
  var now = new Date().toISOString();
  var updated = _mlRepo.MeetingLinks_update(spreadsheet, linkId, {
    link_status: 'INACTIVE',
    is_preferred: false,
    deactivated_at: now,
    updated_at: now
  });

  _mlAudit.recordAuditEvent(spreadsheet, _mlReg, _mlMap, {
    actor_id: actor.actorId,
    actor_email: actor.email,
    entity_type: 'MEETING_LINK',
    entity_id: linkId,
    action: 'DEACTIVATE',
    before_summary: { link_status: existing.link_status },
    after_summary: { link_status: 'INACTIVE', deactivated_at: now },
    request_id: actor.requestId
  });

  return { success: true, data: updated };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MeetingLinks_create: MeetingLinks_create,
    MeetingLinks_deactivate: MeetingLinks_deactivate
  };
}
