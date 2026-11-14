/**
 * StudentService: Business logic, validation, and lifecycle.
 */

var _stuIdGen = typeof generateStudentId === 'function' ? { generateStudentId: generateStudentId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _stuVal = typeof validateStudentInput === 'function' ? { validateStudentInput: validateStudentInput } : (typeof require !== 'undefined' ? require('./StudentValidation.gs') : null);
var _stuRepo = typeof Students_getAll === 'function' ? {
  Students_getAll: Students_getAll,
  Students_getById: Students_getById,
  Students_insert: Students_insert,
  Students_update: typeof Students_repoUpdate === 'function' ? Students_repoUpdate : Students_update
} : (typeof require !== 'undefined' ? require('./StudentRepository.gs') : null);
var _stuLock = typeof withLock === 'function' ? { withLock: withLock } : (typeof require !== 'undefined' ? require('../sheets/LockManager.gs') : null);
var _stuSchedSvc = typeof Schedules_list === 'function' ? { Schedules_list: Schedules_list } : (typeof require !== 'undefined' ? require('../classes/ClassScheduleService.gs') : null);
var _stuClsRepo = typeof Classes_getAll === 'function' ? { Classes_getAll: Classes_getAll } : (typeof require !== 'undefined' ? require('../classes/ClassRepository.gs') : null);
var _stuReg = {
  get SHEET_NAMES() {
    if (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) return SHEET_NAMES;
    if (typeof require !== 'undefined') return require('../sheets/SheetRegistry.gs').SHEET_NAMES;
    return {};
  },
  getExpectedHeaders: function(name) {
    if (typeof getExpectedHeaders === 'function') return getExpectedHeaders(name);
    if (typeof require !== 'undefined') return require('../sheets/SheetRegistry.gs').getExpectedHeaders(name);
    return null;
  }
};
var _stuMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function _hasActiveSchedulesOrSessions(spreadsheet, studentId) {
  if (_stuSchedSvc && _stuSchedSvc.Schedules_list) {
    try {
      var res = _stuSchedSvc.Schedules_list(spreadsheet, studentId);
      var scheds = res && res.data ? res.data : [];
      if (scheds && scheds.length > 0 && scheds.some(function(s) { return s.is_active !== false && String(s.is_active) !== 'false'; })) {
        return { hasActive: true, reason: 'recurring schedules' };
      }
    } catch (e) {}
  }
  if (_stuClsRepo && _stuClsRepo.Classes_getAll) {
    try {
      var sessions = _stuClsRepo.Classes_getAll(spreadsheet);
      var nowTime = new Date().getTime() - 60000;
      for (var i = 0; i < sessions.length; i++) {
        var c = sessions[i];
        if (c.student_id === studentId) {
          var status = c.session_status || c.status;
          if (status === 'SCHEDULED') {
            var start = c.scheduled_start || c.start_time;
            if (start && new Date(start).getTime() >= nowTime) {
              return { hasActive: true, reason: 'active future class sessions' };
            }
          }
        }
      }
    } catch (e) {}
  }
  return { hasActive: false };
}

function _cleanPhone(p) {
  if (!p) return '';
  var s = String(p).trim();
  return s.charAt(0) === "'" ? s.substring(1) : s;
}

function Students_enrich(s) {
  if (!s) return s;
  var copy = Object.assign({}, s);
  copy.student_name = s.student_name || s.full_name || (s.first_name ? (s.first_name + (s.last_name ? ' ' + s.last_name : '')).trim() : '');
  copy.full_name = copy.student_name;
  copy.parent_name = s.parent_name || s.parent_guardian_name || '';
  copy.parent_phone = _cleanPhone(s.parent_phone || s.primary_phone || s.phone || '');
  copy.student_phone = _cleanPhone(s.student_phone || s.secondary_phone || '');
  copy.parent_email = s.parent_email || s.email || '';
  copy.student_email = s.student_email || '';
  copy.phone = copy.parent_phone;
  copy.email = copy.parent_email;
  copy.subject = s.subject || '';
  copy.subjects = s.subjects || (copy.subject ? copy.subject.split(',').map(function(item) { return item.trim(); }).filter(Boolean) : []);
  copy.status = String(s.status || s.student_status || 'ACTIVE').trim().toUpperCase();
  copy.student_status = copy.status;
  copy.notes = s.notes || '';
  return copy;
}

function Students_create(spreadsheet, data, actor) {
  var rawName = data.student_name || data.full_name || (data.first_name ? (data.first_name + (data.last_name ? ' ' + data.last_name : '')).trim() : '');
  var rawParent = data.parent_name || data.parent_guardian_name || '';
  var rawParentPhone = data.parent_phone || data.primary_phone || data.phone || '';
  var rawStudentPhone = data.student_phone || data.secondary_phone || '';
  var rawParentEmail = data.parent_email || data.email || '';
  var rawStudentEmail = data.student_email || '';
  var rawSubject = data.subject !== undefined ? data.subject : (data.subjects !== undefined ? data.subjects : '');
  if (Array.isArray(rawSubject)) {
    rawSubject = rawSubject.join(', ');
  } else {
    rawSubject = String(rawSubject || '').trim();
  }
  var rawNotes = data.notes !== undefined ? String(data.notes).trim() : (data.internal_summary !== undefined ? String(data.internal_summary).trim() : '');

  var normalized = {
    student_name: String(rawName || '').trim(),
    parent_name: String(rawParent || '').trim(),
    parent_phone: String(rawParentPhone || '').trim(),
    student_phone: String(rawStudentPhone || '').trim(),
    parent_email: String(rawParentEmail || '').trim(),
    student_email: String(rawStudentEmail || '').trim(),
    subject: rawSubject,
    status: data.status ? String(data.status).trim().toUpperCase() : (data.student_status ? String(data.student_status).trim().toUpperCase() : 'ACTIVE'),
    notes: rawNotes
  };

  var v = _stuVal.validateStudentInput(normalized, false);
  if (!v.valid) {
    var errMsgs = Object.keys(v.errors).map(function(k) { return v.errors[k]; }).join(', ');
    return { success: false, code: 'VALIDATION_ERROR', message: 'Student validation failed: ' + errMsgs, details: v.errors };
  }

  var now = new Date().toISOString();
  var lockFn = _stuLock && _stuLock.withLock ? _stuLock.withLock : function(timeout, fn) { return { success: true, result: fn() }; };
  var lockRes = lockFn(10000, function() {
    var existingStudents = _stuRepo.Students_getAll(spreadsheet) || [];
    var existingIds = existingStudents.map(function(s) { return s.student_id; });
    var studentId = _stuIdGen.generateStudentId(existingIds);

    if (_stuRepo.Students_getById(spreadsheet, studentId)) {
      throw new Error('Collision detected for student ID: ' + studentId);
    }

    var record = {
      student_id: studentId,
      student_name: normalized.student_name,
      parent_name: normalized.parent_name,
      parent_phone: normalized.parent_phone,
      student_phone: normalized.student_phone,
      parent_email: normalized.parent_email,
      student_email: normalized.student_email,
      subject: normalized.subject,
      status: normalized.status,
      notes: normalized.notes,
      created_at: now,
      updated_at: now,
      archived_at: ''
    };

    _stuRepo.Students_insert(spreadsheet, record);

    return { success: true, data: Students_enrich(record) };
  });

  if (!lockRes.success) {
    return {
      success: false,
      code: lockRes.code || 'CONFLICT',
      message: lockRes.message || 'Could not acquire lock to create student'
    };
  }

  return lockRes.result;
}

function Students_update(spreadsheet, studentId, updates, actor) {
  var existing = _stuRepo.Students_getById(spreadsheet, studentId);
  if (!existing) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + studentId };
  }

  var normalized = Object.assign({}, updates);
  if (updates.full_name !== undefined && updates.student_name === undefined) {
    normalized.student_name = updates.full_name;
  }
  if (updates.parent_guardian_name !== undefined && updates.parent_name === undefined) {
    normalized.parent_name = updates.parent_guardian_name;
  }
  if (updates.primary_phone !== undefined && updates.parent_phone === undefined) {
    normalized.parent_phone = updates.primary_phone;
  }
  if (updates.email !== undefined && updates.parent_email === undefined) {
    normalized.parent_email = updates.email;
  }
  if (updates.subjects !== undefined && updates.subject === undefined) {
    normalized.subject = Array.isArray(updates.subjects) ? updates.subjects.join(', ') : updates.subjects;
  } else if (Array.isArray(updates.subject)) {
    normalized.subject = updates.subject.join(', ');
  }
  if (updates.status !== undefined && updates.status !== null) {
    normalized.status = String(updates.status).trim().toUpperCase();
  }
  if (updates.student_status !== undefined && updates.student_status !== null) {
    normalized.student_status = String(updates.student_status).trim().toUpperCase();
  }

  var v = _stuVal.validateStudentInput(normalized, true);
  if (!v.valid) {
    var errMsgs = Object.keys(v.errors).map(function(k) { return v.errors[k]; }).join(', ');
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed: ' + errMsgs, details: v.errors };
  }

  var safeUpdates = {};
  var allowedFields = [
    'student_name', 'parent_name', 'parent_phone', 'student_phone',
    'parent_email', 'student_email', 'subject', 'status', 'notes'
  ];

  for (var i = 0; i < allowedFields.length; i++) {
    var f = allowedFields[i];
    if (normalized[f] !== undefined) {
      var val = normalized[f] !== null ? String(normalized[f]).trim() : '';
      if ((f === 'student_phone' || f === 'student_email' || f === 'notes') && val === '' && existing[f]) {
        safeUpdates[f] = existing[f];
      } else if (f === 'status') {
        safeUpdates[f] = String(val).trim().toUpperCase();
      } else {
        safeUpdates[f] = val;
      }
    }
  }

  if (normalized.student_status !== undefined && safeUpdates.status === undefined) {
    safeUpdates.status = String(normalized.student_status).trim();
  }

  if (safeUpdates.status === 'INACTIVE' || safeUpdates.status === 'ARCHIVED') {
    var activeCheck = _hasActiveSchedulesOrSessions(spreadsheet, studentId);
    if (activeCheck.hasActive) {
      return {
        success: false,
        code: 'ACTIVE_SCHEDULE_EXISTS',
        message: 'Cannot deactivate student: Student has ' + activeCheck.reason + '. Please cancel or remove all future sessions and recurring schedules before setting student to inactive.'
      };
    }
  }

  safeUpdates.updated_at = new Date().toISOString();

  var updated = _stuRepo.Students_update(spreadsheet, studentId, safeUpdates);

  return { success: true, data: Students_enrich(updated) };
}

function Students_archive(spreadsheet, studentId, actor) {
  var existing = _stuRepo.Students_getById(spreadsheet, studentId);
  if (!existing) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + studentId };
  }
  var activeCheck = _hasActiveSchedulesOrSessions(spreadsheet, studentId);
  if (activeCheck.hasActive) {
    return {
      success: false,
      code: 'ACTIVE_SCHEDULE_EXISTS',
      message: 'Cannot deactivate student: Student has ' + activeCheck.reason + '. Please cancel or remove all future sessions and recurring schedules before setting student to inactive.'
    };
  }
  var now = new Date().toISOString();
  var updated = _stuRepo.Students_update(spreadsheet, studentId, {
    status: 'INACTIVE',
    archived_at: now,
    updated_at: now
  });

  return { success: true, data: Students_enrich(updated) };
}

function Students_reactivate(spreadsheet, studentId, actor) {
  var existing = _stuRepo.Students_getById(spreadsheet, studentId);
  if (!existing) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + studentId };
  }
  var now = new Date().toISOString();
  var updated = _stuRepo.Students_update(spreadsheet, studentId, {
    status: 'ACTIVE',
    updated_at: now
  });

  return { success: true, data: Students_enrich(updated) };
}

function Students_list(spreadsheet, filter) {
  var records = _stuRepo.Students_getAll(spreadsheet);
  var status = filter && filter.status ? String(filter.status).trim() : 'ALL';
  var search = filter && (filter.search || filter.query) ? String(filter.search || filter.query).toLowerCase().trim() : '';

  var filtered = records.filter(function(s) {
    var sStatus = s.status || s.student_status || 'ACTIVE';
    if (status && status !== 'ALL' && sStatus !== status) return false;
    if (search) {
      var sName = String(s.student_name || s.full_name || (s.first_name ? s.first_name + ' ' + (s.last_name || '') : '')).toLowerCase();
      var pName = String(s.parent_name || s.parent_guardian_name || '').toLowerCase();
      var phone = String(s.parent_phone || s.student_phone || s.primary_phone || '').toLowerCase();
      var email = String(s.parent_email || s.student_email || s.email || '').toLowerCase();
      var subj = String(s.subject || '').toLowerCase();
      var notes = String(s.notes || '').toLowerCase();
      if (sName.indexOf(search) === -1 &&
          pName.indexOf(search) === -1 &&
          phone.indexOf(search) === -1 &&
          email.indexOf(search) === -1 &&
          subj.indexOf(search) === -1 &&
          notes.indexOf(search) === -1) {
        return false;
      }
    }
    return true;
  });

  var enrichedList = filtered.map(function(s) {
    return Students_enrich(s);
  });

  return { success: true, data: enrichedList, meta: { total: filtered.length } };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Students_enrich: Students_enrich,
    Students_create: Students_create,
    Students_update: Students_update,
    Students_archive: Students_archive,
    Students_reactivate: Students_reactivate,
    Students_getById: function(spreadsheet, id) { return _stuRepo.Students_getById(spreadsheet, id); },
    Students_list: Students_list
  };
}
