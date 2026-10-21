import { describe, it, expect, beforeEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';
// @ts-ignore
import StudentService from '../../02-backend/apps-script/students/StudentService.gs';
// @ts-ignore
import FeeService from '../../02-backend/apps-script/fees/FeeService.gs';
// @ts-ignore
import FeeRepository from '../../02-backend/apps-script/fees/FeeRepository.gs';
// @ts-ignore
import PaymentService from '../../02-backend/apps-script/payments/PaymentService.gs';
// @ts-ignore
import PaymentRepository from '../../02-backend/apps-script/payments/PaymentRepository.gs';
// @ts-ignore
import AuditService from '../../02-backend/apps-script/audit/AuditService.gs';
// @ts-ignore
import AuditRepository from '../../02-backend/apps-script/audit/AuditRepository.gs';

import { calculateStudentCredits } from '../../src/domains/fees/creditCalculator';
import { FeeObligation } from '../../src/domains/fees/feeTypes';
import { Payment } from '../../src/domains/payments/paymentTypes';

describe('Phase B & C — Payment Safety, Overpayment Boundaries & Backend Invoice Protection', () => {
  let spreadsheet: MockSpreadsheet;
  const actor = { actorId: 'usr_admin', email: 'admin@example.com', requestId: 'req_safety' };
  let studentId: string;

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');

    const s = StudentService.Students_create(spreadsheet, {
      first_name: 'Ananya',
      last_name: 'Deshmukh',
      parent_guardian_name: 'Rajesh Deshmukh',
      primary_phone: '+919876543210'
    }, actor);
    studentId = s.data.student_id;
  });

  it('handles payment equal to outstanding balance', () => {
    const feeRes = FeeService.FeeObligations_create(spreadsheet, {
      student_id: studentId,
      obligation_description: 'November 2026 Tuition',
      amount_due: 5000,
      due_date: '2026-11-05'
    }, actor);
    const feeId = feeRes.data.fee_obligation_id;

    const payRes = PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: feeId,
      amount: 5000,
      payment_method: 'UPI',
      idempotency_key: 'idemp_exact_001'
    }, actor);
    expect(payRes.success).toBe(true);
    expect(payRes.data.amount).toBe(5000);

    const enriched = FeeService.FeeObligations_enrichWithBalances(spreadsheet, FeeRepository.FeeObligations_getById(spreadsheet, feeId));
    expect(enriched.paid_amount).toBe(5000);
    expect(enriched.outstanding_amount).toBe(0);
    expect(enriched.obligation_status).toBe('PAID');
  });

  it('handles multiple partial payments accumulating to settle obligation', () => {
    const feeRes = FeeService.FeeObligations_create(spreadsheet, {
      student_id: studentId,
      obligation_description: 'Q4 Tuition',
      amount_due: 6000,
      due_date: '2026-12-15'
    }, actor);
    const feeId = feeRes.data.fee_obligation_id;

    // Partial payment 1: ₹2,000
    const p1 = PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: feeId,
      amount: 2000,
      payment_method: 'UPI',
      idempotency_key: 'idemp_part_1'
    }, actor);
    expect(p1.success).toBe(true);

    let enriched = FeeService.FeeObligations_enrichWithBalances(spreadsheet, FeeRepository.FeeObligations_getById(spreadsheet, feeId));
    expect(enriched.paid_amount).toBe(2000);
    expect(enriched.outstanding_amount).toBe(4000);
    expect(enriched.obligation_status).toBe('PARTIALLY_PAID');

    // Partial payment 2: ₹4,000
    const p2 = PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: feeId,
      amount: 4000,
      payment_method: 'BANK_TRANSFER',
      idempotency_key: 'idemp_part_2'
    }, actor);
    expect(p2.success).toBe(true);

    enriched = FeeService.FeeObligations_enrichWithBalances(spreadsheet, FeeRepository.FeeObligations_getById(spreadsheet, feeId));
    expect(enriched.paid_amount).toBe(6000);
    expect(enriched.outstanding_amount).toBe(0);
    expect(enriched.obligation_status).toBe('PAID');
  });

  it('safely rejects payment greater than outstanding balance at service boundary', () => {
    const feeRes = FeeService.FeeObligations_create(spreadsheet, {
      student_id: studentId,
      obligation_description: 'December Tuition',
      amount_due: 4000,
      due_date: '2026-12-05'
    }, actor);
    const feeId = feeRes.data.fee_obligation_id;

    // Attempt paying ₹5,000 against a ₹4,000 obligation
    const overpayRes = PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: feeId,
      amount: 5000,
      payment_method: 'UPI',
      idempotency_key: 'idemp_overpay_attempt'
    }, actor);

    expect(overpayRes.success).toBe(false);
    expect(overpayRes.code).toBe('VALIDATION_ERROR');
    expect(overpayRes.message).toContain('exceeds outstanding obligation balance');

    // Fee remains unchanged
    const enriched = FeeService.FeeObligations_enrichWithBalances(spreadsheet, FeeRepository.FeeObligations_getById(spreadsheet, feeId));
    expect(enriched.paid_amount).toBe(0);
    expect(enriched.outstanding_amount).toBe(4000);
  });

  it('idempotently handles payment retry with identical key and rejects conflict with distinct payload', () => {
    const feeRes = FeeService.FeeObligations_create(spreadsheet, {
      student_id: studentId,
      obligation_description: 'Idempotency Test Fee',
      amount_due: 3000,
      due_date: '2026-11-20'
    }, actor);
    const feeId = feeRes.data.fee_obligation_id;

    const initial = PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: feeId,
      amount: 1500,
      payment_method: 'UPI',
      idempotency_key: 'idemp_idem_001'
    }, actor);
    expect(initial.success).toBe(true);

    // Exact retry returns same payment
    const retry = PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: feeId,
      amount: 1500,
      payment_method: 'UPI',
      idempotency_key: 'idemp_idem_001'
    }, actor);
    expect(retry.success).toBe(true);
    expect(retry.data.payment_id).toBe(initial.data.payment_id);
    expect(retry.meta.idempotentRetry).toBe(true);

    // Conflict retry with different amount is rejected
    const conflict = PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: feeId,
      amount: 2000,
      payment_method: 'UPI',
      idempotency_key: 'idemp_idem_001'
    }, actor);
    expect(conflict.success).toBe(false);
    expect(conflict.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('excludes voided payments and fees from balances, credit calculations, and reports', () => {
    const feeRes = FeeService.FeeObligations_create(spreadsheet, {
      student_id: studentId,
      obligation_description: 'Void Test Fee',
      amount_due: 3500,
      due_date: '2026-11-20'
    }, actor);
    const feeId = feeRes.data.fee_obligation_id;

    const payRes = PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: feeId,
      amount: 3500,
      payment_method: 'UPI',
      idempotency_key: 'idemp_void_test'
    }, actor);
    expect(payRes.success).toBe(true);
    const payId = payRes.data.payment_id;

    // Void the payment
    const voidPay = PaymentService.Payments_void(spreadsheet, {
      payment_id: payId,
      void_reason: 'Incorrect transaction reported by parent'
    }, actor);
    expect(voidPay.success).toBe(true);

    // Enriched fee reflects void payment: paid 0, outstanding 3500
    const enriched = FeeService.FeeObligations_enrichWithBalances(spreadsheet, FeeRepository.FeeObligations_getById(spreadsheet, feeId));
    expect(enriched.paid_amount).toBe(0);
    expect(enriched.outstanding_amount).toBe(3500);
    expect(enriched.obligation_status).toBe('OPEN');

    // Credit calculator also excludes voided payment
    const allFees: FeeObligation[] = [enriched as unknown as FeeObligation];
    const allPayments: Payment[] = [voidPay.data as unknown as Payment];
    const credits = calculateStudentCredits(allFees, allPayments, studentId);
    expect(credits[0].unappliedCredit).toBe(0);
    expect(credits[0].totalPaid).toBe(0);
  });

  it('preserves audit logging across fee creation and payment lifecycle', () => {
    const feeRes = FeeService.FeeObligations_create(spreadsheet, {
      student_id: studentId,
      obligation_description: 'Audit Test Fee',
      amount_due: 2500,
      due_date: '2026-11-20'
    }, actor);

    const payRes = PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: feeRes.data.fee_obligation_id,
      amount: 2500,
      payment_method: 'UPI',
      idempotency_key: 'idemp_audit_test'
    }, actor);

    const auditSheet = spreadsheet.getSheetByName(SheetRegistry.SHEET_NAMES.AUDIT_LOG);
    const auditLogs = auditSheet.getDataRange().getValues();
    // Headers + at least student create + fee create + payment record
    expect(auditLogs.length).toBeGreaterThanOrEqual(4);

    const feeAudit = auditLogs.find((row: any[]) => row[4] === 'FEE_OBLIGATION' && row[6] === 'CREATE');
    expect(feeAudit).toBeDefined();

    const payAudit = auditLogs.find((row: any[]) => row[4] === 'PAYMENT' && row[6] === 'RECORD');
    expect(payAudit).toBeDefined();
  });

  it('prevents backend duplicate monthly invoice creation on retry or concurrency', () => {
    // 1. Initial creation of November 2026 Tuition
    const create1 = FeeService.FeeObligations_create(spreadsheet, {
      student_id: studentId,
      obligation_description: 'November 2026 Tuition',
      amount_due: 5000,
      due_date: '2026-11-05',
      idempotency_key: 'inv_monthly_stu_ananya_nov_2026'
    }, actor);
    expect(create1.success).toBe(true);
    const initialFeeId = create1.data.fee_obligation_id;

    // 2. Concurrent / duplicate retry with identical description or idempotency key
    const create2 = FeeService.FeeObligations_create(spreadsheet, {
      student_id: studentId,
      obligation_description: 'November 2026 Tuition',
      amount_due: 5000,
      due_date: '2026-11-05',
      idempotency_key: 'inv_monthly_stu_ananya_nov_2026'
    }, actor);

    expect(create2.success).toBe(true);
    expect(create2.meta.alreadyExists).toBe(true);
    expect(create2.data.fee_obligation_id).toBe(initialFeeId);

    // 3. Verify exactly ONE fee row exists in the repository
    const allFees = FeeRepository.FeeObligations_getByStudentId(spreadsheet, studentId);
    expect(allFees.length).toBe(1);
    expect(allFees[0].fee_obligation_id).toBe(initialFeeId);
  });
});
