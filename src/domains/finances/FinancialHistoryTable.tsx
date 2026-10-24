import React from 'react';
import { Payment } from './financeTypes';
import { DataTable, Column } from '../../components/tables/DataTable';
import { formatCurrency } from '../../lib/currencyFormat';
import { formatDate } from '../../lib/dateFormat';
import { formatStatusBadge } from '../../lib/textFormat';
import { Button } from '../../components/buttons/Button';
import { EmptyState } from '../../components/feedback/EmptyState';

export interface FinancialHistoryTableProps {
  payments: Payment[];
  onVoid: (paymentId: string) => void;
}

export const FinancialHistoryTable: React.FC<FinancialHistoryTableProps> = ({
  payments,
  onVoid,
}) => {
  if (payments.length === 0) {
    return (
      <EmptyState
        title="No payment records found"
        description="No transaction records matched your search or date filter."
      />
    );
  }

  const columns: Column<Payment>[] = [
    {
      key: 'student_name',
      header: 'Student',
      render: (p) => (
        <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
          {p.student_name || p.student_id || '—'}
        </span>
      ),
    },
    {
      key: 'payment_date',
      header: 'Date',
      render: (p) => formatDate(p.payment_date),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (p) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#059669' }}>
          {formatCurrency(p.amount)}
        </span>
      ),
    },
    {
      key: 'payment_method',
      header: 'Method',
      render: (p) => (
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 500,
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-bg-subtle)',
          }}
        >
          {p.payment_method || 'Payment'}
        </span>
      ),
    },
    {
      key: 'reference_number',
      header: 'Reference #',
      render: (p) => <code>{p.reference_number || p.payment_id || '—'}</code>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => {
        const badge = formatStatusBadge(p.status || p.payment_status || 'RECORDED');
        const isSuccess = badge.tone === 'success';
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              backgroundColor: isSuccess ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              color: isSuccess ? 'var(--color-success-text)' : 'var(--color-danger-text)',
              border: `1px solid ${isSuccess ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
            }}
          >
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
          <Button variant="outline" size="sm" onClick={() => onVoid(p.payment_id)}>
            Void
          </Button>
        ) : (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>Voided</span>
        ),
    },
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
      <DataTable columns={columns} data={payments} keyExtractor={(p) => p.payment_id} />
    </div>
  );
};
