import React, { useState } from 'react';
import { PaymentInput } from './paymentTypes';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/buttons/Button';
import { toInputDateFormat } from '../../lib/dateFormat';
import formStyles from '../../components/forms/forms.module.css';

export interface PaymentFormProps {
  studentId: string;
  feeId?: string;
  defaultAmount?: number;
  onSubmit: (input: PaymentInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  studentId,
  feeId,
  defaultAmount = 5000,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [amount, setAmount] = useState(defaultAmount);
  const [paymentDate, setPaymentDate] = useState(toInputDateFormat());
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const idempotencyKey = `pay_idem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await onSubmit({
      student_id: studentId,
      fee_id: feeId || undefined,
      amount: Number(amount),
      payment_date: paymentDate,
      payment_method: paymentMethod,
      reference_number: referenceNumber.trim() || undefined,
      idempotency_key: idempotencyKey,
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Amount Paid (₹ INR)" required>
          <input
            className={formStyles.input}
            type="number"
            min="1"
            step="any"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          />
        </FormField>
        <FormField label="Payment Date" required>
          <input
            className={formStyles.input}
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Payment Method" required>
          <select
            className={formStyles.select}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
            <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS)</option>
            <option value="CASH">Cash</option>
            <option value="CHEQUE">Cheque</option>
          </select>
        </FormField>
        <FormField label="Transaction / Reference #">
          <input
            className={formStyles.input}
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="e.g. UPI Ref / UTR / Cheque #"
          />
        </FormField>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>
          Record Payment
        </Button>
      </div>
    </form>
  );
};
