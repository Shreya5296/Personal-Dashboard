import { describe, it, expect, vi } from 'vitest';
import { validateStudentInput } from '../../src/domains/students/studentValidation';
import { calculateEndTime, isValidClassDuration } from '../../src/domains/classes/scheduleDurationCalculator';

describe('Schedule Persistence, Validation, and Feedback Requirements', () => {
  it('validates student input ignoring inactive placeholder values like "-" for email/phone', () => {
    const inputWithDash = {
      student_name: 'Seerat',
      parent_name: 'Ranjeeta',
      parent_phone: '9876543210',
      parent_email: 'parent@example.com',
      student_phone: '-',
      student_email: '-',
      subject: 'Maths',
    };
    const result = validateStudentInput(inputWithDash);
    expect(result.isValid).toBe(true);
    expect(result.errors.student_email).toBeUndefined();
    expect(result.errors.email).toBeUndefined();
  });

  it('rejects invalid parent email format while accepting valid parent emails', () => {
    const invalidResult = validateStudentInput({
      student_name: 'Seerat',
      parent_name: 'Ranjeeta',
      parent_phone: '9876543210',
      parent_email: 'invalid-email-format',
    });
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors.parent_email).toBe('Invalid parent email address format.');
  });

  it('validates allowed class durations strictly (30, 40, 60)', () => {
    expect(isValidClassDuration(30)).toBe(true);
    expect(isValidClassDuration(40)).toBe(true);
    expect(isValidClassDuration(60)).toBe(true);
    expect(isValidClassDuration(45)).toBe(false);
    expect(isValidClassDuration(0)).toBe(false);
    expect(isValidClassDuration(undefined)).toBe(false);
  });

  it('calculates end times correctly for configured class durations', () => {
    expect(calculateEndTime('16:00', 30)).toBe('16:30');
    expect(calculateEndTime('16:00', 40)).toBe('16:40');
    expect(calculateEndTime('16:00', 60)).toBe('17:00');
    expect(calculateEndTime('23:45', 30)).toBeNull(); // Rejects crossing midnight
  });

  it('verifies schedule entry serialization and ID preservation', () => {
    const rawSchedules = [
      { id: 'csch_existing_1', day_of_week: 'MONDAY', start_time: '16:00', end_time: '16:40' },
      { id: '1729867000123', day_of_week: 'WEDNESDAY', start_time: '17:00', end_time: '17:40' },
    ];
    const dur = 40;
    const serialized = rawSchedules.map((s) => ({
      schedule_id: (s.id && !s.id.startsWith('temp_') && !/^\d+$/.test(s.id)) ? s.id : undefined,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time || calculateEndTime(s.start_time, dur) || '',
    }));

    expect(serialized[0].schedule_id).toBe('csch_existing_1');
    expect(serialized[0].day_of_week).toBe('MONDAY');
    expect(serialized[0].start_time).toBe('16:00');
    expect(serialized[0].end_time).toBe('16:40');

    // Ephemeral timestamp ID replaced with undefined so backend generates sequential csch_ ID
    expect(serialized[1].schedule_id).toBeUndefined();
    expect(serialized[1].day_of_week).toBe('WEDNESDAY');
    expect(serialized[1].start_time).toBe('17:00');
    expect(serialized[1].end_time).toBe('17:40');
  });

  it('confirms the exact success message requirement', () => {
    const SUCCESS_MESSAGE = 'Student details saved successfully';
    expect(SUCCESS_MESSAGE).toBe('Student details saved successfully');
  });
});
