/**
 * ClassValidation: Validates schedule times, statuses, and credit effects.
 */

function validateClassScheduleInput(data) {
  var errors = {};

  if (!data.student_id || !String(data.student_id).trim()) {
    errors.student_id = 'Student ID is required';
  }

  if (!data.scheduled_start || !data.scheduled_end) {
    errors.schedule = 'Scheduled start and end timestamps are required';
  } else if (String(data.scheduled_end) <= String(data.scheduled_start)) {
    errors.scheduled_end = 'Scheduled end time must be later than start time';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

function validateClassCompleteInput(data) {
  var errors = {};
  if (!data.class_session_id) errors.class_session_id = 'Class session ID is required';

  var validAttendance = ['ATTENDED', 'ABSENT', 'EXCUSED'];
  if (!data.attendance_status || validAttendance.indexOf(data.attendance_status) === -1) {
    errors.attendance_status = 'Attendance status must be ATTENDED, ABSENT, or EXCUSED';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateClassScheduleInput: validateClassScheduleInput,
    validateClassCompleteInput: validateClassCompleteInput
  };
}
