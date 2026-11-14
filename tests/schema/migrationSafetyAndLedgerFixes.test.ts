import { describe, it, expect, beforeEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
const { runApprovedSchemaMigration, TARGET_SCHEMAS, FORBIDDEN_OBSOLETE_COLUMNS } = require('../../02-backend/apps-script/setup/SchemaMigration.gs');
// @ts-ignore
const PaymentService = require('../../02-backend/apps-script/payments/PaymentService.gs');
// @ts-ignore
const PaymentRepository = require('../../02-backend/apps-script/payments/PaymentRepository.gs');
// @ts-ignore
const NoteRepository = require('../../02-backend/apps-script/notes/NoteRepository.gs');
// @ts-ignore
const ClassService = require('../../02-backend/apps-script/classes/ClassService.gs');
// @ts-ignore
const PackageService = require('../../02-backend/apps-script/packages/PackageService.gs');

describe('Audit Findings Fixes: Migration Safety, Payment Ops, Notes & Class Deductions', () => {
  let spreadsheet: MockSpreadsheet;
  const actor = { actorId: 'ACT_TEST', email: 'owner@test.local', requestId: 'REQ_AUDIT_FIX' };

  function setupFullSpreadsheet(): MockSpreadsheet {
    const ss = new MockSpreadsheet();
    ss.insertSheet('Students').rows = [
      ['student_id', 'student_name', 'parent_name', 'parent_phone', 'student_phone', 'parent_email', 'student_email', 'subject', 'status']
    ];
    ss.insertSheet('Packages').rows = [
      ['package_id', 'student_id', 'student_name', 'plan_type', 'currency', 'package_price', 'per_class', 'classes_purchased', 'start_date', 'end_date', 'next_due_date']
    ];
    ss.insertSheet('Payments').rows = [
      ['student_id', 'student_name', 'payment_date', 'amount', 'currency', 'in_inr']
    ];
    ss.insertSheet('ClassSessions').rows = [
      ['class_session_id', 'student_id', 'class_date', 'scheduled_start', 'scheduled_end', 'attendance_status', 'session_status', 'cancellation_reason', 'deduct_class']
    ];
    ss.insertSheet('MeetingLinks').rows = [
      ['student_id', 'student_name', 'meeting_link_1', 'meeting_link_2']
    ];
    ss.insertSheet('StudentNotes').rows = [
      ['student_id', 'student_name', 'note_date', 'note_text', 'follow_up_date']
    ];
    return ss;
  }

  beforeEach(() => {
    spreadsheet = setupFullSpreadsheet();
  });

  describe('1. Migration Safety & Archival', () => {
    it('archives legacy non-empty Payments before modifying active Payments tab and remaps rows', () => {
      const ss = new MockSpreadsheet();

      // Setup legacy Payments with 15 columns and 2 data rows
      const legacyPay = ss.insertSheet('Payments');
      legacyPay.rows = [
        ['payment_id', 'student_id', 'fee_obligation_id', 'payment_date', 'amount', 'currency', 'payment_method', 'transaction_reference', 'idempotency_key', 'payment_status', 'notes', 'created_at', 'updated_at', 'voided_at', 'void_reason'],
        ['pay_001', 'stu_100', 'fee_1', '2026-03-01', 5000, 'INR', 'UPI', 'UPI_REF_1', 'idem_1', 'RECORDED', 'First payment', '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z', '', ''],
        ['pay_002', 'stu_200', 'fee_2', '2026-03-02', 3000, 'USD', 'CARD', 'CARD_REF_2', 'idem_2', 'RECORDED', 'Second payment', '2026-03-02T00:00:00Z', '2026-03-02T00:00:00Z', '', '']
      ];

      const res = runApprovedSchemaMigration(ss);
      expect(res.success).toBe(true);
      expect(res.paymentsArchiveTab).toContain('Payments_Archive');

      // Verify archive tab preserves legacy 15 columns losslessly
      const archiveSheet = ss.getSheetByName('Payments_Archive')!;
      expect(archiveSheet).toBeDefined();
      expect(archiveSheet.rows.length).toBe(3);
      expect(archiveSheet.rows[1][0]).toBe('pay_001');
      expect(archiveSheet.rows[1][6]).toBe('UPI');

      // Verify active Payments tab was cleanly remapped to 6 target columns
      const activePay = ss.getSheetByName('Payments')!;
      expect(activePay.getMaxColumns()).toBe(6);
      expect(activePay.rows[0]).toEqual(TARGET_SCHEMAS['Payments']);
      expect(activePay.rows[1][0]).toBe('stu_100'); // student_id correctly remapped
      expect(activePay.rows[1][3]).toBe(5000);     // amount correctly remapped
      expect(activePay.rows[2][0]).toBe('stu_200');
      expect(activePay.rows[2][3]).toBe(3000);
    });

    it('never overwrites an existing archive, creating a timestamped archive instead', () => {
      const ss = new MockSpreadsheet();

      // Pre-existing archive sheet
      const existingArch = ss.insertSheet('FeeObligations_Archive');
      existingArch.rows = [['old_col_1'], ['old_data_1']];

      // Legacy fee obligations with data
      const feeSheet = ss.insertSheet('FeeObligations');
      feeSheet.rows = [['fee_id', 'student_id'], ['fee_999', 'stu_999']];

      const res = runApprovedSchemaMigration(ss);
      expect(res.success).toBe(true);
      expect(res.feeObligationsTab).toMatch(/^ARCHIVED_TO_FeeObligations_Archive_\d+/);

      // Verify original archive was not overwritten
      expect(existingArch.rows[1][0]).toBe('old_data_1');
    });

    it('executes safely without requiring AuditLog or any operational tabs', () => {
      const ss = new MockSpreadsheet();
      const legacyPay = ss.insertSheet('Payments');
      legacyPay.rows = [['payment_id', 'student_id', 'amount'], ['pay_1', 'stu_1', 1000]];

      const res = runApprovedSchemaMigration(ss);
      expect(res.success).toBe(true);
      expect(ss.getSheetByName('AuditLog')).toBeNull();
    });

    it('is completely idempotent when rerun on an already-migrated sheet', () => {
      const run1 = runApprovedSchemaMigration(spreadsheet);
      expect(run1.success).toBe(true);

      const run2 = runApprovedSchemaMigration(spreadsheet);
      expect(run2.success).toBe(true);
      expect(run2.verificationErrors.length).toBe(0);

      // Check all 6 schemas match target
      for (const tab in TARGET_SCHEMAS) {
        const sh = spreadsheet.getSheetByName(tab)!;
        expect(sh.rows[0]).toEqual(TARGET_SCHEMAS[tab]);
      }
    });
  });

  describe('2. Payment Operations & Safety', () => {
    it('voiding a payment never deletes row 1 (the header row)', () => {
      const paySheet = spreadsheet.getSheetByName('Payments')!;
      paySheet.rows = [
        ['student_id', 'student_name', 'payment_date', 'amount', 'currency', 'in_inr'],
        ['stu_safe_01', 'Test Student', '2026-03-10', 4000, 'INR', 4000]
      ];

      const res = PaymentService.Payments_void(spreadsheet, {
        student_id: 'stu_safe_01',
        amount: 4000,
        payment_date: '2026-03-10',
        void_reason: 'Testing header preservation'
      }, actor);

      expect(res.success).toBe(true);
      // Header MUST still be present in row 0
      expect(paySheet.rows[0]).toEqual(TARGET_SCHEMAS['Payments']);
      expect(paySheet.rows.length).toBe(1); // 1 header row left, data row deleted
    });

    it('voiding rejects ambiguous request if multiple identical payments exist without unique identifier', () => {
      const paySheet = spreadsheet.getSheetByName('Payments')!;
      paySheet.rows = [
        ['student_id', 'student_name', 'payment_date', 'amount', 'currency', 'in_inr'],
        ['stu_dup_01', 'Dup Student', '2026-03-10', 2500, 'INR', 2500],
        ['stu_dup_01', 'Dup Student', '2026-03-10', 2500, 'INR', 2500] // Identical duplicate!
      ];

      const res = PaymentService.Payments_void(spreadsheet, {
        student_id: 'stu_dup_01',
        amount: 2500,
        payment_date: '2026-03-10',
        void_reason: 'Void ambiguous'
      }, actor);

      expect(res.success).toBe(false);
      expect(res.code).toBe('AMBIGUOUS_RECORD');
      // Both rows preserved safely; no guess was made
      expect(paySheet.rows.length).toBe(3);
    });

    it('payment update safely rejects ambiguous target and correctly updates an unambiguous record', () => {
      const paySheet = spreadsheet.getSheetByName('Payments')!;
      paySheet.rows = [
        ['student_id', 'student_name', 'payment_date', 'amount', 'currency', 'in_inr'],
        ['stu_up_01', 'Student One', '2026-03-10', 1000, 'INR', 1000],
        ['stu_up_02', 'Student Two', '2026-03-11', 2000, 'INR', 2000]
      ];

      // Unambiguous update targets student 2
      const updated = PaymentRepository.Payments_update(spreadsheet, {
        student_id: 'stu_up_02',
        payment_date: '2026-03-11',
        amount: 2000
      }, { amount: 2500, in_inr: 2500 });

      expect(updated.amount).toBe(2500);
      expect(paySheet.rows[2][3]).toBe(2500);
      // Student 1 payment was NOT modified
      expect(paySheet.rows[1][3]).toBe(1000);

      // Now add duplicate row for student 1 and verify ambiguous update rejection
      paySheet.rows.push(['stu_up_01', 'Student One', '2026-03-10', 1000, 'INR', 1000]);
      expect(() => {
        PaymentRepository.Payments_update(spreadsheet, {
          student_id: 'stu_up_01',
          payment_date: '2026-03-10',
          amount: 1000
        }, { amount: 1200 });
      }).toThrow(/Ambiguous payment update rejected/);
    });
  });

  describe('3. Student Notes Updates & Multiple Notes Support', () => {
    it('supports multiple notes per student and rejects ambiguous updates safely', () => {
      const noteSheet = spreadsheet.getSheetByName('StudentNotes')!;
      noteSheet.rows = [
        ['student_id', 'student_name', 'note_date', 'note_text', 'follow_up_date'],
        ['stu_note_01', 'Alice', '2026-03-01', 'First lesson went well', '2026-03-10'],
        ['stu_note_01', 'Alice', '2026-03-08', 'Second lesson homework assigned', '2026-03-15']
      ];

      // Multiple notes queried for student
      const notes = NoteRepository.Notes_getByStudentId(spreadsheet, 'stu_note_01');
      expect(notes.length).toBe(2);

      // Updating by student_id alone when multiple notes exist is rejected as ambiguous
      expect(() => {
        NoteRepository.Notes_update(spreadsheet, 'stu_note_01', { note_text: 'Overwritten text' });
      }).toThrow(/Ambiguous note update rejected/);

      // None of the notes were corrupted
      expect(noteSheet.rows[1][3]).toBe('First lesson went well');
      expect(noteSheet.rows[2][3]).toBe('Second lesson homework assigned');

      // Unambiguous update targeting specific note text succeeds
      const singleUpdate = NoteRepository.Notes_update(spreadsheet, {
        student_id: 'stu_note_01',
        note_date: '2026-03-01',
        note_text: 'First lesson went well'
      }, { note_text: 'First lesson went exceptionally well' });

      expect(singleUpdate.note_text).toBe('First lesson went exceptionally well');
      expect(noteSheet.rows[1][3]).toBe('First lesson went exceptionally well');
      expect(noteSheet.rows[2][3]).toBe('Second lesson homework assigned');
    });
  });

  describe('4. Class-Credit Behavior & FIFO Allocation', () => {
    it('verifies Attendance deduction rules: Present deducts, Absent asks owner, Cancelled does not deduct by default', () => {
      // Schedule 3 classes
      const c1 = ClassService.Classes_schedule(spreadsheet, {
        student_id: 'stu_cls_01',
        scheduled_start: '2026-03-10T10:00:00Z',
        scheduled_end: '2026-03-10T11:00:00Z'
      }, actor);

      const c2 = ClassService.Classes_schedule(spreadsheet, {
        student_id: 'stu_cls_01',
        scheduled_start: '2026-03-11T10:00:00Z',
        scheduled_end: '2026-03-11T11:00:00Z'
      }, actor);

      const c3 = ClassService.Classes_schedule(spreadsheet, {
        student_id: 'stu_cls_01',
        scheduled_start: '2026-03-12T10:00:00Z',
        scheduled_end: '2026-03-12T11:00:00Z'
      }, actor);

      // 1. Present automatically deducts (deduct_class = true)
      const res1 = ClassService.Classes_complete(spreadsheet, {
        class_session_id: c1.data.class_session_id,
        attendance_status: 'PRESENT'
      }, actor);
      expect(res1.data.deduct_class).toBe(true);
      expect(res1.data.class_credit_effect).toBe('CONSUME');

      // 2. Absent without explicit deduct_class defaults to false (asks owner)
      const res2 = ClassService.Classes_complete(spreadsheet, {
        class_session_id: c2.data.class_session_id,
        attendance_status: 'ABSENT'
      }, actor);
      expect(res2.data.deduct_class).toBe(false);
      expect(res2.data.class_credit_effect).toBe('NO_CONSUME');

      // 3. Cancelled does not deduct by default with advance notice or owner decision
      const res3 = ClassService.Classes_cancel(spreadsheet, {
        class_session_id: c3.data.class_session_id,
        cancellation_time: '2026-03-12T05:00:00Z',
        cancellation_reason: 'Student unwell'
      }, actor);
      expect(res3.data.deduct_class).toBe(false);
      expect(res3.data.class_credit_effect).toBe('NO_CONSUME');

      // 4. Repeated completion on c1 cannot double-deduct
      const res1Repeat = ClassService.Classes_complete(spreadsheet, {
        class_session_id: c1.data.class_session_id,
        attendance_status: 'PRESENT'
      }, actor);
      expect(res1Repeat.data.deduct_class).toBe(true);

      const classRows = spreadsheet.getSheetByName('ClassSessions')!.rows;
      // Exactly 3 sessions remain; no duplicate rows created
      expect(classRows.length).toBe(4); // 1 header + 3 sessions
    });

    it('derives package balance via FIFO and handles zero/blank purchased classes conservatively', () => {
      const stuSheet = spreadsheet.getSheetByName('Students')!;
      stuSheet.rows.push(['stu_pkg_01', 'Bob', '', '', '', '', '', 'Math', 'ACTIVE']);

      const pkgSheet = spreadsheet.getSheetByName('Packages')!;
      // Package 1: 5 classes, starts Jan 1
      pkgSheet.rows.push(['pkg_01', 'stu_pkg_01', 'Bob', 'PACKAGE', 'INR', 5000, 1000, 5, '2026-01-01', '2026-02-01', '']);
      // Package 2: 5 classes, starts Feb 1
      pkgSheet.rows.push(['pkg_02', 'stu_pkg_01', 'Bob', 'PACKAGE', 'INR', 5000, 1000, 5, '2026-02-01', '2026-03-01', '']);
      // Package 3: 0 classes (or blank)
      pkgSheet.rows.push(['pkg_03', 'stu_pkg_01', 'Bob', 'PACKAGE', 'INR', 0, 0, 0, '2026-03-01', '2026-04-01', '']);

      const clsSheet = spreadsheet.getSheetByName('ClassSessions')!;
      // 7 attended sessions for Bob
      for (let i = 1; i <= 7; i++) {
        clsSheet.rows.push([
          `sess_${i}`, 'stu_pkg_01', `2026-01-0${i}`, `2026-01-0${i}T10:00:00Z`, `2026-01-0${i}T11:00:00Z`, 'ATTENDED', 'COMPLETED', '', true
        ]);
      }

      // Query Package 1 (FIFO: first 5 classes consumed -> exhausted)
      const b1 = PackageService.Packages_enrichWithBalance(spreadsheet, {
        package_id: 'pkg_01',
        student_id: 'stu_pkg_01',
        classes_purchased: 5,
        start_date: '2026-01-01'
      });
      expect(b1.consumed_classes).toBe(5);
      expect(b1.remaining_classes).toBe(0);
      expect(b1.is_exhausted).toBe(true);

      // Query Package 2 (FIFO: remaining 2 classes consumed -> 3 remaining)
      const b2 = PackageService.Packages_enrichWithBalance(spreadsheet, {
        package_id: 'pkg_02',
        student_id: 'stu_pkg_01',
        classes_purchased: 5,
        start_date: '2026-02-01'
      });
      expect(b2.consumed_classes).toBe(2);
      expect(b2.remaining_classes).toBe(3);
      expect(b2.is_exhausted).toBe(false);

      // Query Package 3 (0 classes purchased -> treated conservatively as exhausted)
      const b3 = PackageService.Packages_enrichWithBalance(spreadsheet, {
        package_id: 'pkg_03',
        student_id: 'stu_pkg_01',
        classes_purchased: 0,
        start_date: '2026-03-01'
      });
      expect(b3.remaining_classes).toBe(0);
      expect(b3.is_exhausted).toBe(true);
    });
  });
});
