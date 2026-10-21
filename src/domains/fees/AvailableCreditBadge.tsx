import React from 'react';
import { CurrencyCreditSummary } from './creditCalculator';
import { formatCurrency } from '../../lib/currencyFormat';

export interface AvailableCreditBadgeProps {
  summaries: CurrencyCreditSummary[];
  compact?: boolean;
}

export const AvailableCreditBadge: React.FC<AvailableCreditBadgeProps> = ({ summaries, compact = false }) => {
  const credits = summaries.filter((s) => s.unappliedCredit > 0);

  if (credits.length === 0) {
    if (compact) return null;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-xs)',
          backgroundColor: 'var(--color-bg-subtle)',
          color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        <span>Available Credit:</span>
        <strong>₹0</strong>
      </span>
    );
  }

  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
      {credits.map((c) => (
        <span
          key={c.currency}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            backgroundColor: '#dcfce7',
            color: '#15803d',
            border: '1px solid #86efac',
          }}
        >
          <span>Available Credit:</span>
          <span>{c.currency === 'INR' ? formatCurrency(c.unappliedCredit) : `${c.currency} ${c.unappliedCredit.toFixed(2)}`}</span>
        </span>
      ))}
    </div>
  );
};
