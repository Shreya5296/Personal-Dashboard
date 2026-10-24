import { describe, it, expect, beforeEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';
// @ts-ignore
import IdGenerator from '../../02-backend/apps-script/shared/IdGenerator.gs';
// @ts-ignore
import StudentService from '../../02-backend/apps-script/students/StudentService.gs';
// @ts-ignore
import PackageService from '../../02-backend/apps-script/packages/PackageService.gs';
// @ts-ignore
import PaymentService from '../../02-backend/apps-script/payments/PaymentService.gs';
// @ts-ignore
import MeetingLinkService from '../../02-backend/apps-script/meeting-links/MeetingLinkService.gs';
// @ts-ignore
import ClassService from '../../02-backend/apps-script/classes/ClassService.gs';

describe('Permanent, Consistent Student IDs and Lifecycle Integrity', () => {
  let spreadsheet: any;
  const actor = { actorId: 'admin_1', email: 'ashreya0502@gmail.com', requestId: 'req_test' };

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
  });

  it('generates STU_001 for the first student on an empty sheet', () => {
    const nextId = IdGenerator.generateSequentialStudentId([]);
    expect(nextId).toBe('STU_001');

    const res = StudentService.Students_create(spreadsheet, {
      student_name: 'First Learner',
      parent_name: 'Parent One',
      parent_phone: '+919876543210'
    }, actor);
    expect(res.success).toBe(true);
    expect(res.data.student_id).toBe('STU_001');
  });

  it('generates sequential IDs with zero-padding up to 999 and unpadded beyond', () => {
    expect(IdGenerator.formatStudentId(1)).toBe('STU_001');
    expect(IdGenerator.formatStudentId(2)).toBe('STU_002');
    expect(IdGenerator.formatStudentId(42)).toBe('STU_042');
    expect(IdGenerator.formatStudentId(999)).toBe('STU_999');
    expect(IdGenerator.formatStudentId(1000)).toBe('STU_1000');
    expect(IdGenerator.formatStudentId(1005)).toBe('STU_1005');

    const existing = ['STU_001', 'STU_002', 'STU_003'];
    expect(IdGenerator.generateSequentialStudentId(existing)).toBe('STU_004');

    const existing999 = ['STU_999'];
    expect(IdGenerator.generateSequentialStudentId(existing999)).toBe('STU_1000');
  });

  it('safely skips legacy IDs, blank rows, and avoids collisions', () => {
    const existingWithLegacy = ['stu_101', 'LEGACY_A', '', null, undefined, 'STU_005', 'stu_999'];
    const nextId = IdGenerator.generateSequentialStudentId(existingWithLegacy);
    expect(nextId).toBe('STU_006');

    // If candidate collision occurs with legacy ID STU_007:
    const collisionList = ['STU_006', 'STU_007'];
    expect(IdGenerator.generateSequentialStudentId(collisionList)).toBe('STU_008');
  });

  it('never changes student ID when editing, renaming, or changing status', () => {
    const created = StudentService.Students_create(spreadsheet, {
      student_name: 'Original Name',
      parent_name: 'Parent Name',
      parent_phone: '+919876543210',
      subject: 'Math',
      status: 'ACTIVE'
    }, actor);
    const sid = created.data.student_id;
    expect(sid).toBe('STU_001');

    // 1. Rename student
    const renameRes = StudentService.Students_update(spreadsheet, sid, {
      student_name: 'Renamed Student'
    }, actor);
    expect(renameRes.success).toBe(true);
    expect(renameRes.data.student_id).toBe(sid);
    expect(renameRes.data.student_name).toBe('Renamed Student');

    // 2. Change status to INACTIVE
    const statusRes = StudentService.Students_update(spreadsheet, sid, {
      status: 'INACTIVE'
    }, actor);
    expect(statusRes.success).toBe(true);
    expect(statusRes.data.student_id).toBe(sid);
    expect(statusRes.data.status).toBe('INACTIVE');

    // 3. Archive student (sets status to INACTIVE)
    const archiveRes = StudentService.Students_archive(spreadsheet, sid, actor);
    expect(archiveRes.success).toBe(true);
    expect(archiveRes.data.student_id).toBe(sid);
    expect(archiveRes.data.status).toBe('INACTIVE');

    // Also explicit ARCHIVED status update retains identity
    const directArchive = StudentService.Students_update(spreadsheet, sid, { status: 'ARCHIVED' }, actor);
    expect(directArchive.success).toBe(true);
    expect(directArchive.data.student_id).toBe(sid);
    expect(directArchive.data.status).toBe('ARCHIVED');

    // 4. Reactivate student
    const reactivateRes = StudentService.Students_reactivate(spreadsheet, sid, actor);
    expect(reactivateRes.success).toBe(true);
    expect(reactivateRes.data.student_id).toBe(sid);
    expect(reactivateRes.data.status).toBe('ACTIVE');
  });

  it('preserves student identity across packages, payments, schedules, and meeting links', () => {
    const created = StudentService.Students_create(spreadsheet, {
      student_name: 'Aarav Student',
      parent_name: 'Priya Parent',
      parent_phone: '+919876543210'
    }, actor);
    const sid = created.data.student_id;
    expect(sid).toBe('STU_001');

    // Package creation references immutable sid
    const pkgRes = PackageService.Packages_create(spreadsheet, {
      student_id: sid,
      plan_name: '10-Class Pack',
      plan_type: 'PACKAGE',
      currency: 'INR',
      package_price: 10000,
      classes_purchased: 10
    }, actor);
    expect(pkgRes.success).toBe(true);
    expect(pkgRes.data.student_id).toBe(sid);

    // Payment recording references immutable sid
    const payRes = PaymentService.Payments_record(spreadsheet, {
      student_id: sid,
      amount: 10000,
      currency: 'INR',
      in_inr: 10000,
      payment_date: '2026-10-24'
    }, actor);
    expect(payRes.success).toBe(true);
    expect(payRes.data.student_id).toBe(sid);

    // Meeting link creation references immutable sid
    const linkRes = MeetingLinkService.MeetingLinks_create(spreadsheet, {
      student_id: sid,
      meeting_link_1: 'https://meet.google.com/abc-defg-hij',
      meeting_link_2: ''
    }, actor);
    expect(linkRes.success).toBe(true);
    expect(linkRes.data.student_id).toBe(sid);

    // Class scheduling references immutable sid
    const classRes = ClassService.Classes_schedule(spreadsheet, {
      student_id: sid,
      start_time: '2026-10-25T10:00:00.000Z',
      duration_minutes: 60
    }, actor);
    expect(classRes.success).toBe(true);
    expect(classRes.data.student_id).toBe(sid);

    // Verify student record in repository still has same ID and untouched identity
    const verifiedStudent = StudentService.Students_getById(spreadsheet, sid);
    expect(verifiedStudent.student_id).toBe(sid);
    expect(verifiedStudent.student_name).toBe('Aarav Student');
  });
});
