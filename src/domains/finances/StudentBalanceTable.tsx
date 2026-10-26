import React from 'react';
import { StudentBalanceRecord } from './financeTypes';
import { DataTable, Column } from '../../components/tables/DataTable';
import { formatCurrency } from '../../lib/currencyFormat';
import { formatDate } from '../../lib/dateFormat';
import { EmptyState } from '../../components/feedback/EmptyState';
import { formatOutstandingBalance } from '../../lib/balanceFormat';

export interface StudentBalanceTableProps {
  records: StudentBalanceRecord[];
}

export const StudentBalanceTable: React.FC<StudentBalanceTableProps> = ({ records }) => {
  if (records.length === 0) {
    return (
      <EmptyState
        title="No student financial records"
        description="No student packages or balances found matching your filters."
      />
    );
  }

  const columns: Column<StudentBalanceRecord>[] = [
    {
      key: 'student_name',
      header: 'Student',
      width: '24%',
      render: (r) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-main)', display: 'block' }}>
            {r.student_name}
          </span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
            {r.student_id}
          </span>
        </div>
      ),
    },
    {
      key: 'totalInvoiced',
      header: 'Agreed Package Value',
      width: '20%',
      render: (r) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {formatCurrency(r.totalInvoiced)}
        </span>
      ),
    },
    {
      key: 'totalPaid',
      header: 'Collected Payments',
      width: '18%',
      render: (r) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#059669' }}>
          {formatCurrency(r.totalPaid)}
        </span>
      ),
    },
    {
      key: 'outstandingBalance',
      header: 'Outstanding Balance',
      width: '18%',
      render: (r) => {
        const out = formatOutstandingBalance(r.outstandingBalance);
        return (
          <span
            style={{
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 700,
              color: out.color,
            }}
          >
            {out.text}
          </span>
        );
      },
    },
    {
      key: 'paymentCount',
      header: 'Transactions',
      width: '20%',
      render: (r) => (
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          {r.paymentCount} payment(s)
          {r.lastPaymentDate ? ` (last: ${formatDate(r.lastPaymentDate)})` : ''}
        </span>
      ),
    },
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
      <DataTable fixedLayout columns={columns} data={records} keyExtractor={(r) => r.student_id} />
    </div>
  );
};
