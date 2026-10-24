import { describe, it, expect, beforeEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';
// @ts-ignore
import StudentService from '../../02-backend/apps-script/students/StudentService.gs';
// @ts-ignore
import PackageService from '../../02-backend/apps-script/packages/PackageService.gs';
// @ts-ignore
import PaymentService from '../../02-backend/apps-script/payments/PaymentService.gs';
// @ts-ignore
import ReportService from '../../02-backend/apps-script/reports/ReportService.gs';

describe('Earnings Calculations & Canonical Financial Summary', () => {
  let spreadsheet: MockSpreadsheet;
  const actor = { actorId: 'usr_admin', email: 'admin@example.com', requestId: 'req_earnings_test' };

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '2.0.0');
  });

  it('correctly calculates canonical owner data (Rehaan, Vivaan, Seerat)', () => {
    // 1. Create students
    const rehaan = StudentService.Students_create(spreadsheet, {
      first_name: 'Rehaan',
      parent_guardian_name: 'Parent Rehaan',
      primary_phone: '+919876500001'
    }, actor).data;

    const vivaan = StudentService.Students_create(spreadsheet, {
      first_name: 'Vivaan',
      parent_guardian_name: 'Parent Vivaan',
      primary_phone: '+919876500002'
    }, actor).data;

    const seerat = StudentService.Students_create(spreadsheet, {
      first_name: 'Seerat',
      parent_guardian_name: 'Parent Seerat',
      primary_phone: '+919876500003'
    }, actor).data;

    // 2. Create packages matching owner's canonical sheet
    // Rehaan: ₹1,00,000
    PackageService.Packages_create(spreadsheet, {
      student_id: rehaan.student_id,
      student_name: 'Rehaan',
      package_name: 'Rehaan Comprehensive Pack',
      package_price: 100000,
      classes_purchased: 40,
      start_date: '2026-01-10'
    }, actor);

    // Vivaan: ₹1,00,000
    PackageService.Packages_create(spreadsheet, {
      student_id: vivaan.student_id,
      student_name: 'Vivaan',
      package_name: 'Vivaan Comprehensive Pack',
      package_price: 100000,
      classes_purchased: 40,
      start_date: '2026-01-15'
    }, actor);

    // Seerat: ₹16,800
    PackageService.Packages_create(spreadsheet, {
      student_id: seerat.student_id,
      student_name: 'Seerat',
      package_name: 'Seerat Starter Pack',
      package_price: 16800,
      classes_purchased: 8,
      start_date: '2026-02-01'
    }, actor);

    // 3. Record payments matching owner's canonical sheet
    // Rehaan: 3 payments of ₹25,000 each = ₹75,000
    for (let i = 1; i <= 3; i++) {
      PaymentService.Payments_record(spreadsheet, {
        student_id: rehaan.student_id,
        student_name: 'Rehaan',
        amount: 25000,
        currency: 'INR',
        payment_date: `2026-0${i}-15`,
        idempotency_key: `rehaan_pay_${i}`
      }, actor);
    }

    // Vivaan: 3 payments of ₹25,000 each = ₹75,000
    for (let i = 1; i <= 3; i++) {
      PaymentService.Payments_record(spreadsheet, {
        student_id: vivaan.student_id,
        student_name: 'Vivaan',
        amount: 25000,
        currency: 'INR',
        payment_date: `2026-0${i}-20`,
        idempotency_key: `vivaan_pay_${i}`
      }, actor);
    }

    // Seerat: 1 payment of ₹16,800
    PaymentService.Payments_record(spreadsheet, {
      student_id: seerat.student_id,
      student_name: 'Seerat',
      amount: 16800,
      currency: 'INR',
      payment_date: '2026-02-05',
      idempotency_key: 'seerat_pay_1'
    }, actor);

    // 4. Verify financial summary
    const summary = ReportService.Reports_getFinancialSummary(spreadsheet);
    expect(summary.success).toBe(true);
    expect(summary.data.totalInvoiced).toBe(216800);
    expect(summary.data.totalBilled).toBe(216800);
    expect(summary.data.totalCollected).toBe(166800);
    expect(summary.data.totalReceived).toBe(166800);
    expect(summary.data.totalOutstanding).toBe(50000);
    expect(summary.data.currency).toBe('INR');

    // 5. Verify dashboard overview reflects the same outstanding amount
    const overview = ReportService.Reports_getDashboardOverview(spreadsheet);
    expect(overview.success).toBe(true);
    expect(overview.data.outstandingFeesTotal).toBe(50000);
    expect(overview.data.overdueFeesTotal).toBe(50000);
  });

  it('handles multiple packages per student without double-counting', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      first_name: 'Aanya',
      parent_guardian_name: 'Raj',
      primary_phone: '+919876511111'
    }, actor).data;

    // Package 1: ₹50,000
    PackageService.Packages_create(spreadsheet, {
      student_id: stu.student_id,
      package_name: 'Pack 1',
      package_price: 50000,
      classes_purchased: 20
    }, actor);

    // Package 2: ₹30,000
    PackageService.Packages_create(spreadsheet, {
      student_id: stu.student_id,
      package_name: 'Pack 2',
      package_price: 30000,
      classes_purchased: 10
    }, actor);

    // Payment: ₹60,000
    PaymentService.Payments_record(spreadsheet, {
      student_id: stu.student_id,
      amount: 60000,
      currency: 'INR'
    }, actor);

    const summary = ReportService.Reports_getFinancialSummary(spreadsheet);
    expect(summary.data.totalInvoiced).toBe(80000);
    expect(summary.data.totalCollected).toBe(60000);
    expect(summary.data.totalOutstanding).toBe(20000);
  });

  it('insulates debtor balances from another student’s overpayment/credit balance', () => {
    const debtor = StudentService.Students_create(spreadsheet, {
      first_name: 'Debtor Student',
      parent_guardian_name: 'Parent Debtor',
      primary_phone: '+919876522222'
    }, actor).data;

    const overpayer = StudentService.Students_create(spreadsheet, {
      first_name: 'Credit Student',
      parent_guardian_name: 'Parent Credit',
      primary_phone: '+919876533333'
    }, actor).data;

    // Debtor: package 20,000, paid 5,000 -> owes 15,000
    PackageService.Packages_create(spreadsheet, {
      student_id: debtor.student_id,
      package_name: 'Debtor Pack',
      classes_purchased: 10,
      package_price: 20000
    }, actor);
    PaymentService.Payments_record(spreadsheet, {
      student_id: debtor.student_id,
      amount: 5000
    }, actor);

    // Overpayer: package 10,000, paid 15,000 -> owes 0 (credit 5,000)
    PackageService.Packages_create(spreadsheet, {
      student_id: overpayer.student_id,
      package_name: 'Credit Pack',
      classes_purchased: 5,
      package_price: 10000
    }, actor);
    PaymentService.Payments_record(spreadsheet, {
      student_id: overpayer.student_id,
      amount: 15000
    }, actor);

    const summary = ReportService.Reports_getFinancialSummary(spreadsheet);
    expect(summary.data.totalInvoiced).toBe(30000);
    expect(summary.data.totalCollected).toBe(20000);
    // Outstanding should be 15,000 (debtor balance), not 10,000 (which would improperly offset with overpayer credit)
    expect(summary.data.totalOutstanding).toBe(15000);
  });

  it('applies date filters consistently to packages and payments', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      first_name: 'Date Student',
      parent_guardian_name: 'Parent Date',
      primary_phone: '+919876544444'
    }, actor).data;

    // Package Jan: ₹20,000
    PackageService.Packages_create(spreadsheet, {
      student_id: stu.student_id,
      package_name: 'Jan Pack',
      classes_purchased: 10,
      package_price: 20000,
      start_date: '2026-01-10'
    }, actor);

    // Package Feb: ₹30,000
    PackageService.Packages_create(spreadsheet, {
      student_id: stu.student_id,
      package_name: 'Feb Pack',
      classes_purchased: 15,
      package_price: 30000,
      start_date: '2026-02-15'
    }, actor);

    // Payment Jan: ₹15,000
    PaymentService.Payments_record(spreadsheet, {
      student_id: stu.student_id,
      amount: 15000,
      payment_date: '2026-01-20'
    }, actor);

    // Payment Feb: ₹25,000
    PaymentService.Payments_record(spreadsheet, {
      student_id: stu.student_id,
      amount: 25000,
      payment_date: '2026-02-25'
    }, actor);

    // Filter for February only
    const febSummary = ReportService.Reports_getFinancialSummary(spreadsheet, {
      startDate: '2026-02-01',
      endDate: '2026-02-28'
    });
    expect(febSummary.data.totalInvoiced).toBe(30000);
    expect(febSummary.data.totalCollected).toBe(25000);
    expect(febSummary.data.totalOutstanding).toBe(5000);
  });

  it('preserves financial ledger records when a student is archived/inactive', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      first_name: 'Archive Student',
      parent_guardian_name: 'Parent Archive',
      primary_phone: '+919876555555'
    }, actor).data;

    PackageService.Packages_create(spreadsheet, {
      student_id: stu.student_id,
      package_name: 'Archive Pack',
      classes_purchased: 20,
      package_price: 40000
    }, actor);

    PaymentService.Payments_record(spreadsheet, {
      student_id: stu.student_id,
      amount: 30000
    }, actor);

    // Archive student
    StudentService.Students_archive(spreadsheet, stu.student_id, actor);

    const summary = ReportService.Reports_getFinancialSummary(spreadsheet);
    expect(summary.data.totalInvoiced).toBe(40000);
    expect(summary.data.totalCollected).toBe(30000);
    expect(summary.data.totalOutstanding).toBe(10000);
  });

  it('excludes voided payments and cancelled packages from ledger totals', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      first_name: 'Void Student',
      parent_guardian_name: 'Parent Void',
      primary_phone: '+919876566666'
    }, actor).data;

    // Active package: 20,000
    PackageService.Packages_create(spreadsheet, {
      student_id: stu.student_id,
      package_name: 'Active Pack',
      classes_purchased: 10,
      package_price: 20000,
      package_status: 'ACTIVE'
    }, actor);

    // Cancelled package: 50,000
    PackageService.Packages_create(spreadsheet, {
      student_id: stu.student_id,
      package_name: 'Cancelled Pack',
      classes_purchased: 20,
      package_price: 50000,
      plan_type: 'CANCELLED'
    }, actor);

    // Valid payment: 10,000
    PaymentService.Payments_record(spreadsheet, {
      student_id: stu.student_id,
      amount: 10000,
      currency: 'INR'
    }, actor);

    // Payment to be voided: 5,000
    PaymentService.Payments_record(spreadsheet, {
      student_id: stu.student_id,
      amount: 5000,
      payment_date: '2026-03-01',
      currency: 'INR'
    }, actor);

    PaymentService.Payments_void(spreadsheet, {
      student_id: stu.student_id,
      amount: 5000,
      payment_date: '2026-03-01',
      void_reason: 'Duplicate entry'
    }, actor);

    const summary = ReportService.Reports_getFinancialSummary(spreadsheet);
    expect(summary.data.totalInvoiced).toBe(20000); // 50,000 cancelled package excluded
    expect(summary.data.totalCollected).toBe(10000); // 5,000 voided payment excluded
    expect(summary.data.totalOutstanding).toBe(10000);
  });

  it('returns zeros for empty data gracefully without NaN or errors', () => {
    const summary = ReportService.Reports_getFinancialSummary(spreadsheet);
    expect(summary.success).toBe(true);
    expect(summary.data.totalInvoiced).toBe(0);
    expect(summary.data.totalBilled).toBe(0);
    expect(summary.data.totalCollected).toBe(0);
    expect(summary.data.totalReceived).toBe(0);
    expect(summary.data.totalOutstanding).toBe(0);
    expect(summary.data.currency).toBe('INR');
  });
});
