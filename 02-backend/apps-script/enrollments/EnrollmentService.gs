/**
 * EnrollmentService: Business rules and lifecycle for student enrollments.
 */

var _enrIdGen = typeof generateEnrollmentId === 'function' ? { generateEnrollmentId: generateEnrollmentId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _enrVal = typeof validateEnrollmentInput === 'function' ? { validateEnrollmentInput: validateEnrollmentInput } : (typeof require !== 'undefined' ? require('./EnrollmentValidation.gs') : null);
var _enrRepo = typeof Enrollments_getAll === 'function' ? {
  Enrollments_getAll: Enrollments_getAll,
  Enrollments_getById: Enrollments_getById,
  Enrollments_getByStudentId: Enrollments_getByStudentId,
  Enrollments_insert: Enrollments_insert,
  Enrollments_update: typeof Enrollments_repoUpdate === 'function' ? Enrollments_repoUpdate : Enrollments_update
} : (typeof require !== 'undefined' ? require('./EnrollmentRepository.gs') : null);
var _enrStuRepo = typeof Students_getById === 'function' ? { Students_getById: Students_getById } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);
var _enrReg = {
  get SHEET_NAMES() {
    return (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) || (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').SHEET_NAMES : {});
  },
  getExpectedHeaders: function(name) {
    return typeof getExpectedHeaders === 'function' ? getExpectedHeaders(name) : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').getExpectedHeaders(name) : null);
  }
};
var _enrMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function Enrollments_create(spreadsheet, data, actor) {
  var v = _enrVal.validateEnrollmentInput(data, false);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };
  }

  var student = _enrStuRepo.Students_getById(spreadsheet, data.student_id);
  if (!student) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Referenced student not found: ' + data.student_id };
  }

  var now = new Date().toISOString();
  var id = _enrIdGen.generateEnrollmentId();
  var record = {
    enrollment_id: id,
    student_id: data.student_id,
    enrollment_name: data.enrollment_name ? String(data.enrollment_name).trim() : 'Standard Enrollment',
    start_date: data.start_date || '',
    end_date: data.end_date || '',
    enrollment_status: data.enrollment_status || 'ACTIVE',
    fee_plan_name: data.fee_plan_name ? String(data.fee_plan_name).trim() : '',
    agreed_total_amount: data.agreed_total_amount !== undefined && data.agreed_total_amount !== null ? Number(data.agreed_total_amount) : '',
    currency: 'INR',
    billing_notes: data.billing_notes ? String(data.billing_notes).trim() : '',
    created_at: now,
    updated_at: now,
    closed_at: ''
  };

  _enrRepo.Enrollments_insert(spreadsheet, record);

  return { success: true, data: record };
}

function Enrollments_update(spreadsheet, enrollmentId, updates, actor) {
  var existing = _enrRepo.Enrollments_getById(spreadsheet, enrollmentId);
  if (!existing) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Enrollment not found: ' + enrollmentId };
  }

  var v = _enrVal.validateEnrollmentInput(updates, true);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };
  }

  var safeUpdates = {};
  var fields = ['enrollment_name', 'start_date', 'end_date', 'enrollment_status',
    'fee_plan_name', 'agreed_total_amount', 'billing_notes'];

  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    if (updates[f] !== undefined) {
      safeUpdates[f] = updates[f];
    }
  }

  var now = new Date().toISOString();
  safeUpdates.updated_at = now;
  if (updates.enrollment_status === 'COMPLETED' || updates.enrollment_status === 'CANCELLED') {
    safeUpdates.closed_at = now;
  }

  var updated = _enrRepo.Enrollments_update(spreadsheet, enrollmentId, safeUpdates);

  return { success: true, data: updated };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Enrollments_create: Enrollments_create,
    Enrollments_update: Enrollments_update
  };
}
