import React, { useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { FeeObligationList } from './FeeObligationList';
import { PaymentList } from '../payments/PaymentList';

export const FeesPage: React.FC = () => {
  usePageTitle('Fees & Payments Ledger');
  const [tab, setTab] = useState<'fees' | 'payments'>('fees');

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--color-border-subtle)', marginBottom: 'var(--space-4)' }}>
        <button
          type="button"
          onClick={() => setTab('fees')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            background: 'none',
            fontWeight: tab === 'fees' ? 600 : 500,
            color: tab === 'fees' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            borderBottom: tab === 'fees' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          Fee Invoices & Obligations
        </button>
        <button
          type="button"
          onClick={() => setTab('payments')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            background: 'none',
            fontWeight: tab === 'payments' ? 600 : 500,
            color: tab === 'payments' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            borderBottom: tab === 'payments' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          Payment Ledger
        </button>
      </div>

      {tab === 'fees' ? <FeeObligationList /> : <PaymentList />}
    </div>
  );
};
