import { describe, it, expect } from 'vitest';
import { sortPaymentsByDateAscending } from '../../src/domains/finances/financeSorting';
import { Payment } from '../../src/domains/finances/financeTypes';
import { formatStatusBadge } from '../../src/lib/textFormat';

describe('Finances Refinements — Labels, Columns, and Sorting', () => {
  it('displays payment status RECORDED as Received', () => {
    const badge = formatStatusBadge('RECORDED');
    expect(badge.label).toBe('Received');
  });

  it('sorts payments by date in ascending chronological order (oldest first, newest last)', () => {
    const payments: Payment[] = [
      { payment_id: 'p3', student_id: 's1', student_name: 'Diya', amount: 3000, payment_date: '2026-05-10' },
      { payment_id: 'p1', student_id: 's2', student_name: 'Aarav', amount: 1000, payment_date: '2025-12-01' },
      { payment_id: 'p2', student_id: 's3', student_name: 'Rohan', amount: 2000, payment_date: '2026-01-15' },
    ];

    const sorted = sortPaymentsByDateAscending(payments);
    expect(sorted.map((p) => p.payment_id)).toEqual(['p1', 'p2', 'p3']);
    expect(sorted.map((p) => p.payment_date)).toEqual(['2025-12-01', '2026-01-15', '2026-05-10']);
  });

  it('handles same-day transactions with deterministic secondary sort', () => {
    const payments: Payment[] = [
      { payment_id: 'pay_b', student_id: 's2', student_name: 'B', amount: 500, payment_date: '2026-03-01' },
      { payment_id: 'pay_a', student_id: 's1', student_name: 'A', amount: 250, payment_date: '2026-03-01' },
      { payment_id: 'pay_c', student_id: 's3', student_name: 'C', amount: 100, payment_date: '2026-03-01' },
    ];

    const sorted = sortPaymentsByDateAscending(payments);
    expect(sorted.map((p) => p.payment_id)).toEqual(['pay_a', 'pay_b', 'pay_c']);
  });

  it('sorts dates across different months and years correctly', () => {
    const payments: Payment[] = [
      { payment_id: 'y2026_feb', student_id: 's1', amount: 100, payment_date: '2026-02-28' },
      { payment_id: 'y2024_dec', student_id: 's2', amount: 100, payment_date: '2024-12-31' },
      { payment_id: 'y2025_aug', student_id: 's3', amount: 100, payment_date: '2025-08-15' },
      { payment_id: 'y2026_jan', student_id: 's4', amount: 100, payment_date: '2026-01-01' },
    ];

    const sorted = sortPaymentsByDateAscending(payments);
    expect(sorted.map((p) => p.payment_id)).toEqual([
      'y2024_dec',
      'y2025_aug',
      'y2026_jan',
      'y2026_feb',
    ]);
  });

  it('handles invalid or missing payment dates without crashing', () => {
    const payments: Payment[] = [
      { payment_id: 'p_valid2', student_id: 's1', amount: 200, payment_date: '2026-06-01' },
      { payment_id: 'p_invalid', student_id: 's2', amount: 100, payment_date: 'not-a-valid-date' },
      { payment_id: 'p_valid1', student_id: 's3', amount: 300, payment_date: '2026-01-01' },
      { payment_id: 'p_empty', student_id: 's4', amount: 400, payment_date: '' },
    ];

    expect(() => sortPaymentsByDateAscending(payments)).not.toThrow();
    const sorted = sortPaymentsByDateAscending(payments);
    // Valid dates come first in ascending order
    expect(sorted[0].payment_id).toBe('p_valid1');
    expect(sorted[1].payment_id).toBe('p_valid2');
    // Invalid/empty dates are placed at the end deterministically
    const endIds = sorted.slice(2).map((p) => p.payment_id);
    expect(endIds).toContain('p_invalid');
    expect(endIds).toContain('p_empty');
  });

  it('does not mutate the source payments array during sorting', () => {
    const payments: Payment[] = [
      { payment_id: 'p2', student_id: 's1', amount: 200, payment_date: '2026-06-01' },
      { payment_id: 'p1', student_id: 's2', amount: 100, payment_date: '2026-01-01' },
    ];
    const originalOrder = [...payments];
    sortPaymentsByDateAscending(payments);
    expect(payments).toEqual(originalOrder);
  });
});
