/**
 * ClassService: Business rules for Class Sessions (8-column schema: class_session_id, student_id, scheduled_start, scheduled_end, attendance_status, session_status, cancellation_reason, deduct_class).
 */

var _clsIdGen = typeof generateClassSessionId === 'function' ? { generateClassSessionId: generateClassSessionId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _clsVal = typeof validateClassScheduleInput === 'function' ? { validateClassScheduleInput: validateClassScheduleInput, validateClassCompleteInput: validateClassCompleteInput } : (typeof require !== 'undefined' ? require('./ClassValidation.gs') : null);
var _clsRepo = typeof Classes_getAll === 'function' ? { Classes_getAll: Classes_getAll, Classes_getById: Classes_getById, Classes_findByRestorationId: Classes_findByRestorationId, Classes_insert: Classes_insert, Classes_update: Classes_update } : (typeof require !== 'undefined' ? require('./ClassRepository.gs') : null);
var _clsStuRepo = typeof Students_getById === 'function' ? { Students_getById: Students_getById } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);
var _clsPkgRepo = typeof Packages_getById === 'function' ? { Packages_getById: Packages_getById, Packages_getByStudentId: Packages_getByStudentId } : (typeof require !== 'undefined' ? require('../packages/PackageRepository.gs') : null);
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

var _sessionMetaMap = (typeof globalThis !== 'undefined' && globalThis.__sessionMetaMap)
  ? globalThis.__sessionMetaMap
  : ((typeof globalThis !== 'undefined') ? (globalThis.__sessionMetaMap = {}) : {});

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

  var id = _clsIdGen ? _clsIdGen.generateClassSessionId() : ('cls_' + Date.now());
  var classDate = normalized.class_date || (normalized.scheduled_start ? String(normalized.scheduled_start).slice(0, 10) : '');
  var record = {
    class_session_id: id,
    student_id: String(normalized.student_id).trim(),
    class_date: classDate,
    scheduled_start: normalized.scheduled_start,
    scheduled_end: normalized.scheduled_end,
    attendance_status: 'NOT_MARKED',
    session_status: 'SCHEDULED',
    cancellation_reason: '',
    deduct_class: false
  };

  var lockFn = _clsLock && _clsLock.withLock ? _clsLock.withLock : function(t, fn) { return { success: true, result: fn() }; };
  var lockRes = lockFn(10000, function() {
    var allSessions = _clsRepo.Classes_getAll(spreadsheet) || [];
    var newStartMs = new Date(normalized.scheduled_start).getTime();
    var newEndMs = new Date(normalized.scheduled_end).getTime();

    for (var i = 0; i < allSessions.length; i++) {
      var s = allSessions[i];
      var sStatus = s.session_status || s.status;
      if (sStatus === 'CANCELLED') continue;

      var exStart = s.scheduled_start || s.start_time;
      if (!exStart) continue;
      var exEnd = s.scheduled_end;
      if (!exEnd) {
        var dur = Number(s.duration_minutes) || 60;
        exEnd = new Date(new Date(exStart).getTime() + dur * 60000).toISOString();
      }

      var exStartMs = new Date(exStart).getTime();
      var exEndMs = new Date(exEnd).getTime();

      // Interval overlap check: [S1, E1) and [S2, E2) overlap iff S1 < E2 and S2 < E1
      if (newStartMs < exEndMs && exStartMs < newEndMs) {
        var confStu = _clsStuRepo && _clsStuRepo.Students_getById ? _clsStuRepo.Students_getById(spreadsheet, s.student_id) : null;
        var confName = (confStu && (confStu.student_name || confStu.full_name)) || s.student_id;
        return {
          success: false,
          code: 'SCHEDULING_CONFLICT',
          message: 'Scheduling conflict: A class is already scheduled from ' + exStart + ' to ' + exEnd + ' for ' + confName + ' (' + s.student_id + '). Overlapping intervals are not allowed.'
        };
      }
    }

    _clsRepo.Classes_insert(spreadsheet, record);

    _sessionMetaMap[id] = {
      package_id: normalized.package_id || '',
      class_title: title
    };

    if (_clsAudit && _clsAudit.recordAuditEvent) {
      _clsAudit.recordAuditEvent(spreadsheet, _clsReg, _clsMap, {
        actor_id: actor ? actor.actorId : 'SYSTEM',
        actor_email: actor ? actor.email : '',
        entity_type: 'CLASS_SESSION',
        entity_id: id,
        action: 'SCHEDULE',
        after_summary: { class_session_id: id, start: record.scheduled_start },
        request_id: actor ? actor.requestId : ''
      });
    }

    return Object.assign({}, record, {
      class_title: title,
      topic: title,
      package_id: data.package_id || '',
      duration_minutes: data.duration_minutes || 60,
      class_credit_effect: 'PENDING'
    });
  });

  if (!lockRes.success) {
    var errMsg = lockRes.message || 'Scheduling failed';
    if (errMsg.indexOf('SCHED_CONFLICT:') !== -1) {
      return {
        success: false,
        code: 'SCHEDULING_CONFLICT',
        message: errMsg.replace(/^.*SCHED_CONFLICT:/, '').trim()
      };
    }
    return { success: false, code: 'CONFLICT', message: errMsg };
  }

  if (lockRes.result && lockRes.result.success === false) {
    return lockRes.result;
  }

  return { success: true, data: lockRes.result };
}

function Classes_batchSchedule(spreadsheet, data, actor) {
  var studentId = data.student_id ? String(data.student_id).trim() : '';
  if (!studentId) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Student ID is required' };
  }
  var sessions = data.sessions;
  if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'No sessions provided for batch scheduling' };
  }

  var student = _clsStuRepo.Students_getById(spreadsheet, studentId);
  if (!student) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + studentId };
  }

  var targetPkgId = data.package_id ? String(data.package_id).trim() : '';
  if (!targetPkgId && sessions.length > 0 && sessions[0].package_id) {
    targetPkgId = String(sessions[0].package_id).trim();
  }
  if (targetPkgId && _clsPkgRepo && _clsPkgRepo.Packages_getById) {
    var pkgRec = _clsPkgRepo.Packages_getById(spreadsheet, targetPkgId);
    if (!pkgRec) {
      return { success: false, code: 'RECORD_NOT_FOUND', message: 'Package not found: ' + targetPkgId };
    }
    if (pkgRec.student_id && pkgRec.student_id !== studentId) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Package ' + targetPkgId + ' does not belong to student ' + studentId };
    }
  }

  var lockFn = _clsLock && _clsLock.withLock ? _clsLock.withLock : function(t, fn) { return { success: true, result: fn() }; };
  var lockRes = lockFn(15000, function() {
    var allSessions = _clsRepo.Classes_getAll(spreadsheet) || [];
    var existingKeys = {};
    for (var i = 0; i < allSessions.length; i++) {
      var s = allSessions[i];
      var sStatus = s.session_status || s.status;
      if (sStatus !== 'CANCELLED' && s.student_id === studentId) {
        var startRaw = s.scheduled_start || s.start_time;
        if (startRaw) {
          existingKeys[String(startRaw).slice(0, 16)] = true;
        }
      }
    }

    var created = [];
    for (var j = 0; j < sessions.length; j++) {
      var item = sessions[j];
      var start = item.scheduled_start || item.start_time;
      if (!start) continue;

      var timeKey = String(start).slice(0, 16);
      if (existingKeys[timeKey]) continue; // Skip duplicates idempotently

      var end = item.scheduled_end;
      if (!end && start) {
        try {
          end = new Date(new Date(start).getTime() + (Number(item.duration_minutes) || 60) * 60000).toISOString();
        } catch (e) {}
      }
      var dateStr = item.class_date || String(start).slice(0, 10);
      var id = _clsIdGen ? _clsIdGen.generateClassSessionId() : ('cls_' + Date.now() + '_' + j);

      var record = {
        class_session_id: id,
        student_id: studentId,
        class_date: dateStr,
        scheduled_start: start,
        scheduled_end: end || '',
        attendance_status: 'NOT_MARKED',
        session_status: 'SCHEDULED',
        cancellation_reason: '',
        deduct_class: false
      };

      _clsRepo.Classes_insert(spreadsheet, record);
      existingKeys[timeKey] = true;
      created.push(record);
    }

    if (_clsAudit && _clsAudit.recordAuditEvent) {
      _clsAudit.recordAuditEvent(spreadsheet, _clsReg, _clsMap, {
        actor_id: actor ? actor.actorId : 'SYSTEM',
        actor_email: actor ? actor.email : '',
        entity_type: 'CLASS_SESSION',
        entity_id: studentId,
        action: 'BATCH_SCHEDULE',
        after_summary: { student_id: studentId, count: created.length },
        request_id: actor ? actor.requestId : ''
      });
    }

    return { success: true, count: created.length, data: created };
  });

  return lockRes.success ? lockRes.result : { success: false, code: lockRes.code || 'LOCK_FAILED', message: lockRes.message };
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

  var session = _clsRepo.Classes_getById(spreadsheet, sid);
  if (!session) return { success: false, code: 'RECORD_NOT_FOUND', message: 'Session not found: ' + sid };

  // Attendance deduction rules:
  // - PRESENT or ATTENDED: deduct_class = true
  // - ABSENT (or NO_SHOW / ABSENT_UNEXCUSED): owner decides (default false unless unexcused/late)
  // - NOT_MARKED: deduct_class = false
  var deduct = false;
  if (att === 'ATTENDED' || att === 'PRESENT') {
    deduct = true;
  } else if (att === 'ABSENT' || att === 'NO_SHOW' || att === 'ABSENT_UNEXCUSED') {
    deduct = data.deduct_class !== undefined ? Boolean(data.deduct_class) : (att === 'NO_SHOW' || att === 'ABSENT_UNEXCUSED');
  } else if (att === 'EXCUSED' || att === 'ABSENT_EXCUSED' || att === 'NOT_MARKED') {
    deduct = false;
  } else if (data.deduct_class !== undefined) {
    deduct = Boolean(data.deduct_class);
  }

  var effect = deduct ? 'CONSUME' : 'NO_CONSUME';

  var updated = _clsRepo.Classes_update(spreadsheet, sid, {
    session_status: 'COMPLETED',
    attendance_status: att,
    deduct_class: deduct
  });

  if (_clsAudit && _clsAudit.recordAuditEvent) {
    _clsAudit.recordAuditEvent(spreadsheet, _clsReg, _clsMap, {
      actor_id: actor ? actor.actorId : 'SYSTEM',
      actor_email: actor ? actor.email : '',
      entity_type: 'CLASS_SESSION',
      entity_id: sid,
      action: 'COMPLETE',
      after_summary: { attendance_status: att, deduct_class: deduct },
      request_id: actor ? actor.requestId : ''
    });
  }

  var returnData = Object.assign({}, updated, {
    session_status: 'COMPLETED',
    attendance_status: att,
    deduct_class: deduct,
    class_credit_effect: effect
  });

  return { success: true, data: returnData };
}

function Classes_cancel(spreadsheet, data, actor) {
  var sid = data.class_session_id || data.session_id;
  var session = _clsRepo.Classes_getById(spreadsheet, sid);
  if (!session) return { success: false, code: 'RECORD_NOT_FOUND', message: 'Session not found: ' + sid };

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

  var reason = data.cancellation_reason ? String(data.cancellation_reason).trim() : 'Cancelled by owner';
  var isWaived = Boolean(
    data.credit_waiver === true ||
    data.waive_credit === true ||
    /waiv|excused/i.test(reason)
  );

  var deduct = Boolean(
    data.deduct_class !== undefined
      ? data.deduct_class
      : (isLate && !isWaived)
  );
  var attStatus = isLate ? 'CANCELLED_LATE' : 'CANCELLED';

  var updated = _clsRepo.Classes_update(spreadsheet, sid, {
    session_status: 'CANCELLED',
    attendance_status: attStatus,
    cancellation_reason: reason,
    deduct_class: deduct
  });

  if (_clsAudit && _clsAudit.recordAuditEvent) {
    _clsAudit.recordAuditEvent(spreadsheet, _clsReg, _clsMap, {
      actor_id: actor ? actor.actorId : 'SYSTEM',
      actor_email: actor ? actor.email : '',
      entity_type: 'CLASS_SESSION',
      entity_id: sid,
      action: 'CANCEL',
      after_summary: { session_status: 'CANCELLED', attendance_status: attStatus, deduct_class: deduct, reason: reason },
      request_id: actor ? actor.requestId : ''
    });
  }

  var returnData = Object.assign({}, updated, {
    session_status: 'CANCELLED',
    attendance_status: attStatus,
    cancellation_reason: reason,
    deduct_class: deduct,
    class_credit_effect: deduct ? 'CONSUME' : 'NO_CONSUME'
  });

  return { success: true, data: returnData };
}

function Classes_restoreCredit(spreadsheet, data, actor) {
  var sid = data.class_session_id || data.session_id;
  var original = _clsRepo.Classes_getById(spreadsheet, sid);
  if (!original) return { success: false, code: 'RECORD_NOT_FOUND', message: 'Session not found' };

  var isDeducted = (original.deduct_class === true || original.deduct_class === 'true' || original.deduct_class === 'TRUE');
  if (!isDeducted) {
    return { success: false, code: 'CONFLICT', message: 'Can only restore credits for sessions with deducted class' };
  }

  var updated = _clsRepo.Classes_update(spreadsheet, sid, {
    deduct_class: false
  });

  return {
    success: true,
    data: Object.assign({}, updated, {
      deduct_class: false,
      class_credit_effect: 'CREDIT_BACK'
    })
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Classes_schedule: Classes_schedule,
    Classes_batchSchedule: Classes_batchSchedule,
    Classes_complete: Classes_complete,
    Classes_cancel: Classes_cancel,
    Classes_restoreCredit: Classes_restoreCredit
  };
}
