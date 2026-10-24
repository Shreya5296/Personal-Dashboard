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
import { AddPaymentModal } from './AddPaymentModal';
import { useFinancesData } from './useFinancesData';
import { exportFinancesCsv } from './financeCsvExport';

export const FinancesPage: React.FC = () => {
  usePageTitle('Finances');
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<FinanceTab>('balances');
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const {
    summary,
    packages,
    filteredPayments,
    studentBalances,
    loading,
    filter,
    setFilter,
    voidingId,
    setVoidingId,
    isVoiding,
    handleConfirmVoid,
    refresh,
  } = useFinancesData(token);

  if (loading && !summary) {
    return <LoadingState message="Loading financial records…" />;
  }

  const handlePaymentSuccess = async (msg: string) => {
    setIsAddPaymentOpen(false);
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 5000);
    await refresh();
  };

  return (
    <div>
      <PageHeader
        title="Finances"
        subtitle="Unified ledger of agreed packages, received tuition, pending balances, and student payment history."
      />
      {successBanner && <div style={successBannerStyle}>✓ {successBanner}</div>}
      <FinanceSummaryCards summary={summary} />
      <FinanceToolbar
        filter={filter}
        onFilterChange={setFilter}
        onExportCsv={() => exportFinancesCsv(summary, filteredPayments)}
        onAddPayment={() => setIsAddPaymentOpen(true)}
      />

      <div role="tablist" aria-label="Finances ledger views" style={tabContainerStyle}>
        <button
          type="button"
          role="tab"
          id="tab-balances"
          aria-selected={activeTab === 'balances'}
          aria-controls="panel-balances"
          tabIndex={activeTab === 'balances' ? 0 : -1}
          onClick={() => setActiveTab('balances')}
          style={getTabButtonStyle(activeTab === 'balances')}
        >
          Student Balances ({studentBalances.length})
        </button>
        <button
          type="button"
          role="tab"
          id="tab-history"
          aria-selected={activeTab === 'history'}
          aria-controls="panel-history"
          tabIndex={activeTab === 'history' ? 0 : -1}
          onClick={() => setActiveTab('history')}
          style={getTabButtonStyle(activeTab === 'history')}
        >
          Payment History ({filteredPayments.length})
        </button>
      </div>

      {activeTab === 'balances' ? (
        <div id="panel-balances" role="tabpanel" aria-labelledby="tab-balances">
          <StudentBalanceTable records={studentBalances} />
        </div>
      ) : (
        <div id="panel-history" role="tabpanel" aria-labelledby="tab-history">
          <FinancialHistoryTable payments={filteredPayments} onVoid={setVoidingId} />
        </div>
      )}

      <AddPaymentModal
        isOpen={isAddPaymentOpen}
        token={token}
        packages={packages}
        onClose={() => setIsAddPaymentOpen(false)}
        onSuccess={handlePaymentSuccess}
      />

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
  display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--color-border-subtle)', marginBottom: 'var(--space-4)',
};

const successBannerStyle: React.CSSProperties = {
  padding: '10px 14px', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0',
  borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', fontWeight: 500,
};

function getTabButtonStyle(isActive: boolean): React.CSSProperties {
  return {
    padding: '0.625rem 1rem', border: 'none', background: 'none',
    fontWeight: isActive ? 600 : 500, fontSize: 'var(--font-size-sm)',
    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
    borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
    cursor: 'pointer', transition: 'color 120ms ease, border-color 120ms ease',
  };
}
