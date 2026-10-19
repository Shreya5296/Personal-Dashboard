/**
 * ClassHandlers: Adapts API requests to ClassService calls and registers operations.
 */

var _clsSvcH = typeof Classes_schedule === 'function' ? { Classes_schedule: Classes_schedule, Classes_complete: Classes_complete, Classes_cancel: Classes_cancel, Classes_restoreCredit: Classes_restoreCredit } : (typeof require !== 'undefined' ? require('./ClassService.gs') : null);
var _clsRepoH = typeof Classes_getAll === 'function' ? { Classes_getAll: Classes_getAll } : (typeof require !== 'undefined' ? require('./ClassRepository.gs') : null);

function registerClassOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('classes.list', function(ctx) {
    var studentId = ctx.payload && ctx.payload.studentId;
    var includeRestorations = ctx.payload && ctx.payload.includeRestorations;
    var all = _clsRepoH.Classes_getAll(ctx.spreadsheet);

    var filtered = all.filter(function(c) {
      if (!includeRestorations && c.class_credit_effect === 'CREDIT_BACK') return false;
      if (studentId && c.student_id !== studentId) return false;
      return true;
    });

    return { success: true, data: filtered };
  });

  reg('classes.create', function(ctx) {
    return _clsSvcH.Classes_schedule(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId, email: ctx.verifiedEmail, requestId: ctx.requestId
    });
  });

  reg('classes.complete', function(ctx) {
    return _clsSvcH.Classes_complete(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId, email: ctx.verifiedEmail, requestId: ctx.requestId
    });
  });

  reg('classes.cancel', function(ctx) {
    return _clsSvcH.Classes_cancel(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId, email: ctx.verifiedEmail, requestId: ctx.requestId
    });
  });

  reg('classes.restoreCredit', function(ctx) {
    return _clsSvcH.Classes_restoreCredit(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId, email: ctx.verifiedEmail, requestId: ctx.requestId
    });
  });
}

if (typeof registerOperation === 'function') {
  registerClassOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerClassOperations: registerClassOperations };
}
