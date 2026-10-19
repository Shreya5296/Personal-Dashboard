import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { FinancialSummary, ReportFilter } from './reportTypes';
import { fetchFinancialSummary } from './reportApi';
import { ReportFilters } from './ReportFilters';
import { ExportAction } from './ExportAction';
import { formatCurrency } from '../../lib/currencyFormat';
import { LoadingState } from '../../components/feedback/LoadingState';

export const ReportsPage: React.FC = () => {
  usePageTitle('Financial Reports');
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
      `Total Collected,${summary.totalCollected}\n` +
      `Total Outstanding,${summary.totalOutstanding}\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial_summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <LoadingState message="Generating financial reports…" />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <ReportFilters filter={filter} onChange={setFilter} />
        <ExportAction onExport={handleExport} label="Export Summary CSV" />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
      }}>
        <div style={{ padding: 'var(--space-5)', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Total Invoiced</span>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, margin: 'var(--space-2) 0' }}>
            {formatCurrency(summary?.totalInvoiced)}
          </div>
        </div>
        <div style={{ padding: 'var(--space-5)', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Total Collected</span>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, margin: 'var(--space-2) 0', color: 'var(--color-primary)' }}>
            {formatCurrency(summary?.totalCollected)}
          </div>
        </div>
        <div style={{ padding: 'var(--space-5)', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Total Outstanding</span>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, margin: 'var(--space-2) 0', color: 'var(--color-danger)' }}>
            {formatCurrency(summary?.totalOutstanding)}
          </div>
        </div>
      </div>
    </div>
  );
};
