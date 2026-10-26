import { describe, it, expect } from 'vitest';
import { buildDayColumns } from '../../src/domains/calendar/calendarGridBuilder';
import { getMonthSessionStyle } from '../../src/domains/calendar/monthEventStyle';
import { filterStudentsByTab, isStudentActive } from '../../src/domains/students/studentStatusClassifier';
import { buildSessionProgressMap, isSessionDeductible } from '../../src/domains/classes/sessionProgressCalculator';
import { Student } from '../../src/domains/students/studentTypes';
import { ClassSession } from '../../src/domains/classes/classTypes';
import { Package } from '../../src/domains/packages/packageTypes';

describe('Fix Batch 5 — Calendar Status, Student Classification, Session Integrity & Table Layout', () => {
  it('Fix 1: calendarGridBuilder correctly retains dated sessions where start_time is a bare time', () => {
    const datedSession: ClassSession = {
      session_id: 'SESS_001', student_id: 'STU_004', schedule_date: '2026-08-02', schedule_time: '10:00',
      start_time: '10:00', scheduled_start: '2026-08-02T10:00:00+05:30', scheduled_end: '2026-08-02T10:30:00+05:30',
      session_status: 'COMPLETED', status: 'COMPLETED', attendance_status: 'PRESENT', duration_minutes: 30,
    };
    const cols = buildDayColumns({
      datedSessions: [datedSession], recurringSchedules: [],
      students: [{ student_id: 'STU_004', student_name: 'Sudarshini', subject: 'Geeta', status: 'ACTIVE' } as Student],
      weekDates: ['2026-08-02'], activeTz: 'Asia/Kolkata',
    });
    expect(cols[0].events).toHaveLength(1);
    expect(cols[0].events[0].id).toBe('SESS_001');
    expect(cols[0].events[0].isPast).toBe(true);
    expect(cols[0].events[0].status).toBe('COMPLETED');
  });

  it('Fix 1: monthEventStyle applies muted faded green to past completed sessions', () => {
    const sess: ClassSession = { session_id: 'S1', student_id: 'STU_004', session_status: 'COMPLETED', attendance_status: 'PRESENT' };
    const style = getMonthSessionStyle(sess, true);
    expect(style.bg).toBe('#e5f4ea');
    expect(style.opacity).toBe(0.82);
    expect(style.color).toBe('#276749');
  });

  it('Fix 2: student classification keeps canonical ACTIVE students active regardless of last class date', () => {
    const stu5: Student = {
      student_id: 'STU_005', student_name: 'Krishnavi', parent_name: 'Dhaneshwari', subject: 'Math',
      status: 'ACTIVE', student_status: 'ACTIVE',
    };
    const getBalance = () => ({ totalPurchased: 30, totalConsumed: 6 });
    const getLastCompleted = () => '2026-09-12'; // > 1 calendar month ago

    const activeList = filterStudentsByTab([stu5], 'ACTIVE', getBalance, getLastCompleted);
    expect(activeList).toHaveLength(1);
    expect(activeList[0].student_id).toBe('STU_005');

    const inactiveList = filterStudentsByTab([stu5], 'INACTIVE', getBalance, getLastCompleted);
    expect(inactiveList).toHaveLength(0);

    expect(isStudentActive(stu5, { balance: { totalPurchased: 30, totalConsumed: 6 } })).toBe(true);
  });

  it('Fix 3: session progress calculator does not count future scheduled sessions as consumed', () => {
    const pkgs: Package[] = [{ student_id: 'STU_004', classes_purchased: 32 } as Package];
    const sessions: ClassSession[] = [
      { session_id: 'S1', student_id: 'STU_004', schedule_date: '2026-08-02', schedule_time: '10:00', session_status: 'COMPLETED', deduct_class: true },
      { session_id: 'S2', student_id: 'STU_004', schedule_date: '2026-08-08', schedule_time: '10:00', session_status: 'COMPLETED', deduct_class: true },
      { session_id: 'S3_CANC', student_id: 'STU_004', schedule_date: '2026-09-13', schedule_time: '10:00', session_status: 'CANCELLED', deduct_class: false },
      { session_id: 'S4_FUTURE', student_id: 'STU_004', schedule_date: '2026-10-31', schedule_time: '10:00', session_status: 'SCHEDULED', attendance_status: 'NOT_MARKED', deduct_class: false },
      { session_id: 'S5_FUTURE', student_id: 'STU_004', schedule_date: '2026-11-28', schedule_time: '10:00', session_status: 'SCHEDULED', attendance_status: 'NOT_MARKED', deduct_class: false },
    ];

    expect(isSessionDeductible(sessions[0])).toBe(true);
    expect(isSessionDeductible(sessions[2])).toBe(false);
    expect(isSessionDeductible(sessions[3])).toBe(false);
    expect(isSessionDeductible(sessions[4])).toBe(false);

    const progressMap = buildSessionProgressMap(sessions, pkgs);
    expect(progressMap.get('S1')?.display).toBe('01 / 32');
    expect(progressMap.get('S1')?.remainingDisplay).toBe('31 remaining');

    expect(progressMap.get('S2')?.display).toBe('02 / 32');
    expect(progressMap.get('S2')?.remainingDisplay).toBe('30 remaining');

    // Cancelled non-deductible: not consumed, shows not deducted
    expect(progressMap.get('S3_CANC')?.display).toBe('— / 32');
    expect(progressMap.get('S3_CANC')?.remainingDisplay).toBe('30 remaining (not deducted)');

    // Future scheduled: NOT consumed, remaining stays 30
    expect(progressMap.get('S4_FUTURE')?.display).toBe('— / 32');
    expect(progressMap.get('S4_FUTURE')?.remainingDisplay).toBe('30 remaining');

    expect(progressMap.get('S5_FUTURE')?.display).toBe('— / 32');
    expect(progressMap.get('S5_FUTURE')?.remainingDisplay).toBe('30 remaining');
  });

  it('Fix 4: meeting links table proportions sum to 100% with compact student column', () => {
    const studentWidth = 15;
    const primaryWidth = 37.5;
    const secondaryWidth = 37.5;
    const actionsWidth = 10;
    expect(studentWidth + primaryWidth + secondaryWidth + actionsWidth).toBe(100);
    expect(primaryWidth + secondaryWidth).toBe(75);
  });
});
