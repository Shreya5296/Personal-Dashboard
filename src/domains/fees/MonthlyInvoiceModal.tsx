import React, { useState, useMemo } from 'react';
import { Student } from '../students/studentTypes';
import { FeeObligation } from './feeTypes';
import { createFeeObligation } from './feeApi';
import { generateInvoiceCandidates, candidateToFeeInput } from './monthlyInvoiceGenerator';
import { Button } from '../../components/buttons/Button';
import { formatCurrency } from '../../lib/currencyFormat';

export interface MonthlyInvoiceModalProps {
  students: Student[];
  existingFees: FeeObligation[];
  token?: string | null;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export const MonthlyInvoiceModal: React.FC<MonthlyInvoiceModalProps> = ({
  students,
  existingFees,
  token,
  onClose,
  onSuccess,
}) => {
  const [period, setPeriod] = useState('November 2026');
  const [dueDate, setDueDate] = useState('2026-11-05');
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(
    () => generateInvoiceCandidates(students, existingFees, period),
    [students, existingFees, period]
  );

  const eligibleCandidates = candidates.filter((c) => !c.isDuplicate);
  const totalAmount = eligibleCandidates.reduce((sum, c) => sum + c.amount, 0);

  const handleGenerate = async () => {
    if (!confirmed || eligibleCandidates.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      let createdCount = 0;
      for (const cand of eligibleCandidates) {
        const input = candidateToFeeInput(cand, dueDate);
        await createFeeObligation(input, token);
        createdCount++;
      }
      onSuccess(createdCount);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed during invoice generation. Safe to retry un-invoiced records.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--space-4)' }}>
      <div style={{ backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-lg)', maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-3)' }}>
          <h3 style={{ margin: 0 }}>Generate Monthly Invoices</h3>
          <button type="button" onClick={onClose} disabled={isSubmitting} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
        </div>

        {error && <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>⚠️ {error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '4px' }}>Billing Period</label>
            <input type="text" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '4px' }}>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }} />
          </div>
        </div>

        <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead style={{ backgroundColor: 'var(--color-bg-subtle)', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px' }}>Student</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Basis</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Amount</th>
                <th style={{ textAlign: 'center', padding: '8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.studentId} style={{ borderTop: '1px solid var(--color-border-subtle)', opacity: c.isDuplicate ? 0.6 : 1 }}>
                  <td style={{ padding: '8px' }}>{c.studentName}</td>
                  <td style={{ padding: '8px' }}>{c.basis}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(c.amount)}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, backgroundColor: c.isDuplicate ? '#fef3c7' : '#dcfce7', color: c.isDuplicate ? '#92400e' : '#15803d' }}>
                      {c.isDuplicate ? 'Already Invoiced' : 'Eligible'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ backgroundColor: 'var(--color-bg-subtle)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
          <span>Eligible Students: <strong>{eligibleCandidates.length}</strong> / {candidates.length}</span>
          <span>Total: <strong>{formatCurrency(totalAmount)}</strong> ({eligibleCandidates[0]?.currency || 'INR'})</span>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={eligibleCandidates.length === 0 || isSubmitting} />
          <span>I confirm generation of <strong>{eligibleCandidates.length}</strong> invoices for {period}.</span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-3)' }}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button variant="primary" onClick={handleGenerate} disabled={!confirmed || eligibleCandidates.length === 0 || isSubmitting} isLoading={isSubmitting}>
            Generate Invoices ({eligibleCandidates.length})
          </Button>
        </div>
      </div>
    </div>
  );
};
