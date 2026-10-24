import React from 'react';
import styles from './weeklyTimeGrid.module.css';
import { DayColumnData, CalendarEventItem } from './calendarTypes';
import { formatTimeTo12Hour } from '../../lib/time12Format';

export interface WeeklyTimeGridProps {
  dayColumns: DayColumnData[];
  startHour?: number;
  endHour?: number;
}

const HOURS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00', '22:00',
];

function getEventCardClass(evt: CalendarEventItem): string {
  if (evt.isCancelled) return styles.cardCancelled;
  if (evt.isPast && !evt.isRecurring) {
    const att = (evt.attendanceStatus || evt.status).toUpperCase();
    if (att === 'PRESENT' || att === 'ATTENDED' || att === 'COMPLETED') return styles.cardAttended;
    if (att === 'ABSENT' || att === 'NO_SHOW') return styles.cardAbsent;
    return styles.cardUnmarked;
  }
  return evt.isRecurring ? styles.recurringCard : styles.sessionCard;
}

export const WeeklyTimeGrid: React.FC<WeeklyTimeGridProps> = ({ dayColumns }) => {
  return (
    <div className={styles.calendarOuter}>
      <div className={styles.scrollContainer}>
        <div className={styles.gridTable}>
          <div className={styles.timeAxis}>
            <div className={styles.timeAxisHeader} />
            {HOURS.map((hourStr) => (
              <div key={hourStr} className={styles.timeSlot}>
                {formatTimeTo12Hour(hourStr)}
              </div>
            ))}
          </div>

          <div className={styles.dayColumnsWrapper}>
            {dayColumns.map((col) => (
              <div key={col.dateKey} className={styles.dayColumn}>
                <div className={`${styles.dayHeader} ${col.isToday ? styles.dayHeaderToday : ''}`}>
                  <span className={styles.dayName}>{col.dayName}</span>
                  <span className={styles.dayNumber}>{col.dayNumber}</span>
                </div>

                <div className={`${styles.dayBody} ${col.isToday ? styles.dayBodyToday : ''}`}>
                  {col.events.map((evt) => {
                    const cardClass = getEventCardClass(evt);
                    const baseMin = 7 * 60;
                    const evtMin = evt.startHour * 60 + evt.startMinute;
                    const diffMin = Math.max(0, evtMin - baseMin);
                    const topPx = Math.round((diffMin / 60) * 56);
                    const heightPx = Math.max(50, Math.round(((evt.durationMinutes || 60) / 60) * 56) - 4);

                    return (
                      <div
                        key={evt.id}
                        className={`${styles.eventCard} ${cardClass}`}
                        style={{
                          position: 'absolute',
                          top: `${topPx}px`,
                          left: '2px',
                          right: '2px',
                          minHeight: `${heightPx}px`,
                          zIndex: evt.isRecurring ? 5 : 6,
                        }}
                        title={`${evt.studentName} — ${evt.subject} (${evt.timeRange12})`}
                      >
                        <div className={styles.eventHeader}>
                          <span className={styles.eventStudent}>{evt.studentName}</span>
                          {evt.isRecurring && <span className={styles.badgeSubtle}>Recurring</span>}
                          {evt.isCancelled && <span className={styles.badgeCancelled}>Cancelled</span>}
                        </div>
                        <span className={styles.eventSubject}>{evt.subject}</span>
                        <span className={styles.eventTime}>{evt.timeRange12}</span>
                        {evt.canJoin && evt.meetingUrl && (
                          <a
                            href={evt.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.joinBtn}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Join Class ↗
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
