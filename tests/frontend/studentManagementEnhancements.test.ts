import { describe, it, expect } from 'vitest';
import { generateProposedSessions } from '../../src/domains/classes/classGenerator';
import { isStudentActive, filterStudentsByTab } from '../../src/domains/students/studentStatusClassifier';
import { validateRegistrationForm } from '../../src/domains/students/registrationValidation';
import { RegistrationFormData } from '../../src/domains/students/registrationTypes';
import { Student } from '../../src/domains/students/studentTypes';
import { WeeklyScheduleEntry } from '../../src/domains/classes/scheduleApi';

describe('Requirement 1 & 2 — Recurring Schedules & Validations', () => {
  it('validates that end time must be after start time across independent days', () => {
    const data: RegistrationFormData = {
      student: { student_name: 'Test Learner', subject: 'Math', student_phone: '', student_email: 'learner@example.com' },
      parent: { parent_name: 'Parent Learner', parent_phone: '+91 99999 88888', parent_email: 'parent@example.com' },
      pkg: { plan_type: 'Package', currency: 'INR', package_price: '10000', per_class: '1000', classes_purchased: '10' },
      schedules: [
        { id: '1', day_of_week: 'MONDAY', start_time: '17:00', end_time: '18:00' },
        { id: '2', day_of_week: 'WEDNESDAY', start_time: '16:00', end_time: '15:30' }, // Invalid!
      ],
      first_class_date: '2026-11-02',
    };

    const res = validateRegistrationForm(data);
    expect(res.isValid).toBe(false);
    expect(res.errors.schedules?.['entry_2_time']).toBe('End time must be after start time.');
  });

  it('allows multiple schedule entries on different days with different times', () => {
    const data: RegistrationFormData = {
      student: { student_name: 'Valid Learner', subject: 'Physics', student_phone: '', student_email: 'val@example.com' },
      parent: { parent_name: 'Valid Parent', parent_phone: '+91 98888 77777', parent_email: 'vp@example.com' },
      pkg: { plan_type: 'Package', currency: 'INR', package_price: '12000', per_class: '1200', classes_purchased: '10' },
      schedules: [
        { id: '1', day_of_week: 'MONDAY', start_time: '16:00', end_time: '17:00' },
        { id: '2', day_of_week: 'THURSDAY', start_time: '18:30', end_time: '20:00' },
      ],
      first_class_date: '2026-11-02',
    };

    const res = validateRegistrationForm(data);
    expect(res.isValid).toBe(true);
  });
});

describe('Requirement 4 — Auto-Scheduling Classes from Recurring Schedules', () => {
  const recurringMonday: WeeklyScheduleEntry[] = [
    { schedule_id: 'sch_1', student_id: 'STU_001', day_of_week: 'MONDAY', start_time: '16:00', end_time: '17:00' },
  ];

  it('generates exact purchased class count starting on specified date', () => {
    // Starting on Monday 26 October 2026
    const proposed = generateProposedSessions(recurringMonday, '2026-10-26', 10, [], 'STU_001');
    expect(proposed).toHaveLength(10);
    expect(proposed[0].dateStr).toBe('2026-10-26');
    expect(proposed[0].dayName).toBe('Monday');
    expect(proposed[0].startTime).toBe('16:00');
    expect(proposed[0].endTime).toBe('17:00');
    expect(proposed[0].durationMinutes).toBe(60);

    // Consecutive Mondays
    expect(proposed[1].dateStr).toBe('2026-11-02');
    expect(proposed[2].dateStr).toBe('2026-11-09');
    expect(proposed[9].dateStr).toBe('2026-12-28');
  });

  it('distributes across multiple recurring schedule entries with different times', () => {
    const multiSched: WeeklyScheduleEntry[] = [
      { schedule_id: 's1', student_id: 'STU_002', day_of_week: 'MONDAY', start_time: '16:00', end_time: '17:00' },
      { schedule_id: 's2', student_id: 'STU_002', day_of_week: 'WEDNESDAY', start_time: '17:30', end_time: '19:00' },
    ];

    const proposed = generateProposedSessions(multiSched, '2026-10-26', 4, [], 'STU_002');
    expect(proposed).toHaveLength(4);
    expect(proposed[0].dateStr).toBe('2026-10-26'); // Monday
    expect(proposed[0].startTime).toBe('16:00');
    expect(proposed[1].dateStr).toBe('2026-10-28'); // Wednesday
    expect(proposed[1].startTime).toBe('17:30');
    expect(proposed[1].durationMinutes).toBe(90);
    expect(proposed[2].dateStr).toBe('2026-11-02'); // Next Monday
    expect(proposed[3].dateStr).toBe('2026-11-04'); // Next Wednesday
  });

  it('detects conflicts and duplicates against existing scheduled sessions', () => {
    const existing = [
      {
        session_id: 'cls_ex1',
        student_id: 'STU_001',
        scheduled_start: '2026-10-26T16:00:00.000Z',
        duration_minutes: 60,
        status: 'SCHEDULED',
        class_credit_effect: 'PENDING' as const,
      },
    ];

    const proposed = generateProposedSessions(recurringMonday, '2026-10-26', 2, existing, 'STU_001');
    expect(proposed).toHaveLength(2);
    expect(proposed[0].hasConflict).toBe(true);
    expect(proposed[0].isDuplicate).toBe(true);
    expect(proposed[1].hasConflict).toBe(false);
  });
});

describe('Requirement 5 & 6 — Active / Inactive Tabs & Classification Rules', () => {
  const students: Student[] = [
    { student_id: 'STU_001', student_name: 'Active Learner 1', status: 'ACTIVE' },
    { student_id: 'STU_002', student_name: 'Exhausted Learner', status: 'ACTIVE' },
    { student_id: 'STU_003', student_name: 'Archived Learner', status: 'ARCHIVED' },
    { student_id: 'STU_004', student_name: 'Active Learner 2', status: 'ACTIVE' },
  ];

  const balances: Record<string, { totalPurchased: number; totalConsumed: number }> = {
    STU_001: { totalPurchased: 12, totalConsumed: 4 }, // 8 remaining -> ACTIVE
    STU_002: { totalPurchased: 10, totalConsumed: 10 }, // 0 remaining -> INACTIVE
    STU_003: { totalPurchased: 10, totalConsumed: 2 }, // ARCHIVED status -> INACTIVE
    STU_004: { totalPurchased: 5, totalConsumed: 0 }, // 5 remaining -> ACTIVE
  };

  it('classifies students using remaining classes without modifying rows', () => {
    expect(isStudentActive(students[0], balances['STU_001'])).toBe(true);
    expect(isStudentActive(students[1], balances['STU_002'])).toBe(false); // 0 remaining
    expect(isStudentActive(students[2], balances['STU_003'])).toBe(false); // archived
    expect(isStudentActive(students[3], balances['STU_004'])).toBe(true);
  });

  it('filters students by active and inactive tabs accurately', () => {
    const getBal = (id: string) => balances[id] || { totalPurchased: 0, totalConsumed: 0 };
    const all = filterStudentsByTab(students, 'ALL', getBal);
    expect(all).toHaveLength(4);

    const active = filterStudentsByTab(students, 'ACTIVE', getBal);
    expect(active.map((s) => s.student_id)).toEqual(['STU_001', 'STU_004']);

    const inactive = filterStudentsByTab(students, 'INACTIVE', getBal);
    expect(inactive.map((s) => s.student_id)).toEqual(['STU_002', 'STU_003']);
  });
});