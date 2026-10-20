/**
 * StudentValidation: Validates student input fields and state transitions.
 */

function validateStudentInput(data, isUpdate) {
  var errors = {};

  if (!isUpdate || data.first_name !== undefined || data.full_name !== undefined) {
    var fn = data.first_name ? String(data.first_name).trim() : (data.full_name ? String(data.full_name).trim() : '');
    if (!fn) errors.first_name = 'First name is required';
  }

  if (!isUpdate || data.parent_guardian_name !== undefined || data.parent_name !== undefined) {
    var pgn = data.parent_guardian_name ? String(data.parent_guardian_name).trim() : (data.parent_name ? String(data.parent_name).trim() : '');
    if (!pgn) errors.parent_guardian_name = 'Parent or guardian name is required';
  }

  if (!isUpdate || data.primary_phone !== undefined || data.phone !== undefined || data.parent_phone !== undefined) {
    var phone = data.primary_phone ? String(data.primary_phone).trim() : (data.parent_phone ? String(data.parent_phone).trim() : (data.phone ? String(data.phone).trim() : ''));
    if (!phone) errors.primary_phone = 'Primary phone is required';
  }

  var rawEmail = data.parent_email || data.email;
  if (rawEmail) {
    var email = String(rawEmail).trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
