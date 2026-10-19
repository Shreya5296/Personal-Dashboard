/**
 * NoteHandlers: Adapts API requests to NoteService calls and registers operations.
 */

var _noteSvcH = typeof Notes_create === 'function' ? { Notes_create: Notes_create } : (typeof require !== 'undefined' ? require('./NoteService.gs') : null);
var _noteRepoH = typeof Notes_getByStudentId === 'function' ? { Notes_getByStudentId: Notes_getByStudentId, Notes_getAll: Notes_getAll } : (typeof require !== 'undefined' ? require('./NoteRepository.gs') : null);

function registerNoteOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('notes.list', function(ctx) {
    var studentId = ctx.payload && ctx.payload.studentId;
    var data = studentId
      ? _noteRepoH.Notes_getByStudentId(ctx.spreadsheet, studentId)
      : _noteRepoH.Notes_getAll(ctx.spreadsheet);
    return { success: true, data: data };
  });

  reg('notes.create', function(ctx) {
    return _noteSvcH.Notes_create(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });
}

if (typeof registerOperation === 'function') {
  registerNoteOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerNoteOperations: registerNoteOperations };
}
