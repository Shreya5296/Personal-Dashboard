import { describe, it, expect } from 'vitest';
import { adaptStudentInput, enrichStudentData } from '../../src/domains/students/studentApi';
import { validateStudentInput } from '../../src/domains/students/studentValidation';

describe('Student Subject Field & Persistence Handling', () => {
  it('validates subject length not exceeding 100 characters', () => {
    const valid = validateStudentInput({ full_name: 'Aarav Sharma', subject: 'Mathematics' });
    expect(valid.isValid).toBe(true);

    const tooLong = validateStudentInput({
      full_name: 'Aarav Sharma',
      subject: 'A'.repeat(101),
    });
    expect(tooLong.isValid).toBe(false);
    expect(tooLong.errors.subject).toContain('cannot exceed 100 characters');
  });

  it('adapts subject cleanly into notes and internal_summary for zero-schema-change persistence', () => {
    const adapted = adaptStudentInput({
      full_name: 'Priya Patel',
      subject: 'Physics',
      notes: 'Needs help with thermodynamics',
    });

    expect(adapted.subject).toBe('Physics');
    expect(adapted.internal_summary).toBe('[Subject: Physics] Needs help with thermodynamics');
  });

  it('adapts subject when no prior notes exist', () => {
    const adapted = adaptStudentInput({
      full_name: 'Rohan Gupta',
      subject: 'English Literature',
    });

    expect(adapted.subject).toBe('English Literature');
    expect(adapted.internal_summary).toBe('[Subject: English Literature]');
  });

  it('enriches student data by extracting subject tag from notes when retrieved', () => {
    const student = enrichStudentData({
      student_id: 'stu_test_1',
      full_name: 'Rohan Gupta',
      status: 'ACTIVE',
      notes: '[Subject: Chemistry] Top performer in class',
    });

    expect(student.subject).toBe('Chemistry');
    expect(student.notes).toBe('Top performer in class');
  });

  it('preserves direct subject if already set on student record', () => {
    const student = enrichStudentData({
      student_id: 'stu_test_2',
      full_name: 'Sneha Rao',
      status: 'ACTIVE',
      subject: 'Computer Science',
      notes: 'Advanced Python programming',
    });

    expect(student.subject).toBe('Computer Science');
    expect(student.notes).toBe('Advanced Python programming');
  });
});
