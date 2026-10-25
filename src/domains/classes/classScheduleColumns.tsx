import { ClassSession } from './classTypes';
import { Column } from '../../components/tables/DataTable';
import { AttendanceControl } from './AttendanceControl';
import { Button } from '../../components/buttons/Button';
import { formatIsoTo12Hour } from '../../lib/time12Format';
import { getDateKeyInTz } from '../dashboard/calendarEventGenerator';

export function formatClassDate(rawIso?: string): string {
  if (!rawIso) return '—';
  try {
    const d = new Date(String(rawIso).trim().replace(/T\s+(\d:)/, 'T0$1'));
    if (isNaN(d.getTime())) return String(rawIso);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    }).format(d);
  } catch { return String(rawIso); }
}

export function buildClassScheduleColumns(params: {
  todayKey: string;
  nowMs: number;
  getStudentConsumedClasses: (id: string) => { consumed: number; purchased: number };
  getStudentMeetingLink: (id: string) => { meeting_link_1?: string; meeting_link_2?: string } | undefined;
  handleUpdateStatus: (sessionId: string, outcome: string) => Promise<void>;
  handleRestore: (sessionId: string) => Promise<void>;
}): Column<ClassSession>[] {
  const { todayKey, nowMs, getStudentConsumedClasses, getStudentMeetingLink, handleUpdateStatus, handleRestore } = params;

  return [
    {
      key: 'student', header: 'Student',
      render: (c) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: 'var(--font-size-sm)', display: 'block' }}>
            {c.student_name || c.student_id}
          </span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            {c.subject || c.topic || c.class_title || 'Class Session'}
          </span>
        </div>
      ),
    },
    {
      key: 'date', header: 'Weekday & Date',
      render: (c) => (
        <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: 'var(--font-size-sm)' }}>
          {formatClassDate(c.scheduled_start || c.start_time)}
        </span>
      ),
    },
    {
      key: 'start_time', header: 'Class Time',
      render: (c) => {
        const raw = c.scheduled_start || c.start_time;
        const start12 = formatIsoTo12Hour(raw, 'Asia/Kolkata');
        return (
          <div>
            <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: 'var(--font-size-sm)', display: 'block' }}>
              {start12}
            </span>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{c.duration_minutes || 60} min</span>
          </div>
        );
      },
    },
    {
      key: 'consumed', header: 'Consumed / Purchased',
      render: (c) => {
        const { consumed, purchased } = getStudentConsumedClasses(c.student_id);
        const rem = Math.max(0, purchased - consumed);
        return (
          <div>
            <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)' }}>{consumed} / {purchased || '—'}</span>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)' }}>{purchased ? `${rem} remaining` : 'No package'}</span>
          </div>
        );
      },
    },
    {
      key: 'join', header: 'Join Class',
      render: (c) => {
        const raw = c.scheduled_start || c.start_time;
        const d = raw ? new Date(String(raw).trim().replace(/T\s+(\d:)/, 'T0$1')) : null;
        const sessionDateKey = d ? getDateKeyInTz(d, 'Asia/Kolkata') : '';
        const isToday = sessionDateKey === todayKey;
        const isPast = d ? (sessionDateKey < todayKey || (isToday && d.getTime() < nowMs)) : false;
        const isFuture = d ? sessionDateKey > todayKey : false;
        const status = (c.session_status || c.status || '').toUpperCase();
        const isCompleted = status === 'COMPLETED';
        const isCancelled = status === 'CANCELLED';
        const linkObj = getStudentMeetingLink(c.student_id);
        const joinUrl = c.meeting_url || linkObj?.meeting_link_1 || linkObj?.meeting_link_2;

        if (isToday && !isCompleted && !isCancelled && joinUrl) {
          return (
            <a href={joinUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="sm">Join Class ↗</Button>
            </a>
          );
        }
        if (isCancelled) return <span style={{ fontSize: 'var(--font-size-xs)', color: '#dc2626', fontWeight: 600 }}>Cancelled</span>;
        if (isCompleted) return <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Completed</span>;
        if (!joinUrl) return <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>No link</span>;
        return <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>{isPast ? 'Past class' : isFuture ? 'Upcoming' : 'Scheduled'}</span>;
      },
    },
    {
      key: 'attendance', header: 'Attendance',
      render: (c) => (
        <AttendanceControl
          status={c.status}
          creditEffect={c.class_credit_effect || 'PENDING'}
          onUpdateStatus={(outcome) => handleUpdateStatus(c.session_id, outcome)}
          onRestoreCredit={() => handleRestore(c.session_id)}
        />
      ),
    },
  ];
}
