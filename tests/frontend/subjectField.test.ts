import { describe, it, expect, beforeEach } from 'vitest';
import {
  adaptStudentInput,
  enrichStudentData,
  formatSubjectAndNotes,
  parseSubjectAndNotes,
} from '../../src/domains/students/studentApi';
import { validateStudentInput } from '../../src/domains/students/studentValidation';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';
// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';
// @ts-ignore
import StudentService from '../../02-backend/apps-script/students/StudentService.gs';

describe('Student Subject Field & Persistence Handling (Phase D)', () => {
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
    expect(adapted.internal_summary).toBe('[Subject: Physics]\nNeeds help with thermodynamics');
  });

  it('adapts subject when no prior notes exist', () => {
    const adapted = adaptStudentInput({
      full_name: 'Rohan Gupta',
      subject: 'English Literature',
    });

    expect(adapted.subject).toBe('English Literature');
    expect(adapted.internal_summary).toBe('[Subject: English Literature]');
  });

  it('handles brackets, Unicode, and punctuation in subject and notes', () => {
    const subjWithBrackets = 'Math [AP Calculus BC]';
    const unicodeNotes = 'Étudiant exemplaire; parle français & हिंदी fluently.';
    const formatted = formatSubjectAndNotes(subjWithBrackets, unicodeNotes);
    const parsed = parseSubjectAndNotes(formatted);

    expect(parsed.subject).toBe(subjWithBrackets);
    expect(parsed.notes).toBe(unicodeNotes);
  });

  it('preserves notes when updating only subject, and preserves subject when updating only notes', () => {
    const step1 = formatSubjectAndNotes('Chemistry', 'Initial laboratory notes');
    expect(step1).toBe('[Subject: Chemistry]\nInitial laboratory notes');

    // User updates subject to 'Advanced Chemistry', keeping notes
    const parsed1 = parseSubjectAndNotes(step1);
    const step2 = formatSubjectAndNotes('Advanced Chemistry', parsed1.notes);
    expect(step2).toBe('[Subject: Advanced Chemistry]\nInitial laboratory notes');
    const parsed2 = parseSubjectAndNotes(step2);
    expect(parsed2.subject).toBe('Advanced Chemistry');
    expect(parsed2.notes).toBe('Initial laboratory notes');

    // User updates notes, keeping subject
    const step3 = formatSubjectAndNotes(parsed2.subject, 'Updated laboratory notes with scores');
    const parsed3 = parseSubjectAndNotes(step3);
    expect(parsed3.subject).toBe('Advanced Chemistry');
    expect(parsed3.notes).toBe('Updated laboratory notes with scores');
  });

  it('cleanly strips tag when subject is emptied without leaving orphan markers', () => {
    const formatted = formatSubjectAndNotes('Biology', 'Medical prep notes');
    const parsed = parseSubjectAndNotes(formatted);
    const cleared = formatSubjectAndNotes('', parsed.notes);

    expect(cleared).toBe('Medical prep notes');
    const parsedCleared = parseSubjectAndNotes(cleared);
    expect(parsedCleared.subject).toBe('');
    expect(parsedCleared.notes).toBe('Medical prep notes');
  });

  it('enriches student data by extracting subject tag from notes when retrieved', () => {
    const student = enrichStudentData({
      student_id: 'stu_test_1',
      full_name: 'Rohan Gupta',
      status: 'ACTIVE',
      notes: '[Subject: Chemistry]\nTop performer in class',
    });

    expect(student.subject).toBe('Chemistry');
    expect(student.notes).toBe('Top performer in class');
  });

  it('parses legacy single-line subject tag correctly', () => {
    const legacy = enrichStudentData({
      student_id: 'stu_legacy_1',
      full_name: 'Ananya Roy',
      status: 'ACTIVE',
      notes: '[Subject: Economics] Excellent grasp of micro theory',
    });

    expect(legacy.subject).toBe('Economics');
    expect(legacy.notes).toBe('Excellent grasp of micro theory');
  });

  describe('Backend round-trip persistence via StudentService.gs', () => {
    let spreadsheet: MockSpreadsheet;
    const actor = { actorId: 'usr_tutor', email: 'tutor@example.com', requestId: 'req_stu_subj' };

    beforeEach(() => {
      spreadsheet = new MockSpreadsheet();
      SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
    });

    it('creates and enriches student with subject cleanly', () => {
      const created = StudentService.Students_create(spreadsheet, {
        first_name: 'Dev',
        last_name: 'Sharma',
        parent_name: 'Anita Sharma',
        parent_phone: '+919876543210',
        subject: 'Physics [Mechanics]'
      }, actor);

      expect(created.success).toBe(true);
      expect(created.data.subject).toBe('Physics [Mechanics]');

      // Update only subject
      const updatedSubj = StudentService.Students_update(spreadsheet, created.data.student_id, {
        subject: 'Physics [Optics]'
      }, actor);
      expect(updatedSubj.success).toBe(true);
      expect(updatedSubj.data.subject).toBe('Physics [Optics]');

      // Clear subject
      const clearedSubj = StudentService.Students_update(spreadsheet, created.data.student_id, {
        subject: ''
      }, actor);
      expect(clearedSubj.success).toBe(true);
      expect(clearedSubj.data.subject).toBe('');
    });
  });
});
