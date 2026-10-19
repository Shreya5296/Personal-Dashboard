/**
 * NoteService: Business logic and audit integration for student notes.
 */

var _noteIdGen = typeof generateNoteId === 'function' ? { generateNoteId: generateNoteId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _noteVal = typeof validateNoteInput === 'function' ? { validateNoteInput: validateNoteInput } : (typeof require !== 'undefined' ? require('./NoteValidation.gs') : null);
var _noteRepo = typeof Notes_getAll === 'function' ? { Notes_getAll: Notes_getAll, Notes_getById: Notes_getById, Notes_getByStudentId: Notes_getByStudentId, Notes_insert: Notes_insert, Notes_update: Notes_update } : (typeof require !== 'undefined' ? require('./NoteRepository.gs') : null);
var _noteStuRepo = typeof Students_getById === 'function' ? { Students_getById: Students_getById } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);
var _noteAudit = typeof recordAuditEvent === 'function' ? { recordAuditEvent: recordAuditEvent } : (typeof require !== 'undefined' ? require('../audit/AuditService.gs') : null);
var _noteReg = typeof SHEET_NAMES !== 'undefined' ? { SHEET_NAMES: SHEET_NAMES, getExpectedHeaders: getExpectedHeaders } : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs') : null);
var _noteMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function Notes_create(spreadsheet, data, actor) {
  var v = _noteVal.validateNoteInput(data);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };
  }

  var student = _noteStuRepo.Students_getById(spreadsheet, data.student_id);
  if (!student) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + data.student_id };
  }

  var now = new Date().toISOString();
  var id = _noteIdGen.generateNoteId();
  var record = {
    note_id: id,
    student_id: data.student_id,
    note_type: data.note_type || 'GENERAL',
    note_text: String(data.note_text).trim(),
    follow_up_date: data.follow_up_date || '',
    follow_up_status: data.follow_up_status || 'NOT_REQUIRED',
    created_at: now,
    updated_at: now,
    created_by: actor.actorId || 'admin'
  };

  _noteRepo.Notes_insert(spreadsheet, record);

  _noteAudit.recordAuditEvent(spreadsheet, _noteReg, _noteMap, {
    actor_id: actor.actorId,
    actor_email: actor.email,
    entity_type: 'STUDENT_NOTE',
    entity_id: id,
    action: 'CREATE',
    after_summary: { note_id: id, student_id: data.student_id, note_type: record.note_type },
    request_id: actor.requestId
  });

  return { success: true, data: record };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Notes_create: Notes_create };
}
