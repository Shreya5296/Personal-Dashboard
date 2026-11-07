import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ClassSession } from '../../src/domains/classes/classTypes';
import { Package } from '../../src/domains/packages/packageTypes';
import { Student } from '../../src/domains/students/studentTypes';
import {
  getSessionDate,
  getSessionStartTime,
  getSessionDuration,
  getSessionEndTime,
  formatSessionTimeRange,
  isSessionOnDate,
} from '../../src/domains/classes/sessionTimeNormalizer';
import { TodayClassesSection } from '../../src/domains/dashboard/TodayClassesSection';
import { DashboardCalendar } from '../../src/domains/dashboard/DashboardCalendar';
import { buildDayColumns } from '../../src/domains/calendar/calendarGridBuilder';
import { toInputDateFormat } from '../../src/lib/dateFormat';

describe('Global Google Sheets Data Consistency — Schedule Consistency Across Pages', () => {
  const sampleStudent: Student = {
    student_id: 'STU_VERMA',
    student_name: 'Rahul Verma',
    status: 'ACTIVE',
    subject: 'Physics',
  } as Student;

  const createSheetsSession = (scheduleTime = '10:00', duration = 30, scheduleDate = '2026-11-10'): ClassSession => ({
    session_id: 'sess_100',
    student_id: 'STU_VERMA',
    student_name: 'Rahul Verma',
    schedule_date: scheduleDate,
    schedule_time: scheduleTime,
    start_time: scheduleTime,
    scheduled_start: `${scheduleDate}T${scheduleTime}:00.000Z`,
    duration_minutes: duration,
    status: 'SCHEDULED',
    session_status: 'SCHEDULED',
  });

  it('normalizes session date and local clock time without UTC date or time shifts', () => {
    const session = createSheetsSession('10:00', 30);
    const pkg: Package = {
      student_id: 'STU_VERMA',
      class_duration: 30,
    } as Package;

    expect(getSessionDate(session)).toBe('2026-11-10');
    expect(getSessionStartTime(session)).toBe('10:00');
    expect(getSessionDuration(session, pkg)).toBe(30);
    expect(getSessionEndTime(session, pkg)).toBe('10:30');
    expect(formatSessionTimeRange(session, pkg)).toBe('10:00 AM – 10:30 AM');
    expect(isSessionOnDate(session, '2026-11-10')).toBe(true);
    expect(isSessionOnDate(session, '2026-11-11')).toBe(false);
  });

  it('accurately derives end times for 30, 40, and 60 minute class durations', () => {
    const session30 = createSheetsSession('10:00', 30);
    const pkg30: Package = { student_id: 'STU_VERMA', class_duration: 30 } as Package;
    expect(formatSessionTimeRange(session30, pkg30)).toBe('10:00 AM – 10:30 AM');

    const session40 = createSheetsSession('10:00', 40);
    const pkg40: Package = { student_id: 'STU_VERMA', class_duration: 40 } as Package;
    expect(formatSessionTimeRange(session40, pkg40)).toBe('10:00 AM – 10:40 AM');

    const session60 = createSheetsSession('10:00', 60);
    const pkg60: Package = { student_id: 'STU_VERMA', class_duration: 60 } as Package;
    expect(formatSessionTimeRange(session60, pkg60)).toBe('10:00 AM – 11:00 AM');
  });

  it('renders exact 10:00 AM time in TodayClassesSection without timezone drift to 3:30 PM', () => {
    const activeTz = 'Asia/Kolkata';
    const todayStr = toInputDateFormat(new Date(), activeTz);
    const session = createSheetsSession('10:00', 30, todayStr);
    const pkg: Package = { student_id: 'STU_VERMA', class_duration: 30 } as Package;

    const html = renderToString(
      React.createElement(TodayClassesSection, {
        classes: [session],
        students: [sampleStudent],
        packages: [pkg],
        activeTz,
      })
    );

    // Must show 10:00 AM – 10:30 AM, never 3:30 PM
    expect(html).toContain('10:00 AM – 10:30 AM');
    expect(html).toContain('30');
    expect(html).toContain('min');
    expect(html).not.toContain('3:30 PM');
    expect(html).not.toContain('03:30 PM');
  });

  it('renders exact 10:00 AM time in DashboardCalendar', () => {
    const activeTz = 'Asia/Kolkata';
    const todayStr = toInputDateFormat(new Date(), activeTz);
    const session = createSheetsSession('10:00', 30, todayStr);
    const pkg: Package = { student_id: 'STU_VERMA', class_duration: 30 } as Package;

    const html = renderToString(
      React.createElement(DashboardCalendar, {
        classes: [session],
        students: [sampleStudent],
        packages: [pkg],
      })
    );

    expect(html).toContain('10:00 AM');
    expect(html).not.toContain('Invalid Date');
    expect(html).not.toContain('—</span>');
  });

  it('renders exact 10:00 AM time in CalendarPage buildDayColumns', () => {
    const session = createSheetsSession('10:00', 30, '2026-11-10');
    const pkg: Package = { student_id: 'STU_VERMA', class_duration: 30 } as Package;
    const weekDates = [
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12',
      '2026-11-13', '2026-11-14', '2026-11-15',
    ];

    const columns = buildDayColumns({
      datedSessions: [session],
      recurringSchedules: [],
      students: [sampleStudent],
      packages: [pkg],
      weekDates,
      activeTz: 'Asia/Kolkata',
    });

    const tuesdayCol = columns.find((c) => c.dateKey === '2026-11-10');
    expect(tuesdayCol).toBeDefined();
    expect(tuesdayCol!.events).toHaveLength(1);

    const event = tuesdayCol!.events[0];
    expect(event.startTime12.toLowerCase()).toBe('10:00 am');
    expect(event.endTime12.toLowerCase()).toBe('10:30 am');
    expect(event.timeRange12.toLowerCase()).toBe('10:00 am – 10:30 am');
    expect(event.durationMinutes).toBe(30);
  });

  it('handles boundary edge cases: midnight (00:00), noon (12:00), and late evening (22:00)', () => {
    const midnight = createSheetsSession('00:00', 30);
    expect(formatSessionTimeRange(midnight)).toBe('12:00 AM – 12:30 AM');

    const noon = createSheetsSession('12:00', 40);
    expect(formatSessionTimeRange(noon)).toBe('12:00 PM – 12:40 PM');

    const evening = createSheetsSession('22:00', 60);
    expect(formatSessionTimeRange(evening)).toBe('10:00 PM – 11:00 PM');
    // Ensure 22:00 does not shift date
    expect(getSessionDate(evening)).toBe('2026-11-10');
    expect(isSessionOnDate(evening, '2026-11-10')).toBe(true);
  });

  it('handles leap year date 2028-02-29 and fallback duration when package is missing', () => {
    const leapSession: ClassSession = {
      session_id: 'sess_leap',
      student_id: 'STU_LEAP',
      schedule_date: '2028-02-29',
      schedule_time: '14:15',
      start_time: '14:15',
      duration_minutes: 0, // unconfigured
      status: 'SCHEDULED',
    };

    expect(getSessionDate(leapSession)).toBe('2028-02-29');
    expect(getSessionDuration(leapSession, null)).toBe(60); // default fallback
    expect(formatSessionTimeRange(leapSession, null)).toBe('2:15 PM – 3:15 PM');
  });
});
