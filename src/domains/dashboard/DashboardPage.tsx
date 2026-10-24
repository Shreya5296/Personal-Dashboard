import React from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useDashboardData } from './useDashboardData';
import { generateAttentionAlerts } from './attentionAlerts';
import { ThingsThatNeedAttention } from './ThingsThatNeedAttention';
import { TodayClassesSection } from './TodayClassesSection';
import { DashboardSummary } from './DashboardSummary';
import { DashboardCalendar } from './DashboardCalendar';
import { LoadingState } from '../../components/feedback/LoadingState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Button } from '../../components/buttons/Button';
import { PageHeader } from '../../layout/PageHeader';
import { NavSection } from '../../layout/Sidebar';

export interface DashboardPageProps {
  onNavigate: (section: NavSection) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  usePageTitle('Dashboard');
  const { token } = useAuth();
  const {
    overview,
    classes,
    schedules,
    students,
    packages,
    meetingLinks,
    loading,
    error,
    refreshData,
  } = useDashboardData(token);

  if (loading && !overview) {
    return <LoadingState message="Loading dashboard metrics…" />;
  }

  if (error && !overview) {
    return <ErrorState message={error} onRetry={refreshData} />;
  }

  const defaultOverview = overview || {
    activeStudentsCount: 0,
    classesUpcoming7Days: 0,
    outstandingFeesTotal: 0,
    currency: 'INR',
  };

  const attentionAlerts = generateAttentionAlerts({
    students,
    schedules,
    meetingLinks,
    packages,
  });

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
          <Button variant="secondary" onClick={() => onNavigate('finances')}>
            Review Finances
          </Button>
          <Button variant="secondary" onClick={() => onNavigate('calendar')}>
            View Calendar
          </Button>
        </div>
      </div>

      {/* Priority 1 & 2: Today's Classes with Imminent Class highlighted */}
      <TodayClassesSection
        classes={classes}
        students={students}
        meetingLinks={meetingLinks}
      />

      {/* Priority 3: Things That Need Attention */}
      <ThingsThatNeedAttention
        alerts={attentionAlerts}
        onNavigate={onNavigate}
        error={error}
      />

      {/* Weekly Class Schedule Calendar */}
      <DashboardCalendar
        classes={classes}
        schedules={schedules}
        students={students}
        onRefresh={refreshData}
      />
    </div>
  );
};
