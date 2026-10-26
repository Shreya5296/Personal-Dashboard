import React from 'react';
import { Payment } from './financeTypes';
import { DataTable, Column } from '../../components/tables/DataTable';
import { formatCurrency } from '../../lib/currencyFormat';
import { formatDate } from '../../lib/dateFormat';
import { EmptyState } from '../../components/feedback/EmptyState';

export interface FinancialHistoryTableProps {
  payments: Payment[];
  onVoid?: (paymentId: string) => void;
}

export const FinancialHistoryTable: React.FC<FinancialHistoryTableProps> = ({
  payments,
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
      key: 'student_id',
      header: 'Student ID',
      width: '20%',
      render: (p) => (
        <span style={{ fontSize: 'var(--font-size-xs)', fontFamily: 'monospace', color: 'var(--color-text-subtle)' }}>
          {p.student_id || '—'}
        </span>
      ),
    },
    {
      key: 'student_name',
      header: 'Student Name',
      width: '35%',
      render: (p) => (
        <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
          {p.student_name || p.student_id || '—'}
        </span>
      ),
    },
    {
      key: 'payment_date',
      header: 'Date',
      width: '22%',
      render: (p) => formatDate(p.payment_date),
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '23%',
      render: (p) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#059669' }}>
          {formatCurrency(p.amount, true, p.currency)}
        </span>
      ),
    },
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
      <DataTable fixedLayout columns={columns} data={payments} keyExtractor={(p) => p.payment_id} />
    </div>
  );
};
