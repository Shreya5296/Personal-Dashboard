import React, { useState } from 'react';
import styles from './dashboardCalendar.module.css';
import { ClassSession } from '../classes/classTypes';
import { getSavedTimezone } from '../../lib/userPreferences';
import { formatTimeOnly } from '../../lib/dateFormat';
import { Button } from '../../components/buttons/Button';

export interface DashboardCalendarProps {
  classes: ClassSession[];
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getDateKeyInTz(d: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export const DashboardCalendar: React.FC<DashboardCalendarProps> = ({ classes }) => {
  const [monday, setMonday] = useState<Date>(() => getMonday(new Date()));
  const activeTz = getSavedTimezone();

  const weekDays = [0, 1, 2, 3, 4, 5, 6].map((offset) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offset);
    return d;
  });

  const sunday = weekDays[6];
  const todayKey = getDateKeyInTz(new Date(), activeTz);

  const rangeText = `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: activeTz }).format(monday)} – ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: activeTz }).format(sunday)} (${activeTz})`;

  const handlePrev = () => setMonday((prev) => new Date(prev.getTime() - 7 * 86400000));
  const handleNext = () => setMonday((prev) => new Date(prev.getTime() + 7 * 86400000));
  const handleToday = () => setMonday(getMonday(new Date()));

  return (
    <div className={styles.calendarWrapper}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>Weekly Class Schedule</h3>
          <span className={styles.rangeText}>{rangeText}</span>
        </div>
        <div className={styles.navControls}>
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
          {weekDays.map((day) => {
            const dayKey = getDateKeyInTz(day, activeTz);
            const isToday = dayKey === todayKey;
            const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: activeTz }).format(day);
            const dayNumber = new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: activeTz }).format(day);

            const dayClasses = classes.filter((c) => {
              const start = c.start_time || c.scheduled_start;
              if (!start) return false;
              return getDateKeyInTz(new Date(start), activeTz) === dayKey;
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
                    dayClasses.map((c) => {
                      const startTime = c.start_time || c.scheduled_start;
                      const timeStr = formatTimeOnly(startTime, activeTz);
                      const studentName = c.student_name || c.student_id;
                      const topic = c.topic || c.class_title || 'Class Session';
                      return (
                        <div key={c.session_id || c.class_session_id || Math.random()} className={styles.classCard}>
                          <span className={styles.classTime}>
                            {timeStr} ({c.duration_minutes || 60}m)
                          </span>
                          <span className={styles.classTopic} title={topic}>
                            {topic}
                          </span>
                          <span className={styles.classStudent} title={studentName}>
                            {studentName} • {c.status || 'SCHEDULED'}
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
