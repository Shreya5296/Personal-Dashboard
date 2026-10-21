import React, { useState } from 'react';
import { FeeObligationInput } from './feeTypes';
import { validateFeeInput } from './feeValidation';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/buttons/Button';
import { toInputDateFormat } from '../../lib/dateFormat';
import { ApiClientError } from '../../api/apiErrors';
import formStyles from '../../components/forms/forms.module.css';

export interface FeeObligationFormProps {
  studentId: string;
  onSubmit: (input: FeeObligationInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const FeeObligationForm: React.FC<FeeObligationFormProps> = ({
  studentId,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [description, setDescription] = useState('Monthly Tuition Fee');
  const [amountDue, setAmountDue] = useState<number | string>(5000);
  const [dueDate, setDueDate] = useState(toInputDateFormat());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validation = validateFeeInput({
      description,
      amount_due: Number(amountDue),
      due_date: dueDate,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      await onSubmit({
        student_id: studentId,
        description: description.trim(),
        amount_due: Number(amountDue),
        due_date: dueDate,
      });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.details) {
        const fieldErrors: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.details)) {
          if (k === 'obligation_description') fieldErrors.description = String(v);
          else fieldErrors[k] = String(v);
        }
        setErrors(fieldErrors);
      }
      setServerError((err as Error)?.message || 'Failed to create fee obligation');
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {serverError && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-text)', fontSize: 'var(--font-size-sm)' }}>
          ⚠️ {serverError}
        </div>
      )}

      <FormField label="Fee Description" required error={errors.description}>
        <input
          className={formStyles.input}
          type="text"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
          }}
          placeholder="e.g. March 2026 Tuition"
        />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Amount Due (₹ INR)" required error={errors.amount_due}>
          <input
            className={formStyles.input}
            type="number"
            min="1"
            step="any"
            value={amountDue}
            onChange={(e) => {
              setAmountDue(e.target.value === '' ? '' : parseFloat(e.target.value));
              if (errors.amount_due) setErrors((prev) => ({ ...prev, amount_due: '' }));
            }}
            placeholder="5000"
          />
        </FormField>
        <FormField label="Due Date" required error={errors.due_date}>
          <input
            className={formStyles.input}
            type="date"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              if (errors.due_date) setErrors((prev) => ({ ...prev, due_date: '' }));
            }}
          />
        </FormField>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>
          Create Fee Obligation
        </Button>
      </div>
    </form>
  );
};
