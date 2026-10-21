/**
 * ClassService: Business rules, class credit effects, deduplication, and restorations.
 */

var _clsIdGen = typeof generateClassSessionId === 'function' ? { generateClassSessionId: generateClassSessionId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _clsVal = typeof validateClassScheduleInput === 'function' ? { validateClassScheduleInput: validateClassScheduleInput, validateClassCompleteInput: validateClassCompleteInput } : (typeof require !== 'undefined' ? require('./ClassValidation.gs') : null);
var _clsRepo = typeof Classes_getAll === 'function' ? { Classes_getAll: Classes_getAll, Classes_getById: Classes_getById, Classes_findByRestorationId: Classes_findByRestorationId, Classes_insert: Classes_insert, Classes_update: Classes_update } : (typeof require !== 'undefined' ? require('./ClassRepository.gs') : null);
var _clsAudit = typeof recordAuditEvent === 'function' ? { recordAuditEvent: recordAuditEvent } : (typeof require !== 'undefined' ? require('../audit/AuditService.gs') : null);
var _clsLock = typeof withLock === 'function' ? { withLock: withLock } : (typeof require !== 'undefined' ? require('../sheets/LockManager.gs') : null);
var _clsReg = {
  get SHEET_NAMES() {
    return (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) || (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').SHEET_NAMES : {});
  },
  getExpectedHeaders: function(name) {
    return typeof getExpectedHeaders === 'function' ? getExpectedHeaders(name) : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').getExpectedHeaders(name) : null);
  }
};
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
  var rawAtt = data.attendance_status || data.outcome;
  if (rawAtt === 'CANCELLED' || data.outcome === 'CANCELLED') {
    return Classes_cancel(spreadsheet, data, actor);
  }

  var att = rawAtt || 'ATTENDED';
  if (att === 'NO_SHOW') att = 'ABSENT_UNEXCUSED';
  else if (att === 'EXCUSED') att = 'ABSENT_EXCUSED';

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
    var isAttended = (att === 'ATTENDED');
    var isNoShow = (att === 'ABSENT_UNEXCUSED' || att === 'NO_SHOW' || data.outcome === 'NO_SHOW');
    var isExcused = (att === 'ABSENT_EXCUSED' || att === 'EXCUSED' || att === 'ABSENT' || data.credit_waiver === true || data.excused === true);

    var effect = 'NO_CONSUME';
    if (session.package_id && (isAttended || isNoShow) && !isExcused) {
      effect = 'CONSUME';
    }

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

  var cancelTime = data.cancellation_time ? new Date(data.cancellation_time) : new Date();
  var isLate = false;
  if (session.scheduled_start) {
    try {
      var startTime = new Date(session.scheduled_start).getTime();
      var diffHours = (startTime - cancelTime.getTime()) / (1000 * 60 * 60);
      if (diffHours < 4) {
        isLate = true;
      }
    } catch (e) {}
  }

  var reason = data.cancellation_reason ? String(data.cancellation_reason).trim() : 'Cancelled by admin';
  var isWaived = Boolean(
    data.credit_waiver === true ||
    data.waive_credit === true ||
    /waiv|excused/i.test(reason)
  );

  var effect = 'NO_CONSUME';
  if (session.package_id && isLate && !isWaived) {
    effect = 'CONSUME';
  }

  var nowIso = new Date().toISOString();
  var updated = _clsRepo.Classes_update(spreadsheet, sid, {
    session_status: 'CANCELLED',
    attendance_status: isLate ? 'CANCELLED_LATE' : 'CANCELLED',
    class_credit_effect: effect,
    cancellation_reason: reason,
    updated_at: nowIso
  });

  if (_clsAudit && _clsAudit.recordAuditEvent) {
    _clsAudit.recordAuditEvent(spreadsheet, _clsReg, _clsMap, {
      actor_id: actor ? actor.actorId : 'SYSTEM',
      actor_email: actor ? actor.email : '',
      entity_type: 'CLASS_SESSION',
      entity_id: sid,
      action: 'CANCEL',
      after_summary: { effect: effect, isLate: isLate, isWaived: isWaived, reason: reason },
      request_id: actor ? actor.requestId : ''
    });
  }

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
