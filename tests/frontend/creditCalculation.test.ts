import { describe, it, expect } from 'vitest';
import { calculateStudentCredits } from '../../src/domains/fees/creditCalculator';
import { FeeObligation } from '../../src/domains/fees/feeTypes';
import { Payment } from '../../src/domains/payments/paymentTypes';

describe('Available Student Credit Calculation', () => {
  it('calculates zero credit when payments match obligation amount exactly', () => {
    const fees: FeeObligation[] = [
      {
        fee_id: 'fee_1',
        student_id: 'stu_1',
        description: 'October Tuition',
        amount_due: 5000,
        amount_paid: 5000,
        outstanding_balance: 0,
        status: 'PAID',
        due_date: '2026-10-05',
      },
    ];
    const payments: Payment[] = [
      {
        payment_id: 'pay_1',
        student_id: 'stu_1',
        fee_id: 'fee_1',
        amount: 5000,
        payment_date: '2026-10-04',
        payment_method: 'UPI',
        status: 'COMPLETED',
      },
    ];

    const result = calculateStudentCredits(fees, payments, 'stu_1');
    expect(result).toHaveLength(1);
    expect(result[0].currency).toBe('INR');
    expect(result[0].unappliedCredit).toBe(0);
    expect(result[0].totalPaid).toBe(5000);
    expect(result[0].outstandingBalance).toBe(0);
  });

  it('calculates positive credit when parent overpays', () => {
    const fees: FeeObligation[] = [
      {
        fee_id: 'fee_1',
        student_id: 'stu_1',
        description: 'November Tuition',
        amount_due: 5000,
        amount_paid: 5000,
        outstanding_balance: 0,
        status: 'PAID',
        due_date: '2026-11-05',
      },
    ];
    // Parent paid ₹6,500 total against a ₹5,000 obligation
    const payments: Payment[] = [
      {
        payment_id: 'pay_1',
        student_id: 'stu_1',
        fee_id: 'fee_1',
        amount: 6500,
        payment_date: '2026-11-04',
        payment_method: 'BANK_TRANSFER',
        status: 'COMPLETED',
      },
    ];

    const result = calculateStudentCredits(fees, payments, 'stu_1');
    expect(result).toHaveLength(1);
    expect(result[0].currency).toBe('INR');
    expect(result[0].totalPaid).toBe(6500);
    expect(result[0].unappliedCredit).toBe(1500);
  });

  it('handles multi-currency scenarios without mixing currencies', () => {
    const fees: FeeObligation[] = [
      {
        fee_id: 'fee_inr',
        student_id: 'stu_1',
        description: 'Local Tuition',
        amount_due: 4000,
        amount_paid: 4000,
        outstanding_balance: 0,
        status: 'PAID',
        due_date: '2026-11-05',
        currency: 'INR',
      } as FeeObligation,
      {
        fee_id: 'fee_usd',
        student_id: 'stu_1',
        description: 'International Prep',
        amount_due: 100,
        amount_paid: 100,
        outstanding_balance: 0,
        status: 'PAID',
        due_date: '2026-11-05',
        currency: 'USD',
      } as FeeObligation,
    ];

    const payments: Payment[] = [
      {
        payment_id: 'pay_inr',
        student_id: 'stu_1',
        fee_id: 'fee_inr',
        amount: 5000, // ₹1,000 excess
        payment_date: '2026-11-04',
        payment_method: 'UPI',
        status: 'COMPLETED',
        currency: 'INR',
      } as Payment,
      {
        payment_id: 'pay_usd',
        student_id: 'stu_1',
        fee_id: 'fee_usd',
        amount: 150, // $50 excess
        payment_date: '2026-11-04',
        payment_method: 'BANK_TRANSFER',
        status: 'COMPLETED',
        currency: 'USD',
      } as Payment,
    ];

    const result = calculateStudentCredits(fees, payments, 'stu_1');
    expect(result).toHaveLength(2);

    const inrSummary = result.find((r) => r.currency === 'INR')!;
    const usdSummary = result.find((r) => r.currency === 'USD')!;

    expect(inrSummary.unappliedCredit).toBe(1000);
    expect(inrSummary.totalPaid).toBe(5000);

    expect(usdSummary.unappliedCredit).toBe(50);
    expect(usdSummary.totalPaid).toBe(150);
  });

  it('ignores voided payments and fees', () => {
    const fees: FeeObligation[] = [
      {
        fee_id: 'fee_void',
        student_id: 'stu_1',
        description: 'Voided Bill',
        amount_due: 3000,
        amount_paid: 0,
        outstanding_balance: 0,
        status: 'VOID',
        due_date: '2026-10-01',
      },
    ];
    const payments: Payment[] = [
      {
        payment_id: 'pay_void',
        student_id: 'stu_1',
        fee_id: 'fee_void',
        amount: 3000,
        payment_date: '2026-10-01',
        payment_method: 'UPI',
        status: 'VOID',
      },
    ];

    const result = calculateStudentCredits(fees, payments, 'stu_1');
    expect(result[0].unappliedCredit).toBe(0);
    expect(result[0].totalPaid).toBe(0);
  });
});
