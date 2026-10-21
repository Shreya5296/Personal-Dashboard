import { describe, it, expect, beforeEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';
// @ts-ignore
import StudentService from '../../02-backend/apps-script/students/StudentService.gs';
// @ts-ignore
import StudentRepository from '../../02-backend/apps-script/students/StudentRepository.gs';
// @ts-ignore
import PackageService from '../../02-backend/apps-script/packages/PackageService.gs';
// @ts-ignore
import PackageRepository from '../../02-backend/apps-script/packages/PackageRepository.gs';
// @ts-ignore
import FeeService from '../../02-backend/apps-script/fees/FeeService.gs';
// @ts-ignore
import FeeRepository from '../../02-backend/apps-script/fees/FeeRepository.gs';
// @ts-ignore
import PaymentService from '../../02-backend/apps-script/payments/PaymentService.gs';
// @ts-ignore
import PaymentRepository from '../../02-backend/apps-script/payments/PaymentRepository.gs';
// @ts-ignore
import RowReader from '../../02-backend/apps-script/sheets/RowReader.gs';
// @ts-ignore
import HeaderMapper from '../../02-backend/apps-script/sheets/HeaderMapper.gs';

import { calculateStudentCredits } from '../../src/domains/fees/creditCalculator';
import { FeeObligation } from '../../src/domains/fees/feeTypes';
import { Payment } from '../../src/domains/payments/paymentTypes';

describe('Clean Single-Truth Requirements & Ledger Reconciliation Regression Tests', () => {
  let spreadsheet: MockSpreadsheet;
  const actor = { actorId: 'usr_admin', email: 'admin@example.com', requestId: 'req_clean_test' };

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
  });

  it('proves single student_name is used, and obsolete CRM fields (first_name, last_name, preferred_name, dob) are eliminated', () => {
    const res = StudentService.Students_create(spreadsheet, {
      student_name: 'Ananya Sharma',
      parent_name: 'Priya Sharma',
      parent_phone: '+919876543210',
      student_phone: '+919876543211',
      parent_email: 'priya.sharma@example.com',
      student_email: 'ananya.sharma@example.com',
      subject: 'Physics',
      status: 'ACTIVE',
      notes: 'Weekly evening classes'
    }, actor);

    expect(res.success).toBe(true);
    const stuId = res.data.student_id;

    // Check raw spreadsheet row
    const stuSheet = spreadsheet.getSheetByName('Students');
    const records = RowReader.readAllRecords(stuSheet, HeaderMapper);
    expect(records.length).toBe(1);
    const raw = records[0];

    // Single student_name column exists and matches
    expect(raw.student_name).toBe('Ananya Sharma');
    expect(raw.student_id).toBe(stuId);
    expect(raw.subject).toBe('Physics');
    expect(raw.status).toBe('ACTIVE');

    // Obsolete fields do NOT exist in raw record
    expect(raw.first_name).toBeUndefined();
    expect(raw.last_name).toBeUndefined();
    expect(raw.preferred_name).toBeUndefined();
    expect(raw.date_of_birth).toBeUndefined();
    expect(raw.dob).toBeUndefined();
    expect(raw.city).toBeUndefined();
    expect(raw.internal_summary).toBeUndefined();
  });

  it('proves parent_email and student_email are strictly separate and never overwrite each other', () => {
    const res = StudentService.Students_create(spreadsheet, {
      student_name: 'Vikram Mehta',
      parent_name: 'Rajesh Mehta',
      parent_phone: '+919811122233',
      parent_email: 'rajesh.parent@example.com',
      student_email: 'vikram.student@example.com',
      subject: 'Mathematics'
    }, actor);

    expect(res.success).toBe(true);
    const stuId = res.data.student_id;

    // Read back and verify strict independence
    const stu = StudentRepository.Students_getById(spreadsheet, stuId);
    expect(stu.parent_email).toBe('rajesh.parent@example.com');
    expect(stu.student_email).toBe('vikram.student@example.com');
    expect(stu.parent_email).not.toBe(stu.student_email);

    // Update student_email without affecting parent_email
    const updRes = StudentService.Students_update(spreadsheet, stuId, {
      student_email: 'vikram.newschool@example.com'
    }, actor);
    expect(updRes.success).toBe(true);

    const updatedStu = StudentRepository.Students_getById(spreadsheet, stuId);
    expect(updatedStu.parent_email).toBe('rajesh.parent@example.com');
    expect(updatedStu.student_email).toBe('vikram.newschool@example.com');
  });

  it('proves subject is stored in dedicated subject column, not embedded in notes', () => {
    const res = StudentService.Students_create(spreadsheet, {
      student_name: 'Kavya Raman',
      parent_name: 'Ramanathan',
      parent_phone: '+919833344455',
      subject: 'Computer Science',
      notes: 'Preparing for board exams'
    }, actor);

    expect(res.success).toBe(true);
    const stuId = res.data.student_id;

    const stu = StudentRepository.Students_getById(spreadsheet, stuId);
    expect(stu.subject).toBe('Computer Science');
    // In finalized 9-column Students schema, notes is not a physical column
    expect(stu.notes).toBeUndefined();
  });

  it('proves overpayment on Fee A carries forward via credit_applied on Fee B with zero double counting', () => {
    // 1. Create Student
    const stuRes = StudentService.Students_create(spreadsheet, {
      student_name: 'Rohan Verma',
      parent_name: 'Anita Verma',
      parent_phone: '+919777788888',
      subject: 'Chemistry'
    }, actor);
    const stuId = stuRes.data.student_id;

    // 2. Issue Fee A: ₹5,000 for Month 1
    const feeARes = FeeService.FeeObligations_create(spreadsheet, {
      student_id: stuId,
      obligation_description: 'Month 1 Tuition',
      amount_due: 5000,
      credit_applied: 0,
      due_date: '2026-11-05'
    }, actor);
    expect(feeARes.success).toBe(true);
    const feeAId = feeARes.data.fee_obligation_id;

    // 3. Parent overpays: ₹6,000 cash received
    const pay1Res = PaymentService.Payments_record(spreadsheet, {
      student_id: stuId,
      fee_obligation_id: feeAId,
      amount: 6000,
      payment_method: 'UPI',
      idempotency_key: 'idem_pay_overpay_01',
      allow_overpayment: true
    }, actor);
    expect(pay1Res.success).toBe(true);

    // Verify Fee A balance state: paid = 5000, outstanding = 0, status = PAID
    const feeAEnriched = FeeService.FeeObligations_enrichWithBalances(
      spreadsheet,
      FeeRepository.FeeObligations_getById(spreadsheet, feeAId)
    );
    expect(feeAEnriched.paid_amount).toBe(5000);
    expect(feeAEnriched.raw_paid_amount).toBe(6000);
    expect(feeAEnriched.outstanding_amount).toBe(0);
    expect(feeAEnriched.obligation_status).toBe('PAID');

    // Verify student available unapplied credit = ₹1,000
    const feeList1 = [FeeRepository.FeeObligations_getById(spreadsheet, feeAId)] as FeeObligation[];
    const payList1 = [PaymentRepository.Payments_getById(spreadsheet, pay1Res.data.payment_id)] as Payment[];
    const credits1 = calculateStudentCredits(feeList1, payList1, stuId);
    expect(credits1[0].unappliedCredit).toBe(1000);
    expect(credits1[0].outstandingBalance).toBe(0);
    expect(credits1[0].totalPaid).toBe(6000);
    expect(credits1[0].totalBilled).toBe(5000);

    // 4. Issue Fee B: ₹5,000 for Month 2 with credit_applied = 1000 absorbed
    const feeBRes = FeeService.FeeObligations_create(spreadsheet, {
      student_id: stuId,
      obligation_description: 'Month 2 Tuition',
      amount_due: 5000,
      credit_applied: 1000,
      due_date: '2026-12-05'
    }, actor);
    expect(feeBRes.success).toBe(true);
    const feeBId = feeBRes.data.fee_obligation_id;

    // Net payable for Fee B should be 5000 - 1000 = 4000
    const feeBEnrichedBeforePay = FeeService.FeeObligations_enrichWithBalances(
      spreadsheet,
      FeeRepository.FeeObligations_getById(spreadsheet, feeBId)
    );
    expect(feeBEnrichedBeforePay.net_payable).toBe(4000);
    expect(feeBEnrichedBeforePay.outstanding_amount).toBe(4000);

    // 5. Parent pays net due of ₹4,000
    const pay2Res = PaymentService.Payments_record(spreadsheet, {
      student_id: stuId,
      fee_obligation_id: feeBId,
      amount: 4000,
      payment_method: 'UPI',
      idempotency_key: 'idem_pay_feeB_02'
    }, actor);
    expect(pay2Res.success).toBe(true);

    // Fee B is now fully settled
    const feeBEnrichedAfterPay = FeeService.FeeObligations_enrichWithBalances(
      spreadsheet,
      FeeRepository.FeeObligations_getById(spreadsheet, feeBId)
    );
    expect(feeBEnrichedAfterPay.paid_amount).toBe(4000);
    expect(feeBEnrichedAfterPay.outstanding_amount).toBe(0);
    expect(feeBEnrichedAfterPay.obligation_status).toBe('PAID');

    // 6. Final Ledger Verification across all fees & payments
    const allFees = [
      FeeRepository.FeeObligations_getById(spreadsheet, feeAId),
      FeeRepository.FeeObligations_getById(spreadsheet, feeBId)
    ] as FeeObligation[];
    const allPayments = [
      PaymentRepository.Payments_getById(spreadsheet, pay1Res.data.payment_id),
      PaymentRepository.Payments_getById(spreadsheet, pay2Res.data.payment_id)
    ] as Payment[];

    const finalCredits = calculateStudentCredits(allFees, allPayments, stuId);
    expect(finalCredits[0].totalPaid).toBe(10000); // 6000 + 4000 = 10,000 matches bank statement exactly
    expect(finalCredits[0].totalBilled).toBe(10000); // 5000 + 5000 = 10,000 matches tuition billed
    expect(finalCredits[0].outstandingBalance).toBe(0);
    expect(finalCredits[0].unappliedCredit).toBe(0); // All credit absorbed
  });
});
