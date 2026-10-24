import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { FinancialSummary, ReportFilter } from './reportTypes';
import { fetchFinancialSummary } from './reportApi';
import { ReportFilters } from './ReportFilters';
import { ExportAction } from './ExportAction';
import { formatCurrency } from '../../lib/currencyFormat';
import { LoadingState } from '../../components/feedback/LoadingState';
import { PageHeader } from '../../layout/PageHeader';

export const ReportsPage: React.FC = () => {
  usePageTitle('Earnings');
  const { token } = useAuth();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReportFilter>({});

  useEffect(() => {
    fetchFinancialSummary(token)
      .then((data) => setSummary(data))
      .finally(() => setLoading(false));
  }, [token]);

  const handleExport = () => {
    if (!summary) return;
    const csvContent = 'data:text/csv;charset=utf-8,Metric,Amount\n' +
      `Total Invoiced,${summary.totalInvoiced}\n` +
      `Collected Earnings,${summary.totalCollected}\n` +
      `Total Outstanding,${summary.totalOutstanding}\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `earnings_summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <LoadingState message="Loading earnings overview…" />;

  const invoiced = summary?.totalInvoiced || 0;
  const collected = summary?.totalCollected || 0;
  const outstanding = summary?.totalOutstanding || 0;
  const collectionRate = invoiced > 0 ? Math.round((collected / invoiced) * 100) : 100;

  return (
    <div>
      <PageHeader
        title="Earnings Overview"
        subtitle="Ledger summary of collected tuition earnings, invoiced fees, and outstanding balances."
        actions={<ExportAction onExport={handleExport} label="Export Earnings CSV" />}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <ReportFilters filter={filter} onChange={setFilter} />
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          Collection Rate: <strong style={{ color: 'var(--color-primary)' }}>{collectionRate}%</strong>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div style={{ padding: '1.25rem 1.5rem', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xs)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontWeight: 500 }}>Total Invoiced</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '6px 0 4px', color: 'var(--color-text-main)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(invoiced)}
          </div>
          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>Total billed tuition obligations</p>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xs)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontWeight: 500 }}>Collected Earnings</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '6px 0 4px', color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(collected)}
          </div>
          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>Actual received tuition payments</p>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xs)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontWeight: 500 }}>Total Outstanding</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '6px 0 4px', color: outstanding > 0 ? '#dc2626' : 'var(--color-text-main)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(outstanding)}
          </div>
          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>Uncollected receivables due for settlement</p>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-xl)', padding: '1.25rem 1.5rem', boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
          <span>Collection Performance</span>
          <span>{collectionRate}% Collected</span>
        </div>
        <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, collectionRate)}%`, backgroundColor: '#059669', borderRadius: 'var(--radius-full)', transition: 'width 300ms ease' }} />
        </div>
      </div>
    </div>
  );
};
