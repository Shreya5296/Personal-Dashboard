import { describe, it, expect } from 'vitest';
import { adaptStudentInput } from '../../src/domains/students/studentApi';
import { validateStudentInput } from '../../src/domains/students/studentValidation';
import {
  getMondayForDateStr,
  getWeekDates,
  shiftMondayStr,
  makeIsoInTz,
  generateCalendarEvents,
  getDateKeyInTz,
} from '../../src/domains/dashboard/calendarEventGenerator';
import { ClassSession } from '../../src/domains/classes/classTypes';
import { WeeklyScheduleEntry } from '../../src/domains/classes/scheduleApi';
import { Student } from '../../src/domains/students/studentTypes';

// Require backend validator to test Apps Script logic
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { validateStudentInput: backendValidateStudent } = require('../../02-backend/apps-script/students/StudentValidation.gs');

describe('Issue 1: Student Status Validation and Normalization', () => {
  it('normalizes mixed-case and title-case status (Active, Inactive) to uppercase in API adapter', () => {
    const input1 = adaptStudentInput({ full_name: 'Test Student', status: 'Active' });
    expect(input1.status).toBe('ACTIVE');

    const input2 = adaptStudentInput({ full_name: 'Test Student', status: 'Inactive' });
    expect(input2.status).toBe('INACTIVE');

    const input3 = adaptStudentInput({ full_name: 'Test Student', status: 'ACTIVE' });
    expect(input3.status).toBe('ACTIVE');
  });

  it('frontend validator accepts Active and normalizes to ACTIVE, rejecting invalid status', () => {
    const validRes = validateStudentInput({ student_name: 'Test', status: 'Active' });
    expect(validRes.isValid).toBe(true);

    const invalidRes = validateStudentInput({ student_name: 'Test', status: 'UNKNOWN_STATUS' });
    expect(invalidRes.isValid).toBe(false);
    expect(invalidRes.errors.status).toBe('Status must be ACTIVE, INACTIVE, or ARCHIVED');
  });

  it('backend StudentValidation accepts Active, Inactive, ARCHIVED and rejects invalid values', () => {
    const resActive = backendValidateStudent({ student_name: 'Test', status: 'Active' }, true);
    expect(resActive.valid).toBe(true);

    const resInactive = backendValidateStudent({ student_name: 'Test', status: 'Inactive' }, true);
    expect(resInactive.valid).toBe(true);

    const resArchived = backendValidateStudent({ student_name: 'Test', status: 'archived' }, true);
    expect(resArchived.valid).toBe(true);

    const resBad = backendValidateStudent({ student_name: 'Test', status: 'PENDING' }, true);
    expect(resBad.valid).toBe(false);
    expect(resBad.errors.status).toBe('Status must be ACTIVE, INACTIVE, or ARCHIVED');
  });
});

describe('Issue 2: Calendar Synchronization and Recurring Occurrences', () => {
  it('correctly maps week dates starting from Monday without UTC date shifts', () => {
    const mon = getMondayForDateStr('2026-10-25'); // 2026-10-25 is Sunday
    expect(mon).toBe('2026-10-19');

    const mon2 = getMondayForDateStr('2026-10-26'); // 2026-10-26 is Monday
    expect(mon2).toBe('2026-10-26');

    const weekDates = getWeekDates('2026-10-26');
    expect(weekDates.length).toBe(7);
    expect(weekDates[0]).toBe('2026-10-26'); // Monday
    expect(weekDates[2]).toBe('2026-10-28'); // Wednesday
    expect(weekDates[6]).toBe('2026-11-01'); // Sunday

    expect(shiftMondayStr('2026-10-26', -7)).toBe('2026-10-19');
    expect(shiftMondayStr('2026-10-26', 7)).toBe('2026-11-02');
  });

  it('handles timezone boundaries and midnight without off-by-one shifts in Asia/Kolkata', () => {
    const tz = 'Asia/Kolkata';
    const isoLate = makeIsoInTz('2026-10-26', '23:30', tz);
    const parsedLate = new Date(isoLate);
    expect(getDateKeyInTz(parsedLate, tz)).toBe('2026-10-26');

    const isoEarly = makeIsoInTz('2026-10-26', '00:15', tz);
    const parsedEarly = new Date(isoEarly);
    expect(getDateKeyInTz(parsedEarly, tz)).toBe('2026-10-26');
  });

  it('generates recurring schedule occurrences across visible week and enriches student info', () => {
    const tz = 'Asia/Kolkata';
    const weekDates = getWeekDates('2026-10-26');
    const schedules: WeeklyScheduleEntry[] = [
      { schedule_id: 'csch_1', student_id: 'STU_001', day_of_week: 'MONDAY', start_time: '16:00', end_time: '16:40', is_active: true },
      { schedule_id: 'csch_2', student_id: 'STU_002', day_of_week: 'WEDNESDAY', start_time: '17:00', end_time: '17:40', is_active: true },
    ];
    const students: Student[] = [
      { student_id: 'STU_001', student_name: 'Seerat', parent_name: 'P1', parent_phone: '123', status: 'ACTIVE', subject: 'Calculus' },
      { student_id: 'STU_002', student_name: 'Rehaan', parent_name: 'P2', parent_phone: '456', status: 'ACTIVE', subject: 'Physics' },
    ];

    const events = generateCalendarEvents({
      datedSessions: [],
      recurringSchedules: schedules,
      students,
      weekDates,
      activeTz: tz,
    });

    expect(events.length).toBe(2);
    const mondayEvent = events.find((e) => e.student_id === 'STU_001');
    expect(mondayEvent).toBeDefined();
    expect(mondayEvent?.student_name).toBe('Seerat');
    expect(mondayEvent?.topic).toBe('Calculus');
    expect(mondayEvent?.duration_minutes).toBe(40);
    expect((mondayEvent as any).is_recurring).toBe(true);

    const wedEvent = events.find((e) => e.student_id === 'STU_002');
    expect(wedEvent).toBeDefined();
    expect(wedEvent?.student_name).toBe('Rehaan');
    expect(wedEvent?.duration_minutes).toBe(40);
  });

  it('distinguishes recurring schedules from dated sessions and avoids slot duplication', () => {
    const tz = 'Asia/Kolkata';
    const weekDates = getWeekDates('2026-10-26');
    const schedules: WeeklyScheduleEntry[] = [
      { schedule_id: 'csch_1', student_id: 'STU_001', day_of_week: 'MONDAY', start_time: '16:00', end_time: '16:40', is_active: true },
    ];
    const students: Student[] = [
      { student_id: 'STU_001', student_name: 'Seerat', parent_name: 'P1', parent_phone: '123', status: 'ACTIVE', subject: 'Calculus' },
    ];

    // Dated completed session already exists for STU_001 on 2026-10-26 at 16:00 (10:30 UTC)
    const datedSessions: ClassSession[] = [
      {
        session_id: 'cls_real_1',
        student_id: 'STU_001',
        student_name: 'Seerat',
        start_time: '2026-10-26T10:30:00.000Z',
        duration_minutes: 40,
        status: 'COMPLETED',
        class_credit_effect: 'CONSUME',
      },
      {
        session_id: 'cls_real_2',
        student_id: 'STU_001',
        student_name: 'Seerat',
        start_time: '2026-10-29T10:30:00.000Z', // Thursday ad-hoc class
        duration_minutes: 40,
        status: 'SCHEDULED',
        class_credit_effect: 'PENDING',
      },
    ];

    const events = generateCalendarEvents({
      datedSessions,
      recurringSchedules: schedules,
      students,
      weekDates,
      activeTz: tz,
    });

    // Should NOT duplicate STU_001 on Monday 16:00; instead real completed session is retained,
    // and Thursday ad-hoc class is also retained. Total events = 2.
    expect(events.length).toBe(2);
    const mondayEvent = events.find((e) => e.session_id === 'cls_real_1');
    expect(mondayEvent?.status).toBe('COMPLETED');
    expect((mondayEvent as any).is_recurring).toBeFalsy();
  });
});
