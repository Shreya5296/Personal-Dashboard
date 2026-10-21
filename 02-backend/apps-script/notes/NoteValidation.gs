/**
 * NoteValidation: Validates student note fields for 5-column schema (student_id, student_name, note_date, note_text, follow_up_date).
 */

function validateNoteInput(data) {
  var errors = {};

  if (!data || !data.student_id || !String(data.student_id).trim()) {
    errors.student_id = 'Student ID is required';
  }

  var text = data ? (data.note_text || data.content) : null;
  if (!text || !String(text).trim()) {
    errors.note_text = 'Note text is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateNoteInput: validateNoteInput };
}
