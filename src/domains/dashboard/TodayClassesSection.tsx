import React from 'react';
import { ClassSession } from '../classes/classTypes';
import { WeeklyScheduleEntry } from '../classes/scheduleApi';
import { Student } from '../students/studentTypes';
import { MeetingLink } from '../meeting-links/meetingLinkTypes';
import { toInputDateFormat } from '../../lib/dateFormat';
import { generateCalendarEvents, getDateKeyInTz } from './calendarEventGenerator';
import { formatIsoTo12Hour } from '../../lib/time12Format';
import { Button } from '../../components/buttons/Button';

export interface TodayClassesSectionProps {
  classes: ClassSession[];
  schedules?: WeeklyScheduleEntry[];
  students?: Student[];
  meetingLinks?: MeetingLink[];
  activeTz?: string;
}

export const TodayClassesSection: React.FC<TodayClassesSectionProps> = ({
  classes,
  schedules = [],
  students = [],
  meetingLinks = [],
  activeTz = 'Asia/Kolkata',
}) => {
  const todayKey = toInputDateFormat(new Date(), activeTz);

  const allEvents = generateCalendarEvents({
    datedSessions: classes,
    recurringSchedules: schedules,
    students,
    weekDates: [todayKey],
    activeTz,
  });

  const todayClasses = allEvents.filter((c) => {
    const raw = c.start_time || c.scheduled_start;
    if (!raw) return false;
    const parsed = new Date(String(raw).trim().replace(/T\s+(\d:)/, 'T0$1'));
    return getDateKeyInTz(parsed, activeTz) === todayKey;
  });

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.25rem 1.5rem',
        boxShadow: 'var(--shadow-xs)',
        marginTop: 'var(--space-6)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
          Today's Classes
        </h3>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          {todayKey} ({activeTz})
        </span>
      </div>

      {todayClasses.length === 0 ? (
        <div style={{ padding: 'var(--space-4) 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
          No classes scheduled for today.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {todayClasses.map((c, idx) => {
            const rawStart = c.start_time || c.scheduled_start;
            const start12 = formatIsoTo12Hour(rawStart, activeTz);
            const end12 = c.scheduled_end ? formatIsoTo12Hour(c.scheduled_end, activeTz) : '';
            const timeRange = end12 ? `${start12} – ${end12}` : start12;

            const isRec = Boolean((c as unknown as { is_recurring?: boolean }).is_recurring);
            const statusLabel = isRec ? 'Recurring Slot' : (c.status || 'SCHEDULED');

            const linkObj = meetingLinks.find((l) => l.student_id === c.student_id);
            const joinUrl = c.meeting_url || linkObj?.meeting_link_1 || linkObj?.meeting_link_2;

            return (
              <div
                key={`${c.session_id || idx}_${c.student_id || idx}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-subtle)',
                  border: '1px solid var(--color-border-subtle)',
                  flexWrap: 'wrap',
                  gap: 'var(--space-2)',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)', display: 'block' }}>
                    {c.student_name || c.student_id}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    {timeRange} • {c.topic || 'Class Session'} • {statusLabel}
                  </span>
                </div>

                {joinUrl ? (
                  <a
                    href={joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Button variant="primary" size="sm">
                      Join Class ↗
                    </Button>
                  </a>
                ) : (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
                    No meeting link
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
