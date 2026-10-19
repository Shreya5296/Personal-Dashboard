/**
 * MeetingLinkValidation: Validates URL schemes, providers, and labels.
 */

function validateMeetingLinkInput(data) {
  var errors = {};

  if (!data.student_id || !String(data.student_id).trim()) {
    errors.student_id = 'Student ID is required';
  }

  var allowedProviders = ['ZOOM', 'GOOGLE_MEET', 'OTHER'];
  if (!data.provider || allowedProviders.indexOf(data.provider) === -1) {
    errors.provider = 'Provider must be ZOOM, GOOGLE_MEET, or OTHER';
  }

  if (!data.link_label || !String(data.link_label).trim()) {
    errors.link_label = 'Link label is required';
  }

  if (!data.meeting_url || typeof data.meeting_url !== 'string') {
    errors.meeting_url = 'Meeting URL is required';
  } else {
    var trimmedUrl = data.meeting_url.trim();
    if (trimmedUrl.indexOf('https://') !== 0) {
      errors.meeting_url = 'Meeting URL must use HTTPS protocol';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateMeetingLinkInput: validateMeetingLinkInput };
}
