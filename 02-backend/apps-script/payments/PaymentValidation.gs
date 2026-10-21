/**
 * PaymentValidation: Validates payment recording for Payment Details (6-column schema).
 */

function validatePaymentRecordInput(data) {
  var errors = {};

  if (!data || !data.student_id || !String(data.student_id).trim()) {
    errors.student_id = 'Student ID is required';
  }

  var amount = Number(data ? data.amount : NaN);
  if (isNaN(amount) || amount <= 0) {
    errors.amount = 'Payment amount must be greater than zero';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

function validatePaymentVoidInput(data) {
  var errors = {};
  var payId = data ? (data.payment_id || data.paymentId || data.id) : null;
  var hasStudentAndAmount = data && data.student_id && (data.amount !== undefined && data.amount !== null);
  if (!payId && !hasStudentAndAmount) {
    errors.payment_id = 'Payment ID or (student_id and amount) is required';
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
