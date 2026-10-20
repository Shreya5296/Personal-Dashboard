import { describe, it, expect, beforeEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';
// @ts-ignore
import StudentService from '../../02-backend/apps-script/students/StudentService.gs';
// @ts-ignore
import StudentRepository from '../../02-backend/apps-script/students/StudentRepository.gs';
// @ts-ignore
import StudentValidation from '../../02-backend/apps-script/students/StudentValidation.gs';
// @ts-ignore
import RowReader from '../../02-backend/apps-script/sheets/RowReader.gs';
// @ts-ignore
import HeaderMapper from '../../02-backend/apps-script/sheets/HeaderMapper.gs';
// @ts-ignore
import EnrollmentService from '../../02-backend/apps-script/enrollments/EnrollmentService.gs';
// @ts-ignore
import EnrollmentRepository from '../../02-backend/apps-script/enrollments/EnrollmentRepository.gs';

import { adaptStudentInput, fetchStudents } from '../../src/domains/students/studentApi';
import { mapApiErrorsToFields } from '../../src/domains/students/studentValidation';

describe('Phase 5 — Students and Enrollments Domain Services', () => {
  let spreadsheet: MockSpreadsheet;
  const actor = { actorId: 'usr_admin', email: 'admin@example.com', requestId: 'req_test' };

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
  });

  it('creates, updates, searches, archives, and reactivates students', () => {
    // 1. Create student
    const createRes = StudentService.Students_create(spreadsheet, {
      first_name: 'Ananya',
      last_name: 'Iyer',
      preferred_name: 'Anu',
      parent_guardian_name: 'Karthik Iyer',
      primary_phone: '+919123456789',
      parent_email: 'karthik@synthetic-test.local',
      city: 'Chennai'
    }, actor);

    expect(createRes.success).toBe(true);
    const stuId = createRes.data.student_id;
    expect(stuId.startsWith('stu_')).toBe(true);
    expect(createRes.data.student_status).toBe('ACTIVE');

    // 2. Search student
    const searchRes = StudentService.Students_list(spreadsheet, { status: 'ACTIVE', search: 'Anu' });
    expect(searchRes.data.length).toBe(1);
    expect(searchRes.data[0].student_id).toBe(stuId);

    // 3. Update student
    const updateRes = StudentService.Students_update(spreadsheet, stuId, { city: 'Bengaluru' }, actor);
    expect(updateRes.success).toBe(true);
    expect(updateRes.data.city).toBe('Bengaluru');

    // 4. Archive student
    const archiveRes = StudentService.Students_archive(spreadsheet, stuId, actor);
    expect(archiveRes.success).toBe(true);
    expect(archiveRes.data.student_status).toBe('INACTIVE');
    expect(Boolean(archiveRes.data.archived_at)).toBe(true);

    // 5. Active list excludes archived student
    const activeList = StudentService.Students_list(spreadsheet, { status: 'ACTIVE' });
    expect(activeList.data.length).toBe(0);

    // 6. Reactivate student
    const reactivateRes = StudentService.Students_reactivate(spreadsheet, stuId, actor);
    expect(reactivateRes.success).toBe(true);
    expect(reactivateRes.data.student_status).toBe('ACTIVE');
  });

  it('handles the exact user form submission payload safely', () => {
    const rawUserInput = {
      full_name: 'test Student',
      email: 'student@example.com',
      phone: '9876543210',
      parent_name: 'test parent',
      parent_phone: '9876543210',
      parent_email: '',
      notes: ''
    };

    // 1. Frontend adapter maps to canonical backend columns
    const adapted = adaptStudentInput(rawUserInput);
    expect(adapted.first_name).toBe('test');
    expect(adapted.last_name).toBe('Student');
    expect(adapted.parent_guardian_name).toBe('test parent');
    expect(adapted.primary_phone).toBe('9876543210');
    expect(adapted.parent_email).toBe('student@example.com');

    // 2. Backend validation validates both raw and adapted inputs
    const rawVal = StudentValidation.validateStudentInput(rawUserInput, false);
    expect(rawVal.valid).toBe(true);

    const adaptedVal = StudentValidation.validateStudentInput(adapted, false);
    expect(adaptedVal.valid).toBe(true);

    // 3. Backend service successfully creates student from either format
    const createRes = StudentService.Students_create(spreadsheet, adapted, actor);
    expect(createRes.success).toBe(true);
    expect(createRes.data.student_id.startsWith('stu_')).toBe(true);
    expect(createRes.data.first_name).toBe('test');
    expect(createRes.data.last_name).toBe('Student');
    expect(createRes.data.full_name).toBe('test Student');
    expect(createRes.data.parent_name).toBe('test parent');
    expect(createRes.data.email).toBe('student@example.com');
  });

  it('safely validates inputs and maps server error details back to UI form fields', () => {
    // Missing required fields
    const invalidInput = {
      full_name: '',
      email: 'not-an-email',
      parent_email: 'bad-email'
    };

    const val = StudentValidation.validateStudentInput(invalidInput, false);
    expect(val.valid).toBe(false);
    expect(val.errors.first_name).toBeDefined();
    expect(val.errors.parent_guardian_name).toBeDefined();
    expect(val.errors.primary_phone).toBeDefined();

    // Mapping to frontend field errors
    const uiErrors = mapApiErrorsToFields(val.errors);
    expect(uiErrors.full_name).toBe('First name is required');
    expect(uiErrors.parent_name).toBe('Parent or guardian name is required');
    expect(uiErrors.parent_phone).toBe('Primary phone is required');
    expect(uiErrors.phone).toBe('Primary phone is required');
  });

  it('creates and manages enrollments linked to a student', () => {
    const stuRes = StudentService.Students_create(spreadsheet, {
      first_name: 'Rohan',
      parent_guardian_name: 'Meera',
      primary_phone: '+919988776655'
    }, actor);
    const stuId = stuRes.data.student_id;

    // Reject enrollment for nonexistent student
    const invalidRes = EnrollmentService.Enrollments_create(spreadsheet, {
      student_id: 'stu_nonexistent'
    }, actor);
    expect(invalidRes.success).toBe(false);
    expect(invalidRes.code).toBe('RECORD_NOT_FOUND');

    // Valid enrollment
    const enrRes = EnrollmentService.Enrollments_create(spreadsheet, {
      student_id: stuId,
      enrollment_name: 'Term 1 Coding',
      start_date: '2026-02-01',
      end_date: '2026-06-30',
      agreed_total_amount: 15000
    }, actor);

    expect(enrRes.success).toBe(true);
    expect(enrRes.data.enrollment_status).toBe('ACTIVE');

    // Update status to COMPLETED
    const updateEnr = EnrollmentService.Enrollments_update(spreadsheet, enrRes.data.enrollment_id, {
      enrollment_status: 'COMPLETED'
    }, actor);
    expect(updateEnr.success).toBe(true);
    expect(updateEnr.data.enrollment_status).toBe('COMPLETED');
    expect(Boolean(updateEnr.data.closed_at)).toBe(true);
  });

  it('safely handles duplicate header rows and reads real records correctly', () => {
    const sheet = spreadsheet.getSheetByName(SheetRegistry.SHEET_NAMES.STUDENTS);
    // Simulating sheet with duplicate header in Row 2, then actual data in Row 3
    const headers = SheetRegistry.getExpectedHeaders(SheetRegistry.SHEET_NAMES.STUDENTS);
    sheet!.rows = [
      [...headers], // Row 1: Header
      [...headers], // Row 2: Duplicate header
      ['stu_test1', 'test', 'student', '', '', 'test parent', '', '9876543210', '', 'student@example.com', '', 'ACTIVE', '', '', '', '2026-10-20T00:00:00.000Z', '2026-10-20T00:00:00.000Z', '', '']
    ];

    const records = RowReader.readAllRecords(sheet, HeaderMapper);
    // Must ignore Row 2 and return only Row 3
    expect(records.length).toBe(1);
    expect(records[0].student_id).toBe('stu_test1');
    expect(records[0].first_name).toBe('test');

    // Students_list must return the enriched record
    const listRes = StudentService.Students_list(spreadsheet, { status: 'ALL' });
    expect(listRes.success).toBe(true);
    expect(listRes.data.length).toBe(1);
    expect(listRes.data[0].full_name).toBe('test student');
  });

  it('proves newly created student appears immediately in fresh Students_list with enrichments', () => {
    // Empty list initially
    const emptyList = StudentService.Students_list(spreadsheet, { status: 'ALL' });
    expect(emptyList.data.length).toBe(0);

    // Create student
    const created = StudentService.Students_create(spreadsheet, {
      full_name: 'test student',
      email: 'student@example.com',
      phone: '9876543210',
      parent_name: 'test parent',
      parent_phone: '9876543210',
    }, actor);
    expect(created.success).toBe(true);

    // Immediate list read
    const freshList = StudentService.Students_list(spreadsheet, { status: 'ALL' });
    expect(freshList.data.length).toBe(1);
    expect(freshList.data[0].student_id).toBe(created.data.student_id);
    expect(freshList.data[0].full_name).toBe('test student');
    expect(freshList.data[0].email).toBe('student@example.com');
    expect(freshList.data[0].phone).toBe('9876543210');
    expect(freshList.data[0].status).toBe('ACTIVE');

    // Search query matches
    const searchMatch = StudentService.Students_list(spreadsheet, { query: 'test' });
    expect(searchMatch.data.length).toBe(1);

    const noMatch = StudentService.Students_list(spreadsheet, { query: 'nonexistent' });
    expect(noMatch.data.length).toBe(0);
  });
});
