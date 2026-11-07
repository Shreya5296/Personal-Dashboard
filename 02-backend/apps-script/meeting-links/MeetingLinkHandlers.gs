/**
 * MeetingLinkHandlers: Adapts API requests to MeetingLinkService calls and registers operations.
 */

var _mlSvcH = typeof MeetingLinks_create === 'function' ? {
  MeetingLinks_create: MeetingLinks_create,
  MeetingLinks_deleteSlot: typeof MeetingLinks_deleteSlot === 'function' ? MeetingLinks_deleteSlot : null,
  MeetingLinks_deactivate: MeetingLinks_deactivate,
  MeetingLinks_cleanupInactiveStudents: MeetingLinks_cleanupInactiveStudents
} : (typeof require !== 'undefined' ? require('./MeetingLinkService.gs') : null);
var _mlRepoH = typeof MeetingLinks_getAll === 'function' ? { MeetingLinks_getAll: MeetingLinks_getAll, MeetingLinks_getByStudentId: MeetingLinks_getByStudentId } : (typeof require !== 'undefined' ? require('./MeetingLinkRepository.gs') : null);

function registerMeetingLinkOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('meetingLinks.list', function(ctx) {
    var studentId = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id);
    var all = _mlRepoH.MeetingLinks_getAll(ctx.spreadsheet);

    var filtered = all.filter(function(m) {
      if (studentId && m.student_id !== studentId) return false;
      return true;
    }).map(function(m) {
      var copy = Object.assign({}, m);
      copy.meeting_link_id = 'ml_' + m.student_id;
      copy.meeting_url = m.meeting_link_1 || m.meeting_link_2 || '';
      copy.link_label = 'Primary Link';
      copy.provider = 'Google Meet';
      copy.is_preferred = true;
      copy.link_status = 'ACTIVE';
      return copy;
    });

    return { success: true, data: filtered };
  });

  reg('meetingLinks.create', function(ctx) {
    return _mlSvcH.MeetingLinks_create(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId, email: ctx.verifiedEmail, requestId: ctx.requestId
    });
  });

  reg('meetingLinks.update', function(ctx) {
    return _mlSvcH.MeetingLinks_create(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId, email: ctx.verifiedEmail, requestId: ctx.requestId
    });
  });

  reg('meetingLinks.delete', function(ctx) {
    return _mlSvcH.MeetingLinks_deleteSlot(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId, email: ctx.verifiedEmail, requestId: ctx.requestId
    });
  });

  reg('meetingLinks.deactivate', function(ctx) {
    return _mlSvcH.MeetingLinks_deactivate(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId, email: ctx.verifiedEmail, requestId: ctx.requestId
    });
  });

  reg('meetingLinks.cleanupInactive', function(ctx) {
    return _mlSvcH.MeetingLinks_cleanupInactiveStudents(ctx.spreadsheet, {
      actorId: ctx.actorId, email: ctx.verifiedEmail, requestId: ctx.requestId
    });
  });
}

if (typeof registerOperation === 'function') {
  registerMeetingLinkOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerMeetingLinkOperations: registerMeetingLinkOperations };
}
