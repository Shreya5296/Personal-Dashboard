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
import ReportService from '../../02-backend/apps-script/reports/ReportService.gs';

describe('Phase 5 — Financial Ledger and Payments Domain', () => {
  let spreadsheet: MockSpreadsheet;
  const actor = { actorId: 'usr_admin', email: 'admin@example.com', requestId: 'req_fin' };
  let studentId: string;

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');

    const s = StudentService.Students_create(spreadsheet, {
      first_name: 'Kabir',
      parent_guardian_name: 'Vikram',
      primary_phone: '+919876543210'
    }, actor);
    studentId = s.data.student_id;
  });

  it('manages fee obligations, payments with idempotency, and overpayment guards', () => {
    // 1. Create fee obligation
    const feeRes = FeeService.FeeObligations_create(spreadsheet, {
      student_id: studentId,
      obligation_description: 'Term 1 Tuition',
      amount_due: 5000,
      due_date: '2026-02-15'
    }, actor);
    expect(feeRes.success).toBe(true);
    const feeId = feeRes.data.fee_obligation_id;

    // 2. Record first payment of 3000
    const payRes1 = PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: feeId,
      amount: 3000,
      payment_method: 'UPI',
      idempotency_key: 'key_pay_001'
    }, actor);
    expect(payRes1.success).toBe(true);
    const payId1 = payRes1.data.payment_id;

    // 3. Idempotent retry returns original payment
    const retryRes = PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: feeId,
      amount: 3000,
      payment_method: 'UPI',
      idempotency_key: 'key_pay_001'
    }, actor);
    expect(retryRes.success).toBe(true);
    expect(retryRes.data.payment_id).toBe(payId1);
    expect(retryRes.meta.idempotentRetry).toBe(true);

    // 4. Reusing idempotency key with different amount is rejected
    const conflictRes = PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: feeId,
      amount: 1000,
      payment_method: 'UPI',
      idempotency_key: 'key_pay_001'
    }, actor);
    expect(conflictRes.success).toBe(false);
    expect(conflictRes.code).toBe('IDEMPOTENCY_CONFLICT');

    // 5. Check enriched fee obligation: paid 3000, outstanding 2000
    const enriched1 = FeeService.FeeObligations_enrichWithBalances(spreadsheet, FeeRepository.FeeObligations_getById(spreadsheet, feeId));
    expect(enriched1.paid_amount).toBe(3000);
    expect(enriched1.outstanding_amount).toBe(2000);
    expect(enriched1.obligation_status).toBe('PARTIALLY_PAID');

    // 6. Overpayment attempt (paying 2500 when 2000 is outstanding) is rejected
    const overpayRes = PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: feeId,
      amount: 2500,
      payment_method: 'CASH',
      idempotency_key: 'key_pay_over'
    }, actor);
    expect(overpayRes.success).toBe(false);
    expect(overpayRes.code).toBe('VALIDATION_ERROR');

    // 7. Pay exact remaining balance 2000
    const payRes2 = PaymentService.Payments_record(spreadsheet, {
      student_id: studentId,
      fee_obligation_id: feeId,
      amount: 2000,
      payment_method: 'BANK_TRANSFER',
      idempotency_key: 'key_pay_002'
    }, actor);
    expect(payRes2.success).toBe(true);

    const enriched2 = FeeService.FeeObligations_enrichWithBalances(spreadsheet, FeeRepository.FeeObligations_getById(spreadsheet, feeId));
    expect(enriched2.paid_amount).toBe(5000);
    expect(enriched2.outstanding_amount).toBe(0);
    expect(enriched2.obligation_status).toBe('PAID');

    // 8. Financial summary
    const summary = ReportService.Reports_getFinancialSummary(spreadsheet);
    expect(summary.data.totalBilled).toBe(5000);
    expect(summary.data.totalReceived).toBe(5000);
    expect(summary.data.totalOutstanding).toBe(0);
  });
});
