/**
 * FeeValidation: Validates fee obligation fields and void reasons.
 */

function validateFeeObligationInput(data) {
  var errors = {};

  if (!data.student_id || !String(data.student_id).trim()) {
    errors.student_id = 'Student ID is required';
  }

  if (!data.obligation_description || !String(data.obligation_description).trim()) {
    errors.obligation_description = 'Description is required';
  }

  var amount = Number(data.amount_due);
  if (isNaN(amount) || amount <= 0) {
    errors.amount_due = 'Amount due must be a positive number';
  }

  if (data.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.due_date)) {
    errors.due_date = 'Due date must be in YYYY-MM-DD format';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

function validateFeeVoidInput(data) {
  var errors = {};
  if (!data.fee_obligation_id) {
    errors.fee_obligation_id = 'Fee obligation ID is required';
  }
  if (!data.void_reason || !String(data.void_reason).trim()) {
    errors.void_reason = 'A valid void reason is required';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateFeeObligationInput: validateFeeObligationInput,
    validateFeeVoidInput: validateFeeVoidInput
  };
}
