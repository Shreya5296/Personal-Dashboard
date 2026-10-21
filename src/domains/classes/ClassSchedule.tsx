import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { ClassSession, AttendanceStatus } from './classTypes';
import { fetchClasses, recordAttendance, restoreCredit } from './classApi';
import { MeetingLinkAction } from './MeetingLinkAction';
import { AttendanceControl } from './AttendanceControl';
import { DataTable, Column } from '../../components/tables/DataTable';
import { formatDateTime } from '../../lib/dateFormat';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';

export const ClassSchedule: React.FC<{ studentId?: string }> = ({ studentId }) => {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchClasses(studentId, token);
      setSessions(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId, token]);

  const handleUpdateStatus = async (sessionId: string, outcome: AttendanceStatus) => {
    await recordAttendance(sessionId, outcome, token);
    await loadData();
  };

  const handleRestore = async (sessionId: string) => {
    await restoreCredit(sessionId, 'Admin manual credit restoration', token);
    await loadData();
  };

  const columns: Column<ClassSession>[] = [
    {
      key: 'start_time',
      header: 'Scheduled Date & Time',
      render: (c) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: 'var(--font-size-sm)', display: 'block' }}>
            {formatDateTime(c.start_time)}
          </span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Duration: {c.duration_minutes} min
          </span>
        </div>
      ),
    },
    {
      key: 'topic',
      header: 'Session Topic',
      render: (c) => (
        <div>
          <span style={{ fontWeight: 500, color: 'var(--color-text-main)', fontSize: 'var(--font-size-sm)' }}>
            {c.topic || 'Class Session'}
          </span>
          {c.student_name && (
            <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              {c.student_name}
            </span>
          )}
        </div>
      ),
    },
    { key: 'meeting', header: 'Meeting Link', render: (c) => <MeetingLinkAction url={c.meeting_url} /> },
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
  if (sessions.length === 0) return <EmptyState title="No classes scheduled" description="No upcoming or historical class sessions found." />;

  return <DataTable columns={columns} data={sessions} keyExtractor={(c) => c.session_id} />;
};
