import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Payment } from './paymentTypes';
import { fetchPayments, voidPayment } from './paymentApi';
import { DataTable, Column } from '../../components/tables/DataTable';
import { formatCurrency } from '../../lib/currencyFormat';
import { formatDate } from '../../lib/dateFormat';
import { formatStatusBadge } from '../../lib/textFormat';
import { Button } from '../../components/buttons/Button';
import { ConfirmDialog } from '../../components/overlays/ConfirmDialog';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';

export const PaymentList: React.FC<{ studentId?: string }> = ({ studentId }) => {
  const { token } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPayments(studentId, undefined, token);
      setPayments(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId, token]);

  const handleConfirmVoid = async () => {
    if (!voidingId) return;
    setIsVoiding(true);
    try {
      await voidPayment(voidingId, token);
      setVoidingId(null);
      await loadData();
    } finally {
      setIsVoiding(false);
    }
  };

  const columns: Column<Payment>[] = [
    { key: 'payment_date', header: 'Date', render: (p) => formatDate(p.payment_date) },
    { key: 'amount', header: 'Amount', render: (p) => <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{formatCurrency(p.amount)}</span> },
    { key: 'payment_method', header: 'Method', render: (p) => <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg-subtle)' }}>{p.payment_method}</span> },
    { key: 'reference_number', header: 'Reference #', render: (p) => <code>{p.reference_number || '—'}</code> },
    {
      key: 'status',
      header: 'Status',
      render: (p) => {
        const badge = formatStatusBadge(p.status);
        const isSuccess = badge.tone === 'success';
        return (
          <span style={{
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            backgroundColor: isSuccess ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            color: isSuccess ? 'var(--color-success-text)' : 'var(--color-danger-text)',
            border: `1px solid ${isSuccess ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
          }}>
            {badge.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (p) =>
        p.status !== 'VOID' ? (
          <Button variant="outline" size="sm" onClick={() => setVoidingId(p.payment_id)}>
            Void
          </Button>
        ) : null,
    },
  ];

  if (loading) return <LoadingState message="Loading payment transactions…" />;
  if (payments.length === 0) return <EmptyState title="No payments recorded" description="No transactions in the ledger." />;

  return (
    <>
      <DataTable columns={columns} data={payments} keyExtractor={(p) => p.payment_id} />
      <ConfirmDialog
        isOpen={Boolean(voidingId)}
        title="Void Payment Record?"
        message="Are you sure you want to void this payment record? This will restore any associated fee balances and cannot be undone."
        confirmLabel="Void Payment"
        isDestructive
        isLoading={isVoiding}
        onConfirm={handleConfirmVoid}
        onCancel={() => setVoidingId(null)}
      />
    </>
  );
};
