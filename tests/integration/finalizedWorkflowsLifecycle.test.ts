import { describe, it, expect, beforeEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';

// Load domain services and repositories
const StudentService = require('../../02-backend/apps-script/students/StudentService.gs');
const StudentRepository = require('../../02-backend/apps-script/students/StudentRepository.gs');
const PackageService = require('../../02-backend/apps-script/packages/PackageService.gs');
const PackageRepository = require('../../02-backend/apps-script/packages/PackageRepository.gs');
const PaymentService = require('../../02-backend/apps-script/payments/PaymentService.gs');
const PaymentRepository = require('../../02-backend/apps-script/payments/PaymentRepository.gs');
const ClassService = require('../../02-backend/apps-script/classes/ClassService.gs');
const ClassRepository = require('../../02-backend/apps-script/classes/ClassRepository.gs');
const MeetingLinkService = require('../../02-backend/apps-script/meeting-links/MeetingLinkService.gs');
const MeetingLinkRepository = require('../../02-backend/apps-script/meeting-links/MeetingLinkRepository.gs');
const NoteService = require('../../02-backend/apps-script/notes/NoteService.gs');
const NoteRepository = require('../../02-backend/apps-script/notes/NoteRepository.gs');
const ReportService = require('../../02-backend/apps-script/reports/ReportService.gs');

describe('Finalized 6-Table End-to-End User Workflows Verification', () => {
  let spreadsheet: MockSpreadsheet;
  const adminActor = {
    actorId: 'usr_admin_e2e',
    email: 'admin@dashboard.local',
    requestId: 'req_finalized_e2e'
  };

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');

    // Simulate exact post-migration state: remove legacy Enrollments & FeeObligations tabs
    spreadsheet.deleteSheet('Enrollments');
    spreadsheet.deleteSheet('FeeObligations');
  });

  // Workflow 1: Student CRUD & Lifecycle
  it('1. verifies student creation, profile view, editing, archive, and reactivation', () => {
    // A. Create Student (9-col schema)
    const createRes = StudentService.Students_create(spreadsheet, {
      student_name: 'Priya Sharma',
      parent_name: 'Rajesh Sharma',
      parent_phone: '+91 98765 43210',
      student_phone: '+91 98765 43211',
      parent_email: 'rajesh@example.com',
      student_email: 'priya@example.com',
      subject: 'Mathematics [Grade 10]',
      status: 'ACTIVE'
    }, adminActor);

    expect(createRes.success).toBe(true);
    const stuId = createRes.data.student_id;
    expect(stuId).toBeDefined();

    // B. View Student & Profile Enrichment
    const fetched = StudentRepository.Students_getById(spreadsheet, stuId);
    expect(fetched).toBeDefined();
    const enriched = StudentService.Students_enrich(fetched);
    expect(enriched.student_name).toBe('Priya Sharma');
    expect(enriched.full_name).toBe('Priya Sharma');
    expect(enriched.subject).toBe('Mathematics [Grade 10]');
    expect(enriched.status).toBe('ACTIVE');

    // C. Edit Student Details
    const updateRes = StudentService.Students_update(spreadsheet, stuId, {
      subject: 'Advanced Mathematics [Grade 10]',
      parent_phone: '+91 98765 99999'
    }, adminActor);
    expect(updateRes.success).toBe(true);
    expect(updateRes.data.subject).toBe('Advanced Mathematics [Grade 10]');
    expect(updateRes.data.parent_phone).toBe('+91 98765 99999');

    // D. Archive Student
    const archiveRes = StudentService.Students_archive(spreadsheet, stuId, adminActor);
    expect(archiveRes.success).toBe(true);
    expect(archiveRes.data.status).toBe('INACTIVE');

    // E. Reactivate Student
    const reactivateRes = StudentService.Students_reactivate(spreadsheet, stuId, adminActor);
    expect(reactivateRes.success).toBe(true);
    expect(reactivateRes.data.status).toBe('ACTIVE');
  });

  // Workflow 2 & 6: Package Creation, Balance & FIFO Allocation Across Multiple Packages
  it('2 & 6. verifies package management, balance derivations, and FIFO consumption order', () => {
    const stuRes = StudentService.Students_create(spreadsheet, {
      student_name: 'Aarav Patel',
      parent_name: 'Vikram Patel',
      parent_phone: '+91 91111 22222',
      status: 'ACTIVE'
    }, adminActor);
    const stuId = stuRes.data.student_id;

    // Create Package A (Older package: 5 classes, start_date = 2026-03-01)
    const pkgA = PackageService.Packages_create(spreadsheet, {
      student_id: stuId,
      student_name: 'Aarav Patel',
      plan_type: 'PACKAGE',
      currency: 'INR',
      package_price: 5000,
      per_class: 1000,
      classes_purchased: 5,
      start_date: '2026-03-01',
      end_date: '2026-04-01'
    }, adminActor);
    expect(pkgA.success).toBe(true);
    const pkgAId = pkgA.data.package_id;

    // Create Package B (Newer package: 5 classes, start_date = 2026-04-01)
    const pkgB = PackageService.Packages_create(spreadsheet, {
      student_id: stuId,
      student_name: 'Aarav Patel',
      plan_type: 'PACKAGE',
      currency: 'INR',
      package_price: 5000,
      per_class: 1000,
      classes_purchased: 5,
      start_date: '2026-04-01',
      end_date: '2026-05-01'
    }, adminActor);
    expect(pkgB.success).toBe(true);
    const pkgBId = pkgB.data.package_id;

    // Schedule and attend 5 sessions in March -> Should deduct 5 classes from Package A
    for (let i = 1; i <= 5; i++) {
      const cls = ClassService.Classes_schedule(spreadsheet, {
        student_id: stuId,
        scheduled_start: `2026-03-0${i}T10:00:00Z`,
        scheduled_end: `2026-03-0${i}T11:00:00Z`
      }, adminActor).data;

      ClassService.Classes_complete(spreadsheet, {
        class_session_id: cls.class_session_id,
        attendance_status: 'PRESENT'
      }, adminActor);
    }

    // Check balances after 5 attended sessions:
    // Package A must be exhausted (consumed: 5, remaining: 0)
    const balA = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgAId));
    expect(balA.consumed_classes).toBe(5);
    expect(balA.remaining_classes).toBe(0);
    expect(balA.is_exhausted).toBe(true);

    // Package B must be completely untouched (consumed: 0, remaining: 5)
    const balB = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgBId));
    expect(balB.consumed_classes).toBe(0);
    expect(balB.remaining_classes).toBe(5);
    expect(balB.is_exhausted).toBe(false);

    // Schedule and attend 6th session in April -> FIFO should deduct from Package B
    const cls6 = ClassService.Classes_schedule(spreadsheet, {
      student_id: stuId,
      scheduled_start: '2026-04-05T10:00:00Z',
      scheduled_end: '2026-04-05T11:00:00Z'
    }, adminActor).data;

    ClassService.Classes_complete(spreadsheet, {
      class_session_id: cls6.class_session_id,
      attendance_status: 'PRESENT'
    }, adminActor);

    // Package A remains exhausted (consumed: 5)
    const balAAfter6 = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgAId));
    expect(balAAfter6.consumed_classes).toBe(5);
    expect(balAAfter6.remaining_classes).toBe(0);

    // Package B now has 1 consumed, 4 remaining
    const balBAfter6 = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgBId));
    expect(balBAfter6.consumed_classes).toBe(1);
    expect(balBAfter6.remaining_classes).toBe(4);
    expect(balBAfter6.is_exhausted).toBe(false);
  });

  // Workflow 3: Payment Recording, Idempotency & Safe Voiding
  it('3. verifies payment recording, duplicate idempotency protection, and safe voiding', () => {
    const stuRes = StudentService.Students_create(spreadsheet, {
      student_name: 'Rohan Mehra',
      parent_name: 'Sunil Mehra',
      parent_phone: '+91 97777 88888',
      status: 'ACTIVE'
    }, adminActor);
    expect(stuRes.success).toBe(true);
    const stuId = stuRes.data.student_id;

    // A. Record Payment 1 (₹5,000)
    const pay1 = PaymentService.Payments_record(spreadsheet, {
      student_id: stuId,
      student_name: 'Rohan Mehra',
      payment_date: '2026-03-10',
      amount: 5000,
      currency: 'INR',
      in_inr: 5000,
      idempotency_key: 'idemp_unique_pay_01'
    }, adminActor);
    expect(pay1.success).toBe(true);
    expect(pay1.data.amount).toBe(5000);

    // B. Retried Payment with same Idempotency Key -> Returns cached record without appending duplicate row
    const pay1Retry = PaymentService.Payments_record(spreadsheet, {
      student_id: stuId,
      student_name: 'Rohan Mehra',
      payment_date: '2026-03-10',
      amount: 5000,
      currency: 'INR',
      in_inr: 5000,
      idempotency_key: 'idemp_unique_pay_01'
    }, adminActor);
    expect(pay1Retry.success).toBe(true);

    const paySheet = spreadsheet.getSheetByName('Payments')!;
    expect(paySheet.rows.length).toBe(2); // Exactly 1 header + 1 payment row

    // C. Record Payment 2 (₹2,500)
    const pay2 = PaymentService.Payments_record(spreadsheet, {
      student_id: stuId,
      student_name: 'Rohan Mehra',
      payment_date: '2026-03-15',
      amount: 2500,
      currency: 'INR',
      in_inr: 2500,
      idempotency_key: 'idemp_unique_pay_02'
    }, adminActor);
    expect(pay2.success).toBe(true);
    expect(paySheet.rows.length).toBe(3);

    // D. Safe Voiding of Payment 2
    const voidRes = PaymentService.Payments_void(spreadsheet, {
      payment_id: pay2.data.payment_id,
      void_reason: 'Accidental duplicate charge'
    }, adminActor);
    expect(voidRes.success).toBe(true);

    // Header row is preserved, and remaining payment row exists
    expect(paySheet.rows[0]).toEqual(['student_id', 'student_name', 'payment_date', 'amount', 'currency', 'in_inr']);
  });

  // Workflow 4 & 5: Class Scheduling, Attendance Marking & Deduction Rules Matrix
  it('4 & 5. verifies attendance marking and full class deduction rules matrix', () => {
    const stuRes = StudentService.Students_create(spreadsheet, {
      student_name: 'Kavya Rao',
      parent_name: 'Anand Rao',
      parent_phone: '+91 96666 77777',
      status: 'ACTIVE'
    }, adminActor);
    expect(stuRes.success).toBe(true);
    const stuId = stuRes.data.student_id;

    // Rule A: PRESENT -> deduct_class = true (consumes 1 credit)
    const clsA = ClassService.Classes_schedule(spreadsheet, {
      student_id: stuId,
      scheduled_start: '2026-03-20T10:00:00Z',
      scheduled_end: '2026-03-20T11:00:00Z'
    }, adminActor).data;

    const resA = ClassService.Classes_complete(spreadsheet, {
      class_session_id: clsA.class_session_id,
      attendance_status: 'PRESENT'
    }, adminActor);
    expect(resA.data.deduct_class).toBe(true);
    expect(resA.data.class_credit_effect).toBe('CONSUME');

    // Rule B: ABSENT -> asks owner; defaults to deduct_class = false
    const clsB = ClassService.Classes_schedule(spreadsheet, {
      student_id: stuId,
      scheduled_start: '2026-03-21T10:00:00Z',
      scheduled_end: '2026-03-21T11:00:00Z'
    }, adminActor).data;

    const resB = ClassService.Classes_complete(spreadsheet, {
      class_session_id: clsB.class_session_id,
      attendance_status: 'ABSENT'
    }, adminActor);
    expect(resB.data.deduct_class).toBe(false);
    expect(resB.data.class_credit_effect).toBe('NO_CONSUME');

    // Rule C: NOT MARKED / SCHEDULED -> deduct_class = false
    const clsC = ClassService.Classes_schedule(spreadsheet, {
      student_id: stuId,
      scheduled_start: '2026-03-25T10:00:00Z',
      scheduled_end: '2026-03-25T11:00:00Z'
    }, adminActor).data;
    expect(clsC.deduct_class).toBe(false);

    // Rule D: CANCELLED with advance notice (>= 4 hours) -> preserves credit
    const clsD = ClassService.Classes_schedule(spreadsheet, {
      student_id: stuId,
      scheduled_start: '2026-03-26T14:00:00Z',
      scheduled_end: '2026-03-26T15:00:00Z'
    }, adminActor).data;

    const resD = ClassService.Classes_cancel(spreadsheet, {
      class_session_id: clsD.class_session_id,
      cancellation_time: '2026-03-26T08:00:00Z', // 6h advance notice
      cancellation_reason: 'Doctor appointment'
    }, adminActor);
    expect(resD.data.deduct_class).toBe(false);
    expect(resD.data.class_credit_effect).toBe('NO_CONSUME');

    // Rule E: CANCELLED with late notice (< 4 hours) without waiver -> deducts 1 credit
    const clsE = ClassService.Classes_schedule(spreadsheet, {
      student_id: stuId,
      scheduled_start: '2026-03-27T10:00:00Z',
      scheduled_end: '2026-03-27T11:00:00Z'
    }, adminActor).data;

    const resE = ClassService.Classes_cancel(spreadsheet, {
      class_session_id: clsE.class_session_id,
      cancellation_time: '2026-03-27T09:00:00Z', // 1h advance notice
      cancellation_reason: 'Overslept',
      waive_penalty: false
    }, adminActor);
    expect(resE.data.deduct_class).toBe(true);
    expect(resE.data.class_credit_effect).toBe('CONSUME');

    // Rule F: CREDIT_BACK -> restores credit consumed
    const restRes = ClassService.Classes_restoreCredit(spreadsheet, {
      class_session_id: clsE.class_session_id,
      reason: 'Tutor decided to grant one-time courtesy makeup'
    }, adminActor);
    expect(restRes.success).toBe(true);
    expect(restRes.data.class_credit_effect).toBe('CREDIT_BACK');
  });

  // Workflow 7: Meeting Links & Student Notes
  it('7. verifies meeting links creation and student notes logging', () => {
    const stuRes = StudentService.Students_create(spreadsheet, {
      student_name: 'Devansh Jain',
      parent_name: 'Alok Jain',
      parent_phone: '+91 95555 66666',
      status: 'ACTIVE'
    }, adminActor);
    expect(stuRes.success).toBe(true);
    const stuId = stuRes.data.student_id;

    // A. Create & Query Meeting Links (4-col flat structure)
    const linkRes = MeetingLinkService.MeetingLinks_create(spreadsheet, {
      student_id: stuId,
      student_name: 'Devansh Jain',
      meeting_link_1: 'https://meet.google.com/abc-defg-hij',
      meeting_link_2: 'https://meet.google.com/xyz-uvwx-rst'
    }, adminActor);
    expect(linkRes.success).toBe(true);

    const links = MeetingLinkRepository.MeetingLinks_getByStudentId(spreadsheet, stuId);
    expect(links).toBeDefined();
    expect(links.meeting_link_1).toBe('https://meet.google.com/abc-defg-hij');
    expect(links.meeting_link_2).toBe('https://meet.google.com/xyz-uvwx-rst');

    // B. Append Multiple Student Notes (5-col structure)
    const note1 = NoteService.Notes_create(spreadsheet, {
      student_id: stuId,
      student_name: 'Devansh Jain',
      note_date: '2026-03-01',
      note_text: 'Diagnostic evaluation: Strong in algebra, needs trigonometry reinforcement.',
      follow_up_date: '2026-03-15'
    }, adminActor);
    expect(note1.success).toBe(true);

    const note2 = NoteService.Notes_create(spreadsheet, {
      student_id: stuId,
      student_name: 'Devansh Jain',
      note_date: '2026-03-15',
      note_text: 'Trigonometry module 1 completed successfully.',
      follow_up_date: '2026-03-30'
    }, adminActor);
    expect(note2.success).toBe(true);

    const studentNotes = NoteRepository.Notes_getByStudentId(spreadsheet, stuId);
    expect(studentNotes.length).toBe(2);
    expect(studentNotes[0].note_text).toContain('Diagnostic evaluation');
    expect(studentNotes[1].note_text).toContain('Trigonometry module 1');
  });

  // Workflow 8: Dashboard Metrics & Financial Reports
  it('8. verifies dynamic dashboard metrics and financial reporting without legacy tabs', () => {
    // 2 Active Students
    const s1 = StudentService.Students_create(spreadsheet, {
      student_name: 'Student One',
      parent_name: 'Parent One',
      parent_phone: '+91 94444 55555',
      status: 'ACTIVE'
    }, adminActor).data;

    const s2 = StudentService.Students_create(spreadsheet, {
      student_name: 'Student Two',
      parent_name: 'Parent Two',
      parent_phone: '+91 94444 66666',
      status: 'ACTIVE'
    }, adminActor).data;

    // Package for s1: 2 classes
    PackageService.Packages_create(spreadsheet, {
      student_id: s1.student_id,
      student_name: 'Student One',
      plan_type: 'PACKAGE',
      currency: 'INR',
      package_price: 2000,
      per_class: 1000,
      classes_purchased: 2,
      start_date: '2026-03-01',
      end_date: '2026-04-01'
    }, adminActor);

    // Schedule 1 upcoming class in next 3 days
    const now = new Date();
    const futureStart = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const futureEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 3600000).toISOString();
    const schedRes = ClassService.Classes_schedule(spreadsheet, {
      student_id: s1.student_id,
      scheduled_start: futureStart,
      scheduled_end: futureEnd
    }, adminActor);
    expect(schedRes.success).toBe(true);

    // Record 1 payment of ₹2,000
    PaymentService.Payments_record(spreadsheet, {
      student_id: s1.student_id,
      student_name: 'Student One',
      payment_date: '2026-03-01',
      amount: 2000,
      currency: 'INR',
      in_inr: 2000
    }, adminActor);

    // Dashboard Overview Verification
    const overview = ReportService.Reports_getDashboardOverview(spreadsheet);
    expect(overview.success).toBe(true);
    expect(overview.data.activeStudentsCount).toBe(2);
    expect(overview.data.upcomingClassesCount).toBe(1);
    expect(overview.data.classesUpcoming7Days).toBe(1);

    // Financial Summary Verification
    const finSummary = ReportService.Reports_getFinancialSummary(spreadsheet);
    expect(finSummary.success).toBe(true);
    expect(finSummary.data.totalReceived).toBe(2000);
    expect(finSummary.data.totalCollected).toBe(2000);
    expect(finSummary.data.currency).toBe('INR');
  });
});
