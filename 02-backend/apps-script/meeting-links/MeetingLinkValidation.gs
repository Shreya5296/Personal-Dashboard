/**
 * MeetingLinkValidation: Validates meeting links for flat 4-column schema.
 */

function validateMeetingLinkInput(data) {
  var errors = {};

  if (!data || !data.student_id || !String(data.student_id).trim()) {
    errors.student_id = 'Student ID is required';
  }

  var l1 = data ? (data.meeting_link_1 || data.meeting_url || data.link1) : null;
  var l2 = data ? (data.meeting_link_2 || data.link2) : null;

  if (!l1 && !l2) {
    errors.meeting_link = 'At least one meeting link is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateMeetingLinkInput: validateMeetingLinkInput
  };
}
