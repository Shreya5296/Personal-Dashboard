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
    { key: 'start_time', header: 'Scheduled Time', render: (c) => formatDateTime(c.start_time) },
    { key: 'topic', header: 'Topic', render: (c) => c.topic || 'Class Session' },
    { key: 'duration_minutes', header: 'Duration', render: (c) => `${c.duration_minutes} min` },
    { key: 'meeting', header: 'Meeting', render: (c) => <MeetingLinkAction url={c.meeting_url} /> },
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
  if (sessions.length === 0) return <EmptyState title="No classes scheduled" description="No upcoming or past class sessions found." />;

  return <DataTable columns={columns} data={sessions} keyExtractor={(c) => c.session_id} />;
};
