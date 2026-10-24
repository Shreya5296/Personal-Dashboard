import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { PageHeader } from '../../layout/PageHeader';
import { LoadingState } from '../../components/feedback/LoadingState';
import { ConfirmDialog } from '../../components/overlays/ConfirmDialog';
import { FinanceTab } from './financeTypes';
import { FinanceSummaryCards } from './FinanceSummaryCards';
import { FinanceToolbar } from './FinanceToolbar';
import { FinancialHistoryTable } from './FinancialHistoryTable';
import { StudentBalanceTable } from './StudentBalanceTable';
import { useFinancesData } from './useFinancesData';
import { exportFinancesCsv } from './financeCsvExport';

export const FinancesPage: React.FC = () => {
  usePageTitle('Finances');
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<FinanceTab>('history');

  const {
    summary,
    filteredPayments,
    studentBalances,
    loading,
    filter,
    setFilter,
    voidingId,
    setVoidingId,
    isVoiding,
    handleConfirmVoid,
  } = useFinancesData(token);

  if (loading && !summary) {
    return <LoadingState message="Loading financial records…" />;
  }

  const handleExport = () => {
    exportFinancesCsv(summary, filteredPayments);
  };

  return (
    <div>
      <PageHeader
        title="Finances"
        subtitle="Unified ledger of agreed packages, received tuition, pending balances, and student payment history."
      />

      <FinanceSummaryCards summary={summary} />

      <FinanceToolbar
        filter={filter}
        onFilterChange={setFilter}
        onExportCsv={handleExport}
      />

      <div style={tabContainerStyle}>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          style={getTabButtonStyle(activeTab === 'history')}
        >
          Payment History ({filteredPayments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('balances')}
          style={getTabButtonStyle(activeTab === 'balances')}
        >
          Student Balances ({studentBalances.length})
        </button>
      </div>

      {activeTab === 'history' ? (
        <FinancialHistoryTable
          payments={filteredPayments}
          onVoid={setVoidingId}
        />
      ) : (
        <StudentBalanceTable records={studentBalances} />
      )}

      <ConfirmDialog
        isOpen={Boolean(voidingId)}
        title="Void Payment Record?"
        message="Are you sure you want to void this payment record? This action will adjust the financial ledger and cannot be undone."
        confirmLabel="Void Payment"
        isDestructive
        isLoading={isVoiding}
        onConfirm={handleConfirmVoid}
        onCancel={() => setVoidingId(null)}
      />
    </div>
  );
};

const tabContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--space-2)',
  borderBottom: '1px solid var(--color-border-subtle)',
  marginBottom: 'var(--space-4)',
};

function getTabButtonStyle(isActive: boolean): React.CSSProperties {
  return {
    padding: '0.625rem 1rem',
    border: 'none',
    background: 'none',
    fontWeight: isActive ? 600 : 500,
    fontSize: 'var(--font-size-sm)',
    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
    borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'color 120ms ease, border-color 120ms ease',
  };
}
