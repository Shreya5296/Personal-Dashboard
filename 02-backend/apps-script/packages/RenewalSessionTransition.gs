/**
 * RenewalSessionTransition: Handles safe future session transition and renewal generation.
 * Canonical schema: student_id, student_name, schedule_date, schedule_time, attendance_status, session_status, cancellation_reason, deduct_class
 */

var _rstClsRepo = typeof Classes_getAll === 'function' ? { Classes_getAll: Classes_getAll, Classes_insert: Classes_insert, Classes_update: Classes_update } : (typeof require !== 'undefined' ? require('../classes/ClassRepository.gs') : null);

function _countConsumedCredits(sessions, studentId) {
  var count = 0;
  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    if (!s || s.student_id !== studentId) continue;
    var raw = s.deduct_class, sStat = String(s.session_status || s.status || '').trim().toUpperCase();
    if (sStat === 'SCHEDULED') continue;
    var isDeducted = false;
    if (raw === true || raw === 1) isDeducted = true;
    else if (typeof raw === 'string' && raw.trim() !== '') {
      var t = raw.trim().toUpperCase();
      isDeducted = (t === 'TRUE' || t === '1' || t === 'YES');
    } else if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
      var aStat = String(s.attendance_status || '').trim().toUpperCase();
      if ((sStat === 'COMPLETED' || sStat === 'ATTENDED') && (aStat === 'PRESENT' || aStat === 'ATTENDED' || (!aStat && sStat === 'ATTENDED'))) isDeducted = true;
    }
    if (isDeducted) count++;
  }
  return count;
}

function _cancelFutureSessionsOnRenewal(spreadsheet, sessions, studentId, effectiveStartDate, oldScheduleStr, targetSlots) {
  if (!oldScheduleStr || typeof oldScheduleStr !== 'string' || oldScheduleStr.trim() === '') return;
  var DAY_MAP = { SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6 };
  var ABBR = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
  var oldSlots = {}, tokens = oldScheduleStr.split(',');
  for (var t = 0; t < tokens.length; t++) {
    var tok = tokens[t].trim().toUpperCase(); if (!tok) continue;
    var dow = null;
    for (var a in ABBR) { if (tok.indexOf(a) !== -1) { dow = ABBR[a]; break; } }
    if (dow === null) { for (var d in DAY_MAP) { if (tok.indexOf(d) !== -1) { dow = DAY_MAP[d]; break; } } }
    if (dow === null) continue;
    var tm = tok.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
    if (tm) {
      var h = Number(tm[1]), m = Number(tm[2]), mer = tm[3] ? tm[3].toUpperCase() : '';
      if (mer === 'PM' && h < 12) h += 12; else if (mer === 'AM' && h === 12) h = 0;
      oldSlots[dow + '@' + (h < 10 ? '0' + h : String(h)) + ':' + (m < 10 ? '0' + m : String(m))] = true;
    }
  }

  var excludeMap = {};
  if (targetSlots && Array.isArray(targetSlots)) {
    for (var x = 0; x < targetSlots.length; x++) {
      var ts = targetSlots[x], td = ts.schedule_date || (typeof ts === 'string' ? ts.split('__')[1] : '');
      var tt = String(ts.schedule_time || (typeof ts === 'string' ? ts.split('__')[2] : '')).slice(0, 5);
      if (td && tt) excludeMap[td + '__' + tt] = true;
    }
  }

  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    if (!s || s.student_id !== studentId || (s.session_status || s.status) !== 'SCHEDULED') continue;
    var sDate = String(s.schedule_date || s.class_date || '').trim().replace(/^'/, '');
    if (!effectiveStartDate || sDate >= effectiveStartDate) {
      var sTimeRaw = String(s.schedule_time || s.start_time || '').trim(), sm = sTimeRaw.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
      var sNorm = sm ? (function() {
        var sh = Number(sm[1]), smn = Number(sm[2]), smer = sm[3] ? sm[3].toUpperCase() : '';
        if (smer === 'PM' && sh < 12) sh += 12; else if (smer === 'AM' && sh === 12) sh = 0;
        return (sh < 10 ? '0' + sh : String(sh)) + ':' + (smn < 10 ? '0' + smn : String(smn));
      })() : sTimeRaw.slice(0, 5);

      if (excludeMap[sDate + '__' + sNorm]) continue;
      var sParts = sDate.split('-').map(Number);
      var sDow = new Date(Date.UTC(sParts[0], sParts[1] - 1, sParts[2], 12, 0, 0)).getUTCDay();
      if (!oldSlots[sDow + '@' + sNorm]) continue;
      var sid = s.class_session_id || s.session_id || (studentId + '__' + sDate + '__' + sNorm);
      _rstClsRepo.Classes_update(spreadsheet, sid, { session_status: 'CANCELLED', attendance_status: 'CANCELLED', cancellation_reason: 'Superceded by renewal schedule', deduct_class: false });
    }
  }
}

function _planRenewalSlots(existingSessions, studentId, schedules, startDate, count) {
  if (!schedules || !schedules.length || !startDate || count <= 0) return [];
  var DAY_MAP = { SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6 };
  var sortedScheds = schedules.slice().sort(function(a, b) { return String(a.start_time || '').localeCompare(String(b.start_time || '')); });
  var occMap = {};
  for (var i = 0; i < (existingSessions || []).length; i++) {
    var ex = existingSessions[i];
    if (ex && ex.student_id === studentId && (ex.session_status || ex.status) !== 'CANCELLED') {
      var ed = String(ex.schedule_date || ex.class_date || '').trim().replace(/^'/, '');
      occMap[ed + '__' + String(ex.schedule_time || ex.start_time || '').slice(0, 5)] = true;
    }
  }
  var parts = startDate.split('-').map(Number), curr = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0)), slots = [], safety = 0;
  while (slots.length < count && safety < 730) {
    var dow = curr.getUTCDay(), cy = curr.getUTCFullYear(), cm = String(curr.getUTCMonth() + 1), cd = String(curr.getUTCDate());
    var dStr = cy + '-' + (cm.length < 2 ? '0' + cm : cm) + '-' + (cd.length < 2 ? '0' + cd : cd);
    for (var s = 0; s < sortedScheds.length; s++) {
      if (slots.length >= count) break;
      var entry = sortedScheds[s];
      if (DAY_MAP[String(entry.day_of_week || '').trim().toUpperCase()] === dow) {
        var tStr = String(entry.start_time || '00:00').slice(0, 5);
        if (!occMap[dStr + '__' + tStr]) { slots.push({ schedule_date: dStr, schedule_time: tStr, target_key: studentId + '__' + dStr + '__' + tStr }); occMap[dStr + '__' + tStr] = true; }
      }
    }
    curr.setUTCDate(curr.getUTCDate() + 1); safety++;
  }
  return slots;
}

function _generateNewRenewalSessions(spreadsheet, studentId, studentName, schedules, startDate, count, duration, endDate, alreadyCreatedIds, targetSlots) {
  var allSessions = _rstClsRepo.Classes_getAll(spreadsheet) || [], existingMap = {};
  for (var e = 0; e < allSessions.length; e++) {
    var ex = allSessions[e];
    if (ex && ex.student_id === studentId && (ex.session_status || ex.status) !== 'CANCELLED') {
      var ed = String(ex.schedule_date || ex.class_date || '').trim().replace(/^'/, '');
      existingMap[studentId + '__' + ed + '__' + String(ex.schedule_time || ex.start_time || '').slice(0, 5)] = true;
    }
  }
  if (targetSlots && targetSlots.length > 0) {
    var created = 0, existing = 0;
    for (var i = 0; i < targetSlots.length; i++) {
      var slot = targetSlots[i], sDate = slot.schedule_date || (typeof slot === 'string' ? slot.split('__')[1] : '');
      var sTime = slot.schedule_time || (typeof slot === 'string' ? slot.split('__')[2] : '');
      var compKey = studentId + '__' + sDate + '__' + sTime;
      if (existingMap[compKey]) { existing++; } else {
        _rstClsRepo.Classes_insert(spreadsheet, { student_id: studentId, student_name: studentName, schedule_date: sDate, schedule_time: sTime, attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED', cancellation_reason: '', deduct_class: false });
        existingMap[compKey] = true; created++;
      }
    }
    return created + existing;
  }
  var alreadyScheduled = (alreadyCreatedIds && Array.isArray(alreadyCreatedIds)) ? alreadyCreatedIds.length : 0;
  var planned = _planRenewalSlots(allSessions, studentId, schedules, startDate, Math.max(0, count - alreadyScheduled)), createdCount = 0;
  for (var j = 0; j < planned.length; j++) {
    var p = planned[j];
    _rstClsRepo.Classes_insert(spreadsheet, { student_id: studentId, student_name: studentName, schedule_date: p.schedule_date, schedule_time: p.schedule_time, attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED', cancellation_reason: '', deduct_class: false });
    createdCount++;
  }
  return createdCount + alreadyScheduled;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    _setClassRepo: function(cr) { _rstClsRepo = cr; },
    _countConsumedCredits: _countConsumedCredits,
    _cancelFutureSessionsOnRenewal: _cancelFutureSessionsOnRenewal,
    _planRenewalSlots: _planRenewalSlots,
    _generateNewRenewalSessions: _generateNewRenewalSessions
  };
}
