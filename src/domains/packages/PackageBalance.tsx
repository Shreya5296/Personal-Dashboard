import React from 'react';
import { PackageBalanceData } from './packageTypes';

export interface PackageBalanceProps {
  balance: PackageBalanceData;
}

export const PackageBalance: React.FC<PackageBalanceProps> = ({ balance }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 'var(--space-3)',
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-xl)',
        marginBottom: 'var(--space-5)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 500, display: 'block' }}>Purchased</span>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
          {balance.totalPurchased}
        </div>
      </div>
      <div>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 500, display: 'block' }}>Consumed</span>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
          {balance.totalConsumed}
        </div>
      </div>
      <div>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 500, display: 'block' }}>Restored</span>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
          {balance.totalRestored}
        </div>
      </div>
      <div>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 500, display: 'block' }}>Remaining</span>
        <div
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            marginTop: '2px',
            fontVariantNumeric: 'tabular-nums',
            color: balance.remainingClasses > 2 ? '#059669' : '#dc2626',
          }}
        >
          {balance.remainingClasses} classes
        </div>
      </div>
    </div>
  );
};
