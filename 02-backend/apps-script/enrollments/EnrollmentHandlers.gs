/**
 * EnrollmentHandlers: Adapts API requests to EnrollmentService calls and registers operations.
 */

var _enrSvcH = typeof Enrollments_create === 'function' ? { Enrollments_create: Enrollments_create, Enrollments_update: Enrollments_update } : (typeof require !== 'undefined' ? require('./EnrollmentService.gs') : null);
var _enrRepoH = typeof Enrollments_getByStudentId === 'function' ? { Enrollments_getByStudentId: Enrollments_getByStudentId, Enrollments_getAll: Enrollments_getAll } : (typeof require !== 'undefined' ? require('./EnrollmentRepository.gs') : null);

function registerEnrollmentOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('enrollments.list', function(ctx) {
    var studentId = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id);
    var data = studentId
      ? _enrRepoH.Enrollments_getByStudentId(ctx.spreadsheet, studentId)
      : _enrRepoH.Enrollments_getAll(ctx.spreadsheet);

    var enriched = data.map(function(e) {
      var copy = Object.assign({}, e);
      copy.course_name = e.subject_or_level || 'General';
      copy.level_or_grade = e.academic_year || '';
      copy.status = e.enrollment_status || 'ACTIVE';
      return copy;
    });

    return { success: true, data: enriched };
  });

  reg('enrollments.create', function(ctx) {
    var p = Object.assign({}, ctx.payload);
    p.subject_or_level = p.subject_or_level || p.course_name || 'General';
    p.academic_year = p.academic_year || p.level_or_grade || '2026';
    return _enrSvcH.Enrollments_create(ctx.spreadsheet, p, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });

  reg('enrollments.update', function(ctx) {
    var eid = ctx.payload && (ctx.payload.enrollmentId || ctx.payload.enrollment_id);
    if (!eid) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Missing enrollmentId in payload' };
    }
    return _enrSvcH.Enrollments_update(ctx.spreadsheet, eid, ctx.payload, {
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
