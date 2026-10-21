import { Student } from '../students/studentTypes';
import { FeeObligation, FeeObligationInput } from './feeTypes';

export interface MonthlyInvoiceCandidate {
  studentId: string;
  studentName: string;
  periodLabel: string;
  basis: string;
  sessionCount: number;
  amount: number;
  currency: string;
  isDuplicate: boolean;
  duplicateReason?: string;
  idempotencyKey: string;
}

export function generateInvoiceCandidates(
  students: Student[],
  existingFees: FeeObligation[],
  periodLabel: string,
  defaultMonthlyAmount: number = 5000
): MonthlyInvoiceCandidate[] {
  const periodKey = periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');

  return students
    .filter((s) => s.status === 'ACTIVE')
    .map((s) => {
      const idempotencyKey = `inv_monthly_${s.student_id}_${periodKey}`;

      // Duplicate check: student already has an active fee for this period description or idempotency
      const duplicate = existingFees.find(
        (f) =>
          f.student_id === s.student_id &&
          f.status !== 'VOID' &&
          (f.description.toLowerCase().includes(periodLabel.toLowerCase()) ||
            (f.notes && f.notes.includes(idempotencyKey)))
      );

      return {
        studentId: s.student_id,
        studentName: s.full_name,
        periodLabel,
        basis: 'Monthly Retainer',
        sessionCount: 0,
        amount: defaultMonthlyAmount,
        currency: 'INR',
        isDuplicate: Boolean(duplicate),
        duplicateReason: duplicate ? `Already invoiced (${duplicate.description})` : undefined,
        idempotencyKey,
      };
    });
}

export function candidateToFeeInput(
  candidate: MonthlyInvoiceCandidate,
  dueDate: string
): FeeObligationInput {
  return {
    student_id: candidate.studentId,
    description: `${candidate.periodLabel} Tuition`,
    amount_due: candidate.amount,
    due_date: dueDate,
    notes: `Generated via Monthly Billing. IdempotencyKey: ${candidate.idempotencyKey}`,
  };
}
