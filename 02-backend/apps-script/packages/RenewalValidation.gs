/**
 * RenewalValidation: Validation rules for student renewal operations and actor authorization.
 */

var DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
var _renAdminAuth = typeof isAuthorizedAdmin === 'function' ? isAuthorizedAdmin : (typeof require !== 'undefined' ? require('../auth/AdminAuthorization.gs').isAuthorizedAdmin : null);

function validateRenewalActor(actor) {
  if (!actor || typeof actor !== 'object') {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Missing actor context' };
  }
  var email = String(actor.verifiedEmail || actor.email || '').trim().toLowerCase();
  var actorId = String(actor.actorId || '').trim();
  if (!email && !actorId) {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Caller identity is required' };
  }
  if (actor.role === 'EDUCATOR') {
    return { valid: false, code: 'FORBIDDEN', message: 'Educators are not permitted to renew packages' };
  }
  var isAdmin = (_renAdminAuth && email) ? _renAdminAuth(email) : false;
  if (!isAdmin) {
    return { valid: false, code: 'FORBIDDEN', message: 'Caller is not an authorized administrator' };
  }
  return { valid: true };
}

function validateRenewalInput(data) {
  var errors = {};
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: { payload: 'Invalid renewal payload' } };
  }

  var studentId = String(data.student_id || data.studentId || '').trim();
  if (!studentId) errors.student_id = 'Student ID is required for renewal';

  var idempKey = String(data.idempotency_key || data.idempotencyKey || '').trim();
  if (!idempKey) errors.idempotency_key = 'idempotency_key is mandatory for renewals';

  var rawPurchased = data.new_classes_purchased !== undefined ? data.new_classes_purchased : data.classes_purchased;
  var purchased = Number(rawPurchased);
  if (rawPurchased === undefined || rawPurchased === null || rawPurchased === '' || isNaN(purchased) || purchased <= 0) {
    errors.new_classes_purchased = 'Number of newly purchased classes must be greater than zero';
  }

  var currency = String(data.currency || '').trim();
  if (!currency) errors.currency = 'Currency is required';

  if (data.package_price !== undefined && data.package_price !== null && data.package_price !== '') {
    var price = Number(data.package_price);
    if (isNaN(price) || price < 0) errors.package_price = 'Package price cannot be negative';
  }

  if (data.per_class !== undefined && data.per_class !== null && data.per_class !== '') {
    var perClass = Number(data.per_class);
    if (isNaN(perClass) || perClass < 0) errors.per_class = 'Per-class rate cannot be negative';
  }

  if (data.class_duration !== undefined && data.class_duration !== null && data.class_duration !== '') {
    var dur = Number(data.class_duration);
    if (isNaN(dur) || dur < 15 || dur > 240) errors.class_duration = 'Class duration must be between 15 and 240 minutes';
  }

  if (data.start_date) {
    var startStr = String(data.start_date).trim().slice(0, 10);
    if (!DATE_REGEX.test(startStr)) errors.start_date = 'Start date must be in YYYY-MM-DD format';
  }

  if (data.end_date) {
    var endStr = String(data.end_date).trim().slice(0, 10);
    if (!DATE_REGEX.test(endStr)) errors.end_date = 'End date must be in YYYY-MM-DD format';
    else if (data.start_date && String(data.start_date).trim().slice(0, 10) > endStr) {
      errors.end_date = 'End date cannot be earlier than start date';
    }
  }

  if (data.payment) {
    var pay = data.payment;
    var paySid = String(pay.student_id || pay.studentId || '').trim();
    if (paySid && studentId && paySid !== studentId) {
      errors.payment_student = 'Payment student ID must match renewal student ID';
    }
    if (pay.amount !== undefined && pay.amount !== null && pay.amount !== '') {
      var payAmt = Number(pay.amount);
      if (isNaN(payAmt) || payAmt < 0) errors.payment_amount = 'Payment amount cannot be negative';
    }
    if (pay.payment_date) {
      var payDateStr = String(pay.payment_date).trim().slice(0, 10);
      if (!DATE_REGEX.test(payDateStr)) errors.payment_date = 'Payment date must be in YYYY-MM-DD format';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors: errors };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateRenewalActor: validateRenewalActor,
    validateRenewalInput: validateRenewalInput
  };
}
