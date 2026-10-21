import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../auth/AuthProvider';
import { FeeObligationList } from './FeeObligationList';
import { PaymentList } from '../payments/PaymentList';
import { Button } from '../../components/buttons/Button';
import { PageHeader } from '../../layout/PageHeader';
import { MonthlyInvoiceModal } from './MonthlyInvoiceModal';
import { fetchStudents } from '../students/studentApi';
import { fetchFeeObligations } from './feeApi';
import { Student } from '../students/studentTypes';
import { FeeObligation } from './feeTypes';

export const FeesPage: React.FC = () => {
  usePageTitle('Fees & Payments Ledger');
  const { token } = useAuth();
  const [tab, setTab] = useState<'fees' | 'payments'>('fees');
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<FeeObligation[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (showMonthlyModal) {
      Promise.all([
        fetchStudents({ status: 'ACTIVE' }, token).catch(() => []),
        fetchFeeObligations(undefined, token).catch(() => []),
      ]).then(([stus, feeList]) => {
        setStudents(stus);
        setFees(feeList);
      });
    }
  }, [showMonthlyModal, token]);

  const handleMonthlySuccess = (count: number) => {
    setBanner(`Successfully generated ${count} monthly invoice(s).`);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div>
      <PageHeader
        title="Fees & Payments Ledger"
        subtitle="Manage monthly tuition invoices, outstanding fee balances, and verified payment transactions."
        actions={
          tab === 'fees' ? (
            <Button variant="primary" onClick={() => setShowMonthlyModal(true)}>
              ⚡ Generate Monthly Invoices
            </Button>
          ) : undefined
        }
      />

      <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--color-border-subtle)', marginBottom: 'var(--space-4)' }}>
        <button
          type="button"
          onClick={() => setTab('fees')}
          style={{
            padding: '0.625rem 1rem',
            border: 'none',
            background: 'none',
            fontWeight: tab === 'fees' ? 600 : 500,
            fontSize: 'var(--font-size-sm)',
            color: tab === 'fees' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            borderBottom: tab === 'fees' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'color 120ms ease, border-color 120ms ease',
          }}
        >
          Fee Invoices & Obligations
        </button>
        <button
          type="button"
          onClick={() => setTab('payments')}
          style={{
            padding: '0.625rem 1rem',
            border: 'none',
            background: 'none',
            fontWeight: tab === 'payments' ? 600 : 500,
            fontSize: 'var(--font-size-sm)',
            color: tab === 'payments' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            borderBottom: tab === 'payments' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'color 120ms ease, border-color 120ms ease',
          }}
        >
          Payment Transactions
        </button>
      </div>

      {banner && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-success-text)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✓ {banner}</span>
          <button type="button" onClick={() => setBanner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {tab === 'fees' ? <FeeObligationList key={refreshKey} /> : <PaymentList />}

      {showMonthlyModal && (
        <MonthlyInvoiceModal
          students={students}
          existingFees={fees}
          token={token}
          onClose={() => setShowMonthlyModal(false)}
          onSuccess={handleMonthlySuccess}
        />
      )}
    </div>
  );
};
