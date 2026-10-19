/**
 * PaymentValidation: Validates payment recording, idempotency keys, and voiding.
 */

function validatePaymentRecordInput(data) {
  var errors = {};

  if (!data.student_id || !String(data.student_id).trim()) {
    errors.student_id = 'Student ID is required';
  }

  if (!data.fee_obligation_id || !String(data.fee_obligation_id).trim()) {
    errors.fee_obligation_id = 'Fee obligation ID is required for every payment in V1';
  }

  var amount = Number(data.amount);
  if (isNaN(amount) || amount <= 0) {
    errors.amount = 'Payment amount must be greater than zero';
  }

  var allowedMethods = ['UPI', 'BANK_TRANSFER', 'CASH', 'CARD', 'OTHER'];
  if (!data.payment_method || allowedMethods.indexOf(data.payment_method) === -1) {
    errors.payment_method = 'Payment method must be one of: ' + allowedMethods.join(', ');
  }

  if (!data.idempotency_key || !String(data.idempotency_key).trim()) {
    errors.idempotency_key = 'Idempotency key is required to record a payment';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

function validatePaymentVoidInput(data) {
  var errors = {};
  if (!data.payment_id) errors.payment_id = 'Payment ID is required';
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
    validatePaymentRecordInput: validatePaymentRecordInput,
    validatePaymentVoidInput: validatePaymentVoidInput
  };
}
