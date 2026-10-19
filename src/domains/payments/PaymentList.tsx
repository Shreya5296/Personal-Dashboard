import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Payment } from './paymentTypes';
import { fetchPayments, voidPayment } from './paymentApi';
import { DataTable, Column } from '../../components/tables/DataTable';
import { formatCurrency } from '../../lib/currencyFormat';
import { formatDate } from '../../lib/dateFormat';
import { formatStatusBadge } from '../../lib/textFormat';
import { Button } from '../../components/buttons/Button';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';

export const PaymentList: React.FC<{ studentId?: string }> = ({ studentId }) => {
  const { token } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleVoid = async (paymentId: string) => {
    if (confirm('Are you sure you want to void this payment record? This will adjust balances.')) {
      await voidPayment(paymentId, token);
      await loadData();
    }
  };

  const columns: Column<Payment>[] = [
    { key: 'payment_date', header: 'Date', render: (p) => formatDate(p.payment_date) },
    { key: 'amount', header: 'Amount', render: (p) => formatCurrency(p.amount) },
    { key: 'payment_method', header: 'Method' },
    { key: 'reference_number', header: 'Reference', render: (p) => p.reference_number || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (p) => {
        const badge = formatStatusBadge(p.status);
        return (
          <span style={{
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            backgroundColor: badge.tone === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            color: badge.tone === 'success' ? 'var(--color-success-text)' : 'var(--color-danger-text)',
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
          <Button variant="outline" onClick={() => handleVoid(p.payment_id)}>
            Void
          </Button>
        ) : null,
    },
  ];

  if (loading) return <LoadingState message="Loading payment transactions…" />;
  if (payments.length === 0) return <EmptyState title="No payments recorded" description="No transactions in the ledger." />;

  return <DataTable columns={columns} data={payments} keyExtractor={(p) => p.payment_id} />;
};
