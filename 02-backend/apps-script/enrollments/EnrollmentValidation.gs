/**
 * EnrollmentValidation: Validates enrollment fields and dates.
 */

function validateEnrollmentInput(data, isUpdate) {
  var errors = {};

  if (!isUpdate || data.student_id !== undefined) {
    if (!data.student_id || !String(data.student_id).trim()) {
      errors.student_id = 'Student ID is required';
    }
  }

  if (data.start_date && data.end_date) {
    if (String(data.end_date) < String(data.start_date)) {
      errors.end_date = 'End date cannot be earlier than start date';
    }
  }

  if (data.enrollment_status) {
    var allowed = ['ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED'];
    if (allowed.indexOf(data.enrollment_status) === -1) {
      errors.enrollment_status = 'Status must be one of: ' + allowed.join(', ');
    }
  }

  if (data.agreed_total_amount !== undefined && data.agreed_total_amount !== null && data.agreed_total_amount !== '') {
    var amt = Number(data.agreed_total_amount);
    if (isNaN(amt) || amt < 0) {
      errors.agreed_total_amount = 'Agreed total amount must be a non-negative number';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateEnrollmentInput: validateEnrollmentInput };
}
