import React, { useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { useAsyncState } from '../../hooks/useAsyncState';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchDashboardOverview } from './dashboardApi';
import { DashboardSummary } from './DashboardSummary';
import { LoadingState } from '../../components/feedback/LoadingState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Button } from '../../components/buttons/Button';
import { NavSection } from '../../layout/Sidebar';

export interface DashboardPageProps {
  onNavigate: (section: NavSection) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  usePageTitle('Dashboard');
  const { token } = useAuth();
  const { data: overview, loading, error, run } = useAsyncState({
    activeStudentsCount: 0,
    classesUpcoming7Days: 0,
    outstandingFeesTotal: 0,
    currency: 'INR',
  });

  const loadData = () => {
    run(() => fetchDashboardOverview(token));
  };

  useEffect(() => {
    loadData();
  }, [token]);

  if (loading && !overview) {
    return <LoadingState message="Loading dashboard metrics…" />;
  }

  if (error && !overview) {
    return <ErrorState message={error.message} onRetry={loadData} />;
  }

  return (
    <div>
      <DashboardSummary overview={overview || { activeStudentsCount: 0, classesUpcoming7Days: 0, outstandingFeesTotal: 0, currency: 'INR' }} />

      <div style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
      }}>
        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
          Quick Actions
        </h3>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => onNavigate('students')}>
            Manage Students
          </Button>
          <Button variant="secondary" onClick={() => onNavigate('classes')}>
            View Class Schedule
          </Button>
          <Button variant="secondary" onClick={() => onNavigate('fees')}>
            Review Fee Obligations
          </Button>
          <Button variant="outline" onClick={() => onNavigate('imports')}>
            Spreadsheet Import
          </Button>
        </div>
      </div>
    </div>
  );
};
