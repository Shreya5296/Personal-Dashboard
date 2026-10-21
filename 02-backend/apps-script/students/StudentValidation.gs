/**
 * StudentValidation: Validates student input fields and state transitions.
 */

function validateStudentInput(data, isUpdate) {
  var errors = {};

  if (!isUpdate || data.student_name !== undefined || data.full_name !== undefined || data.first_name !== undefined) {
    var name = data.student_name ? String(data.student_name).trim() : (data.full_name ? String(data.full_name).trim() : (data.first_name ? String(data.first_name).trim() : ''));
    if (!name) errors.student_name = 'Student name is required';
  }

  if (!isUpdate || data.parent_name !== undefined || data.parent_guardian_name !== undefined) {
    var pName = data.parent_name ? String(data.parent_name).trim() : (data.parent_guardian_name ? String(data.parent_guardian_name).trim() : '');
    if (!pName) errors.parent_name = 'Parent name is required';
  }

  if (!isUpdate || data.parent_phone !== undefined || data.primary_phone !== undefined || data.phone !== undefined) {
    var phone = data.parent_phone ? String(data.parent_phone).trim() : (data.primary_phone ? String(data.primary_phone).trim() : (data.phone ? String(data.phone).trim() : ''));
    if (!phone) errors.parent_phone = 'Parent phone is required';
  }

  var rawParentEmail = data.parent_email || data.email;
  if (rawParentEmail) {
    var pEmail = String(rawParentEmail).trim();
    if (pEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pEmail)) {
      errors.parent_email = 'Invalid parent email address format';
    }
  }

  var rawStudentEmail = data.student_email;
  if (rawStudentEmail) {
    var sEmail = String(rawStudentEmail).trim();
    if (sEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sEmail)) {
      errors.student_email = 'Invalid student email address format';
    }
  }

  var statusVal = data.status || data.student_status;
  if (statusVal && ['ACTIVE', 'INACTIVE', 'ARCHIVED'].indexOf(statusVal) === -1) {
    errors.status = 'Status must be ACTIVE, INACTIVE, or ARCHIVED';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateStudentInput: validateStudentInput };
}
