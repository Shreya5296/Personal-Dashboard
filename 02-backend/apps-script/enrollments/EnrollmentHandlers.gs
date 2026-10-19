/**
 * EnrollmentHandlers: Adapts API requests to EnrollmentService calls and registers operations.
 */

var _enrSvcH = typeof Enrollments_create === 'function' ? { Enrollments_create: Enrollments_create, Enrollments_update: Enrollments_update } : (typeof require !== 'undefined' ? require('./EnrollmentService.gs') : null);
var _enrRepoH = typeof Enrollments_getByStudentId === 'function' ? { Enrollments_getByStudentId: Enrollments_getByStudentId, Enrollments_getAll: Enrollments_getAll } : (typeof require !== 'undefined' ? require('./EnrollmentRepository.gs') : null);

function registerEnrollmentOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('enrollments.list', function(ctx) {
    var studentId = ctx.payload && ctx.payload.studentId;
    var data = studentId
      ? _enrRepoH.Enrollments_getByStudentId(ctx.spreadsheet, studentId)
      : _enrRepoH.Enrollments_getAll(ctx.spreadsheet);
    return { success: true, data: data };
  });

  reg('enrollments.create', function(ctx) {
    return _enrSvcH.Enrollments_create(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });

  reg('enrollments.update', function(ctx) {
    if (!ctx.payload || !ctx.payload.enrollmentId) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Missing enrollmentId in payload' };
    }
    return _enrSvcH.Enrollments_update(ctx.spreadsheet, ctx.payload.enrollmentId, ctx.payload, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });
}

if (typeof registerOperation === 'function') {
  registerEnrollmentOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerEnrollmentOperations: registerEnrollmentOperations };
}
