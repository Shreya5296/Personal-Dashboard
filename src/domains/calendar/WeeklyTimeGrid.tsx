import React from 'react';
import styles from './weeklyTimeGrid.module.css';
import { DayColumnData } from './calendarTypes';
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

export const WeeklyTimeGrid: React.FC<WeeklyTimeGridProps> = ({ dayColumns }) => {
  return (
    <div className={styles.calendarOuter}>
      <div className={styles.scrollContainer}>
        <div className={styles.gridTable}>
          {/* Time Axis Column */}
          <div className={styles.timeAxis}>
            <div className={styles.timeAxisHeader} />
            {HOURS.map((hourStr) => (
              <div key={hourStr} className={styles.timeSlot}>
                {formatTimeTo12Hour(hourStr)}
              </div>
            ))}
          </div>

          {/* 7 Days Columns */}
          <div className={styles.dayColumnsWrapper}>
            {dayColumns.map((col) => (
              <div key={col.dateKey} className={styles.dayColumn}>
                <div className={`${styles.dayHeader} ${col.isToday ? styles.dayHeaderToday : ''}`}>
                  <span className={styles.dayName}>{col.dayName}</span>
                  <span className={styles.dayNumber}>{col.dayNumber}</span>
                </div>

                <div className={`${styles.dayBody} ${col.isToday ? styles.dayBodyToday : ''}`}>
                  {col.events.map((evt) => {
                    const isRec = evt.isRecurring;
                    const cardClass = isRec ? styles.recurringCard : styles.sessionCard;
                    const badgeClass = isRec ? styles.badgeRecurring : styles.badgeSession;

                    // Compute top offset based on hour (7 AM is base 0)
                    const baseMin = 7 * 60;
                    const evtMin = evt.startHour * 60 + evt.startMinute;
                    const diffMin = Math.max(0, evtMin - baseMin);
                    // 56px per hour (60 min) => ~0.933px per min
                    const topPx = Math.round((diffMin / 60) * 56);
                    const heightPx = Math.max(46, Math.round(((evt.durationMinutes || 60) / 60) * 56) - 4);

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
                          zIndex: isRec ? 5 : 6,
                        }}
                        title={`${evt.studentName} — ${evt.timeRange12} (${evt.topic})`}
                      >
                        <span className={styles.eventTime}>{evt.timeRange12}</span>
                        <span className={styles.eventStudent}>{evt.studentName}</span>
                        <span className={styles.eventTopic}>{evt.topic}</span>
                        <span className={`${styles.badge} ${badgeClass}`}>
                          {isRec ? 'Recurring Slot' : evt.status}
                        </span>
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
