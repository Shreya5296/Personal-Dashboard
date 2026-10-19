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
    if (!ctx.payload || !ctx.payload.studentId) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Missing studentId in payload' };
    }
    var student = _stuRepoH.Students_getById(ctx.spreadsheet, ctx.payload.studentId);
    if (!student) {
      return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + ctx.payload.studentId };
    }
    return { success: true, data: student };
  });

  reg('students.create', function(ctx) {
    return _stuSvc.Students_create(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });

  reg('students.update', function(ctx) {
    if (!ctx.payload || !ctx.payload.studentId) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Missing studentId in payload' };
    }
    return _stuSvc.Students_update(ctx.spreadsheet, ctx.payload.studentId, ctx.payload, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });

  reg('students.archive', function(ctx) {
    if (!ctx.payload || !ctx.payload.studentId) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Missing studentId in payload' };
    }
    return _stuSvc.Students_archive(ctx.spreadsheet, ctx.payload.studentId, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });

  reg('students.reactivate', function(ctx) {
    if (!ctx.payload || !ctx.payload.studentId) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Missing studentId in payload' };
    }
    return _stuSvc.Students_reactivate(ctx.spreadsheet, ctx.payload.studentId, {
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
