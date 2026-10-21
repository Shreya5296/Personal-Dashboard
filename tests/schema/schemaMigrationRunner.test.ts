import { describe, it, expect, beforeEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
const { runApprovedSchemaMigration, TARGET_SCHEMAS, FORBIDDEN_OBSOLETE_COLUMNS } = require('../../02-backend/apps-script/setup/SchemaMigration.gs');

describe('Physical Schema Migration Runner (SchemaMigration.gs)', () => {
  let spreadsheet: MockSpreadsheet;

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();

    // 1. Setup legacy 19-column Students sheet
    const legacyStudents = spreadsheet.insertSheet('Students');
    legacyStudents.rows = [
      ['student_id', 'first_name', 'last_name', 'preferred_name', 'date_of_birth',
       'parent_guardian_name', 'parent_guardian_relationship', 'primary_phone',
       'secondary_phone', 'parent_email', 'city', 'student_status',
       'first_enrollment_date', 'last_active_date', 'internal_summary',
       'created_at', 'updated_at', 'archived_at', 'source_reference']
    ];

    // 2. Setup legacy 13-column Enrollments sheet (0 data rows)
    const legacyEnrollments = spreadsheet.insertSheet('Enrollments');
    legacyEnrollments.rows = [
      ['enrollment_id', 'student_id', 'enrollment_name', 'start_date', 'end_date',
       'enrollment_status', 'fee_plan_name', 'agreed_total_amount', 'currency',
       'billing_notes', 'created_at', 'updated_at', 'closed_at']
    ];

    // 3. Setup other legacy sheets with extra columns
    const legacyPackages = spreadsheet.insertSheet('Packages');
    legacyPackages.rows = [['package_id', 'student_id', 'enrollment_id', 'package_name', 'purchased_classes', 'package_price', 'currency', 'purchase_date', 'start_date', 'expiry_date', 'package_status', 'notes', 'created_at', 'updated_at', 'closed_at']];

    const legacyFees = spreadsheet.insertSheet('FeeObligations');
    legacyFees.rows = [['fee_obligation_id', 'student_id', 'enrollment_id', 'package_id', 'obligation_description', 'amount_due', 'currency', 'issue_date', 'due_date', 'obligation_status', 'notes', 'created_at', 'updated_at', 'voided_at', 'void_reason']];

    const legacyPayments = spreadsheet.insertSheet('Payments');
    legacyPayments.rows = [['payment_id', 'student_id', 'fee_obligation_id', 'payment_date', 'amount', 'currency', 'payment_method', 'transaction_reference', 'idempotency_key', 'payment_status', 'notes', 'created_at', 'updated_at', 'voided_at', 'void_reason']];

    const legacyClasses = spreadsheet.insertSheet('ClassSessions');
    legacyClasses.rows = [['class_session_id', 'student_id', 'enrollment_id', 'package_id', 'meeting_link_id', 'class_title', 'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end', 'session_status', 'attendance_status', 'class_credit_effect', 'cancellation_reason', 'credit_restoration_for_session_id', 'notes', 'created_at', 'updated_at', 'completed_at']];

    const legacyMeetingLinks = spreadsheet.insertSheet('MeetingLinks');
    legacyMeetingLinks.rows = [['meeting_link_id', 'student_id', 'provider', 'link_label', 'meeting_url', 'is_preferred', 'link_status', 'valid_from', 'valid_until', 'notes', 'created_at', 'updated_at', 'deactivated_at']];

    // Operational sheets
    const auditSheet = spreadsheet.insertSheet('AuditLog');
    auditSheet.rows = [['audit_id', 'occurred_at', 'actor_id', 'actor_email', 'entity_type', 'entity_id', 'action', 'before_summary', 'after_summary', 'request_id', 'outcome', 'error_code']];
    spreadsheet.insertSheet('AppConfig').rows = [['config_key', 'config_value', 'description', 'updated_at']];
    spreadsheet.insertSheet('ImportBatches').rows = [['import_batch_id', 'source_name', 'source_spreadsheet_id', 'source_tab_name', 'started_at', 'completed_at', 'import_status', 'total_rows', 'imported_rows', 'skipped_rows', 'failed_rows', 'duplicate_rows', 'initiated_by', 'notes']];
    spreadsheet.insertSheet('ImportRowResults').rows = [['import_row_result_id', 'import_batch_id', 'source_row_reference', 'target_entity_type', 'target_record_id', 'row_status', 'source_fingerprint', 'message', 'processed_at']];
    spreadsheet.insertSheet('StudentNotes').rows = [['note_id', 'student_id', 'note_type', 'note_text', 'follow_up_date', 'follow_up_status', 'created_at', 'updated_at', 'created_by']];
  });

  it('physically deletes obsolete columns, removes Enrollments, and aligns exact target headers', () => {
    const res = runApprovedSchemaMigration(spreadsheet);
    expect(res.success).toBe(true);
    expect(res.verificationErrors.length).toBe(0);

    // 1. Students sheet verification
    const stuSheet = spreadsheet.getSheetByName('Students')!;
    expect(stuSheet).toBeDefined();
    expect(stuSheet.getMaxColumns()).toBe(9); // Physically 9 columns, not 19 or 13
    const stuHeaders = stuSheet.rows[0];
    expect(stuHeaders).toEqual(TARGET_SCHEMAS['Students']);

    // Assert NO forbidden obsolete columns exist
    for (const forbidden of FORBIDDEN_OBSOLETE_COLUMNS) {
      expect(stuHeaders).not.toContain(forbidden);
    }

    // 2. Enrollments tab verification
    expect(spreadsheet.getSheetByName('Enrollments')).toBeNull(); // Physically deleted
    expect(res.enrollmentsTab).toBe('PHYSICALLY_DELETED_EMPTY');

    // 3. Packages sheet verification
    const pkgSheet = spreadsheet.getSheetByName('Packages')!;
    expect(pkgSheet.getMaxColumns()).toBe(11); // Physically 11 columns, not 16
    expect(pkgSheet.rows[0]).toEqual(TARGET_SCHEMAS['Packages']);
    expect(pkgSheet.rows[0]).not.toContain('in_INR');
    expect(pkgSheet.rows[0]).not.toContain('enrollment_id');

    // 4. FeeObligations sheet verification
    const feeSheet = spreadsheet.getSheetByName('FeeObligations')!;
    expect(feeSheet.getMaxColumns()).toBe(16);
    expect(feeSheet.rows[0]).toEqual(TARGET_SCHEMAS['FeeObligations']);
    expect(feeSheet.rows[0]).toContain('credit_applied');
    expect(feeSheet.rows[0]).not.toContain('enrollment_id');

    // 5. Operational sheets verification
    expect(spreadsheet.getSheetByName('AuditLog')).not.toBeNull();
    expect(spreadsheet.getSheetByName('AppConfig')).not.toBeNull();
    expect(spreadsheet.getSheetByName('ImportBatches')).not.toBeNull();
    expect(spreadsheet.getSheetByName('ImportRowResults')).not.toBeNull();
    expect(spreadsheet.getSheetByName('StudentNotes')).not.toBeNull();

    // 6. Audit log entry recorded
    const auditSheet = spreadsheet.getSheetByName('AuditLog')!;
    expect(auditSheet.rows.length).toBe(2); // Header + 1 migration log entry
    expect(auditSheet.rows[1][6]).toBe('MIGRATE_PHYSICAL_SCHEMA');
  });
});
