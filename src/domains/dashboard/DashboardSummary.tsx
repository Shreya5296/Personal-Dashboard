import React from 'react';
import { DashboardOverviewData } from './dashboardTypes';
import { formatCurrency } from '../../lib/currencyFormat';

export interface DashboardSummaryProps {
  overview: DashboardOverviewData;
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({ overview }) => {
  const cards = [
    {
      title: 'Active Students',
      value: overview.activeStudentsCount.toString(),
      description: 'Currently enrolled active students',
    },
    {
      title: 'Upcoming Classes (7 Days)',
      value: overview.classesUpcoming7Days.toString(),
      description: 'Scheduled sessions across all students',
    },
    {
      title: 'Outstanding Fees',
      value: formatCurrency(overview.outstandingFeesTotal),
      description: 'Unpaid fee balance awaiting collection',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: 'var(--space-4)',
      marginBottom: 'var(--space-6)',
    }}>
      {cards.map((c) => (
        <div
          key={c.title}
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
          }}
        >
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            {c.title}
          </span>
          <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, margin: 'var(--space-2) 0', color: 'var(--color-primary)' }}>
            {c.value}
          </div>
          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            {c.description}
          </p>
        </div>
      ))}
    </div>
  );
};
