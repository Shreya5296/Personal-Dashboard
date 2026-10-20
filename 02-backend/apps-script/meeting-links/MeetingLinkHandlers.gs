/**
 * MeetingLinkHandlers: Adapts API requests to MeetingLinkService calls and registers operations.
 */

var _mlSvcH = typeof MeetingLinks_create === 'function' ? { MeetingLinks_create: MeetingLinks_create, MeetingLinks_deactivate: MeetingLinks_deactivate } : (typeof require !== 'undefined' ? require('./MeetingLinkService.gs') : null);
var _mlRepoH = typeof MeetingLinks_getByStudentId === 'function' ? { MeetingLinks_getByStudentId: MeetingLinks_getByStudentId, MeetingLinks_getAll: MeetingLinks_getAll } : (typeof require !== 'undefined' ? require('./MeetingLinkRepository.gs') : null);

function registerMeetingLinkOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('meetingLinks.list', function(ctx) {
    var studentId = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id);
    var data = studentId
      ? _mlRepoH.MeetingLinks_getByStudentId(ctx.spreadsheet, studentId)
      : _mlRepoH.MeetingLinks_getAll(ctx.spreadsheet);
    return { success: true, data: data };
  });

  reg('meetingLinks.create', function(ctx) {
    return _mlSvcH.MeetingLinks_create(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });

  reg('meetingLinks.deactivate', function(ctx) {
    var mid = ctx.payload && (ctx.payload.meetingLinkId || ctx.payload.meeting_link_id);
    if (!mid) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Missing meetingLinkId' };
    }
    return _mlSvcH.MeetingLinks_deactivate(ctx.spreadsheet, mid, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });
}

if (typeof registerOperation === 'function') {
  registerMeetingLinkOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerMeetingLinkOperations: registerMeetingLinkOperations };
}
