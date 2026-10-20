/**
 * ClassService: Business rules, class credit effects, deduplication, and restorations.
 */

var _clsIdGen = typeof generateClassSessionId === 'function' ? { generateClassSessionId: generateClassSessionId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _clsVal = typeof validateClassScheduleInput === 'function' ? { validateClassScheduleInput: validateClassScheduleInput, validateClassCompleteInput: validateClassCompleteInput } : (typeof require !== 'undefined' ? require('./ClassValidation.gs') : null);
var _clsRepo = typeof Classes_getAll === 'function' ? { Classes_getAll: Classes_getAll, Classes_getById: Classes_getById, Classes_findByRestorationId: Classes_findByRestorationId, Classes_insert: Classes_insert, Classes_update: Classes_update } : (typeof require !== 'undefined' ? require('./ClassRepository.gs') : null);
var _clsAudit = typeof recordAuditEvent === 'function' ? { recordAuditEvent: recordAuditEvent } : (typeof require !== 'undefined' ? require('../audit/AuditService.gs') : null);
var _clsLock = typeof withLock === 'function' ? { withLock: withLock } : (typeof require !== 'undefined' ? require('../sheets/LockManager.gs') : null);
var _clsReg = typeof SHEET_NAMES !== 'undefined' ? { SHEET_NAMES: SHEET_NAMES, getExpectedHeaders: getExpectedHeaders } : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs') : null);
var _clsMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function Classes_schedule(spreadsheet, data, actor) {
  var start = data.scheduled_start || data.start_time;
  var end = data.scheduled_end;
  if (!end && start) {
    try {
      end = new Date(new Date(start).getTime() + (Number(data.duration_minutes) || 60) * 60000).toISOString();
    } catch (e) {}
  }
  var title = data.class_title ? String(data.class_title).trim() : (data.topic ? String(data.topic).trim() : 'Class session');

  var normalized = Object.assign({}, data, {
    scheduled_start: start,
    scheduled_end: end,
    class_title: title
  });

  var v = _clsVal.validateClassScheduleInput(normalized);
  if (!v.valid) return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };

  var now = new Date().toISOString();
  var id = _clsIdGen.generateClassSessionId();
  var record = {
    class_session_id: id,
    student_id: normalized.student_id,
    enrollment_id: normalized.enrollment_id || '',
    package_id: normalized.package_id || '',
    meeting_link_id: normalized.meeting_link_id || '',
    class_title: normalized.class_title,
    scheduled_start: normalized.scheduled_start,
    scheduled_end: normalized.scheduled_end,
    actual_start: '',
    actual_end: '',
    session_status: 'SCHEDULED',
    attendance_status: 'NOT_MARKED',
    class_credit_effect: 'PENDING',
    cancellation_reason: '',
    credit_restoration_for_session_id: '',
    notes: normalized.notes ? String(normalized.notes).trim() : '',
    created_at: now,
    updated_at: now,
    completed_at: ''
  };

  _clsRepo.Classes_insert(spreadsheet, record);
  _clsAudit.recordAuditEvent(spreadsheet, _clsReg, _clsMap, {
    actor_id: actor.actorId, actor_email: actor.email, entity_type: 'CLASS_SESSION',
    entity_id: id, action: 'SCHEDULE', after_summary: { class_session_id: id, start: record.scheduled_start },
    request_id: actor.requestId
  });
  return { success: true, data: record };
}

function Classes_complete(spreadsheet, data, actor) {
  var sid = data.class_session_id || data.session_id;
  var att = data.attendance_status || (data.outcome === 'NO_SHOW' ? 'ABSENT' : data.outcome);
  var normalized = Object.assign({}, data, {
    class_session_id: sid,
    attendance_status: att
  });

  var v = _clsVal.validateClassCompleteInput(normalized);
  if (!v.valid) return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };

  var lockRes = _clsLock.withLock(5000, function() {
    var session = _clsRepo.Classes_getById(spreadsheet, sid);
    if (!session) return { success: false, code: 'RECORD_NOT_FOUND', message: 'Session not found' };

    // Prevent re-consuming credit on retry
    if (session.session_status === 'COMPLETED') {
      return { success: true, data: session, meta: { idempotentRetry: true } };
    }

    var now = new Date().toISOString();
    var effect = (att === 'ATTENDED' && session.package_id) ? 'CONSUME' : 'NO_CONSUME';

    var updated = _clsRepo.Classes_update(spreadsheet, sid, {
      session_status: 'COMPLETED',
      attendance_status: att,
      class_credit_effect: effect,
      actual_start: data.actual_start || session.scheduled_start,
      actual_end: data.actual_end || session.scheduled_end,
      completed_at: now,
      updated_at: now
    });

    _clsAudit.recordAuditEvent(spreadsheet, _clsReg, _clsMap, {
      actor_id: actor.actorId, actor_email: actor.email, entity_type: 'CLASS_SESSION',
      entity_id: sid, action: 'COMPLETE',
      after_summary: { effect: effect, attendance: att }, request_id: actor.requestId
    });
    return { success: true, data: updated };
  });
  return lockRes.success ? lockRes.result : lockRes;
}

function Classes_cancel(spreadsheet, data, actor) {
  var sid = data.class_session_id || data.session_id;
  var session = _clsRepo.Classes_getById(spreadsheet, sid);
  if (!session) return { success: false, code: 'RECORD_NOT_FOUND', message: 'Session not found' };
  if (session.session_status === 'CANCELLED') return { success: true, data: session };

  var now = new Date().toISOString();
  var updated = _clsRepo.Classes_update(spreadsheet, sid, {
    session_status: 'CANCELLED',
    class_credit_effect: 'NO_CONSUME',
    cancellation_reason: data.cancellation_reason ? String(data.cancellation_reason).trim() : 'Cancelled by admin',
    updated_at: now
  });
  return { success: true, data: updated };
}

function Classes_restoreCredit(spreadsheet, data, actor) {
  var sid = data.class_session_id || data.session_id;
  var original = _clsRepo.Classes_getById(spreadsheet, sid);
  if (!original) return { success: false, code: 'RECORD_NOT_FOUND', message: 'Session not found' };
  if (original.class_credit_effect !== 'CONSUME') {
    return { success: false, code: 'CONFLICT', message: 'Can only restore credits for sessions with CONSUME effect' };
  }

  var existing = _clsRepo.Classes_findByRestorationId(spreadsheet, sid);
  if (existing) {
    return { success: false, code: 'CONFLICT', message: 'Credit for this session has already been restored' };
  }

  var now = new Date().toISOString();
  var id = _clsIdGen.generateClassSessionId();
  var restorationRecord = {
    class_session_id: id,
    student_id: original.student_id,
    enrollment_id: original.enrollment_id,
    package_id: original.package_id,
    meeting_link_id: '',
    class_title: 'Credit Restoration: ' + original.class_title,
    scheduled_start: now,
    scheduled_end: now,
    actual_start: '',
    actual_end: '',
    session_status: 'COMPLETED',
    attendance_status: 'NOT_MARKED',
    class_credit_effect: 'CREDIT_BACK',
    cancellation_reason: '',
    credit_restoration_for_session_id: original.class_session_id,
    notes: data.reason ? String(data.reason).trim() : 'Administrative credit restoration',
    created_at: now,
    updated_at: now,
    completed_at: now
  };

  _clsRepo.Classes_insert(spreadsheet, restorationRecord);
  return { success: true, data: restorationRecord };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Classes_schedule: Classes_schedule,
    Classes_complete: Classes_complete,
    Classes_cancel: Classes_cancel,
    Classes_restoreCredit: Classes_restoreCredit
  };
}
