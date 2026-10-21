/**
 * Canonical Sheet Registry
 * Defines all 12 master spreadsheet tabs and their exact column headers.
 */

var SHEET_NAMES = {
  STUDENTS: 'Students',
  ENROLLMENTS: 'Enrollments',
  PACKAGES: 'Packages',
  FEE_OBLIGATIONS: 'FeeObligations',
  PAYMENTS: 'Payments',
  CLASS_SESSIONS: 'ClassSessions',
  MEETING_LINKS: 'MeetingLinks',
  STUDENT_NOTES: 'StudentNotes',
  AUDIT_LOG: 'AuditLog',
  IMPORT_BATCHES: 'ImportBatches',
  IMPORT_ROW_RESULTS: 'ImportRowResults',
  APP_CONFIG: 'AppConfig'
};

var SHEET_SCHEMAS = {};

SHEET_SCHEMAS[SHEET_NAMES.STUDENTS] = [
  'student_id', 'student_name', 'parent_name', 'parent_phone', 'student_phone',
  'parent_email', 'student_email', 'subject', 'status'
];

// Preserved for legacy transitions; deprecated in finalized schema
SHEET_SCHEMAS[SHEET_NAMES.ENROLLMENTS] = [
  'enrollment_id', 'student_id', 'enrollment_name', 'start_date', 'end_date',
  'enrollment_status', 'fee_plan_name', 'agreed_total_amount', 'currency',
  'billing_notes', 'created_at', 'updated_at', 'closed_at'
];

SHEET_SCHEMAS[SHEET_NAMES.PACKAGES] = [
  'package_id', 'student_id', 'student_name', 'plan_type',
  'currency', 'package_price', 'per_class', 'classes_purchased',
  'start_date', 'end_date', 'next_due_date'
];

SHEET_SCHEMAS[SHEET_NAMES.FEE_OBLIGATIONS] = [
  'fee_obligation_id', 'student_id', 'student_name', 'package_id',
  'obligation_description', 'amount_due', 'credit_applied', 'currency',
  'issue_date', 'due_date', 'obligation_status', 'notes',
  'created_at', 'updated_at', 'voided_at', 'void_reason'
];

SHEET_SCHEMAS[SHEET_NAMES.PAYMENTS] = [
  'payment_id', 'student_id', 'student_name', 'fee_obligation_id',
  'payment_date', 'amount', 'currency', 'payment_method',
  'transaction_reference', 'idempotency_key', 'payment_status', 'notes',
  'created_at', 'updated_at', 'voided_at', 'void_reason'
];

SHEET_SCHEMAS[SHEET_NAMES.CLASS_SESSIONS] = [
  'class_session_id', 'student_id', 'student_name', 'package_id',
  'meeting_link_id', 'class_title', 'scheduled_start', 'scheduled_end',
  'actual_start', 'actual_end', 'session_status', 'attendance_status',
  'class_credit_effect', 'cancellation_reason',
  'credit_restoration_for_session_id', 'notes',
  'created_at', 'updated_at', 'completed_at'
];

SHEET_SCHEMAS[SHEET_NAMES.MEETING_LINKS] = [
  'meeting_link_id', 'student_id', 'student_name', 'link_label',
  'meeting_url', 'provider', 'is_preferred', 'link_status',
  'created_at', 'updated_at'
];

SHEET_SCHEMAS[SHEET_NAMES.STUDENT_NOTES] = [
  'note_id', 'student_id', 'note_type', 'note_text', 'follow_up_date',
  'follow_up_status', 'created_at', 'updated_at', 'created_by'
];

SHEET_SCHEMAS[SHEET_NAMES.AUDIT_LOG] = [
  'audit_id', 'occurred_at', 'actor_id', 'actor_email', 'entity_type',
  'entity_id', 'action', 'before_summary', 'after_summary', 'request_id',
  'outcome', 'error_code'
];

SHEET_SCHEMAS[SHEET_NAMES.IMPORT_BATCHES] = [
  'import_batch_id', 'source_name', 'source_spreadsheet_id',
  'source_tab_name', 'started_at', 'completed_at', 'import_status',
  'total_rows', 'imported_rows', 'skipped_rows', 'failed_rows',
  'duplicate_rows', 'initiated_by', 'notes'
];

SHEET_SCHEMAS[SHEET_NAMES.IMPORT_ROW_RESULTS] = [
  'import_row_result_id', 'import_batch_id', 'source_row_reference',
  'target_entity_type', 'target_record_id', 'row_status',
  'source_fingerprint', 'message', 'processed_at'
];

SHEET_SCHEMAS[SHEET_NAMES.APP_CONFIG] = [
  'config_key', 'config_value', 'description', 'updated_at'
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
