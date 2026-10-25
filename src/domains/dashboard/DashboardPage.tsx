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

      {/* 1. Today's Classes */}
      <TodayClassesSection
        classes={classes}
        students={students}
        meetingLinks={meetingLinks}
      />

      {/* 2, 3, 4. Summary metrics: Active Students, Upcoming Classes (7 Days), Outstanding Fees */}
      <DashboardSummary overview={defaultOverview} />

      {/* 5. Weekly Class Schedule */}
      <DashboardCalendar
        classes={classes}
        schedules={schedules}
        students={students}
        onRefresh={refreshData}
      />

      {/* 6. Things That Need Attention */}
      <ThingsThatNeedAttention
        alerts={attentionAlerts}
        onNavigate={onNavigate}
        error={error}
      />
    </div>
  );
};
