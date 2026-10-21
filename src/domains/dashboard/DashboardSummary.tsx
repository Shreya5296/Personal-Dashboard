import React from 'react';
import { DashboardOverviewData } from './dashboardTypes';
import { formatCurrency } from '../../lib/currencyFormat';
import { StudentsIcon, ClassesIcon, FeesIcon } from '../../components/icons/NavIcons';

export interface DashboardSummaryProps {
  overview: DashboardOverviewData;
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({ overview }) => {
  const cards = [
    {
      title: 'Active Students',
      value: overview.activeStudentsCount.toLocaleString(),
      description: 'Currently enrolled active learners',
      Icon: StudentsIcon,
      accentColor: 'var(--color-primary)',
      accentBg: 'var(--color-primary-bg)',
    },
    {
      title: 'Upcoming Classes (7 Days)',
      value: overview.classesUpcoming7Days.toLocaleString(),
      description: 'Sessions scheduled in next 7 days',
      Icon: ClassesIcon,
      accentColor: '#059669',
      accentBg: '#ecfdf5',
    },
    {
      title: 'Outstanding Fees',
      value: formatCurrency(overview.outstandingFeesTotal),
      description: 'Unpaid fee balance awaiting collection',
      Icon: FeesIcon,
      accentColor: '#d97706',
      accentBg: '#fffbeb',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
      }}
    >
      {cards.map((c) => {
        const { Icon } = c;
        return (
          <div
            key={c.title}
            style={{
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.25rem 1.5rem',
              boxShadow: 'var(--shadow-xs)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                {c.title}
              </span>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: c.accentBg,
                  color: c.accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={18} />
              </div>
            </div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--color-text-main)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                margin: '4px 0 6px',
              }}
            >
              {c.value}
            </div>
            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
              {c.description}
            </p>
          </div>
        );
      })}
    </div>
  );
};
