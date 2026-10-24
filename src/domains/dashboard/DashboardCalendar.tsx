import React, { useState } from 'react';
import styles from './dashboardCalendar.module.css';
import { ClassSession } from '../classes/classTypes';
import { WeeklyScheduleEntry } from '../classes/scheduleApi';
import { Student } from '../students/studentTypes';
import { getSavedTimezone } from '../../lib/userPreferences';
import { toInputDateFormat } from '../../lib/dateFormat';
import { formatIsoTo12Hour } from '../../lib/time12Format';
import { Button } from '../../components/buttons/Button';
import {
  getMondayForDateStr, shiftMondayStr, getWeekDates,
  generateCalendarEvents, getDateKeyInTz,
} from './calendarEventGenerator';

export interface DashboardCalendarProps {
  classes: ClassSession[];
  schedules?: WeeklyScheduleEntry[];
  students?: Student[];
  onRefresh?: () => void;
}

export const DashboardCalendar: React.FC<DashboardCalendarProps> = ({
  classes, schedules = [], students = [], onRefresh,
}) => {
  const activeTz = getSavedTimezone();
  const [mondayStr, setMondayStr] = useState<string>(() =>
    getMondayForDateStr(toInputDateFormat(new Date(), activeTz))
  );

  const weekDates = getWeekDates(mondayStr);
  const todayKey = toInputDateFormat(new Date(), activeTz);
  const allEvents = generateCalendarEvents({
    datedSessions: classes, recurringSchedules: schedules, students, weekDates, activeTz,
  });

  const rangeText = `${mondayStr} – ${weekDates[6]} (${activeTz})`;
  const nowMs = Date.now();

  return (
    <div className={styles.calendarWrapper}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>Weekly Class Schedule</h3>
          <span className={styles.rangeText}>{rangeText}</span>
        </div>
        <div className={styles.navControls}>
          {onRefresh && <Button variant="secondary" size="sm" onClick={onRefresh} aria-label="Refresh calendar">↻</Button>}
          <Button variant="secondary" size="sm" onClick={() => setMondayStr((p) => shiftMondayStr(p, -7))} aria-label="Previous week">‹</Button>
          <Button variant="secondary" size="sm" onClick={() => setMondayStr(getMondayForDateStr(toInputDateFormat(new Date(), activeTz)))}>This Week</Button>
          <Button variant="secondary" size="sm" onClick={() => setMondayStr((p) => shiftMondayStr(p, 7))} aria-label="Next week">›</Button>
        </div>
      </div>

      <div className={styles.gridContainer}>
        <div className={styles.grid}>
          {weekDates.map((dayKey) => {
            const [y, m, d] = dayKey.split('-').map(Number);
            const dayDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
            const isToday = dayKey === todayKey;
            const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(dayDate);
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
                  <span className={styles.dayNumber}>{d}</span>
                </div>
                <div className={styles.classesList}>
                  {dayClasses.length === 0 ? (
                    <span className={styles.emptyDay}>No classes</span>
                  ) : (
                    dayClasses.map((c, idx) => {
                      const startTime = c.start_time || c.scheduled_start;
                      const time12 = formatIsoTo12Hour(startTime, activeTz);
                      const stu = students.find((s) => s.student_id === c.student_id);
                      const studentName = c.student_name || c.student_id;
                      const subject = stu?.subject || c.topic || 'General';
                      const isRec = (c as unknown as { is_recurring?: boolean }).is_recurring;
                      const isCancelled = c.status === 'CANCELLED' || (c as unknown as { session_status?: string }).session_status === 'CANCELLED';
                      const parsed = new Date(String(startTime).trim().replace(/T\s+(\d:)/, 'T0$1'));
                      const isPast = dayKey < todayKey || (dayKey === todayKey && parsed.getTime() < nowMs);

                      let colorClass = '';
                      if (isCancelled) colorClass = styles.cardCancelled;
                      else if (isPast && !isRec) {
                        const att = ((c as unknown as { attendance_status?: string }).attendance_status || c.status).toUpperCase();
                        if (att === 'PRESENT' || att === 'ATTENDED' || att === 'COMPLETED') colorClass = styles.cardAttended;
                        else if (att === 'ABSENT' || att === 'NO_SHOW') colorClass = styles.cardAbsent;
                        else colorClass = styles.cardUnmarked;
                      }

                      return (
                        <div key={`${c.session_id || idx}_${c.student_id || idx}_${idx}`} className={`${styles.classCard} ${colorClass}`}>
                          <span className={styles.classTime}>{time12}</span>
                          <span className={styles.classTopic} title={`${studentName} — ${subject}`}>
                            {studentName} — {subject}
                          </span>
                          <span className={styles.classStudent}>
                            {isCancelled ? 'Cancelled' : isRec ? 'Recurring Slot' : (c.status || 'SCHEDULED')}
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
