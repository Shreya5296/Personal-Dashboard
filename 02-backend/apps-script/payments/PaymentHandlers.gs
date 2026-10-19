/**
 * PaymentHandlers: Adapts API requests to PaymentService calls and registers operations.
 */

var _paySvcH = typeof Payments_record === 'function' ? { Payments_record: Payments_record, Payments_void: Payments_void } : (typeof require !== 'undefined' ? require('./PaymentService.gs') : null);
var _payRepoH = typeof Payments_getAll === 'function' ? { Payments_getAll: Payments_getAll } : (typeof require !== 'undefined' ? require('./PaymentRepository.gs') : null);

function registerPaymentOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('payments.list', function(ctx) {
    var studentId = ctx.payload && ctx.payload.studentId;
    var obligationId = ctx.payload && ctx.payload.feeObligationId;
    var all = _payRepoH.Payments_getAll(ctx.spreadsheet);

    var filtered = all.filter(function(p) {
      if (studentId && p.student_id !== studentId) return false;
      if (obligationId && p.fee_obligation_id !== obligationId) return false;
      return true;
    });

    return { success: true, data: filtered };
  });

  reg('payments.record', function(ctx) {
    return _paySvcH.Payments_record(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });

  reg('payments.void', function(ctx) {
    return _paySvcH.Payments_void(ctx.spreadsheet, ctx.payload, {
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
