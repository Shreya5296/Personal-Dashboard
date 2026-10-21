/**
 * PaymentHandlers: Adapts API requests to PaymentService calls and registers operations.
 */

var _paySvcH = typeof Payments_record === 'function' ? { Payments_record: Payments_record, Payments_void: Payments_void } : (typeof require !== 'undefined' ? require('./PaymentService.gs') : null);
var _payRepoH = typeof Payments_getAll === 'function' ? { Payments_getAll: Payments_getAll } : (typeof require !== 'undefined' ? require('./PaymentRepository.gs') : null);

function registerPaymentOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('payments.list', function(ctx) {
    var studentId = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id);
    var all = _payRepoH.Payments_getAll(ctx.spreadsheet);

    var filtered = all.filter(function(p) {
      if (studentId && p.student_id !== studentId) return false;
      return true;
    }).map(function(p) {
      var copy = Object.assign({}, p);
      copy.payment_id = p.payment_id || (p.student_id + '_' + (p.payment_date || '') + '_' + (p.amount || ''));
      copy.reference_number = p.transaction_reference || p.reference_number || '';
      copy.status = p.payment_status || p.status || 'RECORDED';
      copy.payment_status = copy.status;
      return copy;
    });

    return { success: true, data: filtered };
  });

  reg('payments.record', function(ctx) {
    var p = Object.assign({}, ctx.payload);
    p.transaction_reference = p.transaction_reference || p.reference_number || p.referenceNumber;
    return _paySvcH.Payments_record(ctx.spreadsheet, p, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });

  reg('payments.void', function(ctx) {
    var p = Object.assign({}, ctx.payload);
    p.payment_id = p.payment_id || p.paymentId;
    p.void_reason = p.void_reason || p.reason || 'Voided by administrator';
    return _paySvcH.Payments_void(ctx.spreadsheet, p, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });
}

if (typeof registerOperation === 'function') {
  registerPaymentOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerPaymentOperations: registerPaymentOperations };
}
