/**
 * StudentHandlers: Adapts API requests to StudentService calls and registers operations.
 */

var _stuSvc = typeof Students_create === 'function' ? { Students_create: Students_create, Students_update: Students_update, Students_archive: Students_archive, Students_reactivate: Students_reactivate, Students_list: Students_list } : (typeof require !== 'undefined' ? require('./StudentService.gs') : null);
var _stuRepoH = typeof Students_getById === 'function' ? { Students_getById: Students_getById } : (typeof require !== 'undefined' ? require('./StudentRepository.gs') : null);

function registerStudentOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('students.list', function(ctx) {
    return _stuSvc.Students_list(ctx.spreadsheet, ctx.payload);
  });

  reg('students.get', function(ctx) {
    var sid = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id);
    if (!sid) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Missing studentId in payload' };
    }
    var student = _stuRepoH.Students_getById(ctx.spreadsheet, sid);
    if (!student) {
      return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + sid };
    }
    var enrich = typeof Students_enrich === 'function' ? Students_enrich : (_stuSvc && _stuSvc.Students_enrich ? _stuSvc.Students_enrich : function(x) { return x; });
    return { success: true, data: enrich(student) };
  });

  reg('students.create', function(ctx) {
    return _stuSvc.Students_create(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });

  reg('students.update', function(ctx) {
    var sid = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id);
    if (!sid) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Missing studentId in payload' };
    }
    return _stuSvc.Students_update(ctx.spreadsheet, sid, ctx.payload, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });

  reg('students.archive', function(ctx) {
    var sid = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id);
    if (!sid) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Missing studentId in payload' };
    }
    return _stuSvc.Students_archive(ctx.spreadsheet, sid, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });

  reg('students.reactivate', function(ctx) {
    var sid = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id);
    if (!sid) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Missing studentId in payload' };
    }
    return _stuSvc.Students_reactivate(ctx.spreadsheet, sid, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });
}

// Auto-register in global environment
if (typeof registerOperation === 'function') {
  registerStudentOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerStudentOperations: registerStudentOperations };
}
