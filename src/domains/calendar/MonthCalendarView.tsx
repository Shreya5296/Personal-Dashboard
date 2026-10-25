import React from 'react';
import { ClassSession } from '../classes/classTypes';
import { Student } from '../students/studentTypes';
import { parseYearMonth, getMonthGridDates } from './calendarDateUtils';
import { getDateKeyInTz } from '../dashboard/calendarEventGenerator';
import { formatIsoTo12Hour } from '../../lib/time12Format';
import { toInputDateFormat } from '../../lib/dateFormat';

export interface MonthCalendarViewProps {
  yearMonthStr: string;
  sessions: ClassSession[];
  students: Student[];
  onSelectDate: (dateStr: string) => void;
  activeTz?: string;
}

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MonthCalendarView: React.FC<MonthCalendarViewProps> = ({
  yearMonthStr,
  sessions,
  students,
  onSelectDate,
  activeTz = 'Asia/Kolkata',
}) => {
  const { year, month } = parseYearMonth(yearMonthStr);
  const gridDates = getMonthGridDates(year, month);
  const todayStr = toInputDateFormat(new Date(), activeTz);
  const currentMonthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const studentMap = new Map(students.map((s) => [s.student_id, s.student_name || s.full_name || s.student_id]));

  // Index sessions by date string
  const sessionsByDate = new Map<string, ClassSession[]>();
  for (const s of sessions) {
    const raw = s.scheduled_start || s.start_time;
    if (!raw) continue;
    const parsed = new Date(String(raw).trim().replace(/T\s+(\d:)/, 'T0$1'));
    const dKey = !isNaN(parsed.getTime()) ? getDateKeyInTz(parsed, activeTz) : '';
    if (dKey) {
      const arr = sessionsByDate.get(dKey) || [];
      arr.push(s);
      sessionsByDate.set(dKey, arr);
    }
  }

  return (
    <div style={{ background: 'var(--color-bg-surface, #fff)', border: '1px solid var(--color-border-subtle, #e2e8f0)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--color-bg-subtle, #f8fafc)', borderBottom: '1px solid var(--color-border-subtle, #e2e8f0)' }}>
        {WEEKDAY_NAMES.map((name) => (
          <div key={name} style={{ padding: '8px 4px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted, #64748b)' }}>
            {name}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(96px, 1fr)' }}>
        {gridDates.map((dateStr) => {
          const isCurrentMonth = dateStr.startsWith(currentMonthPrefix);
          const isToday = dateStr === todayStr;
          const dayNum = parseInt(dateStr.slice(8), 10);
          const daySessions = sessionsByDate.get(dateStr) || [];
          const visibleSessions = daySessions.slice(0, 2);
          const overflowCount = daySessions.length - visibleSessions.length;

          return (
            <div
              key={dateStr}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDate(dateStr)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectDate(dateStr); }}
              title={`Click to view day view for ${dateStr}`}
              style={{
                borderRight: '1px solid var(--color-border-subtle, #e2e8f0)',
                borderBottom: '1px solid var(--color-border-subtle, #e2e8f0)',
                padding: '4px 6px',
                background: isToday ? '#eff6ff' : isCurrentMonth ? '#fff' : '#fcfcfc',
                opacity: isCurrentMonth ? 1 : 0.45,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                transition: 'background 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: isToday ? 700 : 500,
                    width: '20px',
                    height: '20px',
                    lineHeight: '20px',
                    textAlign: 'center',
                    borderRadius: '50%',
                    background: isToday ? '#2563eb' : 'transparent',
                    color: isToday ? '#fff' : 'var(--color-text-main, #1e293b)',
                  }}
                >
                  {dayNum}
                </span>
                {daySessions.length > 0 && (
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#059669' }}>
                    {daySessions.length}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                {visibleSessions.map((sess, idx) => {
                  const studentName = studentMap.get(sess.student_id) || sess.student_id;
                  const time12 = sess.scheduled_start ? formatIsoTo12Hour(sess.scheduled_start, activeTz) : '';
                  return (
                    <div
                      key={sess.session_id || idx}
                      style={{
                        fontSize: '10px',
                        padding: '1px 3px',
                        borderRadius: '3px',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        color: '#065f46',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {time12 ? `${time12} ` : ''}{studentName}
                    </div>
                  );
                })}
                {overflowCount > 0 && (
                  <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: 500 }}>
                    +{overflowCount} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
