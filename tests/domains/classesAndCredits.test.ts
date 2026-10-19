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

  it('enforces single preferred meeting link policy', () => {
    const l1 = MeetingLinkService.MeetingLinks_create(spreadsheet, {
      student_id: studentId, provider: 'ZOOM', link_label: 'Main Zoom',
      meeting_url: 'https://zoom.us/j/111', is_preferred: true
    }, actor);
    expect(l1.success).toBe(true);
    expect(l1.data.is_preferred).toBe(true);

    const l2 = MeetingLinkService.MeetingLinks_create(spreadsheet, {
      student_id: studentId, provider: 'GOOGLE_MEET', link_label: 'Backup Meet',
      meeting_url: 'https://meet.google.com/abc', is_preferred: true
    }, actor);
    expect(l2.success).toBe(true);
    expect(l2.data.is_preferred).toBe(true);

    // L1 should have been unmarked as preferred
    const l1Updated = MeetingLinkRepository.MeetingLinks_getById(spreadsheet, l1.data.meeting_link_id);
    expect(l1Updated.is_preferred).toBe(false);
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
});
