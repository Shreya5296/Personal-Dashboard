import { describe, it, expect } from 'vitest';
import { validateFeeInput } from '../../src/domains/fees/feeValidation';

describe('Fee Validation & Input Processing', () => {
  it('accepts valid fee inputs including ₹5,000', () => {
    const res = validateFeeInput({
      description: 'Term 1 Tuition',
      amount_due: 5000,
      due_date: '2026-11-01',
    });
    expect(res.isValid).toBe(true);
    expect(Object.keys(res.errors)).toHaveLength(0);
  });

  it('accepts fractional positive INR amounts', () => {
    const res = validateFeeInput({
      description: 'Lab Materials Fee',
      amount_due: 1250.50,
      due_date: '2026-11-15',
    });
    expect(res.isValid).toBe(true);
    expect(Object.keys(res.errors)).toHaveLength(0);
  });

  it('rejects zero, negative, or invalid amounts with a clear message', () => {
    const zeroRes = validateFeeInput({
      description: 'Term 1',
      amount_due: 0,
      due_date: '2026-11-01',
    });
    expect(zeroRes.isValid).toBe(false);
    expect(zeroRes.errors.amount_due).toBe('Amount due must be a positive number greater than zero.');

    const negRes = validateFeeInput({
      description: 'Term 1',
      amount_due: -500,
      due_date: '2026-11-01',
    });
    expect(negRes.isValid).toBe(false);
    expect(negRes.errors.amount_due).toBe('Amount due must be a positive number greater than zero.');

    const nanRes = validateFeeInput({
      description: 'Term 1',
      amount_due: NaN,
      due_date: '2026-11-01',
    });
    expect(nanRes.isValid).toBe(false);
    expect(nanRes.errors.amount_due).toBe('Amount due must be a positive number greater than zero.');
  });

  it('rejects empty or whitespace-only description', () => {
    const emptyDesc = validateFeeInput({
      description: '   ',
      amount_due: 5000,
      due_date: '2026-11-01',
    });
    expect(emptyDesc.isValid).toBe(false);
    expect(emptyDesc.errors.description).toBe('Fee description is required.');
  });

  it('rejects missing or empty due date', () => {
    const emptyDate = validateFeeInput({
      description: 'Monthly Tuition',
      amount_due: 5000,
      due_date: '',
    });
    expect(emptyDate.isValid).toBe(false);
    expect(emptyDate.errors.due_date).toBe('Valid due date is required (YYYY-MM-DD).');
  });
});
