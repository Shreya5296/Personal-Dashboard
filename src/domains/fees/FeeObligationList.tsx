import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { FeeObligation, FeeObligationInput } from './feeTypes';
import { fetchFeeObligations, createFeeObligation, voidFeeObligation } from './feeApi';
import { FeeStatus } from './FeeStatus';
import { FeeObligationForm } from './FeeObligationForm';
import { PaymentForm } from '../payments/PaymentForm';
import { recordPayment } from '../payments/paymentApi';
import { PaymentInput } from '../payments/paymentTypes';
import { DataTable, Column } from '../../components/tables/DataTable';
import { formatCurrency } from '../../lib/currencyFormat';
import { formatDate } from '../../lib/dateFormat';
import { Button } from '../../components/buttons/Button';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';

export const FeeObligationList: React.FC<{ studentId?: string }> = ({ studentId }) => {
  const { token } = useAuth();
  const [fees, setFees] = useState<FeeObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [payingFee, setPayingFee] = useState<FeeObligation | null>(null);
  const [formLoading, setFormLoading] = useState(false);

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
    try {
      await createFeeObligation(input, token);
      setIsAdding(false);
      await loadData();
    } finally {
      setFormLoading(false);
    }
  };

  const handleRecordPayment = async (input: PaymentInput) => {
    setFormLoading(true);
    try {
      await recordPayment(input, token);
      setPayingFee(null);
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

  const columns: Column<FeeObligation>[] = [
    { key: 'description', header: 'Description' },
    { key: 'amount_due', header: 'Amount Due', render: (f) => formatCurrency(f.amount_due) },
    { key: 'amount_paid', header: 'Paid', render: (f) => formatCurrency(f.amount_paid) },
    { key: 'outstanding_balance', header: 'Outstanding', render: (f) => formatCurrency(f.outstanding_balance) },
    { key: 'due_date', header: 'Due Date', render: (f) => formatDate(f.due_date) },
    { key: 'status', header: 'Status', render: (f) => <FeeStatus status={f.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (f) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {f.status !== 'VOID' && f.outstanding_balance > 0 && (
            <Button variant="primary" onClick={() => setPayingFee(f)}>
              Pay
            </Button>
          )}
          {f.status !== 'VOID' && f.amount_paid === 0 && (
            <Button variant="outline" onClick={() => handleVoid(f.fee_id)}>
              Void
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h4 style={{ margin: 0 }}>Fee Obligations & Invoices</h4>
        {studentId && (
          <Button variant="secondary" onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? 'Cancel' : '+ New Fee Obligation'}
          </Button>
        )}
      </div>

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
