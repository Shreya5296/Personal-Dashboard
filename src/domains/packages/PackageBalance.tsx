import React from 'react';
import { PackageBalanceData } from './packageTypes';

export interface PackageBalanceProps {
  balance: PackageBalanceData;
}

export const PackageBalance: React.FC<PackageBalanceProps> = ({ balance }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 'var(--space-3)',
      backgroundColor: 'var(--color-bg-subtle)',
      padding: 'var(--space-4)',
      borderRadius: 'var(--radius-lg)',
      marginBottom: 'var(--space-4)',
    }}>
      <div>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Purchased</span>
        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>{balance.totalPurchased}</div>
      </div>
      <div>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Attended / Consumed</span>
        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text-main)' }}>
          {balance.totalConsumed}
        </div>
      </div>
      <div>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Restored Credits</span>
        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
          {balance.totalRestored}
        </div>
      </div>
      <div>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Remaining Classes</span>
        <div style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 700,
          color: balance.remainingClasses > 2 ? 'var(--color-primary)' : 'var(--color-danger)',
        }}>
          {balance.remainingClasses}
        </div>
      </div>
    </div>
  );
};
