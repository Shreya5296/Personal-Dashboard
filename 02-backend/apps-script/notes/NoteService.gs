/**
 * NoteService: Business logic and audit integration for student notes (5 columns: student_id, student_name, note_date, note_text, follow_up_date).
 */

var _noteIdGen = typeof generateNoteId === 'function' ? { generateNoteId: generateNoteId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _noteVal = typeof validateNoteInput === 'function' ? { validateNoteInput: validateNoteInput } : (typeof require !== 'undefined' ? require('./NoteValidation.gs') : null);
var _noteRepo = typeof Notes_getAll === 'function' ? { Notes_getAll: Notes_getAll, Notes_getById: Notes_getById, Notes_getByStudentId: Notes_getByStudentId, Notes_insert: Notes_insert, Notes_update: Notes_update } : (typeof require !== 'undefined' ? require('./NoteRepository.gs') : null);
var _noteStuRepo = typeof Students_getById === 'function' ? { Students_getById: Students_getById } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);
var _noteAudit = typeof recordAuditEvent === 'function' ? { recordAuditEvent: recordAuditEvent } : (typeof require !== 'undefined' ? require('../audit/AuditService.gs') : null);
var _noteReg = {
  get SHEET_NAMES() {
    return (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) || (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').SHEET_NAMES : {});
  },
  getExpectedHeaders: function(name) {
    return typeof getExpectedHeaders === 'function' ? getExpectedHeaders(name) : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').getExpectedHeaders(name) : null);
  }
};
var _noteMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function Notes_create(spreadsheet, data, actor) {
  var v = _noteVal.validateNoteInput(data);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };
  }

  var student = _noteStuRepo.Students_getById(spreadsheet, data.student_id);
  var studentName = data.student_name || (student ? (student.student_name || student.full_name || '') : '');
  var now = new Date().toISOString();

  var record = {
    student_id: String(data.student_id).trim(),
    student_name: studentName,
    note_date: data.note_date || now.split('T')[0],
    note_text: String(data.note_text || data.content).trim(),
    follow_up_date: data.follow_up_date || ''
  };

  _noteRepo.Notes_insert(spreadsheet, record);

  var noteId = _noteIdGen ? _noteIdGen.generateNoteId() : ('note_' + Date.now());

  if (_noteAudit && _noteAudit.recordAuditEvent) {
    _noteAudit.recordAuditEvent(spreadsheet, _noteReg, _noteMap, {
      actor_id: actor ? actor.actorId : 'SYSTEM',
      actor_email: actor ? actor.email : '',
      entity_type: 'STUDENT_NOTE',
      entity_id: noteId,
      action: 'CREATE',
      after_summary: { student_id: data.student_id, note_date: record.note_date },
      request_id: actor ? actor.requestId : ''
    });
  }

  var returnData = Object.assign({}, record, {
    note_id: noteId,
    content: record.note_text,
    note_type: data.note_type || 'GENERAL'
  });

  return { success: true, data: returnData };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Notes_create: Notes_create };
}
