import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { FeeObligation, FeeObligationInput } from './feeTypes';
import { fetchFeeObligations, createFeeObligation, voidFeeObligation } from './feeApi';
import { fetchPayments, recordPayment } from '../payments/paymentApi';
import { calculateStudentCredits, CurrencyCreditSummary } from './creditCalculator';
import { AvailableCreditBadge } from './AvailableCreditBadge';
import { FeeObligationForm } from './FeeObligationForm';
import { PaymentForm } from '../payments/PaymentForm';
import { PaymentInput } from '../payments/paymentTypes';
import { DataTable } from '../../components/tables/DataTable';
import { Button } from '../../components/buttons/Button';
import { ConfirmDialog } from '../../components/overlays/ConfirmDialog';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';
import { getFeeColumns } from './feeColumns';

export const FeeObligationList: React.FC<{ studentId?: string }> = ({ studentId }) => {
  const { token } = useAuth();
  const [fees, setFees] = useState<FeeObligation[]>([]);
  const [credits, setCredits] = useState<CurrencyCreditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [payingFee, setPayingFee] = useState<FeeObligation | null>(null);
  const [voidingFeeId, setVoidingFeeId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [feeData, payData] = await Promise.all([
        fetchFeeObligations(studentId, token),
        fetchPayments(studentId, undefined, token).catch(() => []),
      ]);
      setFees(feeData);
      setCredits(calculateStudentCredits(feeData, payData, studentId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [studentId, token]);

  const handleCreate = async (input: FeeObligationInput) => {
    setFormLoading(true);
    setSuccessMessage(null);
    try {
      await createFeeObligation(input, token);
      setIsAdding(false);
      setSuccessMessage('Fee obligation created successfully.');
      await loadData();
    } finally {
      setFormLoading(false);
    }
  };

  const handleRecordPayment = async (input: PaymentInput) => {
    setFormLoading(true);
    setSuccessMessage(null);
    setPaymentError(null);
    try {
      await recordPayment(input, token);
      setPayingFee(null);
      setSuccessMessage('Payment recorded successfully.');
      await loadData();
    } catch (err: unknown) {
      setPaymentError((err as Error).message || 'Failed to record payment');
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmVoid = async () => {
    if (!voidingFeeId) return;
    setFormLoading(true);
    try {
      await voidFeeObligation(voidingFeeId, token);
      setVoidingFeeId(null);
      await loadData();
    } finally {
      setFormLoading(false);
    }
  };

  const columns = getFeeColumns({ onPay: setPayingFee, onVoid: (id) => setVoidingFeeId(id) });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Fee Obligations & Invoices</h4>
          <AvailableCreditBadge summaries={credits} />
        </div>
        {studentId && (
          <Button variant="secondary" size="sm" onClick={() => { setIsAdding(!isAdding); setSuccessMessage(null); }}>
            {isAdding ? 'Cancel' : '+ New Fee Obligation'}
          </Button>
        )}
      </div>

      {successMessage && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-success-text)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✓ {successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {isAdding && studentId && (
        <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-5)', boxShadow: 'var(--shadow-sm)' }}>
          <FeeObligationForm studentId={studentId} onSubmit={handleCreate} onCancel={() => setIsAdding(false)} isLoading={formLoading} />
        </div>
      )}

      {payingFee && (
        <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-5)', boxShadow: 'var(--shadow-sm)' }}>
          <h4 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Record Payment for {payingFee.description}</h4>
          {paymentError && (
            <div style={{ color: 'var(--color-danger-text)', padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-danger-bg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-xs)' }}>
              ⚠️ {paymentError}
            </div>
          )}
          <PaymentForm studentId={payingFee.student_id} feeId={payingFee.fee_id || payingFee.fee_obligation_id} defaultAmount={payingFee.outstanding_balance} onSubmit={handleRecordPayment} onCancel={() => { setPayingFee(null); setPaymentError(null); }} isLoading={formLoading} />
        </div>
      )}

      {loading && <LoadingState message="Loading fee obligations…" />}
      {!loading && fees.length === 0 && <EmptyState title="No fee obligations" description="No invoices or pending obligations found." />}
      {!loading && fees.length > 0 && <DataTable columns={columns} data={fees} keyExtractor={(f) => f.fee_id || f.fee_obligation_id || Math.random().toString()} />}

      <ConfirmDialog
        isOpen={Boolean(voidingFeeId)}
        title="Void Fee Obligation?"
        message="Are you sure you want to void this fee obligation? This will remove the balance due and mark the invoice as void."
        confirmLabel="Void Obligation"
        isDestructive
        isLoading={formLoading}
        onConfirm={handleConfirmVoid}
        onCancel={() => setVoidingFeeId(null)}
      />
    </div>
  );
};
