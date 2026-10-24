/**
 * ClassScheduleHandlers: Registers API operations for recurring weekly schedules.
 */

var _schedSvc = typeof Schedules_list === 'function' ? { Schedules_list: Schedules_list, Schedules_save: Schedules_save } : (typeof require !== 'undefined' ? require('./ClassScheduleService.gs') : null);

function registerClassScheduleOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('schedules.list', function(ctx) {
    var sid = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id);
    var fn = typeof Schedules_list === 'function' ? Schedules_list : (_schedSvc && _schedSvc.Schedules_list);
    return fn(ctx.spreadsheet, sid);
  });

  reg('schedules.save', function(ctx) {
    var sid = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id);
    var entries = ctx.payload && (ctx.payload.schedules || ctx.payload.entries || []);
    var fn = typeof Schedules_save === 'function' ? Schedules_save : (_schedSvc && _schedSvc.Schedules_save);
    return fn(ctx.spreadsheet, sid, entries, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });
}

if (typeof registerOperation === 'function') {
  registerClassScheduleOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerClassScheduleOperations: registerClassScheduleOperations };
}
