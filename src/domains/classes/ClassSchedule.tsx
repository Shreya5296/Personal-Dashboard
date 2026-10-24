import React from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { ClassSession, AttendanceStatus } from './classTypes';
import { recordAttendance, restoreCredit } from './classApi';
import { MeetingLinkAction } from './MeetingLinkAction';
import { AttendanceControl } from './AttendanceControl';
import { DataTable, Column } from '../../components/tables/DataTable';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Button } from '../../components/buttons/Button';
import { useClassScheduleData } from './useClassScheduleData';
import { formatIsoTo12Hour, formatDateTime12Hour } from '../../lib/time12Format';
import { formatWeeklySchedule } from '../students/scheduleFormatter';
import { toInputDateFormat } from '../../lib/dateFormat';
import { getDateKeyInTz } from '../dashboard/calendarEventGenerator';

export const ClassSchedule: React.FC<{ studentId?: string; onRefreshTrigger?: number }> = ({
  studentId,
}) => {
  const { token } = useAuth();
  const {
    sessions, loading, refetch,
    getStudentConsumedClasses, getStudentSchedule, getStudentMeetingLink,
  } = useClassScheduleData(studentId, token);

  const todayKey = toInputDateFormat(new Date(), 'Asia/Kolkata');

  const handleUpdateStatus = async (sessionId: string, outcome: AttendanceStatus) => {
    await recordAttendance(sessionId, outcome, token);
    await refetch();
  };

  const handleRestore = async (sessionId: string) => {
    await restoreCredit(sessionId, 'Admin manual credit restoration', token);
    await refetch();
  };

  const columns: Column<ClassSession>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (c) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: 'var(--font-size-sm)', display: 'block' }}>
            {c.student_name || c.student_id}
          </span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            {c.topic || c.class_title || 'Class Session'}
          </span>
        </div>
      ),
    },
    {
      key: 'start_time',
      header: 'Scheduled Date & Time',
      render: (c) => {
        const raw = c.scheduled_start || c.start_time;
        const start12 = formatDateTime12Hour(raw, 'Asia/Kolkata');
        const end12 = c.scheduled_end ? formatIsoTo12Hour(c.scheduled_end, 'Asia/Kolkata') : '';
        return (
          <div>
            <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: 'var(--font-size-sm)', display: 'block' }}>
              {end12 ? `${start12} – ${end12}` : start12}
            </span>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Duration: {c.duration_minutes || 60} min
            </span>
          </div>
        );
      },
    },
    {
      key: 'recurring_slot',
      header: 'Recurring Slot',
      render: (c) => {
        const sched = getStudentSchedule(c.student_id);
        const text = formatWeeklySchedule(sched);
        return (
          <span style={{ fontSize: 'var(--font-size-xs)', color: sched.length > 0 ? 'var(--color-text-main)' : 'var(--color-text-subtle)' }}>
            {text}
          </span>
        );
      },
    },
    {
      key: 'consumed',
      header: 'Classes Consumed',
      render: (c) => {
        const { consumed, purchased } = getStudentConsumedClasses(c.student_id);
        return (
          <div>
            <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)' }}>
              {consumed} / {purchased || '—'}
            </span>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {purchased ? `${Math.max(0, purchased - consumed)} remaining` : 'No package'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'join',
      header: 'Meeting / Join',
      render: (c) => {
        const raw = c.scheduled_start || c.start_time;
        const d = raw ? new Date(String(raw).trim().replace(/T\s+(\d:)/, 'T0$1')) : null;
        const isToday = d ? getDateKeyInTz(d, 'Asia/Kolkata') === todayKey : false;
        const linkObj = getStudentMeetingLink(c.student_id);
        const joinUrl = c.meeting_url || linkObj?.meeting_link_1 || linkObj?.meeting_link_2;

        if (isToday && joinUrl) {
          return (
            <a href={joinUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="sm">Join Class ↗</Button>
            </a>
          );
        }
        return <MeetingLinkAction url={joinUrl} />;
      },
    },
    {
      key: 'attendance',
      header: 'Attendance / Action',
      render: (c) => (
        <AttendanceControl
          status={c.status}
          creditEffect={c.class_credit_effect}
          onUpdateStatus={(outcome) => handleUpdateStatus(c.session_id, outcome)}
          onRestoreCredit={() => handleRestore(c.session_id)}
        />
      ),
    },
  ];

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
