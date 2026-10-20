/**
 * StudentService: Business logic, validation, audit integration, and lifecycle.
 */

var _stuIdGen = typeof generateStudentId === 'function' ? { generateStudentId: generateStudentId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _stuVal = typeof validateStudentInput === 'function' ? { validateStudentInput: validateStudentInput } : (typeof require !== 'undefined' ? require('./StudentValidation.gs') : null);
var _stuRepo = typeof Students_getAll === 'function' ? { Students_getAll: Students_getAll, Students_getById: Students_getById, Students_insert: Students_insert, Students_update: Students_update } : (typeof require !== 'undefined' ? require('./StudentRepository.gs') : null);
var _stuAudit = typeof recordAuditEvent === 'function' ? { recordAuditEvent: recordAuditEvent } : (typeof require !== 'undefined' ? require('../audit/AuditService.gs') : null);
var _stuReg = typeof SHEET_NAMES !== 'undefined' ? { SHEET_NAMES: SHEET_NAMES, getExpectedHeaders: getExpectedHeaders } : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs') : null);
var _stuMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function Students_enrich(s) {
  if (!s) return s;
  var copy = Object.assign({}, s);
  copy.full_name = (s.first_name + (s.last_name ? ' ' + s.last_name : '')).trim();
  copy.phone = s.primary_phone || '';
  copy.email = s.parent_email || '';
  copy.parent_name = s.parent_guardian_name || '';
  copy.parent_phone = s.secondary_phone || s.primary_phone || '';
  copy.status = s.student_status || 'ACTIVE';
  copy.notes = s.internal_summary || '';
  return copy;
}

function Students_create(spreadsheet, data, actor) {
  var rawFirst = data.first_name;
  var rawLast = data.last_name;
  if (!rawFirst && data.full_name) {
    var parts = String(data.full_name).trim().split(/\s+/);
    rawFirst = parts[0];
    rawLast = parts.slice(1).join(' ');
  }
  var rawParent = data.parent_guardian_name || data.parent_name || '';
  var rawPhone = data.primary_phone || data.parent_phone || data.phone || '';
  var rawEmail = data.parent_email || data.email || '';
  var rawSecondaryPhone = data.secondary_phone || (data.parent_phone && data.parent_phone !== rawPhone ? data.parent_phone : (data.phone && data.phone !== rawPhone ? data.phone : ''));

  var normalized = Object.assign({}, data, {
    first_name: rawFirst,
    last_name: rawLast,
    parent_guardian_name: rawParent,
    primary_phone: rawPhone,
    parent_email: rawEmail,
    secondary_phone: rawSecondaryPhone
  });

  var v = _stuVal.validateStudentInput(normalized, false);
  if (!v.valid) {
    var errMsgs = Object.keys(v.errors).map(function(k) { return v.errors[k]; }).join(', ');
    return { success: false, code: 'VALIDATION_ERROR', message: 'Student validation failed: ' + errMsgs, details: v.errors };
  }

  var now = new Date().toISOString();
  var studentId = _stuIdGen.generateStudentId();
  var record = {
    student_id: studentId,
    first_name: String(normalized.first_name).trim(),
    last_name: normalized.last_name ? String(normalized.last_name).trim() : '',
    preferred_name: normalized.preferred_name ? String(normalized.preferred_name).trim() : '',
    date_of_birth: normalized.date_of_birth || '',
    parent_guardian_name: String(normalized.parent_guardian_name).trim(),
    parent_guardian_relationship: normalized.parent_guardian_relationship ? String(normalized.parent_guardian_relationship).trim() : '',
    primary_phone: String(normalized.primary_phone).trim(),
    secondary_phone: normalized.secondary_phone ? String(normalized.secondary_phone).trim() : '',
    parent_email: normalized.parent_email ? String(normalized.parent_email).trim() : '',
    city: normalized.city ? String(normalized.city).trim() : '',
    student_status: 'ACTIVE',
    first_enrollment_date: normalized.first_enrollment_date || '',
    last_active_date: normalized.last_active_date || '',
    internal_summary: normalized.internal_summary || normalized.notes ? String(normalized.internal_summary || normalized.notes).trim() : '',
    created_at: now,
    updated_at: now,
    archived_at: '',
    source_reference: normalized.source_reference || ''
  };

  _stuRepo.Students_insert(spreadsheet, record);

  _stuAudit.recordAuditEvent(spreadsheet, _stuReg, _stuMap, {
    actor_id: actor.actorId,
    actor_email: actor.email,
    entity_type: 'STUDENT',
    entity_id: studentId,
    action: 'CREATE',
    after_summary: { student_id: studentId, name: record.first_name + ' ' + record.last_name },
    request_id: actor.requestId
  });

  return { success: true, data: Students_enrich(record) };
}

function Students_update(spreadsheet, studentId, updates, actor) {
  var existing = _stuRepo.Students_getById(spreadsheet, studentId);
  if (!existing) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + studentId };
  }

  var rawFirst = updates.first_name;
  var rawLast = updates.last_name;
  if (!rawFirst && updates.full_name) {
    var parts = String(updates.full_name).trim().split(/\s+/);
    rawFirst = parts[0];
    rawLast = parts.slice(1).join(' ');
  }
  var rawParent = updates.parent_guardian_name || updates.parent_name;
  var rawPhone = updates.primary_phone || updates.parent_phone || updates.phone;
  var rawEmail = updates.parent_email || updates.email;

  var normalized = Object.assign({}, updates);
  if (rawFirst !== undefined) normalized.first_name = rawFirst;
  if (rawLast !== undefined) normalized.last_name = rawLast;
  if (rawParent !== undefined) normalized.parent_guardian_name = rawParent;
  if (rawPhone !== undefined) normalized.primary_phone = rawPhone;
  if (rawEmail !== undefined) normalized.parent_email = rawEmail;

  var v = _stuVal.validateStudentInput(normalized, true);
  if (!v.valid) {
    var errMsgs = Object.keys(v.errors).map(function(k) { return v.errors[k]; }).join(', ');
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed: ' + errMsgs, details: v.errors };
  }

  var safeUpdates = {};
  var fields = ['first_name', 'last_name', 'preferred_name', 'date_of_birth',
    'parent_guardian_name', 'parent_guardian_relationship', 'primary_phone',
    'secondary_phone', 'parent_email', 'city', 'first_enrollment_date',
    'last_active_date', 'internal_summary'];

  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    if (normalized[f] !== undefined) {
      safeUpdates[f] = normalized[f] !== null ? String(normalized[f]).trim() : '';
    }
  }
  if (normalized.notes !== undefined && safeUpdates.internal_summary === undefined) {
    safeUpdates.internal_summary = String(normalized.notes).trim();
  }
  safeUpdates.updated_at = new Date().toISOString();

  var updated = _stuRepo.Students_update(spreadsheet, studentId, safeUpdates);

  _stuAudit.recordAuditEvent(spreadsheet, _stuReg, _stuMap, {
    actor_id: actor.actorId,
    actor_email: actor.email,
    entity_type: 'STUDENT',
    entity_id: studentId,
    action: 'UPDATE',
    before_summary: existing,
    after_summary: updated,
    request_id: actor.requestId
  });

  return { success: true, data: Students_enrich(updated) };
}

function Students_archive(spreadsheet, studentId, actor) {
  var existing = _stuRepo.Students_getById(spreadsheet, studentId);
  if (!existing) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + studentId };
  }
  var now = new Date().toISOString();
  var updated = _stuRepo.Students_update(spreadsheet, studentId, {
    student_status: 'INACTIVE',
    archived_at: now,
    updated_at: now
  });

  _stuAudit.recordAuditEvent(spreadsheet, _stuReg, _stuMap, {
    actor_id: actor.actorId,
    actor_email: actor.email,
    entity_type: 'STUDENT',
    entity_id: studentId,
    action: 'ARCHIVE',
    before_summary: { student_status: existing.student_status },
    after_summary: { student_status: 'INACTIVE', archived_at: now },
    request_id: actor.requestId
  });

  return { success: true, data: updated };
}

function Students_reactivate(spreadsheet, studentId, actor) {
  var existing = _stuRepo.Students_getById(spreadsheet, studentId);
  if (!existing) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + studentId };
  }
  var now = new Date().toISOString();
  var updated = _stuRepo.Students_update(spreadsheet, studentId, {
    student_status: 'ACTIVE',
    updated_at: now
  });

  _stuAudit.recordAuditEvent(spreadsheet, _stuReg, _stuMap, {
    actor_id: actor.actorId,
    actor_email: actor.email,
    entity_type: 'STUDENT',
    entity_id: studentId,
    action: 'REACTIVATE',
    before_summary: { student_status: existing.student_status },
    after_summary: { student_status: 'ACTIVE' },
    request_id: actor.requestId
  });

  return { success: true, data: updated };
}

function Students_list(spreadsheet, filter) {
  var records = _stuRepo.Students_getAll(spreadsheet);
  var status = filter && filter.status ? filter.status : 'ACTIVE';
  var search = filter && filter.search ? String(filter.search).toLowerCase().trim() : '';

  var filtered = records.filter(function(s) {
    if (status !== 'ALL' && s.student_status !== status) return false;
    if (search) {
      var fullName = (s.first_name + ' ' + (s.last_name || '')).toLowerCase();
      var prefName = (s.preferred_name || '').toLowerCase();
      var phone = (s.primary_phone || '').toLowerCase();
      var email = (s.parent_email || '').toLowerCase();
      var pName = (s.parent_guardian_name || '').toLowerCase();
      if (fullName.indexOf(search) === -1 &&
          prefName.indexOf(search) === -1 &&
          phone.indexOf(search) === -1 &&
          email.indexOf(search) === -1 &&
          pName.indexOf(search) === -1) {
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
    Students_list: Students_list
  };
}
