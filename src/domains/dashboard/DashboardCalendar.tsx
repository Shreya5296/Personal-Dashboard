import React, { useState } from 'react';
import styles from './dashboardCalendar.module.css';
import { ClassSession } from '../classes/classTypes';
import { WeeklyScheduleEntry } from '../classes/scheduleApi';
import { Student } from '../students/studentTypes';
import { getSavedTimezone } from '../../lib/userPreferences';
import { formatTimeOnly, toInputDateFormat } from '../../lib/dateFormat';
import { Button } from '../../components/buttons/Button';
import {
  getMondayForDateStr,
  shiftMondayStr,
  getWeekDates,
  generateCalendarEvents,
  getDateKeyInTz,
} from './calendarEventGenerator';

export interface DashboardCalendarProps {
  classes: ClassSession[];
  schedules?: WeeklyScheduleEntry[];
  students?: Student[];
  onRefresh?: () => void;
}

export const DashboardCalendar: React.FC<DashboardCalendarProps> = ({
  classes,
  schedules = [],
  students = [],
  onRefresh,
}) => {
  const activeTz = getSavedTimezone();
  const [mondayStr, setMondayStr] = useState<string>(() =>
    getMondayForDateStr(toInputDateFormat(new Date(), activeTz))
  );

  const weekDates = getWeekDates(mondayStr);
  const sundayStr = weekDates[6];
  const todayKey = toInputDateFormat(new Date(), activeTz);

  const allEvents = generateCalendarEvents({
    datedSessions: classes,
    recurringSchedules: schedules,
    students,
    weekDates,
    activeTz,
  });

  const rangeText = `${mondayStr} – ${sundayStr} (${activeTz})`;

  const handlePrev = () => setMondayStr((prev) => shiftMondayStr(prev, -7));
  const handleNext = () => setMondayStr((prev) => shiftMondayStr(prev, 7));
  const handleToday = () => setMondayStr(getMondayForDateStr(toInputDateFormat(new Date(), activeTz)));

  return (
    <div className={styles.calendarWrapper}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>Weekly Class Schedule</h3>
          <span className={styles.rangeText}>{rangeText}</span>
        </div>
        <div className={styles.navControls}>
          {onRefresh && (
            <Button variant="secondary" size="sm" onClick={onRefresh} aria-label="Refresh calendar">
              ↻
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handlePrev} aria-label="Previous week">
            ‹
          </Button>
          <Button variant="secondary" size="sm" onClick={handleToday}>
            This Week
          </Button>
          <Button variant="secondary" size="sm" onClick={handleNext} aria-label="Next week">
            ›
          </Button>
        </div>
      </div>

      <div className={styles.gridContainer}>
        <div className={styles.grid}>
          {weekDates.map((dayKey) => {
            const [y, m, d] = dayKey.split('-').map(Number);
            const dayDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
            const isToday = dayKey === todayKey;
            const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(dayDate);
            const dayNumber = String(d);

            const dayClasses = allEvents.filter((c) => {
              const raw = c.start_time || c.scheduled_start;
              if (!raw) return false;
              const parsed = new Date(String(raw).trim().replace(/T\s+(\d:)/, 'T0$1'));
              return getDateKeyInTz(parsed, activeTz) === dayKey;
            });

            return (
              <div key={dayKey} className={`${styles.dayCol} ${isToday ? styles.dayColToday : ''}`}>
                <div className={styles.dayHeader}>
                  <span className={styles.dayName}>{dayName}</span>
                  <span className={styles.dayNumber}>{dayNumber}</span>
                </div>
                <div className={styles.classesList}>
                  {dayClasses.length === 0 ? (
                    <span className={styles.emptyDay}>No classes</span>
                  ) : (
                    dayClasses.map((c, idx) => {
                      const startTime = c.start_time || c.scheduled_start;
                      const timeStr = formatTimeOnly(startTime, activeTz);
                      const studentName = c.student_name || c.student_id;
                      const topic = c.topic || c.class_title || 'Class Session';
                      const cardKey = `${c.session_id || idx}_${c.student_id || idx}_${idx}`;
                      const isRec = (c as unknown as { is_recurring?: boolean }).is_recurring;
                      return (
                        <div key={cardKey} className={styles.classCard}>
                          <span className={styles.classTime}>
                            {timeStr} ({c.duration_minutes || 60}m)
                          </span>
                          <span className={styles.classTopic} title={topic}>
                            {topic}
                          </span>
                          <span className={styles.classStudent} title={studentName}>
                            {studentName} • {isRec ? 'Recurring' : (c.status || 'SCHEDULED')}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
