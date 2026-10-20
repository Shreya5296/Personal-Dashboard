/**
 * NoteValidation: Validates student note fields, types, and follow-up statuses.
 */

function validateNoteInput(data) {
  var errors = {};

  if (!data.student_id || !String(data.student_id).trim()) {
    errors.student_id = 'Student ID is required';
  }

  var text = data.note_text || data.content;
  if (!text || !String(text).trim()) {
    errors.note_text = 'Note text is required';
  }

  var validTypes = ['GENERAL', 'FEE', 'CLASS', 'FOLLOW_UP', 'OTHER'];
  if (data.note_type && validTypes.indexOf(data.note_type) === -1) {
    errors.note_type = 'Note type must be one of: ' + validTypes.join(', ');
  }

  var validFollowUp = ['NOT_REQUIRED', 'OPEN', 'COMPLETED', 'CANCELLED'];
  if (data.follow_up_status && validFollowUp.indexOf(data.follow_up_status) === -1) {
    errors.follow_up_status = 'Follow-up status must be one of: ' + validFollowUp.join(', ');
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateNoteInput: validateNoteInput };
}
