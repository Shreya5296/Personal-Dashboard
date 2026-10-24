import React from 'react';
import { FinancialSummary } from './financeTypes';
import { formatCurrency } from '../../lib/currencyFormat';

export interface FinanceSummaryCardsProps {
  summary: FinancialSummary | null;
}

export const FinanceSummaryCards: React.FC<FinanceSummaryCardsProps> = ({ summary }) => {
  const invoiced = summary?.totalInvoiced || 0;
  const collected = summary?.totalCollected || 0;
  const outstanding = summary?.totalOutstanding || 0;
  const collectionRate = invoiced > 0 ? Math.round((collected / invoiced) * 100) : 100;

  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div style={cardStyle}>
          <span style={labelStyle}>Total Invoice</span>
          <div style={amountStyle}>{formatCurrency(invoiced)}</div>
          <p style={descStyle}>Total agreed package value</p>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Collected Earnings</span>
          <div style={{ ...amountStyle, color: '#059669' }}>{formatCurrency(collected)}</div>
          <p style={descStyle}>Received Payments</p>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Total Outstanding</span>
          <div style={{ ...amountStyle, color: outstanding > 0 ? '#dc2626' : 'var(--color-text-muted)' }}>
            {outstanding > 0 ? formatCurrency(outstanding) : 'NIL'}
          </div>
          <p style={descStyle}>Uncollected Balance</p>
        </div>
      </div>

      <div style={progressContainerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
          <span>Collection Performance</span>
          <span style={{ color: '#059669' }}>{collectionRate}% Collected</span>
        </div>
        <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, Math.max(0, collectionRate))}%`,
              backgroundColor: '#059669',
              borderRadius: 'var(--radius-full)',
              transition: 'width 300ms ease',
            }}
          />
        </div>
      </div>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  padding: '1.25rem 1.5rem',
  backgroundColor: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-xl)',
  boxShadow: 'var(--shadow-xs)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-muted)',
  fontWeight: 500,
};

const amountStyle: React.CSSProperties = {
  fontSize: '1.75rem',
  fontWeight: 700,
  margin: '6px 0 4px',
  color: 'var(--color-text-main)',
  fontVariantNumeric: 'tabular-nums',
};

const descStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 'var(--font-size-xs)',
  color: 'var(--color-text-subtle)',
};

const progressContainerStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-xl)',
  padding: '1rem 1.5rem',
  boxShadow: 'var(--shadow-xs)',
};
