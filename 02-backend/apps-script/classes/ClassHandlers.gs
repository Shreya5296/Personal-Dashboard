/**
 * ClassHandlers: Adapts API requests to ClassService calls and registers operations.
 */

var _clsSvcH = typeof Classes_schedule === 'function' ? { Classes_schedule: Classes_schedule, Classes_complete: Classes_complete, Classes_cancel: Classes_cancel, Classes_restoreCredit: Classes_restoreCredit } : (typeof require !== 'undefined' ? require('./ClassService.gs') : null);
var _clsRepoH = typeof Classes_getAll === 'function' ? { Classes_getAll: Classes_getAll } : (typeof require !== 'undefined' ? require('./ClassRepository.gs') : null);

function registerClassOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('classes.list', function(ctx) {
    var studentId = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id);
    var all = _clsRepoH.Classes_getAll(ctx.spreadsheet);

    var filtered = all.filter(function(c) {
      if (studentId && c.student_id !== studentId) return false;
      return true;
    }).map(function(c) {
      var copy = Object.assign({}, c);
      copy.session_id = c.class_session_id;
      copy.topic = c.class_title || 'Class Session';
      copy.start_time = c.scheduled_start;
      copy.status = c.session_status;
      if (c.scheduled_start && c.scheduled_end) {
        try {
          var diffMs = new Date(c.scheduled_end).getTime() - new Date(c.scheduled_start).getTime();
          copy.duration_minutes = Math.max(15, Math.round(diffMs / 60000));
        } catch (e) {
          copy.duration_minutes = 60;
        }
      } else {
        copy.duration_minutes = 60;
      }
      return copy;
    });

    return { success: true, data: filtered };
  });

  var scheduleHandler = function(ctx) {
    return _clsSvcH.Classes_schedule(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId, email: ctx.verifiedEmail, requestId: ctx.requestId
    });
  };
  reg('classes.create', scheduleHandler);
  reg('classes.schedule', scheduleHandler);

  var completeHandler = function(ctx) {
    return _clsSvcH.Classes_complete(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId, email: ctx.verifiedEmail, requestId: ctx.requestId
    });
  };
  reg('classes.complete', completeHandler);
  reg('classes.recordAttendance', completeHandler);

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
