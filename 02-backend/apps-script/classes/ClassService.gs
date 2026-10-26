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

  var student = _clsStuRepo ? _clsStuRepo.Students_getById(spreadsheet, normalized.student_id) : null;
  var studentName = student ? (student.student_name || student.full_name || '') : (normalized.student_name || '');
  var classDate = normalized.schedule_date || normalized.class_date || (normalized.scheduled_start ? String(normalized.scheduled_start).slice(0, 10) : '');
  var classTime = normalized.schedule_time || normalized.start_time || (normalized.scheduled_start ? String(normalized.scheduled_start).slice(11, 16) : '00:00');

  var dur = Number(normalized.duration_minutes) || 60;
  var compId = String(normalized.student_id).trim() + '__' + classDate + '__' + classTime.slice(0, 5);
  var startIso = normalized.scheduled_start || (classDate + 'T' + classTime + ':00.000Z');
  var endIso = normalized.scheduled_end || (new Date(new Date(startIso).getTime() + dur * 60000).toISOString());

  var record = {
    student_id: String(normalized.student_id).trim(),
    student_name: studentName,
    schedule_date: classDate,
    schedule_time: classTime.slice(0, 5),
    class_session_id: compId,
    class_date: classDate,
    start_time: classTime.slice(0, 5),
    scheduled_start: startIso,
    scheduled_end: endIso,
    attendance_status: 'NOT_MARKED',
    session_status: 'SCHEDULED',
    cancellation_reason: '',
    deduct_class: false
  };

  var lockFn = _clsLock && _clsLock.withLock ? _clsLock.withLock : function(t, fn) { return { success: true, result: fn() }; };
  var lockRes = lockFn(10000, function() {
    var allSessions = _clsRepo.Classes_getAll(spreadsheet) || [];
    var newStartMs = new Date(startIso).getTime();
    var newEndMs = new Date(endIso).getTime();

    for (var i = 0; i < allSessions.length; i++) {
      var s = allSessions[i];
      var sStatus = s.session_status || s.status;
      if (sStatus === 'CANCELLED') continue;

      if (s.student_id === record.student_id) {
        var exStartMs = new Date(s.scheduled_start).getTime();
        var exEndMs = new Date(s.scheduled_end).getTime();
        if (!isNaN(exStartMs) && !isNaN(exEndMs) && !isNaN(newStartMs) && !isNaN(newEndMs)) {
          if (newStartMs < exEndMs && newEndMs > exStartMs) {
            return {
              success: false,
              code: 'SCHEDULING_CONFLICT',
              message: 'Scheduling conflict: Class already scheduled from ' + s.scheduled_start + ' to ' + s.scheduled_end
            };
          }
        } else {
          var exDate = s.schedule_date || s.class_date;
          var exTime = s.schedule_time || s.start_time;
          if (exDate === classDate && exTime.slice(0, 5) === classTime.slice(0, 5)) {
            return {
              success: false,
              code: 'SCHEDULING_CONFLICT',
              message: 'Scheduling conflict: Class already scheduled at ' + classDate + ' ' + classTime
            };
          }
        }
      }
    }

    _clsRepo.Classes_insert(spreadsheet, record);

    if (_clsAudit && _clsAudit.recordAuditEvent) {
      _clsAudit.recordAuditEvent(spreadsheet, _clsReg, _clsMap, {
        actor_id: actor ? actor.actorId : 'SYSTEM',
        actor_email: actor ? actor.email : '',
        entity_type: 'CLASS_SESSION',
        entity_id: record.student_id + '__' + classDate + '__' + classTime,
        action: 'SCHEDULE',
        after_summary: { student_id: record.student_id, date: classDate, time: classTime },
        request_id: actor ? actor.requestId : ''
      });
    }

    if (normalized.package_id) {
      if (typeof globalThis !== 'undefined') {
        globalThis.__sessionMetaMap = globalThis.__sessionMetaMap || {};
        globalThis.__sessionMetaMap[compId] = { package_id: normalized.package_id };
      }
    }

    return Object.assign({}, record, {
      class_session_id: compId,
      session_id: compId,
      class_title: title,
      topic: title,
      duration_minutes: dur,
      scheduled_start: startIso,
      scheduled_end: endIso,
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
  var studentName = student.student_name || student.full_name || '';

  var targetPkgId = data.package_id ? String(data.package_id).trim() : '';
  if (!targetPkgId && sessions.length > 0 && sessions[0].package_id) {
    targetPkgId = String(sessions[0].package_id).trim();
  }
  if (targetPkgId && _clsPkgRepo && _clsPkgRepo.Packages_getByStudentId) {
    var studentPkgs = _clsPkgRepo.Packages_getByStudentId(spreadsheet, studentId) || [];
    var belongsToStudent = (targetPkgId === studentId) ||
      (targetPkgId.indexOf('pkg_') === 0 && studentPkgs.length > 0) ||
      studentPkgs.some(function(p) { return p.package_id === targetPkgId; });
    if (!belongsToStudent) {
      return { success: false, code: 'RECORD_NOT_FOUND', message: 'Package ' + targetPkgId + ' does not belong to student ' + studentId };
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
        var sDate = s.schedule_date || s.class_date || (s.scheduled_start ? String(s.scheduled_start).slice(0, 10) : '');
        var sTime = s.schedule_time || s.start_time || (s.scheduled_start ? String(s.scheduled_start).slice(11, 16) : '');
        if (sDate && sTime) {
          existingKeys[sDate + '__' + sTime.slice(0, 5)] = true;
        }
      }
    }

    var created = [];
    for (var j = 0; j < sessions.length; j++) {
      var item = sessions[j];
      var dateStr = item.schedule_date || item.class_date || (item.scheduled_start ? String(item.scheduled_start).slice(0, 10) : '');
      var timeStr = item.schedule_time || item.start_time || (item.scheduled_start ? String(item.scheduled_start).slice(11, 16) : '00:00');
      if (!dateStr) continue;

      var timeKey = dateStr + '__' + timeStr.slice(0, 5);
      if (existingKeys[timeKey]) continue; // Skip duplicates idempotently

      var record = {
        student_id: studentId,
        student_name: studentName,
        schedule_date: dateStr,
        schedule_time: timeStr.slice(0, 5),
        class_session_id: studentId + '__' + dateStr + '__' + timeStr.slice(0, 5),
        class_date: dateStr,
        start_time: timeStr.slice(0, 5),
        scheduled_start: item.scheduled_start || (dateStr + 'T' + timeStr.slice(0, 5) + ':00.000Z'),
        scheduled_end: item.scheduled_end || '',
        attendance_status: 'NOT_MARKED',
        session_status: 'SCHEDULED',
        cancellation_reason: '',
        deduct_class: false
      };

      _clsRepo.Classes_insert(spreadsheet, record);
      existingKeys[timeKey] = true;
      var sKey = studentId + '__' + dateStr + '__' + timeStr.slice(0, 5);
      if (item.package_id || data.package_id) {
        if (typeof globalThis !== 'undefined') {
          globalThis.__sessionMetaMap = globalThis.__sessionMetaMap || {};
          globalThis.__sessionMetaMap[sKey] = { package_id: item.package_id || data.package_id };
        }
      }
      var outRecord = Object.assign({}, record, {
        session_id: sKey
      });
      created.push(outRecord);
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

  var att = rawAtt || 'PRESENT';
  if (att === 'NO_SHOW') att = 'ABSENT_UNEXCUSED';
  else if (att === 'EXCUSED') att = 'ABSENT_EXCUSED';

  var session = _clsRepo.Classes_getById(spreadsheet, sid);
  if (!session) return { success: false, code: 'RECORD_NOT_FOUND', message: 'Session not found: ' + sid };

  // Attendance deduction rules:
  // - PRESENT or ATTENDED: deduct_class = true
  // - ABSENT (or NO_SHOW / ABSENT_UNEXCUSED): owner decides (default false unless unexcused/late)
  // - NOT_MARKED: deduct_class = false
  var deduct = false;
  if (att === 'PRESENT' || att === 'ATTENDED') {
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
    _rowIndex: session._rowIndex,
    rowIndex: session._rowIndex,
    student_id: session.student_id,
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
    _rowIndex: session._rowIndex,
    rowIndex: session._rowIndex,
    student_id: session.student_id,
    session_status: 'CANCELLED',
    attendance_status: attStatus,
    cancellation_reason: reason,
    deduct_class: deduct
  });

  // Non-deductible cancellation logic:
  // If deduct === false, student credit entitlement is preserved.
  // Schedule replacement session at the next available slot according to student's recurring schedule,
  // and extend package projected end_date. Idempotency is guaranteed by checking activeSessions < purchased.
  var replacementSession = null;
  if (!deduct && session.student_id) {
    try {
      var pkgRepo = typeof Packages_getAll === 'function' ? { Packages_getAll: Packages_getAll, Packages_update: Packages_update } : (typeof require !== 'undefined' ? require('../packages/PackageRepository.gs') : null);
      if (pkgRepo && pkgRepo.Packages_getAll) {
        var pkgs = pkgRepo.Packages_getAll(spreadsheet) || [];
        var stuPkg = null;
        for (var p = 0; p < pkgs.length; p++) {
          if (pkgs[p].student_id === session.student_id) {
            stuPkg = pkgs[p];
            break;
          }
        }

        var classesPurchased = stuPkg ? (Number(stuPkg.classes_purchased) || Number(stuPkg.total_classes) || 0) : 0;
        if (classesPurchased > 0) {
          var allSessions = _clsRepo.Classes_getAll(spreadsheet) || [];
          var activeSessions = allSessions.filter(function(s) {
            return s.student_id === session.student_id && s.session_status !== 'CANCELLED';
          });

          if (activeSessions.length < classesPurchased) {
            var schedSvc = typeof Schedules_list === 'function' ? { Schedules_list: Schedules_list } : (typeof require !== 'undefined' ? require('./ClassScheduleService.gs') : null);
            var schedRes = schedSvc && schedSvc.Schedules_list ? schedSvc.Schedules_list(spreadsheet, session.student_id) : null;
            var schedEntries = (schedRes && schedRes.success && schedRes.data && schedRes.data.length > 0) ? schedRes.data : [];

            if (!schedEntries.length && stuPkg && stuPkg.class_schedule) {
              var pkgSvc = typeof _parseScheduleString === 'function' ? { _parseScheduleString: _parseScheduleString } : (typeof require !== 'undefined' ? require('../packages/PackageService.gs') : null);
              if (pkgSvc && pkgSvc._parseScheduleString) {
                schedEntries = pkgSvc._parseScheduleString(stuPkg.class_schedule, stuPkg.class_duration);
              }
            }

            if (schedEntries.length > 0) {
              var DAY_MAP = { SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6 };
              var latestDateStr = '';
              for (var s = 0; s < allSessions.length; s++) {
                if (allSessions[s].student_id === session.student_id) {
                  var sd = allSessions[s].schedule_date || allSessions[s].class_date;
                  if (sd && String(sd) > latestDateStr) {
                    latestDateStr = String(sd).slice(0, 10);
                  }
                }
              }

              var baseDate = latestDateStr ? new Date(latestDateStr + 'T12:00:00Z') : new Date();
              var existingKeys = {};
              for (var ek = 0; ek < allSessions.length; ek++) {
                if (allSessions[ek].student_id === session.student_id) {
                  var ekDate = allSessions[ek].schedule_date || allSessions[ek].class_date;
                  var ekTime = allSessions[ek].schedule_time || allSessions[ek].start_time;
                  if (ekDate && ekTime) {
                    existingKeys[String(ekDate).slice(0, 10) + '__' + String(ekTime).slice(0, 5)] = true;
                  }
                }
              }

              var candidateDate = new Date(baseDate.getTime() + 86400000);
              var nextSlot = null;
              var safety = 0;
              while (!nextSlot && safety < 120) {
                var dayNum = candidateDate.getUTCDay();
                for (var se = 0; se < schedEntries.length; se++) {
                  var entry = schedEntries[se];
                  var entryDay = DAY_MAP[String(entry.day_of_week || '').toUpperCase()];
                  if (entryDay === dayNum) {
                    var cYear = candidateDate.getUTCFullYear();
                    var cMonth = String(candidateDate.getUTCMonth() + 1); if (cMonth.length < 2) cMonth = '0' + cMonth;
                    var cDay = String(candidateDate.getUTCDate()); if (cDay.length < 2) cDay = '0' + cDay;
                    var dStr = cYear + '-' + cMonth + '-' + cDay;
                    var tStr = String(entry.start_time || '10:00').slice(0, 5);
                    if (!existingKeys[dStr + '__' + tStr]) {
                      nextSlot = {
                        dateStr: dStr,
                        timeStr: tStr,
                        endStr: String(entry.end_time || '').slice(0, 5)
                      };
                      break;
                    }
                  }
                }
                if (!nextSlot) {
                  candidateDate.setUTCDate(candidateDate.getUTCDate() + 1);
                  safety++;
                }
              }

              if (nextSlot) {
                var dur = Number(stuPkg && stuPkg.class_duration) || Number(session.duration_minutes) || 60;
                var startIso = nextSlot.dateStr + 'T' + nextSlot.timeStr + ':00.000Z';
                var endIso = nextSlot.dateStr + 'T' + (nextSlot.endStr || nextSlot.timeStr) + ':00.000Z';
                var newSession = {
                  student_id: session.student_id,
                  student_name: session.student_name || '',
                  schedule_date: nextSlot.dateStr,
                  schedule_time: nextSlot.timeStr,
                  class_session_id: session.student_id + '__' + nextSlot.dateStr + '__' + nextSlot.timeStr,
                  class_date: nextSlot.dateStr,
                  start_time: nextSlot.timeStr,
                  scheduled_start: startIso,
                  scheduled_end: endIso,
                  attendance_status: 'NOT_MARKED',
                  session_status: 'SCHEDULED',
                  cancellation_reason: '',
                  deduct_class: false
                };
                _clsRepo.Classes_insert(spreadsheet, newSession);
                replacementSession = newSession;

                if (pkgRepo.Packages_update && stuPkg) {
                  pkgRepo.Packages_update(spreadsheet, session.student_id, {
                    end_date: nextSlot.dateStr
                  });
                }
              }
            }
          }
        }
      }
    } catch (e) {}
  }

  if (_clsAudit && _clsAudit.recordAuditEvent) {
    _clsAudit.recordAuditEvent(spreadsheet, _clsReg, _clsMap, {
      actor_id: actor ? actor.actorId : 'SYSTEM',
      actor_email: actor ? actor.email : '',
      entity_type: 'CLASS_SESSION',
      entity_id: sid,
      action: 'CANCEL',
      after_summary: { session_status: 'CANCELLED', attendance_status: attStatus, deduct_class: deduct, reason: reason, replacement: replacementSession ? replacementSession.schedule_date : null },
      request_id: actor ? actor.requestId : ''
    });
  }

  var returnData = Object.assign({}, updated, {
    session_status: 'CANCELLED',
    attendance_status: attStatus,
    cancellation_reason: reason,
    deduct_class: deduct,
    class_credit_effect: deduct ? 'CONSUME' : 'NO_CONSUME',
    replacement_session: replacementSession
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
