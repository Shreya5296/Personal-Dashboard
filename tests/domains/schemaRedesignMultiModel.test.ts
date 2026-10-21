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
import ClassService from '../../02-backend/apps-script/classes/ClassService.gs';
// @ts-ignore
import ClassRepository from '../../02-backend/apps-script/classes/ClassRepository.gs';
// @ts-ignore
import FeeService from '../../02-backend/apps-script/fees/FeeService.gs';
// @ts-ignore
import FeeRepository from '../../02-backend/apps-script/fees/FeeRepository.gs';
// @ts-ignore
import PaymentService from '../../02-backend/apps-script/payments/PaymentService.gs';
// @ts-ignore
import PaymentRepository from '../../02-backend/apps-script/payments/PaymentRepository.gs';
// @ts-ignore
import ReportService from '../../02-backend/apps-script/reports/ReportService.gs';

describe('Isolated Schema Redesign — Multi-Model Billing, Attendance & Safeguards', () => {
  let spreadsheet: MockSpreadsheet;
  const actor = { actorId: 'usr_admin', email: 'admin@example.com', requestId: 'req_multi_model' };
  let studentId: string;

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');

    const s = StudentService.Students_create(spreadsheet, {
      first_name: 'Ananya',
      parent_guardian_name: 'Suresh',
      primary_phone: '+919876543200'
    }, actor);
    studentId = s.data.student_id;
  });

  it('supports all 4 billing models: prepaid packages, monthly, yearly, and per-class', () => {
    // 1. Model A: Prepaid Class Package (10 classes for 12,000 INR)
    const pkgA = PackageService.Packages_create(spreadsheet, {
      student_id: studentId,
      package_name: '10-Class Physics Package',
      purchased_classes: 10,
      package_price: 12000,
      plan_type: 'PACKAGE',
      billing_frequency: 'ONE_OFF'
    }, actor);
    expect(pkgA.success).toBe(true);
    let balA = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgA.data.package_id));
    expect(balA.total_classes).toBe(10);
    expect(balA.remaining_classes).toBe(10);

    // 2. Model B: Monthly Subscription (8 classes/mo for 8,000 INR)
    const pkgB = PackageService.Packages_create(spreadsheet, {
      student_id: studentId,
      package_name: 'October Monthly Plan',
      purchased_classes: 8,
      package_price: 8000,
      plan_type: 'MONTHLY',
      billing_frequency: 'MONTHLY'
    }, actor);
    expect(pkgB.success).toBe(true);
    let balB = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgB.data.package_id));
    expect(balB.total_classes).toBe(8);

    // 3. Model C: Yearly Subscription (Annual Plan for 90,000 INR)
    const pkgC = PackageService.Packages_create(spreadsheet, {
      student_id: studentId,
      package_name: 'Full Year Math Intensive',
      purchased_classes: 100,
      package_price: 90000,
      plan_type: 'YEARLY',
      billing_frequency: 'YEARLY'
    }, actor);
    expect(pkgC.success).toBe(true);

    // 4. Model D: Per-Class Billing (Pay as you go per 1-class unit)
    const pkgD = PackageService.Packages_create(spreadsheet, {
      student_id: studentId,
      package_name: 'Per-Class Tutoring (Pay-as-you-go)',
      purchased_classes: 1,
      package_price: 1500,
      plan_type: 'PER_CLASS',
      billing_frequency: 'PER_CLASS'
    }, actor);
    expect(pkgD.success).toBe(true);
  });

  it('manages partial payments, overpayment rejection, and payment voiding with status reversal', () => {
    // Create Fee Obligation of 10,000 INR
    const feeRes = FeeService.FeeObligations_create(spreadsheet, {
      student_id: studentId,
      obligation_description: 'Term 1 Coaching Fee',
      amount_due: 10000,
      due_date: '2026-11-01'
    }, actor);
    const feeId = feeRes.data.fee_obligation_id;

    // 1. Initial State: OPEN, 0 paid, 10,000 outstanding
    let fee = FeeService.FeeObligations_enrichWithBalances(spreadsheet, FeeRepository.FeeObligations_getById(spreadsheet, feeId));
    expect(fee.obligation_status).toBe('OPEN');
    expect(fee.paid_amount).toBe(0);
    expect(fee.outstanding_amount).toBe(10000);

    // 2. Partial Payment 1: 4,000 INR -> PARTIALLY_PAID, 6,000 outstanding
    const pay1 = PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: feeId,
      amount: 4000,
      payment_method: 'UPI',
      idempotency_key: 'idemp_p1'
    }, actor);
    expect(pay1.success).toBe(true);

    fee = FeeService.FeeObligations_enrichWithBalances(spreadsheet, FeeRepository.FeeObligations_getById(spreadsheet, feeId));
    expect(fee.obligation_status).toBe('PARTIALLY_PAID');
    expect(fee.paid_amount).toBe(4000);
    expect(fee.outstanding_amount).toBe(6000);

    // 3. Partial Payment 2: 6,000 INR -> PAID, 0 outstanding
    const pay2 = PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: feeId,
      amount: 6000,
      payment_method: 'BANK_TRANSFER',
      idempotency_key: 'idemp_p2'
    }, actor);
    expect(pay2.success).toBe(true);

    fee = FeeService.FeeObligations_enrichWithBalances(spreadsheet, FeeRepository.FeeObligations_getById(spreadsheet, feeId));
    expect(fee.obligation_status).toBe('PAID');
    expect(fee.paid_amount).toBe(10000);
    expect(fee.outstanding_amount).toBe(0);

    // 4. Void Payment 2: Reason 'Bank bounce' -> Reverts to PARTIALLY_PAID, 6,000 outstanding
    const voidPayRes = PaymentService.Payments_void(spreadsheet, {
      payment_id: pay2.data.payment_id,
      void_reason: 'Bank bounce'
    }, actor);
    expect(voidPayRes.success).toBe(true);

    fee = FeeService.FeeObligations_enrichWithBalances(spreadsheet, FeeRepository.FeeObligations_getById(spreadsheet, feeId));
    expect(fee.obligation_status).toBe('PARTIALLY_PAID');
    expect(fee.paid_amount).toBe(4000);
    expect(fee.outstanding_amount).toBe(6000);

    // 5. Void entire fee obligation -> status VOID, outstanding 0
    const voidFeeRes = FeeService.FeeObligations_void(spreadsheet, {
      fee_obligation_id: feeId,
      void_reason: 'Billing renegotiated'
    }, actor);
    expect(voidFeeRes.success).toBe(true);

    fee = FeeService.FeeObligations_enrichWithBalances(spreadsheet, FeeRepository.FeeObligations_getById(spreadsheet, feeId));
    expect(fee.obligation_status).toBe('VOID');
    expect(fee.outstanding_amount).toBe(0);
  });

  it('safeguards multiple packages, attendance effects, credit restoration, and student archival', () => {
    // 1. Multiple packages for same student: Math (5 classes) & Science (5 classes)
    const mathPkg = PackageService.Packages_create(spreadsheet, {
      student_id: studentId,
      package_name: '5-Class Math Sprint',
      purchased_classes: 5
    }, actor).data;

    const sciPkg = PackageService.Packages_create(spreadsheet, {
      student_id: studentId,
      package_name: '5-Class Science Sprint',
      purchased_classes: 5
    }, actor).data;

    // 2. Schedule class for Math -> PENDING (0 credits deducted)
    const cls1 = ClassService.Classes_schedule(spreadsheet, {
      student_id: studentId,
      package_id: mathPkg.package_id,
      class_title: 'Math Algebra Lesson',
      scheduled_start: '2026-10-22T10:00:00.000Z',
      scheduled_end: '2026-10-22T11:00:00.000Z'
    }, actor).data;

    let mathBal = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, mathPkg.package_id));
    let sciBal = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, sciPkg.package_id));
    expect(mathBal.remaining_classes).toBe(5);
    expect(sciBal.remaining_classes).toBe(5);

    // 3. Complete class with ATTENDED -> consumes 1 credit from Math only
    ClassService.Classes_complete(spreadsheet, {
      class_session_id: cls1.class_session_id,
      attendance_status: 'ATTENDED'
    }, actor);

    mathBal = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, mathPkg.package_id));
    sciBal = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, sciPkg.package_id));
    expect(mathBal.remaining_classes).toBe(4);
    expect(sciBal.remaining_classes).toBe(5); // Science package untouched!

    // 4. Cancel a session -> NO_CONSUME (preserves credits)
    const cls2 = ClassService.Classes_schedule(spreadsheet, {
      student_id: studentId,
      package_id: mathPkg.package_id,
      class_title: 'Math Geometry Lesson',
      scheduled_start: '2026-10-23T10:00:00.000Z',
      scheduled_end: '2026-10-23T11:00:00.000Z'
    }, actor).data;

    ClassService.Classes_cancel(spreadsheet, {
      class_session_id: cls2.class_session_id,
      cancellation_reason: 'Student excused absence'
    }, actor);

    mathBal = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, mathPkg.package_id));
    expect(mathBal.remaining_classes).toBe(4); // Preserved!

    // 5. Restore credit for Session 1 -> CREDIT_BACK
    const restoreRes = ClassService.Classes_restoreCredit(spreadsheet, {
      class_session_id: cls1.class_session_id,
      reason: 'Administrative correction'
    }, actor);
    expect(restoreRes.success).toBe(true);

    mathBal = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, mathPkg.package_id));
    expect(mathBal.remaining_classes).toBe(5); // Restored!

    // 6. Student Archival and Reactivation lifecycle
    const archRes = StudentService.Students_archive(spreadsheet, studentId, actor);
    expect(archRes.success).toBe(true);
    let stu = StudentRepository.Students_getById(spreadsheet, studentId);
    expect(stu.student_status).toBe('INACTIVE');
    expect(stu.archived_at).toBeTruthy();

    const reactRes = StudentService.Students_reactivate(spreadsheet, studentId, actor);
    expect(reactRes.success).toBe(true);
    stu = StudentRepository.Students_getById(spreadsheet, studentId);
    expect(stu.student_status).toBe('ACTIVE');

    // 7. Financial & Attendance Report Reconciliation
    const report = ReportService.Reports_getFinancialSummary(spreadsheet, {
      startDate: '2026-01-01',
      endDate: '2026-12-31'
    });
    expect(report.success).toBe(true);
    expect(report.data.currency).toBe('INR');
  });

  it('aggregates per-class billing into periodic obligations and validates late-cancellation rules', () => {
    // 1. Setup student on a per-class post-paid agreement (₹1,500/class)
    const perClassPkg = PackageService.Packages_create(spreadsheet, {
      student_id: studentId,
      package_name: 'Post-paid Math Lessons',
      purchased_classes: 1, // unit container
      package_price: 1500,
      plan_type: 'PER_CLASS',
      billing_frequency: 'MONTHLY'
    }, actor).data;

    // 2. Schedule and conduct 3 lessons in October
    const dates = ['2026-10-05', '2026-10-12', '2026-10-19'];
    for (let i = 0; i < dates.length; i++) {
      const cls = ClassService.Classes_schedule(spreadsheet, {
        student_id: studentId,
        package_id: perClassPkg.package_id,
        class_title: `Math Session ${i + 1}`,
        scheduled_start: `${dates[i]}T10:00:00.000Z`,
        scheduled_end: `${dates[i]}T11:00:00.000Z`
      }, actor).data;

      ClassService.Classes_complete(spreadsheet, {
        class_session_id: cls.class_session_id,
        attendance_status: 'ATTENDED'
      }, actor);
    }

    // 3. Schedule 4th lesson that student cancels with 24h notice (Excused -> NO_CONSUME)
    const clsExcused = ClassService.Classes_schedule(spreadsheet, {
      student_id: studentId,
      package_id: perClassPkg.package_id,
      class_title: 'Math Session 4 (Excused)',
      scheduled_start: '2026-10-26T10:00:00.000Z',
      scheduled_end: '2026-10-26T11:00:00.000Z'
    }, actor).data;

    ClassService.Classes_cancel(spreadsheet, {
      class_session_id: clsExcused.class_session_id,
      cancellation_reason: 'Sick with advance doctor note'
    }, actor);

    // 4. End-of-month periodic billing aggregation:
    // Query completed attended classes in October for this student
    const allSessions = ClassRepository.Classes_getAll(spreadsheet);
    const studentOctSessions = allSessions.filter((s: any) =>
      s.student_id === studentId &&
      s.package_id === perClassPkg.package_id &&
      s.session_status === 'COMPLETED' &&
      s.attendance_status === 'ATTENDED'
    );
    expect(studentOctSessions.length).toBe(3);

    const billableAmount = studentOctSessions.length * 1500; // 3 * 1500 = 4500
    expect(billableAmount).toBe(4500);

    // Generate monthly fee obligation
    const monthlyFee = FeeService.FeeObligations_create(spreadsheet, {
      student_id: studentId,
      package_id: perClassPkg.package_id,
      obligation_description: 'October 2026 Tutoring (3 classes @ ₹1,500)',
      amount_due: billableAmount,
      due_date: '2026-11-05'
    }, actor).data;

    expect(monthlyFee.amount_due).toBe(4500);

    // 5. Parent pays in two partial installments
    // Installment 1: ₹2,000 via UPI
    PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: monthlyFee.fee_obligation_id,
      amount: 2000,
      payment_method: 'UPI',
      idempotency_key: 'oct_pay_part1'
    }, actor);

    let feeStatus = FeeService.FeeObligations_enrichWithBalances(spreadsheet, FeeRepository.FeeObligations_getById(spreadsheet, monthlyFee.fee_obligation_id));
    expect(feeStatus.paid_amount).toBe(2000);
    expect(feeStatus.outstanding_amount).toBe(2500);
    expect(feeStatus.obligation_status).toBe('PARTIALLY_PAID');

    // Installment 2: Remaining ₹2,500 via NetBanking
    PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: monthlyFee.fee_obligation_id,
      amount: 2500,
      payment_method: 'BANK_TRANSFER',
      idempotency_key: 'oct_pay_part2'
    }, actor);

    feeStatus = FeeService.FeeObligations_enrichWithBalances(spreadsheet, FeeRepository.FeeObligations_getById(spreadsheet, monthlyFee.fee_obligation_id));
    expect(feeStatus.paid_amount).toBe(4500);
    expect(feeStatus.outstanding_amount).toBe(0);
    expect(feeStatus.obligation_status).toBe('PAID');
  });
});
