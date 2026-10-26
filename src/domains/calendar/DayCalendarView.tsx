import React from 'react';
import { CalendarEventItem } from './calendarTypes';
import { EmptyState } from '../../components/feedback/EmptyState';
import { formatDateDdMmYyyy } from '../../lib/dateFormat';
import styles from './weeklyTimeGrid.module.css';

export interface DayCalendarViewProps {
  selectedDateStr: string;
  events: CalendarEventItem[];
  isToday: boolean;
}

export const DayCalendarView: React.FC<DayCalendarViewProps> = ({
  selectedDateStr,
  events,
  isToday,
}) => {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No classes scheduled"
        description={`There are no classes scheduled for ${formatDateDdMmYyyy(selectedDateStr)}.`}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxWidth: '800px', margin: '0 auto' }}>
      {isToday && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-xs)', fontWeight: 600, width: 'fit-content' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }} /> Today
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {events.map((evt) => {
          const isCancelled = evt.isCancelled;
          const isAbsent = evt.attendanceStatus === 'ABSENT' || evt.attendanceStatus === 'NO_SHOW';
          const isCompleted = evt.status === 'COMPLETED' || evt.attendanceStatus === 'PRESENT' || evt.attendanceStatus === 'ATTENDED';
          const isPastCompleted = (evt.isPast && isCompleted) || (isCompleted && !isCancelled);

          return (
            <div
              key={evt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                backgroundColor: isCancelled || isAbsent ? '#fef2f2' : isPastCompleted ? '#f1f8f4' : 'var(--color-bg-surface)',
                border: isCancelled || isAbsent ? '1px solid #fecaca' : isPastCompleted ? '1px solid #d1fae5' : isToday ? '1px solid #bfdbfe' : '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: isPastCompleted ? 'none' : 'var(--shadow-xs)',
                opacity: isCancelled || isAbsent ? 0.82 : isPastCompleted ? 0.68 : 1,
                filter: isPastCompleted ? 'saturate(0.75)' : undefined,
                gap: 'var(--space-4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ minWidth: '120px', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: isPastCompleted ? '#166534' : isCancelled || isAbsent ? '#991b1b' : 'var(--color-text-main)', fontFamily: 'monospace' }}>
                    {evt.startTime12}
                  </span>
                  <span style={{ fontSize: '11px', color: isPastCompleted ? '#15803d' : isCancelled || isAbsent ? '#b91c1c' : 'var(--color-text-muted)' }}>
                    until {evt.endTime12} ({evt.durationMinutes} min)
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: isPastCompleted ? '#166534' : isCancelled || isAbsent ? '#991b1b' : 'var(--color-text-main)' }}>
                      {evt.studentName}
                    </span>
                    {evt.isRecurring && (
                      <span className={styles.badgeSubtle}>Recurring</span>
                    )}
                  </div>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: isPastCompleted ? '#15803d' : isCancelled || isAbsent ? '#b91c1c' : 'var(--color-text-muted)' }}>
                    {evt.subject}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    backgroundColor: isCancelled ? '#fee2e2' : isCompleted ? '#dcfce7' : '#f1f5f9',
                    color: isCancelled ? '#991b1b' : isCompleted ? '#166534' : '#475569',
                    border: isCancelled ? '1px solid #fecaca' : isCompleted ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                  }}
                >
                  {isCancelled ? 'Cancelled' : isCompleted ? 'Completed' : evt.status}
                </span>

                {evt.canJoin && evt.meetingUrl && (
                  <a
                    href={evt.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.joinBtn}
                    style={{ textDecoration: 'none' }}
                  >
                    Join Class ↗
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
