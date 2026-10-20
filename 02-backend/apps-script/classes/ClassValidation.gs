/**
 * ClassValidation: Validates schedule times, statuses, and credit effects.
 */

function validateClassScheduleInput(data) {
  var errors = {};

  if (!data.student_id || !String(data.student_id).trim()) {
    errors.student_id = 'Student ID is required';
  }

  var start = data.scheduled_start || data.start_time;
  var end = data.scheduled_end;
  if (!end && start && data.duration_minutes) {
    try {
      end = new Date(new Date(start).getTime() + (Number(data.duration_minutes) || 60) * 60000).toISOString();
    } catch (e) {}
  }

  if (!start || !end) {
    errors.schedule = 'Scheduled start and end timestamps are required';
  } else if (String(end) <= String(start)) {
    errors.scheduled_end = 'Scheduled end time must be later than start time';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

function validateClassCompleteInput(data) {
  var errors = {};
  var sid = data.class_session_id || data.session_id;
  if (!sid) errors.class_session_id = 'Class session ID is required';

  var att = data.attendance_status || (data.outcome === 'NO_SHOW' ? 'ABSENT' : data.outcome);
  var validAttendance = ['ATTENDED', 'ABSENT', 'EXCUSED'];
  if (!att || validAttendance.indexOf(att) === -1) {
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
