import { FeeObligationInput } from './feeTypes';

export interface FeeValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateFeeInput(input: Partial<FeeObligationInput>): FeeValidationResult {
  const errors: Record<string, string> = {};

  if (!input.description || !input.description.trim()) {
    errors.description = 'Fee description is required.';
  }

  const amt = Number(input.amount_due);
  if (isNaN(amt) || amt <= 0) {
    errors.amount_due = 'Amount due must be a positive number greater than zero.';
  }

  if (!input.due_date || !/^\d{4}-\d{2}-\d{2}$/.test(input.due_date)) {
    errors.due_date = 'Valid due date is required (YYYY-MM-DD).';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
