/**
 * FeeValidation: Validates fee obligation fields and void reasons.
 */

function validateFeeObligationInput(data) {
  var errors = {};

  if (!data.student_id || !String(data.student_id).trim()) {
    errors.student_id = 'Student ID is required';
  }

  var desc = data.obligation_description || data.description;
  if (!desc || !String(desc).trim()) {
    errors.obligation_description = 'Description is required';
  }

  var amount = Number(data.amount_due);
  if (isNaN(amount) || amount <= 0) {
    errors.amount_due = 'Amount due must be a positive number';
  }

  if (data.credit_applied !== undefined && data.credit_applied !== null && data.credit_applied !== '') {
    var credit = Number(data.credit_applied);
    if (isNaN(credit) || credit < 0) {
      errors.credit_applied = 'Credit applied must be a non-negative number';
    } else if (!isNaN(amount) && credit > amount) {
      errors.credit_applied = 'Credit applied cannot exceed amount due';
    }
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
  var feeId = data.fee_obligation_id || data.fee_id || data.feeId;
  if (!feeId) {
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
