/**
 * StudentValidation: Validates student input fields and state transitions.
 */

function validateStudentInput(data, isUpdate) {
  var errors = {};

  if (!isUpdate || data.first_name !== undefined) {
    var fn = data.first_name ? String(data.first_name).trim() : '';
    if (!fn) errors.first_name = 'First name is required';
  }

  if (!isUpdate || data.parent_guardian_name !== undefined) {
    var pgn = data.parent_guardian_name ? String(data.parent_guardian_name).trim() : '';
    if (!pgn) errors.parent_guardian_name = 'Parent or guardian name is required';
  }

  if (!isUpdate || data.primary_phone !== undefined) {
    var phone = data.primary_phone ? String(data.primary_phone).trim() : '';
    if (!phone) errors.primary_phone = 'Primary phone is required';
  }

  if (data.parent_email) {
    var email = String(data.parent_email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.parent_email = 'Invalid email address format';
    }
  }

  if (data.student_status && ['ACTIVE', 'INACTIVE'].indexOf(data.student_status) === -1) {
    errors.student_status = 'Status must be ACTIVE or INACTIVE';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateStudentInput: validateStudentInput };
}
