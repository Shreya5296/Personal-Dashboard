import { describe, it, expect, beforeEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';

// Load Apps Script modules via CommonJS require
const { registerStudentOperations } = require('../../02-backend/apps-script/students/StudentHandlers.gs');
const { registerPackageOperations } = require('../../02-backend/apps-script/packages/PackageHandlers.gs');
const { registerFeeOperations } = require('../../02-backend/apps-script/fees/FeeHandlers.gs');
const { registerPaymentOperations } = require('../../02-backend/apps-script/payments/PaymentHandlers.gs');
const { registerClassOperations } = require('../../02-backend/apps-script/classes/ClassHandlers.gs');
const { registerReportOperations } = require('../../02-backend/apps-script/reports/ReportHandlers.gs');
const { registerNoteOperations } = require('../../02-backend/apps-script/notes/NoteHandlers.gs');
const { registerMeetingLinkOperations } = require('../../02-backend/apps-script/meeting-links/MeetingLinkHandlers.gs');
const { registerClassScheduleOperations } = require('../../02-backend/apps-script/classes/ClassScheduleHandlers.gs');

describe('Backend Operation Adapters and Compatibility', () => {
  let spreadsheet: any;
  const registry: Record<string, Function> = {};
  const mockRouter = {
    registerOperation: (name: string, fn: Function) => {
      registry[name] = fn;
    },
  };

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
    registerStudentOperations(mockRouter);
    registerPackageOperations(mockRouter);
    registerFeeOperations(mockRouter);
    registerPaymentOperations(mockRouter);
    registerClassOperations(mockRouter);
    registerReportOperations(mockRouter);
    registerNoteOperations(mockRouter);
    registerMeetingLinkOperations(mockRouter);
    registerClassScheduleOperations(mockRouter);
  });

  it('adapts student creation with full_name, phone, parent_name and enriches output', () => {
    const res = registry['students.create']({
      spreadsheet,
      payload: {
        full_name: 'Ananya Roy',
        phone: '9876543210',
        parent_name: 'Sunita Roy',
        parent_email: 'sunita@example.com',
      },
      actorId: 'usr_test',
      verifiedEmail: 'ashreya0502@gmail.com',
      requestId: 'req_1',
    });

    expect(res.success).toBe(true);
    expect(res.data.student_id).toBeDefined();
    expect(res.data.student_name).toBe('Ananya Roy');
    expect(res.data.full_name).toBe('Ananya Roy');
    expect(res.data.phone).toBe('9876543210');
    expect(res.data.parent_name).toBe('Sunita Roy');
    expect(res.data.status).toBe('ACTIVE');
  });

  it('supports packages.getBalance calculation for a student', () => {
    const studentRes = registry['students.create']({
      spreadsheet,
      payload: { full_name: 'Test Student', phone: '9999999999', parent_name: 'P Name' },
      actorId: 'usr_test',
      verifiedEmail: 'ashreya0502@gmail.com',
      requestId: 'req_stu',
    });
    const studentId = studentRes.data.student_id;

    registry['packages.create']({
      spreadsheet,
      payload: { student_id: studentId, package_name: '10-Class Pack', total_classes: 10, price: 5000 },
      actorId: 'usr_test',
      verifiedEmail: 'ashreya0502@gmail.com',
      requestId: 'req_pkg',
    });

    const balRes = registry['packages.getBalance']({
      spreadsheet,
      payload: { studentId },
    });

    expect(balRes.success).toBe(true);
    expect(balRes.data.totalPurchased).toBe(10);
    expect(balRes.data.totalConsumed).toBe(0);
    expect(balRes.data.remainingClasses).toBe(10);
  });

  it('adapts fees.create with description and enriches fee output', () => {
    const studentRes = registry['students.create']({
      spreadsheet,
      payload: { full_name: 'Fee Student', phone: '9888888888', parent_name: 'Parent' },
      actorId: 'usr_test',
      verifiedEmail: 'ashreya0502@gmail.com',
      requestId: 'req_f_stu',
    });
    const studentId = studentRes.data.student_id;

    const feeRes = registry['fees.create']({
      spreadsheet,
      payload: { student_id: studentId, description: 'Monthly Tuition', amount_due: 3000, due_date: '2026-11-01' },
      actorId: 'usr_test',
      verifiedEmail: 'ashreya0502@gmail.com',
      requestId: 'req_f',
    });

    expect(feeRes.success).toBe(true);
    expect(feeRes.data.obligation_description).toBe('Monthly Tuition');

    const listRes = registry['fees.list']({ spreadsheet, payload: { studentId } });
    expect(listRes.success).toBe(true);
    expect(listRes.data[0].fee_id).toBe(feeRes.data.fee_obligation_id);
    expect(listRes.data[0].description).toBe('Monthly Tuition');
    expect(listRes.data[0].outstanding_balance).toBe(3000);
    expect(listRes.data[0].amount_paid).toBe(0);
  });

  it('records payments with fee_id and reference_number aliases', () => {
    const studentRes = registry['students.create']({
      spreadsheet,
      payload: { full_name: 'Pay Student', phone: '9777777777', parent_name: 'Parent' },
      actorId: 'usr_test',
      verifiedEmail: 'ashreya0502@gmail.com',
      requestId: 'req_p_stu',
    });
    const studentId = studentRes.data.student_id;

    const feeRes = registry['fees.create']({
      spreadsheet,
      payload: { student_id: studentId, description: 'Tuition', amount_due: 2000, due_date: '2026-11-01' },
      actorId: 'usr_test',
      verifiedEmail: 'ashreya0502@gmail.com',
      requestId: 'req_p_fee',
    });
    const feeId = feeRes.data.fee_obligation_id;

    const payRes = registry['payments.record']({
      spreadsheet,
      payload: {
        student_id: studentId,
        fee_id: feeId,
        amount: 2000,
        payment_method: 'UPI',
        reference_number: 'UPI_REF_999',
        idempotency_key: 'idem_test_999',
      },
      actorId: 'usr_test',
      verifiedEmail: 'ashreya0502@gmail.com',
      requestId: 'req_pay',
    });

    expect(payRes.success).toBe(true);
    expect(payRes.data.amount).toBe(2000);

    const payList = registry['payments.list']({ spreadsheet, payload: { studentId } });
    expect(payList.data[0].amount).toBe(2000);
    expect(payList.data[0].status).toBe('RECORDED');
  });

  it('routes classes.schedule and classes.recordAttendance aliases', () => {
    const studentRes = registry['students.create']({
      spreadsheet,
      payload: { full_name: 'Class Student', phone: '9666666666', parent_name: 'Parent' },
      actorId: 'usr_test',
      verifiedEmail: 'ashreya0502@gmail.com',
      requestId: 'req_c_stu',
    });
    const studentId = studentRes.data.student_id;

    const schedRes = registry['classes.schedule']({
      spreadsheet,
      payload: {
        student_id: studentId,
        topic: 'Algebra Session 1',
        start_time: '2026-10-25T10:00:00.000Z',
        duration_minutes: 60,
      },
      actorId: 'usr_test',
      verifiedEmail: 'ashreya0502@gmail.com',
      requestId: 'req_sched',
    });

    expect(schedRes.success).toBe(true);
    expect(schedRes.data.class_title).toBe('Algebra Session 1');
    expect(schedRes.data.scheduled_end).toBe('2026-10-25T11:00:00.000Z');

    const listRes = registry['classes.list']({ spreadsheet, payload: { studentId } });
    expect(listRes.data[0].session_id).toBe(schedRes.data.class_session_id);
    expect(listRes.data[0].duration_minutes).toBe(60);

    const attRes = registry['classes.recordAttendance']({
      spreadsheet,
      payload: {
        session_id: schedRes.data.class_session_id,
        outcome: 'ATTENDED',
      },
      actorId: 'usr_test',
      verifiedEmail: 'ashreya0502@gmail.com',
      requestId: 'req_att',
    });

    expect(attRes.success).toBe(true);
    expect(attRes.data.session_status).toBe('COMPLETED');
    expect(attRes.data.attendance_status).toBe('ATTENDED');
  });

  it('routes classes.batchSchedule through router, validates package, and creates sessions idempotently', () => {
    // 1. Verify operation is registered in the router
    expect(registry['classes.batchSchedule']).toBeDefined();
    expect(typeof registry['classes.batchSchedule']).toBe('function');

    // 2. Create student and package
    const stuRes = registry['students.create']({
      spreadsheet,
      payload: { full_name: 'Batch Learner', phone: '9876543210', parent_name: 'Batch Parent' },
      actorId: 'usr_test', verifiedEmail: 'ashreya0502@gmail.com', requestId: 'req_b1',
    });
    const studentId = stuRes.data.student_id;

    const pkgRes = registry['packages.create']({
      spreadsheet,
      payload: { student_id: studentId, package_name: 'Batch Pack', classes_purchased: 4, start_date: '2026-11-02' },
      actorId: 'usr_test', verifiedEmail: 'ashreya0502@gmail.com', requestId: 'req_b2',
    });
    const packageId = pkgRes.data.package_id;

    // 3. Validation: Fails if student does not exist
    const nonExistentRes = registry['classes.batchSchedule']({
      spreadsheet,
      payload: { student_id: 'NON_EXISTENT_ID', sessions: [{ scheduled_start: '2026-11-02T10:00:00Z' }] },
      actorId: 'usr_test', verifiedEmail: 'ashreya0502@gmail.com', requestId: 'req_b3',
    });
    expect(nonExistentRes.success).toBe(false);
    expect(nonExistentRes.code).toBe('RECORD_NOT_FOUND');

    // 4. Validation: Fails if package belongs to different student
    const wrongPkgRes = registry['classes.batchSchedule']({
      spreadsheet,
      payload: { student_id: studentId, package_id: 'PKG_OTHER_STUDENT', sessions: [{ scheduled_start: '2026-11-02T10:00:00Z' }] },
      actorId: 'usr_test', verifiedEmail: 'ashreya0502@gmail.com', requestId: 'req_b4',
    });
    expect(wrongPkgRes.success).toBe(false);

    // 5. Success: Batch schedules sessions with class_date
    const sessions = [
      { class_date: '2026-11-02', scheduled_start: '2026-11-02T18:00:00Z', scheduled_end: '2026-11-02T18:30:00Z', duration_minutes: 30, package_id: packageId },
      { class_date: '2026-11-04', scheduled_start: '2026-11-04T18:00:00Z', scheduled_end: '2026-11-04T18:30:00Z', duration_minutes: 30, package_id: packageId },
    ];
    const batchRes = registry['classes.batchSchedule']({
      spreadsheet,
      payload: { student_id: studentId, package_id: packageId, sessions },
      actorId: 'usr_test', verifiedEmail: 'ashreya0502@gmail.com', requestId: 'req_b5',
    });
    expect(batchRes.success).toBe(true);
    expect(batchRes.count).toBe(2);
    expect(batchRes.data[0].class_date).toBe('2026-11-02');
    expect(batchRes.data[0].session_status).toBe('SCHEDULED');

    // 6. Idempotency: Retrying the identical request creates 0 duplicates
    const retryRes = registry['classes.batchSchedule']({
      spreadsheet,
      payload: { student_id: studentId, package_id: packageId, sessions },
      actorId: 'usr_test', verifiedEmail: 'ashreya0502@gmail.com', requestId: 'req_b6',
    });
    expect(retryRes.success).toBe(true);
    expect(retryRes.count).toBe(0); // 0 new sessions created

    // 7. Verify classes.list returns both sessions
    const listRes = registry['classes.list']({ spreadsheet, payload: { studentId } });
    expect(listRes.success).toBe(true);
    expect(listRes.data).toHaveLength(2);
  });

  it('returns both camelCase and snake_case metrics for dashboard and financial summary', () => {
    const dash = registry['dashboard.overview']({ spreadsheet });
    expect(dash.success).toBe(true);
    expect(dash.data.classesUpcoming7Days).toBeDefined();
    expect(dash.data.upcomingClassesCount).toBeDefined();
    expect(dash.data.outstandingFeesTotal).toBeDefined();
    expect(dash.data.overdueFeesTotal).toBeDefined();

    const fin = registry['reports.financialSummary']({ spreadsheet });
    expect(fin.success).toBe(true);
    expect(fin.data.totalInvoiced).toBeDefined();
    expect(fin.data.totalBilled).toBeDefined();
    expect(fin.data.totalCollected).toBeDefined();
    expect(fin.data.totalReceived).toBeDefined();
  });

  it('adapts notes and meeting links operations correctly', () => {
    // 1. Create a student first
    const stuRes = registry['students.create']({
      spreadsheet,
      payload: { full_name: 'Note Student', phone: '9876543210', parent_name: 'Note Parent' },
      actorId: 'usr_test',
      verifiedEmail: 'ashreya0502@gmail.com',
      requestId: 'req_stu_note',
    });
    const studentId = stuRes.data.student_id;

    // 2. Create note
    const noteRes = registry['notes.create']({
      spreadsheet,
      payload: { student_id: studentId, note_type: 'GENERAL', content: 'Progress note' },
      actorId: 'usr_test',
      verifiedEmail: 'ashreya0502@gmail.com',
      requestId: 'req_note_create',
    });
    expect(noteRes.success).toBe(true);
    expect(noteRes.data.note_id).toBeDefined();

    // 3. List notes
    const noteList = registry['notes.list']({
      spreadsheet,
      payload: { student_id: studentId },
    });
    expect(noteList.success).toBe(true);
    expect(noteList.data).toHaveLength(1);
    expect(noteList.data[0].content).toBe('Progress note');

    // 4. Create meeting link
    const linkRes = registry['meetingLinks.create']({
      spreadsheet,
      payload: {
        student_id: studentId,
        provider: 'GOOGLE_MEET',
        link_label: 'Weekly Class',
        meeting_url: 'https://meet.google.com/test-link',
      },
      actorId: 'usr_test',
      verifiedEmail: 'ashreya0502@gmail.com',
      requestId: 'req_ml_create',
    });
    expect(linkRes.success).toBe(true);
    expect(linkRes.data.meeting_link_id).toBeDefined();

    // 5. List meeting links
    const linkList = registry['meetingLinks.list']({
      spreadsheet,
      payload: { student_id: studentId },
    });
    expect(linkList.success).toBe(true);
    expect(linkList.data).toHaveLength(1);
    expect(linkList.data[0].meeting_url).toBe('https://meet.google.com/test-link');

    // 6. Save recurring weekly class schedules
    const saveSchedRes = registry['schedules.save']({
      spreadsheet,
      payload: {
        student_id: studentId,
        schedules: [
          { day_of_week: 'MONDAY', start_time: '17:00', end_time: '18:00' },
          { day_of_week: 'WEDNESDAY', start_time: '17:30', end_time: '18:30' },
        ],
      },
      actorId: 'usr_test',
      verifiedEmail: 'ashreya0502@gmail.com',
      requestId: 'req_sched_save',
    });
    expect(saveSchedRes.success).toBe(true);
    expect(saveSchedRes.data).toHaveLength(2);

    // 7. List recurring schedules
    const schedList = registry['schedules.list']({
      spreadsheet,
      payload: { student_id: studentId },
    });
    expect(schedList.success).toBe(true);
    expect(schedList.data).toHaveLength(2);
    expect(schedList.data[0].day_of_week).toBe('MONDAY');
  });

  it('supports native classes.batchSchedule for 48 sessions and handles duplicate avoidance', () => {
    // 1. Create student and package
    const stu = registry['students.create']({
      spreadsheet,
      payload: { full_name: 'Batch Student', phone: '9876543210', parent_name: 'Batch Parent' },
      actorId: 'usr_test',
    });
    const sid = stu.data.student_id;

    const pkg = registry['packages.create']({
      spreadsheet,
      payload: {
        student_id: sid,
        package_name: '48 Class Package',
        total_classes: 48,
        price: 16800,
        class_duration: 30,
      },
      actorId: 'usr_test',
    });
    const pkgId = pkg.data.package_id;

    // 2. Generate 48 sessions payload
    const sessions = [];
    for (let i = 0; i < 48; i++) {
      const d = String(i + 1).padStart(2, '0');
      sessions.push({
        student_id: sid,
        package_id: pkgId,
        scheduled_start: `2026-11-${d}T12:30:00.000Z`,
        scheduled_end: `2026-11-${d}T13:00:00.000Z`,
        class_date: `2026-11-${d}`,
        duration_minutes: 30,
      });
    }

    // 3. Execute classes.batchSchedule
    const batchRes = registry['classes.batchSchedule']({
      spreadsheet,
      payload: { student_id: sid, package_id: pkgId, sessions },
      actorId: 'usr_test',
    });

    expect(batchRes.success).toBe(true);
    expect(batchRes.count).toBe(48);
    expect(batchRes.data).toHaveLength(48);

    // 4. Repeat exact batchSchedule request (idempotency check: 0 new sessions created)
    const duplicateRes = registry['classes.batchSchedule']({
      spreadsheet,
      payload: { student_id: sid, package_id: pkgId, sessions },
      actorId: 'usr_test',
    });
    expect(duplicateRes.success).toBe(true);
    expect(duplicateRes.count).toBe(0); // All 48 skipped as existing

    // 5. Total classes in sheet remains exactly 48
    const listRes = registry['classes.list']({
      spreadsheet,
      payload: { student_id: sid },
    });
    expect(listRes.success).toBe(true);
    expect(listRes.data).toHaveLength(48);

    // 6. Test classes.update and classes.batchUpdate
    const firstSession = listRes.data[0];
    const updateRes = registry['classes.update']({
      spreadsheet,
      payload: {
        class_session_id: firstSession.session_id,
        scheduled_start: '2026-11-01T12:30:00.000Z',
        scheduled_end: '2026-11-01T13:00:00.000Z',
      },
      actorId: 'usr_test',
    });
    expect(updateRes.success).toBe(true);

    const batchUpdateRes = registry['classes.batchUpdate']({
      spreadsheet,
      payload: {
        updates: [
          { class_session_id: firstSession.session_id, notes: 'Updated note' },
        ],
      },
      actorId: 'usr_test',
    });
    expect(batchUpdateRes.success).toBe(true);
    expect(batchUpdateRes.count).toBe(1);
  });
});
