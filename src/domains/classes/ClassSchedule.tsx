import React, { useMemo } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { AttendanceStatus, ClassSession } from './classTypes';
import { recordAttendance, restoreCredit } from './classApi';
import { DataTable } from '../../components/tables/DataTable';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useClassScheduleData } from './useClassScheduleData';
import { toInputDateFormat } from '../../lib/dateFormat';
import { buildClassScheduleColumns } from './classScheduleColumns';
import { buildSessionProgressMap } from './sessionProgressCalculator';
import { getSessionStatusStyle } from './sessionStatusStyles';

export const ClassSchedule: React.FC<{ studentId?: string; onRefreshTrigger?: number }> = ({ studentId }) => {
  const { token } = useAuth();
  const {
    sessions, packages, loading, refetch, getStudentConsumedClasses, getStudentMeetingLink,
  } = useClassScheduleData(studentId, token);

  const todayKey = toInputDateFormat(new Date(), 'Asia/Kolkata');
  const nowMs = Date.now();

  const progressMap = useMemo(() => buildSessionProgressMap(sessions, packages), [sessions, packages]);

  const getProgress = (s: ClassSession) => {
    return progressMap.get(s.session_id) || progressMap.get(`${s.student_id}__${s.schedule_date}__${s.schedule_time}`);
  };

  const handleUpdateStatus = async (sessionId: string, outcome: string) => {
    await recordAttendance(sessionId, outcome as AttendanceStatus, token);
    await refetch();
  };

  const handleRestore = async (sessionId: string) => {
    await restoreCredit(sessionId, 'Admin manual credit restoration', token);
    await refetch();
  };

  const columns = buildClassScheduleColumns({
    todayKey, nowMs, getStudentConsumedClasses, getStudentMeetingLink, getProgress,
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

  const rowStyle = (session: ClassSession) => {
    const statusCfg = getSessionStatusStyle(session.session_status || session.status, session.attendance_status);
    return statusCfg.rowBg !== 'transparent' ? { backgroundColor: statusCfg.rowBg } : undefined;
  };

  return <DataTable fixedLayout minWidth="920px" columns={columns} data={sessions} keyExtractor={(c) => c.session_id} rowStyle={rowStyle} />;
};
