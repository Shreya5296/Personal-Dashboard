import { describe, it, expect, beforeEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';
// @ts-ignore
import StudentService from '../../02-backend/apps-script/students/StudentService.gs';
// @ts-ignore
import PackageService from '../../02-backend/apps-script/packages/PackageService.gs';
// @ts-ignore
import PackageRepository from '../../02-backend/apps-script/packages/PackageRepository.gs';
// @ts-ignore
import ClassService from '../../02-backend/apps-script/classes/ClassService.gs';
// @ts-ignore
import MeetingLinkService from '../../02-backend/apps-script/meeting-links/MeetingLinkService.gs';
// @ts-ignore
import MeetingLinkRepository from '../../02-backend/apps-script/meeting-links/MeetingLinkRepository.gs';
// @ts-ignore
import NoteService from '../../02-backend/apps-script/notes/NoteService.gs';
// @ts-ignore
import ReportService from '../../02-backend/apps-script/reports/ReportService.gs';

describe('Phase 5 — Classes, Credits, Meeting Links, and Notes', () => {
  let spreadsheet: MockSpreadsheet;
  const actor = { actorId: 'usr_admin', email: 'admin@example.com', requestId: 'req_cls' };
  let studentId: string;

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');

    const s = StudentService.Students_create(spreadsheet, {
      first_name: 'Tara', parent_guardian_name: 'Anita', primary_phone: '+919876543222'
    }, actor);
    studentId = s.data.student_id;
  });

  it('manages flat meeting links (primary meeting_link_1 and secondary meeting_link_2)', () => {
    const l1 = MeetingLinkService.MeetingLinks_create(spreadsheet, {
      student_id: studentId,
      meeting_link_1: 'https://zoom.us/j/111',
    }, actor);
    expect(l1.success).toBe(true);
    expect(l1.data.meeting_link_1).toBe('https://zoom.us/j/111');

    const l2 = MeetingLinkService.MeetingLinks_create(spreadsheet, {
      student_id: studentId,
      meeting_link_2: 'https://meet.google.com/abc',
    }, actor);
    expect(l2.success).toBe(true);

    const row = MeetingLinkRepository.MeetingLinks_getByStudentId(spreadsheet, studentId);
    expect(row).toBeDefined();
    expect(row.meeting_link_1).toBe('https://zoom.us/j/111');
    expect(row.meeting_link_2).toBe('https://meet.google.com/abc');
  });

  it('manages class consumption, no-shows, and credit restoration safeguards', () => {
    // 1. Create 5-class package
    const pkgRes = PackageService.Packages_create(spreadsheet, {
      student_id: studentId, package_name: '5-Class Math', purchased_classes: 5
    }, actor);
    expect(pkgRes.success).toBe(true);
    const pkgId = pkgRes.data.package_id;

    // Initial balance = 5
    let balance = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgId));
    expect(balance.remaining_classes).toBe(5);

    // 2. Schedule class 1
    const cls1 = ClassService.Classes_schedule(spreadsheet, {
      student_id: studentId, package_id: pkgId, class_title: 'Math Session 1',
      scheduled_start: '2026-03-01T10:00:00.000Z', scheduled_end: '2026-03-01T11:00:00.000Z'
    }, actor);
    expect(cls1.data.class_credit_effect).toBe('PENDING');

    // 3. Complete class 1 with ATTENDED -> CONSUME
    const comp1 = ClassService.Classes_complete(spreadsheet, {
      class_session_id: cls1.data.class_session_id, attendance_status: 'ATTENDED'
    }, actor);
    expect(comp1.data.class_credit_effect).toBe('CONSUME');

    balance = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgId));
    expect(balance.remaining_classes).toBe(4);

    // 4. Schedule and complete class 2 with ABSENT -> NO_CONSUME
    const cls2 = ClassService.Classes_schedule(spreadsheet, {
      student_id: studentId, package_id: pkgId, class_title: 'Math Session 2',
      scheduled_start: '2026-03-08T10:00:00.000Z', scheduled_end: '2026-03-08T11:00:00.000Z'
    }, actor);
    const comp2 = ClassService.Classes_complete(spreadsheet, {
      class_session_id: cls2.data.class_session_id, attendance_status: 'ABSENT'
    }, actor);
    expect(comp2.data.class_credit_effect).toBe('NO_CONSUME');

    balance = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgId));
    expect(balance.remaining_classes).toBe(4); // Did not consume

    // 5. Restore credit for class 1
    const restoreRes = ClassService.Classes_restoreCredit(spreadsheet, {
      class_session_id: cls1.data.class_session_id, reason: 'Technical glitch compensation'
    }, actor);
    expect(restoreRes.success).toBe(true);
    expect(restoreRes.data.class_credit_effect).toBe('CREDIT_BACK');

    balance = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgId));
    expect(balance.remaining_classes).toBe(5); // Restored!

    // 6. Duplicate restore on same session is prevented
    const dupRestore = ClassService.Classes_restoreCredit(spreadsheet, {
      class_session_id: cls1.data.class_session_id, reason: 'Duplicate attempt'
    }, actor);
    expect(dupRestore.success).toBe(false);
    expect(dupRestore.code).toBe('CONFLICT');
  });

  it('enforces approved attendance and late cancellation business policies (Phase F)', () => {
    // Create 10-class package
    const pkgRes = PackageService.Packages_create(spreadsheet, {
      student_id: studentId, package_name: '10-Class Science', purchased_classes: 10
    }, actor);
    const pkgId = pkgRes.data.package_id;

    // 1. Unexcused No-Show (outcome: 'NO_SHOW') consumes 1 credit
    const clsNoShow = ClassService.Classes_schedule(spreadsheet, {
      student_id: studentId, package_id: pkgId, class_title: 'Physics Lab 1',
      scheduled_start: '2026-03-10T10:00:00.000Z', scheduled_end: '2026-03-10T11:00:00.000Z'
    }, actor);
    const compNoShow = ClassService.Classes_complete(spreadsheet, {
      class_session_id: clsNoShow.data.class_session_id, outcome: 'NO_SHOW'
    }, actor);
    expect(compNoShow.data.class_credit_effect).toBe('CONSUME');
    expect(compNoShow.data.attendance_status).toBe('ABSENT_UNEXCUSED');

    let bal = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgId));
    expect(bal.remaining_classes).toBe(9);

    // 2. Excused Absence (outcome: 'EXCUSED') preserves credit
    const clsExcused = ClassService.Classes_schedule(spreadsheet, {
      student_id: studentId, package_id: pkgId, class_title: 'Physics Lab 2',
      scheduled_start: '2026-03-11T10:00:00.000Z', scheduled_end: '2026-03-11T11:00:00.000Z'
    }, actor);
    const compExcused = ClassService.Classes_complete(spreadsheet, {
      class_session_id: clsExcused.data.class_session_id, outcome: 'EXCUSED'
    }, actor);
    expect(compExcused.data.class_credit_effect).toBe('NO_CONSUME');
    expect(compExcused.data.attendance_status).toBe('ABSENT_EXCUSED');

    bal = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgId));
    expect(bal.remaining_classes).toBe(9);

    // 3. Advance cancellation (>= 4 hours notice) preserves credit
    const clsAdvanceCancel = ClassService.Classes_schedule(spreadsheet, {
      student_id: studentId, package_id: pkgId, class_title: 'Physics Lab 3',
      scheduled_start: '2026-03-15T15:00:00.000Z', scheduled_end: '2026-03-15T16:00:00.000Z'
    }, actor);
    const compAdvCancel = ClassService.Classes_cancel(spreadsheet, {
      class_session_id: clsAdvanceCancel.data.class_session_id,
      cancellation_time: '2026-03-15T09:00:00.000Z', // 6 hours prior
      cancellation_reason: 'Doctor appointment'
    }, actor);
    expect(compAdvCancel.data.class_credit_effect).toBe('NO_CONSUME');
    expect(compAdvCancel.data.session_status).toBe('CANCELLED');

    bal = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgId));
    expect(bal.remaining_classes).toBe(9);

    // 4. Late cancellation (< 4 hours notice) without waiver deducts 1 credit
    const clsLateCancel = ClassService.Classes_schedule(spreadsheet, {
      student_id: studentId, package_id: pkgId, class_title: 'Physics Lab 4',
      scheduled_start: '2026-03-16T15:00:00.000Z', scheduled_end: '2026-03-16T16:00:00.000Z'
    }, actor);
    const compLateCancel = ClassService.Classes_cancel(spreadsheet, {
      class_session_id: clsLateCancel.data.class_session_id,
      cancellation_time: '2026-03-16T13:30:00.000Z', // 1.5 hours prior (< 4h)
      cancellation_reason: 'Forgot session'
    }, actor);
    expect(compLateCancel.data.class_credit_effect).toBe('CONSUME');
    expect(compLateCancel.data.attendance_status).toBe('CANCELLED_LATE');

    bal = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgId));
    expect(bal.remaining_classes).toBe(8); // Deducted 1 credit!

    // 5. Late cancellation (< 4 hours notice) WITH tutor waiver preserves credit
    const clsLateWaived = ClassService.Classes_schedule(spreadsheet, {
      student_id: studentId, package_id: pkgId, class_title: 'Physics Lab 5',
      scheduled_start: '2026-03-17T15:00:00.000Z', scheduled_end: '2026-03-17T16:00:00.000Z'
    }, actor);
    const compLateWaived = ClassService.Classes_cancel(spreadsheet, {
      class_session_id: clsLateWaived.data.class_session_id,
      cancellation_time: '2026-03-17T14:00:00.000Z', // 1 hour prior (< 4h)
      cancellation_reason: 'Family emergency',
      credit_waiver: true
    }, actor);
    expect(compLateWaived.data.class_credit_effect).toBe('NO_CONSUME');

    bal = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgId));
    expect(bal.remaining_classes).toBe(8); // Preserved!
  });

  it('records student notes and provides dashboard overview metrics', () => {
    const note = NoteService.Notes_create(spreadsheet, {
      student_id: studentId, note_type: 'FOLLOW_UP', note_text: 'Check homework completion',
      follow_up_date: '2026-03-10'
    }, actor);
    expect(note.success).toBe(true);

    const overview = ReportService.Reports_getDashboardOverview(spreadsheet);
    expect(overview.success).toBe(true);
    expect(overview.data.activeStudentsCount).toBe(1);
  });

  it('authoritatively blocks overlapping scheduling conflicts while allowing adjacent intervals', () => {
    // 1. Initial valid class
    const cls1 = ClassService.Classes_schedule(spreadsheet, {
      student_id: studentId,
      class_title: 'Math Class 1',
      scheduled_start: '2026-11-02T15:00:00.000Z',
      scheduled_end: '2026-11-02T16:00:00.000Z',
      duration_minutes: 60,
    }, actor);
    expect(cls1.success).toBe(true);

    // 2. Overlapping class (15:30 to 16:30) must be rejected
    const overlap = ClassService.Classes_schedule(spreadsheet, {
      student_id: studentId,
      class_title: 'Math Class 2',
      scheduled_start: '2026-11-02T15:30:00.000Z',
      scheduled_end: '2026-11-02T16:30:00.000Z',
      duration_minutes: 60,
    }, actor);
    expect(overlap.success).toBe(false);
    expect(overlap.code).toBe('SCHEDULING_CONFLICT');
    expect(overlap.message).toContain('already scheduled');

    // 3. Exact duplicate (15:00 to 16:00) must be rejected
    const dup = ClassService.Classes_schedule(spreadsheet, {
      student_id: studentId,
      class_title: 'Math Class Dup',
      scheduled_start: '2026-11-02T15:00:00.000Z',
      scheduled_end: '2026-11-02T16:00:00.000Z',
      duration_minutes: 60,
    }, actor);
    expect(dup.success).toBe(false);
    expect(dup.code).toBe('SCHEDULING_CONFLICT');

    // 4. Adjacent class (16:00 to 17:00) touching boundary must be allowed
    const adjacent = ClassService.Classes_schedule(spreadsheet, {
      student_id: studentId,
      class_title: 'Math Class 3',
      scheduled_start: '2026-11-02T16:00:00.000Z',
      scheduled_end: '2026-11-02T17:00:00.000Z',
      duration_minutes: 60,
    }, actor);
    expect(adjacent.success).toBe(true);
  });
});
