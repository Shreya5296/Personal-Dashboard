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

    const legacyNotes = spreadsheet.insertSheet('StudentNotes');
    legacyNotes.rows = [['note_id', 'student_id', 'note_type', 'note_text', 'follow_up_date', 'follow_up_status', 'created_at', 'updated_at', 'created_by']];

    // Operational sheets (AuditLog is the sole required operational sheet)
    const auditSheet = spreadsheet.insertSheet('AuditLog');
    auditSheet.rows = [['audit_id', 'occurred_at', 'actor_id', 'actor_email', 'entity_type', 'entity_id', 'action', 'before_summary', 'after_summary', 'request_id', 'outcome', 'error_code']];
  });

  it('physically deletes obsolete columns, removes legacy tabs, and aligns exact target headers for all six tables', () => {
    const res = runApprovedSchemaMigration(spreadsheet);
    expect(res.success).toBe(true);
    expect(res.verificationErrors.length).toBe(0);

    // 1. Students sheet verification (9 columns)
    const stuSheet = spreadsheet.getSheetByName('Students')!;
    expect(stuSheet).toBeDefined();
    expect(stuSheet.getMaxColumns()).toBe(9);
    expect(stuSheet.rows[0]).toEqual(TARGET_SCHEMAS['Students']);

    // 2. Packages sheet verification (12 columns including class_duration)
    const pkgSheet = spreadsheet.getSheetByName('Packages')!;
    expect(pkgSheet.getMaxColumns()).toBe(12);
    expect(pkgSheet.rows[0]).toEqual(TARGET_SCHEMAS['Packages']);

    // 3. Payment Details / Payments sheet verification (6 columns)
    const paySheet = spreadsheet.getSheetByName('Payments')!;
    expect(paySheet.getMaxColumns()).toBe(6);
    expect(paySheet.rows[0]).toEqual(TARGET_SCHEMAS['Payments']);

    // 4. ClassSessions sheet verification (9 columns)
    const clsSheet = spreadsheet.getSheetByName('ClassSessions')!;
    expect(clsSheet.getMaxColumns()).toBe(9);
    expect(clsSheet.rows[0]).toEqual(TARGET_SCHEMAS['ClassSessions']);

    // 5. MeetingLinks sheet verification (4 columns)
    const mlSheet = spreadsheet.getSheetByName('MeetingLinks')!;
    expect(mlSheet.getMaxColumns()).toBe(4);
    expect(mlSheet.rows[0]).toEqual(TARGET_SCHEMAS['MeetingLinks']);

    // 6. StudentNotes sheet verification (5 columns)
    const noteSheet = spreadsheet.getSheetByName('StudentNotes')!;
    expect(noteSheet.getMaxColumns()).toBe(5);
    expect(noteSheet.rows[0]).toEqual(TARGET_SCHEMAS['StudentNotes']);

    // Verify NO forbidden obsolete columns exist across any migrated sheets
    for (const tabName of ['Students', 'Packages', 'Payments', 'ClassSessions', 'MeetingLinks', 'StudentNotes']) {
      const sheet = spreadsheet.getSheetByName(tabName)!;
      const headers = sheet.rows[0];
      for (const forbidden of FORBIDDEN_OBSOLETE_COLUMNS) {
        expect(headers).not.toContain(forbidden);
      }
    }

    // 7. Legacy tabs verification: Enrollments and FeeObligations removed
    expect(spreadsheet.getSheetByName('Enrollments')).toBeNull();
    expect(spreadsheet.getSheetByName('FeeObligations')).toBeNull();
    expect(res.enrollmentsTab).toBe('PHYSICALLY_DELETED_EMPTY');
    expect(res.feeObligationsTab).toBe('PHYSICALLY_DELETED_EMPTY');

    // 8. Operational sheets verification (AuditLog preserved)
    expect(spreadsheet.getSheetByName('AuditLog')).not.toBeNull();

    // 9. Audit log entry recorded
    const auditSheet = spreadsheet.getSheetByName('AuditLog')!;
    expect(auditSheet.rows.length).toBe(2);
    expect(auditSheet.rows[1][6]).toBe('MIGRATE_PHYSICAL_SCHEMA');
  });
});
