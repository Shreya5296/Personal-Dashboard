import { describe, it, expect } from 'vitest';
import { buildDayColumns } from '../../src/domains/calendar/calendarGridBuilder';
import { generateCalendarEvents, makeIsoInTz } from '../../src/domains/dashboard/calendarEventGenerator';
import { classifyCalendarEvent, isEventPast } from '../../src/domains/calendar/calendarClassification';
import { getMonthSessionStyle } from '../../src/domains/calendar/monthEventStyle';
import { ClassSession } from '../../src/domains/classes/classTypes';
import { WeeklyScheduleEntry } from '../../src/domains/classes/scheduleApi';
import { Student } from '../../src/domains/students/studentTypes';
import { Package } from '../../src/domains/packages/packageTypes';

describe('Calendar Final Fix — Correct Time Slots and Consistent Event Colors', () => {
  const activeTz = 'Asia/Kolkata';

  const stu4: Student = {
    student_id: 'STU_004',
    student_name: 'Sudarshini',
    subject: 'Geeta',
    status: 'ACTIVE',
  };

  const stu5: Student = {
    student_id: 'STU_005',
    student_name: 'Krishnavi',
    subject: 'Math',
    status: 'ACTIVE',
  };

  const stu1: Student = {
    student_id: 'STU_001',
    student_name: 'Akshara',
    subject: 'English',
    status: 'ACTIVE',
  };

  const pkg4: Package = {
    student_id: 'STU_004',
    classes_purchased: 32,
    class_duration: 30,
    start_date: '2026-08-02',
    end_date: '2026-11-29',
  } as Package;

  const pkg5: Package = {
    student_id: 'STU_005',
    classes_purchased: 30,
    class_duration: 60,
    start_date: '2026-08-01',
    end_date: '2026-12-31',
  } as Package;

  describe('1. Time Handling', () => {
    it('STU_004 Saturday & Sunday 10:00 AM remains 10:00 AM (does NOT become 15:30 / 3:30 PM)', () => {
      // Simulating backend response where scheduled_start had UTC .000Z but schedule_time is 10:00
      const saturdaySession: ClassSession = {
        session_id: 'STU_004__2026-10-31__10:00',
        student_id: 'STU_004',
        schedule_date: '2026-10-31',
        schedule_time: '10:00',
        start_time: '10:00',
        duration_minutes: 30,
        scheduled_start: '2026-10-31T10:00:00.000Z',
        scheduled_end: '2026-10-31T10:30:00.000Z',
        session_status: 'SCHEDULED',
        status: 'SCHEDULED',
        attendance_status: 'NOT_MARKED',
      };

      const cols = buildDayColumns({
        datedSessions: [saturdaySession],
        recurringSchedules: [],
        students: [stu4],
        weekDates: ['2026-10-31'],
        activeTz,
        packages: [pkg4],
      });

      expect(cols[0].events).toHaveLength(1);
      const evt = cols[0].events[0];
      expect(evt.startHour).toBe(10);
      expect(evt.startMinute).toBe(0);
      expect(evt.startTime12.toLowerCase()).toContain('10:00');
      expect(evt.startTime12.toLowerCase()).toContain('am');
      expect(evt.startTime12).not.toContain('3:30');
      expect(evt.startTime12).not.toContain('15:30');

      // 30-minute duration end time
      expect(evt.endTime12.toLowerCase()).toContain('10:30');
      expect(evt.durationMinutes).toBe(30);
    });

    it('STU_005 Saturday 6:00 PM remains 6:00 PM', () => {
      const satEveningSession: ClassSession = {
        session_id: 'STU_005__2026-10-31__18:00',
        student_id: 'STU_005',
        schedule_date: '2026-10-31',
        schedule_time: '18:00',
        start_time: '18:00',
        duration_minutes: 60,
        session_status: 'SCHEDULED',
        status: 'SCHEDULED',
        attendance_status: 'NOT_MARKED',
      };

      const cols = buildDayColumns({
        datedSessions: [satEveningSession],
        recurringSchedules: [],
        students: [stu5],
        weekDates: ['2026-10-31'],
        activeTz,
        packages: [pkg5],
      });

      expect(cols[0].events).toHaveLength(1);
      const evt = cols[0].events[0];
      expect(evt.startHour).toBe(18);
      expect(evt.startMinute).toBe(0);
      expect(evt.startTime12.toLowerCase()).toContain('6:00');
      expect(evt.startTime12.toLowerCase()).toContain('pm');
    });

    it('Recurring slots and dated sessions agree on time and duration without duplicating', () => {
      const recurring: WeeklyScheduleEntry[] = [
        { schedule_id: 'rec_4_sat', student_id: 'STU_004', day_of_week: 'SATURDAY', start_time: '10:00', end_time: '10:30' },
      ];
      const dated: ClassSession[] = [
        {
          session_id: 'STU_004__2026-10-31__10:00',
          student_id: 'STU_004',
          schedule_date: '2026-10-31',
          schedule_time: '10:00',
          start_time: '10:00',
          duration_minutes: 30,
          session_status: 'SCHEDULED',
          status: 'SCHEDULED',
        },
      ];

      const events = generateCalendarEvents({
        datedSessions: dated,
        recurringSchedules: recurring,
        students: [stu4],
        packages: [pkg4],
        weekDates: ['2026-10-31'],
        activeTz,
      });

      // No duplicate: exactly 1 event generated
      expect(events).toHaveLength(1);
      expect(events[0].session_id).toBe('STU_004__2026-10-31__10:00');
    });
  });

  describe('2. Event Colors & Three Visual Treatments', () => {
    it('Past PRESENT / COMPLETED event is classified as PAST_COMPLETED (muted green)', () => {
      const cat = classifyCalendarEvent({
        status: 'COMPLETED',
        sessionStatus: 'COMPLETED',
        attendanceStatus: 'PRESENT',
        isCancelled: false,
        isPast: true,
      });
      expect(cat).toBe('PAST_COMPLETED');

      const style = getMonthSessionStyle({ session_status: 'COMPLETED', attendance_status: 'PRESENT' } as ClassSession, true);
      expect(style.bg).toBe('#f4fdf8');
      expect(style.color).toBe('#166534');
      expect(style.opacity).toBe(0.7);
    });

    it('Past CANCELLED event is classified as CANCELLED (muted red)', () => {
      const cat = classifyCalendarEvent({
        status: 'CANCELLED',
        sessionStatus: 'CANCELLED',
        attendanceStatus: 'CANCELLED',
        isCancelled: true,
        isPast: true,
      });
      expect(cat).toBe('CANCELLED');

      const style = getMonthSessionStyle({ session_status: 'CANCELLED' } as ClassSession, true);
      expect(style.bg).toBe('#fdf2f2');
      expect(style.border).toContain('#f3caca');
      expect(style.color).toBe('#a65a5a');
      expect(style.opacity).toBe(0.68);
    });

    it('Upcoming valid class is classified as UPCOMING (yellow/amber)', () => {
      const cat = classifyCalendarEvent({
        status: 'SCHEDULED',
        sessionStatus: 'SCHEDULED',
        attendanceStatus: 'NOT_MARKED',
        isCancelled: false,
        isPast: false,
      });
      expect(cat).toBe('UPCOMING');

      const style = getMonthSessionStyle({ session_status: 'SCHEDULED', attendance_status: 'NOT_MARKED' } as ClassSession, false);
      expect(style.bg).toBe('#fffbeb');
      expect(style.color).toBe('#92400e');
      expect(style.border).toContain('#fde68a');
      expect(style.opacity).toBe(1);
    });

    it('isEventPast accurately evaluates yesterday, future, and today around class end time', () => {
      const mockNow = new Date('2026-10-26T17:00:00+05:30'); // Monday 5:00 PM IST

      // Past date
      expect(isEventPast('2026-10-25', '10:30', activeTz, mockNow)).toBe(true);

      // Future date
      expect(isEventPast('2026-10-27', '10:30', activeTz, mockNow)).toBe(false);

      // Today before end time (class ends at 17:30, now is 17:00) -> upcoming (not past)
      expect(isEventPast('2026-10-26', '17:30', activeTz, mockNow)).toBe(false);

      // Today after end time (class ended at 10:30, now is 17:00) -> past
      expect(isEventPast('2026-10-26', '10:30', activeTz, mockNow)).toBe(true);
    });
  });

  describe('3. Data Integrity & Deduplication', () => {
    it('Day, Week, and Month views use identical classification', () => {
      const pastCompSess: ClassSession = { session_id: 'c1', session_status: 'COMPLETED', attendance_status: 'PRESENT' };
      const cancSess: ClassSession = { session_id: 'c2', session_status: 'CANCELLED' };
      const upcomingSess: ClassSession = { session_id: 'c3', session_status: 'SCHEDULED', attendance_status: 'NOT_MARKED' };

      expect(getMonthSessionStyle(pastCompSess, true).color).toBe('#166534');
      expect(getMonthSessionStyle(cancSess, true).color).toBe('#a65a5a');
      expect(getMonthSessionStyle(upcomingSess, false).color).toBe('#92400e');

      const catComp = classifyCalendarEvent({ sessionStatus: 'COMPLETED', attendanceStatus: 'PRESENT', isPast: true });
      const catCanc = classifyCalendarEvent({ sessionStatus: 'CANCELLED', isPast: true });
      const catUpc = classifyCalendarEvent({ sessionStatus: 'SCHEDULED', isPast: false });

      expect(catComp).toBe('PAST_COMPLETED');
      expect(catCanc).toBe('CANCELLED');
      expect(catUpc).toBe('UPCOMING');
    });
  });
});
