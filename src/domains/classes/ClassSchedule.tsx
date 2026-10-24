import React from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { AttendanceStatus } from './classTypes';
import { recordAttendance, restoreCredit } from './classApi';
import { DataTable } from '../../components/tables/DataTable';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useClassScheduleData } from './useClassScheduleData';
import { toInputDateFormat } from '../../lib/dateFormat';
import { buildClassScheduleColumns } from './classScheduleColumns';

export const ClassSchedule: React.FC<{ studentId?: string; onRefreshTrigger?: number }> = ({ studentId }) => {
  const { token } = useAuth();
  const {
    sessions, loading, refetch, getStudentConsumedClasses, getStudentMeetingLink,
  } = useClassScheduleData(studentId, token);

  const todayKey = toInputDateFormat(new Date(), 'Asia/Kolkata');
  const nowMs = Date.now();

  const handleUpdateStatus = async (sessionId: string, outcome: string) => {
    await recordAttendance(sessionId, outcome as AttendanceStatus, token);
    await refetch();
  };

  const handleRestore = async (sessionId: string) => {
    await restoreCredit(sessionId, 'Admin manual credit restoration', token);
    await refetch();
  };

  const columns = buildClassScheduleColumns({
    todayKey, nowMs, getStudentConsumedClasses, getStudentMeetingLink,
    handleUpdateStatus, handleRestore,
  });

  if (loading) return <LoadingState message="Loading class schedule…" />;
  if (sessions.length === 0) {
    return (
      <EmptyState
        title={studentId ? 'No classes scheduled for this student' : 'No classes scheduled'}
        description={studentId ? 'This student currently has no upcoming or historical class sessions.' : 'No upcoming or historical class sessions found.'}
      />
    );
  }

  return <DataTable columns={columns} data={sessions} keyExtractor={(c) => c.session_id} />;
};
