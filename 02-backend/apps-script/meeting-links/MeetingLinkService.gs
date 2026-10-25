/**
 * MeetingLinkService: Business rules for Meeting Links (Flat 4-column schema: student_id, student_name, meeting_link_1, meeting_link_2).
 */

var _mlIdGen = typeof generateMeetingLinkId === 'function' ? { generateMeetingLinkId: generateMeetingLinkId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _mlVal = typeof validateMeetingLinkInput === 'function' ? { validateMeetingLinkInput: validateMeetingLinkInput } : (typeof require !== 'undefined' ? require('./MeetingLinkValidation.gs') : null);
var _mlRepo = typeof MeetingLinks_getAll === 'function' ? { MeetingLinks_getAll: MeetingLinks_getAll, MeetingLinks_getById: MeetingLinks_getById, MeetingLinks_getByStudentId: MeetingLinks_getByStudentId, MeetingLinks_insert: MeetingLinks_insert, MeetingLinks_update: MeetingLinks_update } : (typeof require !== 'undefined' ? require('./MeetingLinkRepository.gs') : null);
var _mlStuRepo = typeof Students_getById === 'function' ? { Students_getById: Students_getById, Students_getAll: typeof Students_getAll === 'function' ? Students_getAll : null } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);
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

  var l1 = data.meeting_link_1 !== undefined ? String(data.meeting_link_1).trim() : (data.meeting_url !== undefined ? String(data.meeting_url).trim() : undefined);
  var l2 = data.meeting_link_2 !== undefined ? String(data.meeting_link_2).trim() : undefined;

  var existing = _mlRepo.MeetingLinks_getByStudentId(spreadsheet, data.student_id);

  var finalL1 = l1 !== undefined ? l1 : (existing ? (existing.meeting_link_1 || existing.meeting_url || '') : '');
  var finalL2 = l2 !== undefined ? l2 : (existing ? (existing.meeting_link_2 || '') : '');

  var record = {
    student_id: data.student_id,
    student_name: studentName,
    meeting_link_1: finalL1,
    meeting_link_2: finalL2
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

function _calcOneMonthAgoInIst(refDateStr) {
  var d = refDateStr ? new Date(refDateStr) : new Date();
  var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  var p = parts.split('-').map(Number);
  var targetY = p[1] === 1 ? p[0] - 1 : p[0];
  var targetM = p[1] === 1 ? 12 : p[1] - 1;
  var maxDays = new Date(Date.UTC(targetY, targetM, 0)).getUTCDate();
  var targetD = Math.min(p[2], maxDays);
  return targetY + '-' + (targetM < 10 ? '0' + targetM : String(targetM)) + '-' + (targetD < 10 ? '0' + targetD : String(targetD));
}

function MeetingLinks_cleanupInactiveStudents(spreadsheet, actor) {
  var stuSheet = spreadsheet.getSheetByName(_mlReg.SHEET_NAMES.STUDENTS);
  var students = stuSheet ? (typeof readAllRecords === 'function' ? readAllRecords(stuSheet, _mlMap) : (_mlStuRepo && _mlStuRepo.Students_getAll ? _mlStuRepo.Students_getAll(spreadsheet) : [])) : [];
  var clsSheet = spreadsheet.getSheetByName(_mlReg.SHEET_NAMES.CLASS_SESSIONS);
  var sessions = clsSheet ? (typeof readAllRecords === 'function' ? readAllRecords(clsSheet, _mlMap) : []) : [];

  var thresholdDate = _calcOneMonthAgoInIst();
  var cleanedStudentIds = [];

  for (var i = 0; i < students.length; i++) {
    var stu = students[i];
    var sid = stu.student_id;
    var statusUpper = String(stu.status || stu.student_status || '').toUpperCase();
    var isInactive = false;

    if (statusUpper === 'ARCHIVED' || statusUpper === 'INACTIVE') {
      isInactive = true;
    } else {
      var stuCompleted = sessions.filter(function(s) {
        return s.student_id === sid && String(s.session_status || s.status || '').toUpperCase() === 'COMPLETED';
      });

      if (stuCompleted.length > 0) {
        var latestDate = '';
        for (var c = 0; c < stuCompleted.length; c++) {
          var cd = stuCompleted[c].schedule_date || stuCompleted[c].class_date || '';
          if (!cd && stuCompleted[c].scheduled_start) cd = String(stuCompleted[c].scheduled_start).slice(0, 10);
          if (cd && (!latestDate || cd > latestDate)) latestDate = cd;
        }
        if (latestDate && latestDate < thresholdDate) {
          isInactive = true;
        }
      }
    }

    if (isInactive) {
      var existingLink = _mlRepo.MeetingLinks_getByStudentId(spreadsheet, sid);
      if (existingLink && (existingLink.meeting_link_1 || existingLink.meeting_link_2)) {
        _mlRepo.MeetingLinks_update(spreadsheet, sid, {
          meeting_link_1: '',
          meeting_link_2: ''
        });
        cleanedStudentIds.push(sid);
      }
    }
  }

  return { success: true, data: { cleanedStudentIds: cleanedStudentIds, count: cleanedStudentIds.length } };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MeetingLinks_create: MeetingLinks_create,
    MeetingLinks_deactivate: MeetingLinks_deactivate,
    MeetingLinks_cleanupInactiveStudents: MeetingLinks_cleanupInactiveStudents,
    _calcOneMonthAgoInIst: _calcOneMonthAgoInIst
  };
}
