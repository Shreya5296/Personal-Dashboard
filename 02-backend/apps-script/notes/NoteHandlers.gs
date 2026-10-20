/**
 * NoteHandlers: Adapts API requests to NoteService calls and registers operations.
 */

var _noteSvcH = typeof Notes_create === 'function' ? { Notes_create: Notes_create } : (typeof require !== 'undefined' ? require('./NoteService.gs') : null);
var _noteRepoH = typeof Notes_getByStudentId === 'function' ? { Notes_getByStudentId: Notes_getByStudentId, Notes_getAll: Notes_getAll } : (typeof require !== 'undefined' ? require('./NoteRepository.gs') : null);

function registerNoteOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('notes.list', function(ctx) {
    var studentId = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id);
    var data = studentId
      ? _noteRepoH.Notes_getByStudentId(ctx.spreadsheet, studentId)
      : _noteRepoH.Notes_getAll(ctx.spreadsheet);
    var enriched = data.map(function(n) {
      var copy = Object.assign({}, n);
      copy.content = n.note_text;
      return copy;
    });
    return { success: true, data: enriched };
  });

  reg('notes.create', function(ctx) {
    var p = Object.assign({}, ctx.payload);
    p.note_text = p.note_text || p.content;
    return _noteSvcH.Notes_create(ctx.spreadsheet, p, {
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
