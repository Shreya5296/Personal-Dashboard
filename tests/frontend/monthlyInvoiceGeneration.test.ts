import { describe, it, expect } from 'vitest';
import {
  generateInvoiceCandidates,
  candidateToFeeInput,
} from '../../src/domains/fees/monthlyInvoiceGenerator';
import { Student } from '../../src/domains/students/studentTypes';
import { FeeObligation } from '../../src/domains/fees/feeTypes';

describe('Monthly Invoice Generation with Preview and Duplicate Protection', () => {
  const mockStudents: Student[] = [
    { student_id: 'stu_1', full_name: 'Ananya Verma', status: 'ACTIVE' },
    { student_id: 'stu_2', full_name: 'Devansh Joshi', status: 'ACTIVE' },
    { student_id: 'stu_3', full_name: 'Isha Nair', status: 'ARCHIVED' }, // Inactive should be skipped
  ];

  it('generates invoice candidates for active students only', () => {
    const candidates = generateInvoiceCandidates(mockStudents, [], 'November 2026');
    expect(candidates).toHaveLength(2);
    expect(candidates.map((c) => c.studentId)).toEqual(['stu_1', 'stu_2']);
    expect(candidates[0].periodLabel).toBe('November 2026');
    expect(candidates[0].amount).toBe(5000);
    expect(candidates[0].currency).toBe('INR');
    expect(candidates[0].isDuplicate).toBe(false);
  });

  it('detects existing invoice as duplicate and marks it clearly', () => {
    const existingFees: FeeObligation[] = [
      {
        fee_id: 'fee_existing_1',
        student_id: 'stu_1',
        description: 'November 2026 Tuition',
        amount_due: 5000,
        amount_paid: 0,
        outstanding_balance: 5000,
        status: 'PENDING',
        due_date: '2026-11-05',
      },
    ];

    const candidates = generateInvoiceCandidates(mockStudents, existingFees, 'November 2026');
    expect(candidates).toHaveLength(2);

    const stu1Candidate = candidates.find((c) => c.studentId === 'stu_1')!;
    expect(stu1Candidate.isDuplicate).toBe(true);
    expect(stu1Candidate.duplicateReason).toContain('Already invoiced');

    const stu2Candidate = candidates.find((c) => c.studentId === 'stu_2')!;
    expect(stu2Candidate.isDuplicate).toBe(false);
  });

  it('generates deterministic idempotency keys for each candidate', () => {
    const candidates = generateInvoiceCandidates(mockStudents, [], 'December 2026');
    expect(candidates[0].idempotencyKey).toBe('inv_monthly_stu_1_december_2026');
    expect(candidates[1].idempotencyKey).toBe('inv_monthly_stu_2_december_2026');
  });

  it('transforms candidate into fee input with audit trail and idempotency', () => {
    const candidates = generateInvoiceCandidates(mockStudents, [], 'November 2026');
    const feeInput = candidateToFeeInput(candidates[0], '2026-11-05');

    expect(feeInput.student_id).toBe('stu_1');
    expect(feeInput.description).toBe('November 2026 Tuition');
    expect(feeInput.amount_due).toBe(5000);
    expect(feeInput.due_date).toBe('2026-11-05');
    expect(feeInput.notes).toContain('IdempotencyKey: inv_monthly_stu_1_november_2026');
  });
});
