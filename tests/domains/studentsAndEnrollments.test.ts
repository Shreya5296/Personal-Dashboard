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
import EnrollmentService from '../../02-backend/apps-script/enrollments/EnrollmentService.gs';
// @ts-ignore
import EnrollmentRepository from '../../02-backend/apps-script/enrollments/EnrollmentRepository.gs';

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
});
