import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { FeeObligation, FeeObligationInput } from './feeTypes';
import { fetchFeeObligations, createFeeObligation, voidFeeObligation } from './feeApi';
import { FeeObligationForm } from './FeeObligationForm';
import { PaymentForm } from '../payments/PaymentForm';
import { recordPayment } from '../payments/paymentApi';
import { PaymentInput } from '../payments/paymentTypes';
import { DataTable } from '../../components/tables/DataTable';
import { Button } from '../../components/buttons/Button';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';
import { getFeeColumns } from './feeColumns';

export const FeeObligationList: React.FC<{ studentId?: string }> = ({ studentId }) => {
  const { token } = useAuth();
  const [fees, setFees] = useState<FeeObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [payingFee, setPayingFee] = useState<FeeObligation | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchFeeObligations(studentId, token);
      setFees(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId, token]);

  const handleCreate = async (input: FeeObligationInput) => {
    setFormLoading(true);
    setSuccessMessage(null);
    try {
      await createFeeObligation(input, token);
      setIsAdding(false);
      setSuccessMessage(`Fee obligation of ₹${input.amount_due.toLocaleString('en-IN')} created successfully.`);
      await loadData();
    } finally {
      setFormLoading(false);
    }
  };

  const handleRecordPayment = async (input: PaymentInput) => {
    setFormLoading(true);
    setSuccessMessage(null);
    try {
      await recordPayment(input, token);
      setPayingFee(null);
      setSuccessMessage(`Payment of ₹${input.amount.toLocaleString('en-IN')} recorded successfully.`);
      await loadData();
    } finally {
      setFormLoading(false);
    }
  };

  const handleVoid = async (feeId: string) => {
    if (confirm('Are you sure you want to void this fee obligation?')) {
      await voidFeeObligation(feeId, token);
      await loadData();
    }
  };

  const columns = getFeeColumns({ onPay: setPayingFee, onVoid: handleVoid });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h4 style={{ margin: 0 }}>Fee Obligations & Invoices</h4>
        {studentId && (
          <Button variant="secondary" onClick={() => { setIsAdding(!isAdding); setSuccessMessage(null); }}>
            {isAdding ? 'Cancel' : '+ New Fee Obligation'}
          </Button>
        )}
      </div>

      {successMessage && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#dcfce7',
          border: '1px solid #22c55e',
          borderRadius: 'var(--radius-md)',
          color: '#15803d',
          fontSize: '0.875rem',
          marginBottom: 'var(--space-4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>✓ {successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {isAdding && studentId && (
        <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          <FeeObligationForm studentId={studentId} onSubmit={handleCreate} onCancel={() => setIsAdding(false)} isLoading={formLoading} />
        </div>
      )}

      {payingFee && (
        <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          <h4 style={{ margin: '0 0 var(--space-3)' }}>Record Payment for {payingFee.description}</h4>
          <PaymentForm
            studentId={payingFee.student_id}
            feeId={payingFee.fee_id}
            defaultAmount={payingFee.outstanding_balance}
            onSubmit={handleRecordPayment}
            onCancel={() => setPayingFee(null)}
            isLoading={formLoading}
          />
        </div>
      )}

      {loading && <LoadingState message="Loading fee obligations…" />}
      {!loading && fees.length === 0 && <EmptyState title="No fee obligations" description="No invoices or pending obligations found." />}
      {!loading && fees.length > 0 && <DataTable columns={columns} data={fees} keyExtractor={(f) => f.fee_id} />}
    </div>
  );
};
