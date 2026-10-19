import React, { useState } from 'react';
import { FeeObligationInput } from './feeTypes';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/buttons/Button';
import { toInputDateFormat } from '../../lib/dateFormat';

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
  const [amountDue, setAmountDue] = useState(5000);
  const [dueDate, setDueDate] = useState(toInputDateFormat());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      student_id: studentId,
      description: description.trim(),
      amount_due: Number(amountDue),
      due_date: dueDate,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <FormField label="Fee Description" required>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. March 2026 Tuition"
          style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
        />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <FormField label="Amount Due (₹ INR)" required>
          <input
            type="number"
            min={1}
            step={50}
            value={amountDue}
            onChange={(e) => setAmountDue(parseFloat(e.target.value) || 0)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
          />
        </FormField>
        <FormField label="Due Date" required>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
          />
        </FormField>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
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
