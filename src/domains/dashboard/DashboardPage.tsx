import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchDashboardOverview } from './dashboardApi';
import { fetchClasses } from '../classes/classApi';
import { fetchFeeObligations } from '../fees/feeApi';
import { DashboardSummary } from './DashboardSummary';
import { DashboardFollowUps } from './DashboardFollowUps';
import { ClassSession } from '../classes/classTypes';
import { FeeObligation } from '../fees/feeTypes';
import { LoadingState } from '../../components/feedback/LoadingState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Button } from '../../components/buttons/Button';
import { PageHeader } from '../../layout/PageHeader';
import { NavSection } from '../../layout/Sidebar';
import { DashboardOverviewData } from './dashboardTypes';

export interface DashboardPageProps {
  onNavigate: (section: NavSection) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  usePageTitle('Dashboard');
  const { token } = useAuth();
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [fees, setFees] = useState<FeeObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, cls, feeList] = await Promise.all([
        fetchDashboardOverview(token),
        fetchClasses(undefined, token).catch(() => []),
        fetchFeeObligations(undefined, token).catch(() => []),
      ]);
      setOverview(ov);
      setClasses(cls);
      setFees(feeList);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  if (loading && !overview) {
    return <LoadingState message="Loading dashboard metrics…" />;
  }

  if (error && !overview) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const defaultOverview = overview || {
    activeStudentsCount: 0,
    classesUpcoming7Days: 0,
    outstandingFeesTotal: 0,
    currency: 'INR',
  };

  return (
    <div>
      <PageHeader
        title="Administrative Dashboard"
        subtitle="Operational overview of student enrollments, upcoming class sessions, and pending collections."
      />

      <DashboardSummary overview={defaultOverview} />

      <div
        style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.25rem 1.5rem',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: '0 0 var(--space-3)' }}>
          Quick Actions
        </h3>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => onNavigate('students')}>
            + Manage Students
          </Button>
          <Button variant="secondary" onClick={() => onNavigate('classes')}>
            + Schedule Class
          </Button>
          <Button variant="secondary" onClick={() => onNavigate('fees')}>
            Review Fee Obligations
          </Button>
          <Button variant="outline" onClick={() => onNavigate('imports')}>
            Spreadsheet Import
          </Button>
        </div>
      </div>

      <DashboardFollowUps classes={classes} fees={fees} onNavigate={onNavigate} />
    </div>
  );
};
