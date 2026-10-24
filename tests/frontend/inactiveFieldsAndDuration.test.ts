import { describe, it, expect } from 'vitest';
import {
  ALLOWED_CLASS_DURATIONS,
  isValidClassDuration,
  calculateEndTime,
  calculateScheduleEndTime,
  formatDurationLabel,
} from '../../src/domains/classes/scheduleDurationCalculator';
import { validateRegistrationForm } from '../../src/domains/students/registrationValidation';
import { RegistrationFormData } from '../../src/domains/students/registrationTypes';
import { generateProposedSessions } from '../../src/domains/classes/classGenerator';
import { ClassSession } from '../../src/domains/classes/classTypes';
import { WeeklyScheduleEntry } from '../../src/domains/classes/scheduleApi';

describe('Requirement 1 & 2 — Class Duration & Inactive Fields', () => {
  it('strictly allows only 30, 40, and 60 minutes as class durations', () => {
    expect(ALLOWED_CLASS_DURATIONS).toEqual([30, 40, 60]);
    expect(isValidClassDuration(30)).toBe(true);
    expect(isValidClassDuration(40)).toBe(true);
    expect(isValidClassDuration(60)).toBe(true);
    expect(isValidClassDuration(45)).toBe(false);
    expect(isValidClassDuration(90)).toBe(false);
    expect(isValidClassDuration(0)).toBe(false);
    expect(isValidClassDuration('60')).toBe(false);
  });

  it('formats unconfigured and configured duration labels safely without guessing', () => {
    expect(formatDurationLabel(null)).toBe('Not configured');
    expect(formatDurationLabel(undefined)).toBe('Not configured');
    expect(formatDurationLabel(30)).toBe('30 minutes');
    expect(formatDurationLabel(40)).toBe('40 minutes');
    expect(formatDurationLabel(60)).toBe('60 minutes');
  });

  it('calculates exact end times from start time and allowed durations', () => {
    // 30 minutes: 16:00 -> 16:30
    expect(calculateEndTime('16:00', 30)).toBe('16:30');
    // 40 minutes: 16:00 -> 16:40
    expect(calculateEndTime('16:00', 40)).toBe('16:40');
    // 60 minutes: 16:00 -> 17:00
    expect(calculateEndTime('16:00', 60)).toBe('17:00');
  });

  it('clearly rejects schedules that cross midnight', () => {
    // 23:45 + 30m = 00:15 (crosses midnight)
    expect(calculateEndTime('23:45', 30)).toBeNull();
    const mid30 = calculateScheduleEndTime('23:45', 30);
    expect(mid30.crossesMidnight).toBe(true);
    expect(mid30.isValid).toBe(false);

    // 23:30 + 40m = 00:10 (crosses midnight)
    expect(calculateEndTime('23:30', 40)).toBeNull();
    const mid40 = calculateScheduleEndTime('23:30', 40);
    expect(mid40.crossesMidnight).toBe(true);

    // 23:15 + 60m = 00:15 (crosses midnight)
    expect(calculateEndTime('23:15', 60)).toBeNull();
  });

  it('validates registration form against invalid duration and midnight crossing', () => {
    const invalidDurationForm: RegistrationFormData = {
      student: { student_name: 'Test', subject: 'Math', student_phone: '', student_email: '' },
      parent: { parent_name: 'Parent', parent_phone: '1234567890', parent_email: '' },
      pkg: { plan_type: 'Package', currency: 'INR', package_price: '5000', per_class: '500', classes_purchased: '10', class_duration: '45' },
      schedules: [{ id: '1', day_of_week: 'MONDAY', start_time: '16:00', end_time: '16:45' }],
    };
    const res1 = validateRegistrationForm(invalidDurationForm);
    expect(res1.isValid).toBe(false);
    expect(res1.errors.pkg?.class_duration).toBe('Class duration must be 30, 40, or 60 minutes.');

    const midnightForm: RegistrationFormData = {
      student: { student_name: 'Test', subject: 'Math', student_phone: '', student_email: '' },
      parent: { parent_name: 'Parent', parent_phone: '1234567890', parent_email: '' },
      pkg: { plan_type: 'Package', currency: 'INR', package_price: '5000', per_class: '500', classes_purchased: '10', class_duration: '40' },
      schedules: [{ id: '1', day_of_week: 'MONDAY', start_time: '23:30', end_time: '00:10' }],
    };
    const res2 = validateRegistrationForm(midnightForm);
    expect(res2.isValid).toBe(false);
    expect(res2.errors.schedules?.['entry_1_time']).toContain('midnight');
  });
});

describe('Requirement 3 — Duration-Aware Conflict Detection and Scheduling', () => {
  const sched40: WeeklyScheduleEntry[] = [
    { schedule_id: 'sch_40', student_id: 'STU_001', day_of_week: 'MONDAY', start_time: '16:00', end_time: '16:40' },
  ];

  it('uses calculated 40-minute duration for conflict detection', () => {
    // Existing class is from 16:30 to 17:30
    const existingOverlapping: ClassSession[] = [
      {
        session_id: 'cls_1',
        student_id: 'STU_999',
        scheduled_start: '2026-10-26T16:30:00.000Z',
        duration_minutes: 60,
        status: 'SCHEDULED',
        class_credit_effect: 'PENDING' as const,
      },
    ];

    // 16:00 - 16:40 overlaps with 16:30 - 17:30 -> Conflict!
    const proposedConflict = generateProposedSessions(sched40, '2026-10-26', 1, existingOverlapping, 'STU_001', 40);
    expect(proposedConflict[0].hasConflict).toBe(true);
    expect(proposedConflict[0].conflictDetails).toContain('Conflict');

    // Existing class is from 16:45 to 17:45 -> No overlap for 16:00 - 16:40
    const existingNonOverlapping: ClassSession[] = [
      {
        session_id: 'cls_2',
        student_id: 'STU_999',
        scheduled_start: '2026-10-26T16:45:00.000Z',
        duration_minutes: 60,
        status: 'SCHEDULED',
        class_credit_effect: 'PENDING' as const,
      },
    ];
    const proposedClean = generateProposedSessions(sched40, '2026-10-26', 1, existingNonOverlapping, 'STU_001', 40);
    expect(proposedClean[0].hasConflict).toBe(false);
  });
});
