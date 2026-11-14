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
import PackageService from '../../02-backend/apps-script/packages/PackageService.gs';
// @ts-ignore
import PackageRepository from '../../02-backend/apps-script/packages/PackageRepository.gs';
// @ts-ignore
import RenewalService from '../../02-backend/apps-script/packages/RenewalService.gs';
// @ts-ignore
import RenewalSessionTransition from '../../02-backend/apps-script/packages/RenewalSessionTransition.gs';
// @ts-ignore
import RenewalIdempotency from '../../02-backend/apps-script/packages/RenewalIdempotency.gs';
// @ts-ignore
import ClassService from '../../02-backend/apps-script/classes/ClassService.gs';
// @ts-ignore
import ClassRepository from '../../02-backend/apps-script/classes/ClassRepository.gs';
// @ts-ignore
import PaymentRepository from '../../02-backend/apps-script/payments/PaymentRepository.gs';
// @ts-ignore
import PackageHandlers from '../../02-backend/apps-script/packages/PackageHandlers.gs';

describe('Second-Round Engineering Challenge: Verification & Deep Invariants', () => {
  let spreadsheet: any;
  const actor = { actorId: 'usr_lead', email: 'ashreya0502@gmail.com', requestId: 'req_challenge_001' };

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
    // @ts-ignore
    if (globalThis.__renewalIdempCache) globalThis.__renewalIdempCache = {};
  });

  it('Area 1: Canonical schema verification and credit calculation rules', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Canonical Test Student',
      parent_name: 'Parent 1',
      parent_phone: '+91 9876543210',
      subject: 'Math'
    }, actor);
    const sid = s.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid,
      plan_type: 'Per Class',
      classes_purchased: 10,
      currency: 'INR'
    }, actor);

    // 1. Attended session (deduct_class = true) -> counts as 1
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Canonical Test Student',
      schedule_date: '2026-08-01', schedule_time: '10:00',
      attendance_status: 'PRESENT', session_status: 'COMPLETED',
      deduct_class: true, cancellation_reason: ''
    });

    // 2. Attended session with string 'TRUE' from sheet cell -> counts as 1
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Canonical Test Student',
      schedule_date: '2026-08-02', schedule_time: '10:00',
      attendance_status: 'ATTENDED', session_status: 'COMPLETED',
      deduct_class: 'TRUE', cancellation_reason: ''
    });

    // 3. Timely cancelled session (deduct_class = false) -> DOES NOT COUNT
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Canonical Test Student',
      schedule_date: '2026-08-03', schedule_time: '10:00',
      attendance_status: 'CANCELLED', session_status: 'CANCELLED',
      deduct_class: false, cancellation_reason: 'Timely notice by parent'
    });

    // 4. Waived late cancellation (deduct_class = false) -> DOES NOT COUNT
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Canonical Test Student',
      schedule_date: '2026-08-04', schedule_time: '10:00',
      attendance_status: 'CANCELLED_LATE', session_status: 'CANCELLED',
      deduct_class: false, cancellation_reason: 'Medical waiver granted'
    });

    // 5. Late cancellation without waiver (deduct_class = true) -> counts as 1
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Canonical Test Student',
      schedule_date: '2026-08-05', schedule_time: '10:00',
      attendance_status: 'CANCELLED_LATE', session_status: 'CANCELLED',
      deduct_class: true, cancellation_reason: 'Late cancellation unexcused'
    });

    // 6. Rescheduled session: old superseded session (deduct_class = false) -> DOES NOT COUNT
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Canonical Test Student',
      schedule_date: '2026-08-06', schedule_time: '10:00',
      attendance_status: 'CANCELLED', session_status: 'CANCELLED',
      deduct_class: false, cancellation_reason: 'Rescheduled to 2026-08-07'
    });
    // Replacement attended session -> counts as 1 (never double counted)
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Canonical Test Student',
      schedule_date: '2026-08-07', schedule_time: '10:00',
      attendance_status: 'PRESENT', session_status: 'COMPLETED',
      deduct_class: true, cancellation_reason: ''
    });

    // 7. Legacy session with blank/null deduct_class, marked COMPLETED/PRESENT -> counts as 1
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Canonical Test Student',
      schedule_date: '2026-08-08', schedule_time: '10:00',
      attendance_status: 'PRESENT', session_status: 'COMPLETED',
      deduct_class: '', cancellation_reason: ''
    });

    // 8. Legacy session with blank/null deduct_class, marked SCHEDULED -> DOES NOT COUNT
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Canonical Test Student',
      schedule_date: '2026-08-09', schedule_time: '10:00',
      attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED',
      deduct_class: '', cancellation_reason: ''
    });

    const allSessions = ClassRepository.Classes_getAll(spreadsheet);
    const consumed = RenewalSessionTransition._countConsumedCredits(allSessions, sid);
    // Consumed must be exactly 5: (1) 08-01 + (2) 08-02 + (5) 08-05 + (6 repl) 08-07 + (7 legacy completed) 08-08 = 5
    expect(consumed).toBe(5);

    // Initial purchased 10 - consumed 5 = 5 remaining
    // Renewal with 10 classes -> 5 + 10 = 15 available balance
    const ren = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 10,
      currency: 'INR',
      idempotency_key: 'idemp_challenge_area1'
    }, actor);
    expect(ren.success).toBe(true);
    expect(ren.data.cumulative_consumed).toBe(5);
    expect(ren.data.previous_available_balance).toBe(5);
    expect(ren.data.new_available_balance).toBe(15);
  });

  it('Area 2: Future session transition (Tuesday/Friday to Monday/Thursday schedule change)', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Schedule Transition Student',
      parent_name: 'Parent 2',
      parent_phone: '+91 9876543210',
      subject: 'Science'
    }, actor);
    const sid = s.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid,
      plan_type: 'Per Class',
      classes_purchased: 6,
      currency: 'INR',
      class_schedule: 'Tue - 16:00, Fri - 16:00',
      start_date: '2026-09-01'
    }, actor);

    // Past Tuesday 2026-09-01: COMPLETED, ATTENDED
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Schedule Transition Student',
      schedule_date: '2026-09-01', schedule_time: '16:00',
      class_session_id: `${sid}__2026-09-01__16:00`,
      attendance_status: 'PRESENT', session_status: 'COMPLETED',
      deduct_class: true, cancellation_reason: ''
    });

    // Past Friday 2026-09-04: CANCELLED previously
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Schedule Transition Student',
      schedule_date: '2026-09-04', schedule_time: '16:00',
      class_session_id: `${sid}__2026-09-04__16:00`,
      attendance_status: 'CANCELLED', session_status: 'CANCELLED',
      deduct_class: false, cancellation_reason: 'Prior illness'
    });

    // Obsolete future Tuesday 2026-09-15: SCHEDULED
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Schedule Transition Student',
      schedule_date: '2026-09-15', schedule_time: '16:00',
      class_session_id: `${sid}__2026-09-15__16:00`,
      attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED',
      deduct_class: false, cancellation_reason: ''
    });

    // Obsolete future Friday 2026-09-18: SCHEDULED
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Schedule Transition Student',
      schedule_date: '2026-09-18', schedule_time: '16:00',
      class_session_id: `${sid}__2026-09-18__16:00`,
      attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED',
      deduct_class: false, cancellation_reason: ''
    });

    // Execute renewal starting 2026-09-14 with Monday/Thursday schedule (6 classes)
    const ren = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 6,
      currency: 'INR',
      start_date: '2026-09-14',
      idempotency_key: 'idemp_challenge_area2',
      schedules: [
        { day_of_week: 'MONDAY', start_time: '17:00', end_time: '18:00' },
        { day_of_week: 'THURSDAY', start_time: '17:00', end_time: '18:00' }
      ]
    }, actor);

    expect(ren.success).toBe(true);

    const allSessions = ClassRepository.Classes_getAll(spreadsheet).filter((sess: any) => sess.student_id === sid);

    // 1. Past completed session 2026-09-01 is UNTOUCHED
    const pastCompleted = allSessions.find((sess: any) => sess.schedule_date === '2026-09-01');
    expect(pastCompleted.session_status).toBe('COMPLETED');
    expect(pastCompleted.attendance_status).toBe('PRESENT');
    expect(pastCompleted.deduct_class).toBe(true);

    // 2. Past cancelled session 2026-09-04 reason is UNTOUCHED
    const pastCancelled = allSessions.find((sess: any) => sess.schedule_date === '2026-09-04');
    expect(pastCancelled.session_status).toBe('CANCELLED');
    expect(pastCancelled.cancellation_reason).toBe('Prior illness');

    // 3. Obsolete Tuesday/Friday future sessions are transitioned to CANCELLED with reason
    const obsTue = allSessions.find((sess: any) => sess.schedule_date === '2026-09-15');
    expect(obsTue.session_status).toBe('CANCELLED');
    expect(obsTue.attendance_status).toBe('CANCELLED');
    expect(obsTue.cancellation_reason).toBe('Superceded by renewal schedule');
    expect(obsTue.deduct_class).toBe(false);

    const obsFri = allSessions.find((sess: any) => sess.schedule_date === '2026-09-18');
    expect(obsFri.session_status).toBe('CANCELLED');
    expect(obsFri.attendance_status).toBe('CANCELLED');
    expect(obsFri.cancellation_reason).toBe('Superceded by renewal schedule');

    // 4. New sessions generated on Monday/Thursday
    const newScheduled = allSessions.filter((sess: any) => sess.session_status === 'SCHEDULED');
    expect(newScheduled.length).toBe(6);
    for (const ns of newScheduled) {
      const d = new Date(ns.schedule_date + 'T12:00:00Z');
      const day = d.getUTCDay();
      // Monday = 1, Thursday = 4
      expect([1, 4]).toContain(day);
      expect(ns.schedule_time).toBe('17:00');
    }
  });

  it('Area 3: Multi-tier durable idempotency across separate execution isolates', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Idempotency Student',
      parent_name: 'Parent 3',
      parent_phone: '+91 9876543210',
      subject: 'English'
    }, actor);
    const sid = s.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid,
      plan_type: 'Per Class',
      classes_purchased: 10,
      currency: 'INR'
    }, actor);

    const idempKey = 'idemp_key_unique_test_42';

    // Step 1: Initial successful renewal
    const ren1 = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 10,
      currency: 'INR',
      idempotency_key: idempKey,
      payment: { amount: 5000, currency: 'INR', payment_date: '2026-10-01' },
      schedules: [{ day_of_week: 'MONDAY', start_time: '10:00' }],
      start_date: '2026-10-05'
    }, actor);

    expect(ren1.success).toBe(true);
    expect(ren1.data.new_available_balance).toBe(20);
    expect(ren1.data.cumulative_purchased).toBe(20);

    // Step 2: Simulate process crash/eviction by wiping in-memory cache
    // @ts-ignore
    globalThis.__renewalIdempCache = {};

    // Step 3: Retry request with same idempotency key (simulating retry after lost network response)
    const renRetry = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 10,
      currency: 'INR',
      idempotency_key: idempKey,
      payment: { amount: 5000, currency: 'INR', payment_date: '2026-10-01' },
      schedules: [{ day_of_week: 'MONDAY', start_time: '10:00' }],
      start_date: '2026-10-05'
    }, actor);

    expect(renRetry.success).toBe(true);
    // Must return original cached balance without adding 10 credits again!
    expect(renRetry.data.new_available_balance).toBe(20);
    expect(renRetry.data.cumulative_purchased).toBe(20);

    // Verify payments sheet: exactly 1 payment exists
    const payments = PaymentRepository.Payments_getAll(spreadsheet).filter((p: any) => p.student_id === sid);
    expect(payments.length).toBe(1);

    // Verify packages sheet: cumulative credits remained 20
    const pkg = PackageRepository.Packages_getById(spreadsheet, sid);
    expect(pkg.classes_purchased).toBe(20);

    // Verify class sessions: exactly 10 new sessions were created, not 20
    const sessions = ClassRepository.Classes_getAll(spreadsheet).filter((sess: any) => sess.student_id === sid && sess.session_status === 'SCHEDULED');
    expect(sessions.length).toBe(10);
  });

  it('Area 4: Partial failure rollback when payment recording fails', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Rollback Student',
      parent_name: 'Parent 4',
      parent_phone: '+91 9876543210',
      subject: 'History',
      status: 'INACTIVE'
    }, actor);
    const sid = s.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid,
      plan_type: 'Per Class',
      classes_purchased: 10,
      currency: 'INR',
      package_price: 10000
    }, actor);

    // Renewal with an invalid payment amount (negative amount triggers Payments_record failure)
    const renFail = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 10,
      currency: 'INR',
      idempotency_key: 'idemp_challenge_area4',
      payment: {
        amount: -500, // Invalid negative amount
        currency: 'INR'
      }
    }, actor);

    expect(renFail.success).toBe(false);

    // Verify package classes_purchased was rolled back to 10 (not corrupted to 20)
    const pkg = PackageRepository.Packages_getById(spreadsheet, sid);
    expect(pkg.classes_purchased).toBe(10);

    // Verify student status was restored to INACTIVE
    const stu = StudentRepository.Students_getById(spreadsheet, sid);
    expect(stu.status).toBe('INACTIVE');
  });

  it('Area 7: PackageHandlers routing equivalence for students.renew and packages.renew', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Routing Student',
      parent_name: 'Parent 5',
      parent_phone: '+91 9876543210',
      subject: 'Art'
    }, actor);
    const sid = s.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid,
      plan_type: 'Per Class',
      classes_purchased: 12,
      currency: 'INR'
    }, actor);

    // Test calling via operation handler registry
    const ops: Record<string, Function> = {};
    const mockRouter = {
      registerOperation: (name: string, handler: Function) => {
        ops[name] = handler;
      }
    };
    PackageHandlers.registerPackageOperations(mockRouter);

    expect(ops['packages.renew']).toBeDefined();
    expect(ops['students.renew']).toBeDefined();
    // Verify they refer to the exact same handler function
    expect(ops['packages.renew']).toBe(ops['students.renew']);

    const res = ops['students.renew']({
      spreadsheet,
      payload: { student_id: sid, new_classes_purchased: 6, currency: 'INR', idempotency_key: 'idemp_challenge_area7' },
      actorId: 'usr_lead',
      verifiedEmail: 'ashreya0502@gmail.com',
      requestId: 'req_route_test'
    });

    expect(res.success).toBe(true);
    expect(res.data.student_id).toBe(sid);
    expect(res.data.new_classes_purchased).toBe(6);
    expect(res.data.cumulative_purchased).toBe(18);
  });
});
