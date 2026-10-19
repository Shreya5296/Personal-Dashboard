/**
 * StudentService: Business logic, validation, audit integration, and lifecycle.
 */

var _stuIdGen = typeof generateStudentId === 'function' ? { generateStudentId: generateStudentId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _stuVal = typeof validateStudentInput === 'function' ? { validateStudentInput: validateStudentInput } : (typeof require !== 'undefined' ? require('./StudentValidation.gs') : null);
var _stuRepo = typeof Students_getAll === 'function' ? { Students_getAll: Students_getAll, Students_getById: Students_getById, Students_insert: Students_insert, Students_update: Students_update } : (typeof require !== 'undefined' ? require('./StudentRepository.gs') : null);
var _stuAudit = typeof recordAuditEvent === 'function' ? { recordAuditEvent: recordAuditEvent } : (typeof require !== 'undefined' ? require('../audit/AuditService.gs') : null);
var _stuReg = typeof SHEET_NAMES !== 'undefined' ? { SHEET_NAMES: SHEET_NAMES, getExpectedHeaders: getExpectedHeaders } : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs') : null);
var _stuMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function Students_create(spreadsheet, data, actor) {
  var v = _stuVal.validateStudentInput(data, false);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Student validation failed', details: v.errors };
  }

  var now = new Date().toISOString();
  var studentId = _stuIdGen.generateStudentId();
  var record = {
    student_id: studentId,
    first_name: String(data.first_name).trim(),
    last_name: data.last_name ? String(data.last_name).trim() : '',
    preferred_name: data.preferred_name ? String(data.preferred_name).trim() : '',
    date_of_birth: data.date_of_birth || '',
    parent_guardian_name: String(data.parent_guardian_name).trim(),
    parent_guardian_relationship: data.parent_guardian_relationship ? String(data.parent_guardian_relationship).trim() : '',
    primary_phone: String(data.primary_phone).trim(),
    secondary_phone: data.secondary_phone ? String(data.secondary_phone).trim() : '',
    parent_email: data.parent_email ? String(data.parent_email).trim() : '',
    city: data.city ? String(data.city).trim() : '',
    student_status: 'ACTIVE',
    first_enrollment_date: data.first_enrollment_date || '',
    last_active_date: data.last_active_date || '',
    internal_summary: data.internal_summary ? String(data.internal_summary).trim() : '',
    created_at: now,
    updated_at: now,
    archived_at: '',
    source_reference: data.source_reference || ''
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

  return { success: true, data: record };
}

function Students_update(spreadsheet, studentId, updates, actor) {
  var existing = _stuRepo.Students_getById(spreadsheet, studentId);
  if (!existing) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + studentId };
  }

  var v = _stuVal.validateStudentInput(updates, true);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };
  }

  var safeUpdates = {};
  var fields = ['first_name', 'last_name', 'preferred_name', 'date_of_birth',
    'parent_guardian_name', 'parent_guardian_relationship', 'primary_phone',
    'secondary_phone', 'parent_email', 'city', 'first_enrollment_date',
    'last_active_date', 'internal_summary'];

  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    if (updates[f] !== undefined) {
      safeUpdates[f] = updates[f] !== null ? String(updates[f]).trim() : '';
    }
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

  return { success: true, data: updated };
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

  return { success: true, data: filtered, meta: { total: filtered.length } };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Students_create: Students_create,
    Students_update: Students_update,
    Students_archive: Students_archive,
    Students_reactivate: Students_reactivate,
    Students_list: Students_list
  };
}
