/**
 * FeeHandlers: Adapts API requests to FeeService calls and registers operations.
 */

var _feeSvcH = typeof FeeObligations_create === 'function' ? { FeeObligations_create: FeeObligations_create, FeeObligations_void: FeeObligations_void, FeeObligations_enrichWithBalances: FeeObligations_enrichWithBalances } : (typeof require !== 'undefined' ? require('./FeeService.gs') : null);
var _feeRepoH = typeof FeeObligations_getByStudentId === 'function' ? { FeeObligations_getByStudentId: FeeObligations_getByStudentId, FeeObligations_getAll: FeeObligations_getAll, FeeObligations_getById: FeeObligations_getById } : (typeof require !== 'undefined' ? require('./FeeRepository.gs') : null);

function registerFeeOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('fees.list', function(ctx) {
    var studentId = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id);
    var raw = studentId
      ? _feeRepoH.FeeObligations_getByStudentId(ctx.spreadsheet, studentId)
      : _feeRepoH.FeeObligations_getAll(ctx.spreadsheet);

    var enriched = raw.map(function(f) {
      return _feeSvcH.FeeObligations_enrichWithBalances(ctx.spreadsheet, f);
    });

    return { success: true, data: enriched };
  });

  reg('fees.create', function(ctx) {
    var p = Object.assign({}, ctx.payload);
    p.obligation_description = p.obligation_description || p.description;
    p.idempotency_key = p.idempotency_key || ctx.idempotencyKey;
    return _feeSvcH.FeeObligations_create(ctx.spreadsheet, p, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });

  reg('fees.void', function(ctx) {
    var p = Object.assign({}, ctx.payload);
    p.fee_obligation_id = p.fee_obligation_id || p.fee_id || p.feeId;
    p.void_reason = p.void_reason || p.reason || 'Voided by administrator';
    return _feeSvcH.FeeObligations_void(ctx.spreadsheet, p, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });
}

if (typeof registerOperation === 'function') {
  registerFeeOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerFeeOperations: registerFeeOperations };
}
