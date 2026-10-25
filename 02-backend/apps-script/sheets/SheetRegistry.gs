/**
 * Canonical Sheet Registry
 * Defines the canonical business and operational spreadsheet tabs and their exact column headers.
 * AppConfig, ImportBatches, and ImportRowResults are permanently retired from canonical schemas.
 */

var SHEET_NAMES = {
  STUDENTS: 'Students',
  ENROLLMENTS: 'Enrollments',
  PACKAGES: 'Packages',
  FEE_OBLIGATIONS: 'FeeObligations',
  PAYMENTS: 'Payments',
  CLASS_SESSIONS: 'ClassSessions',
  CLASS_SCHEDULES: 'ClassSchedules',
  MEETING_LINKS: 'MeetingLinks',
  STUDENT_NOTES: 'StudentNotes',
  AUDIT_LOG: 'AuditLog'
};

var SHEET_SCHEMAS = {};

// Table 1: Students (9 columns)
SHEET_SCHEMAS[SHEET_NAMES.STUDENTS] = [
  'student_id', 'student_name', 'parent_name', 'parent_phone', 'student_phone',
  'parent_email', 'student_email', 'subject', 'status'
];

// Preserved for legacy transition fallback; superseded by Packages
SHEET_SCHEMAS[SHEET_NAMES.ENROLLMENTS] = [
  'enrollment_id', 'student_id', 'enrollment_name', 'start_date', 'end_date',
  'enrollment_status', 'fee_plan_name', 'agreed_total_amount', 'currency',
  'billing_notes', 'created_at', 'updated_at', 'closed_at'
];

// Table 2: Packages (12 columns)
SHEET_SCHEMAS[SHEET_NAMES.PACKAGES] = [
  'package_id', 'student_id', 'student_name', 'plan_type',
  'currency', 'package_price', 'per_class', 'classes_purchased',
  'start_date', 'end_date', 'next_due_date', 'class_duration'
];

// Preserved for legacy transition fallback; superseded by Payment Details
SHEET_SCHEMAS[SHEET_NAMES.FEE_OBLIGATIONS] = [
  'fee_obligation_id', 'student_id', 'student_name', 'package_id',
  'obligation_description', 'amount_due', 'credit_applied', 'currency',
  'issue_date', 'due_date', 'obligation_status', 'notes',
  'created_at', 'updated_at', 'voided_at', 'void_reason'
];

// Table 3: Payment Details (6 columns)
SHEET_SCHEMAS[SHEET_NAMES.PAYMENTS] = [
  'student_id', 'student_name', 'payment_date', 'amount', 'currency', 'in_inr'
];

// Table 4: Class Sessions (9 columns)
SHEET_SCHEMAS[SHEET_NAMES.CLASS_SESSIONS] = [
  'class_session_id', 'student_id', 'class_date', 'scheduled_start', 'scheduled_end',
  'attendance_status', 'session_status', 'cancellation_reason', 'deduct_class'
];

// Table 5: Class Schedules (8 columns)
SHEET_SCHEMAS[SHEET_NAMES.CLASS_SCHEDULES] = [
  'schedule_id', 'student_id', 'day_of_week', 'start_time', 'end_time',
  'is_active', 'created_at', 'updated_at'
];

// Table 5: Meeting Links (4 columns)
SHEET_SCHEMAS[SHEET_NAMES.MEETING_LINKS] = [
  'student_id', 'student_name', 'meeting_link_1', 'meeting_link_2'
];

// Table 6: Student Notes (5 columns)
SHEET_SCHEMAS[SHEET_NAMES.STUDENT_NOTES] = [
  'student_id', 'student_name', 'note_date', 'note_text', 'follow_up_date'
];

// Operational Tab: AuditLog (Active - audit trail & transaction idempotency, 12 columns)
SHEET_SCHEMAS[SHEET_NAMES.AUDIT_LOG] = [
  'audit_id', 'occurred_at', 'actor_id', 'actor_email', 'entity_type',
  'entity_id', 'action', 'before_summary', 'after_summary', 'request_id',
  'outcome', 'error_code'
];

function getCanonicalSheetNames() {
  return Object.values(SHEET_NAMES);
}

function getExpectedHeaders(sheetName) {
  return SHEET_SCHEMAS[sheetName] || null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SHEET_NAMES: SHEET_NAMES,
    SHEET_SCHEMAS: SHEET_SCHEMAS,
    getCanonicalSheetNames: getCanonicalSheetNames,
    getExpectedHeaders: getExpectedHeaders
  };
}
