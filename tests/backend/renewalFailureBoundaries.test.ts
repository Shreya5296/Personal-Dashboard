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
import ClassRepository from '../../02-backend/apps-script/classes/ClassRepository.gs';
// @ts-ignore
import PaymentRepository from '../../02-backend/apps-script/payments/PaymentRepository.gs';

describe('Third-Round Engineering Challenge: Renewal Failure Boundaries & Durability', () => {
  let spreadsheet: any;
  const actor = { actorId: 'usr_lead', email: 'ashreya0502@gmail.com', requestId: 'req_round3_001' };

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
    // @ts-ignore
    if (globalThis.__renewalIdempCache) globalThis.__renewalIdempCache = {};
  });

  it('Section 1: Test failure boundary 1 (reactivation completed, failure before package update)', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Boundary 1 Student', parent_name: 'P1', parent_phone: '+91 9111111111', status: 'INACTIVE', subject: 'Math'
    }, actor);
    const sid = s.data.student_id;
    PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', class_schedule: 'Tue - 16:00, Fri - 16:00' }, actor);

    // Step 1: Simulate partial failure where student was reactivated, but process crashed before package was updated
    StudentService.Students_update(spreadsheet, sid, { status: 'ACTIVE' }, actor);

    // Retry request with key
    const ren = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid, new_classes_purchased: 10, currency: 'INR', idempotency_key: 'b1_key',
      payment: { amount: 5000, currency: 'INR' }
    }, actor);

    expect(ren.success).toBe(true);
    expect(ren.data.cumulative_purchased).toBe(20);
    expect(ren.data.new_available_balance).toBe(20);
    const pkg = PackageRepository.Packages_getById(spreadsheet, sid);
    expect(pkg.classes_purchased).toBe(20);
  });

  it('Section 1: Test failure boundary 2 (package update completed, failure before payment append)', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Boundary 2 Student', parent_name: 'P2', parent_phone: '+91 9222222222', status: 'ACTIVE', subject: 'Math'
    }, actor);
    const sid = s.data.student_id;
    PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', class_schedule: 'Tue - 16:00, Fri - 16:00' }, actor);

    const idempKey = 'b2_idemp_key';
    // Simulate initial attempt recorded intent for target_cumulative: 20
    RenewalIdempotency._recordRenewalInitiated(spreadsheet, idempKey, sid, 10, 20, { new_classes_purchased: 10, currency: 'INR', payment: { amount: 5000, currency: 'INR' } }, actor);
    // Package update succeeded to 20, then crash occurred before payment
    PackageRepository.Packages_update(spreadsheet, sid, { classes_purchased: 20 });

    // Wipe memory cache to simulate cold process restart
    // @ts-ignore
    globalThis.__renewalIdempCache = {};

    // Retry request with same key
    const retry = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid, new_classes_purchased: 10, currency: 'INR', idempotency_key: idempKey,
      payment: { amount: 5000, currency: 'INR' }
    }, actor);

    expect(retry.success).toBe(true);
    // Must NOT add 10 again (which would be 30); must remain 20!
    expect(retry.data.cumulative_purchased).toBe(20);
    expect(retry.data.new_available_balance).toBe(20);
    const pkg = PackageRepository.Packages_getById(spreadsheet, sid);
    expect(pkg.classes_purchased).toBe(20);

    // Payment must be appended exactly once
    const pays = PaymentRepository.Payments_getAll(spreadsheet).filter((p: any) => p.student_id === sid);
    expect(pays.length).toBe(1);
  });

  it('Section 1: Test failure boundary 4 (first 4 of 10 sessions generated, then retry)', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Boundary 4 Student', parent_name: 'P4', parent_phone: '+91 9444444444', status: 'ACTIVE', subject: 'Math'
    }, actor);
    const sid = s.data.student_id;
    PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', class_schedule: 'Tue - 16:00, Fri - 16:00' }, actor);

    const idempKey = 'b4_idemp_key';
    const schedules = [{ day_of_week: 'MONDAY', start_time: '17:00' }];
    // Pre-create 4 sessions on Monday 17:00 generated by the first attempt
    RenewalSessionTransition._generateNewRenewalSessions(spreadsheet, sid, 'Boundary 4 Student', schedules, '2026-11-02', 4, 60, '');
    const preSessions = ClassRepository.Classes_getAll(spreadsheet).filter((sess: any) => sess.student_id === sid && sess.session_status === 'SCHEDULED');
    expect(preSessions.length).toBe(4);
    const preIds = preSessions.map((s: any) => s.class_session_id || s.session_id);

    // Initial attempt recorded intent tracking these 4 session IDs before crashing
    RenewalIdempotency._recordRenewalInitiated(spreadsheet, idempKey, sid, 10, 20, { new_classes_purchased: 10, currency: 'INR', payment: { amount: 5000, currency: 'INR' }, schedules: schedules, start_date: '2026-11-02' }, actor);
    const ds = RenewalIdempotency._getDurableStore();
    const stored = ds ? ds.getProperty('renewal_idemp_' + idempKey) : null;
    const summary = stored ? JSON.parse(stored) : {};
    summary.created_session_ids = preIds;
    if (ds) ds.setProperty('renewal_idemp_' + idempKey, JSON.stringify(summary));
    // @ts-ignore
    if (globalThis.__renewalIdempCache && globalThis.__renewalIdempCache[idempKey]) {
      // @ts-ignore
      globalThis.__renewalIdempCache[idempKey].created_session_ids = preIds;
    }

    // Execute retry of renewal requesting 10 classes with same key
    const ren = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid, new_classes_purchased: 10, currency: 'INR', idempotency_key: idempKey,
      schedules: schedules, start_date: '2026-11-02',
      payment: { amount: 5000, currency: 'INR' }
    }, actor);

    expect(ren.success).toBe(true);
    // Verify total sessions scheduled is exactly 10, not 4 + 10 = 14!
    const postSessions = ClassRepository.Classes_getAll(spreadsheet).filter((sess: any) => sess.student_id === sid && sess.session_status === 'SCHEDULED');
    expect(postSessions.length).toBe(10);
  });

  it('Section 1: Test failure boundary 6 (Durable store written, response lost, retry recovers original result)', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Boundary 6 Student', parent_name: 'P6', parent_phone: '+91 9666666666', status: 'ACTIVE', subject: 'Math'
    }, actor);
    const sid = s.data.student_id;
    PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', class_schedule: 'Tue - 16:00, Fri - 16:00' }, actor);

    const idempKey = 'b6_idemp_key';
    const ren1 = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid, new_classes_purchased: 10, currency: 'INR', idempotency_key: idempKey,
      payment: { amount: 5000, currency: 'INR' }
    }, actor);
    expect(ren1.success).toBe(true);

    // Wipe in-memory cache to simulate fresh serverless instance
    // @ts-ignore
    globalThis.__renewalIdempCache = {};

    const retry = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid, new_classes_purchased: 10, currency: 'INR', idempotency_key: idempKey,
      payment: { amount: 5000, currency: 'INR' }
    }, actor);

    expect(retry.success).toBe(true);
    expect(retry.data.cumulative_purchased).toBe(20);
    expect(retry.meta.idempotentRetry).toBe(true);

    // Payments and packages remained exactly 1
    const pays = PaymentRepository.Payments_getAll(spreadsheet).filter((p: any) => p.student_id === sid);
    expect(pays.length).toBe(1);
    const pkg = PackageRepository.Packages_getById(spreadsheet, sid);
    expect(pkg.classes_purchased).toBe(20);
  });

  it('Section 2: Challenge durable store durability & mismatch rejection', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Durability Student', parent_name: 'P Durability', parent_phone: '+91 9777777777', status: 'ACTIVE', subject: 'Math'
    }, actor);
    const sid = s.data.student_id;
    PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', class_schedule: 'Tue - 16:00, Fri - 16:00' }, actor);

    const idempKey = 'durability_key_99';
    RenewalService.Packages_renew(spreadsheet, {
      student_id: sid, new_classes_purchased: 10, currency: 'INR', idempotency_key: idempKey
    }, actor);

    // Attempt reusing same key for a DIFFERENT student -> must reject with IDEMPOTENCY_CONFLICT
    const mismatchStudent = RenewalService.Packages_renew(spreadsheet, {
      student_id: 'STU_SOME_OTHER', new_classes_purchased: 10, currency: 'INR', idempotency_key: idempKey
    }, actor);
    expect(mismatchStudent.success).toBe(false);
    expect(mismatchStudent.code).toBe('IDEMPOTENCY_CONFLICT');

    // Attempt reusing same key for same student but with DIFFERENT purchased classes -> must reject
    const mismatchCount = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid, new_classes_purchased: 25, currency: 'INR', idempotency_key: idempKey
    }, actor);
    expect(mismatchCount.success).toBe(false);
    expect(mismatchCount.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('Section 3: Compensating rollback when payment recording fails', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Compensate Student', parent_name: 'P Compensate', parent_phone: '+91 9888888888', status: 'INACTIVE', subject: 'Math'
    }, actor);
    const sid = s.data.student_id;
    PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', class_schedule: 'Tue - 16:00, Fri - 16:00' }, actor);

    // Trigger payment failure via invalid negative payment amount
    const renFail = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid, new_classes_purchased: 10, currency: 'INR', idempotency_key: 'idemp_compensate_fail',
      payment: { amount: -100, currency: 'INR' }
    }, actor);

    expect(renFail.success).toBe(false);

    // Assert package was rolled back to 10 classes
    const pkg = PackageRepository.Packages_getById(spreadsheet, sid);
    expect(pkg.classes_purchased).toBe(10);

    // Assert student status was rolled back to INACTIVE
    const stu = StudentRepository.Students_getById(spreadsheet, sid);
    expect(stu.status).toBe('INACTIVE');
  });

  it('Section 4: Exact session generation scope (unrelated sessions not counted toward renewal)', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Scope Student', parent_name: 'P Scope', parent_phone: '+91 9999999999', status: 'ACTIVE', subject: 'Physics'
    }, actor);
    const sid = s.data.student_id;
    PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', class_schedule: 'Tue - 16:00, Fri - 16:00' }, actor);

    // 1. Create an unrelated scheduled session on Wednesday (e.g. ad-hoc tutoring)
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Scope Student',
      schedule_date: '2026-11-04', schedule_time: '15:00', // Wednesday
      session_status: 'SCHEDULED', attendance_status: 'NOT_MARKED', deduct_class: false, cancellation_reason: ''
    });

    // 2. Create an existing session on Monday, but at a DIFFERENT time (10:00 AM instead of 17:00)
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Scope Student',
      schedule_date: '2026-11-02', schedule_time: '10:00',
      session_status: 'SCHEDULED', attendance_status: 'NOT_MARKED', deduct_class: false, cancellation_reason: ''
    });

    // Renewal with schedule: Monday 17:00 and Thursday 17:00 (10 classes)
    const ren = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid, new_classes_purchased: 10, currency: 'INR',
      start_date: '2026-11-02', idempotency_key: 'idemp_scope_test',
      schedules: [
        { day_of_week: 'MONDAY', start_time: '17:00' },
        { day_of_week: 'THURSDAY', start_time: '17:00' }
      ]
    }, actor);

    expect(ren.success).toBe(true);

    const allSessions = ClassRepository.Classes_getAll(spreadsheet).filter((sess: any) => sess.student_id === sid);
    const renewalSessions = allSessions.filter((sess: any) => sess.session_status === 'SCHEDULED' && sess.schedule_time === '17:00');
    // Exactly 10 renewal sessions must be generated
    expect(renewalSessions.length).toBe(10);

    // The unrelated Wednesday session and Monday 10:00 session must still exist untouched
    const wedSession = allSessions.find((sess: any) => sess.schedule_date === '2026-11-04' && sess.schedule_time === '15:00');
    expect(wedSession).toBeDefined();
    expect(wedSession.session_status).toBe('SCHEDULED');

    const mon10Session = allSessions.find((sess: any) => sess.schedule_date === '2026-11-02' && sess.schedule_time === '10:00');
    expect(mon10Session).toBeDefined();
    expect(mon10Session.session_status).toBe('SCHEDULED');
  });

  it('Section 5: Historical credit reconciliation edge cases', () => {
    const sid = 'STU_HIST_01';

    // 1. CANCELLED with blank deduct_class -> 0 consumed
    const s1 = [{ student_id: sid, session_status: 'CANCELLED', attendance_status: 'CANCELLED', deduct_class: '' }];
    expect(RenewalSessionTransition._countConsumedCredits(s1, sid)).toBe(0);

    // 2. ABSENT with blank deduct_class -> 0 consumed
    const s2 = [{ student_id: sid, session_status: 'COMPLETED', attendance_status: 'ABSENT', deduct_class: '' }];
    expect(RenewalSessionTransition._countConsumedCredits(s2, sid)).toBe(0);

    // 3. COMPLETED with blank deduct_class & PRESENT -> 1 consumed
    const s3 = [{ student_id: sid, session_status: 'COMPLETED', attendance_status: 'PRESENT', deduct_class: '' }];
    expect(RenewalSessionTransition._countConsumedCredits(s3, sid)).toBe(1);

    // 4. Contradictory: PRESENT but deduct_class: false (e.g. promotional free trial) -> 0 consumed
    const s4 = [{ student_id: sid, session_status: 'COMPLETED', attendance_status: 'PRESENT', deduct_class: false }];
    expect(RenewalSessionTransition._countConsumedCredits(s4, sid)).toBe(0);

    // 5. Rescheduled: old superseded session marked CANCELLED with deduct_class: false -> 0 consumed
    const s5 = [
      { student_id: sid, session_status: 'CANCELLED', attendance_status: 'CANCELLED', deduct_class: false, cancellation_reason: 'Rescheduled to 08-07' },
      { student_id: sid, session_status: 'COMPLETED', attendance_status: 'PRESENT', deduct_class: true }
    ];
    // Only the completed replacement is consumed, total 1 (never double counted)
    expect(RenewalSessionTransition._countConsumedCredits(s5, sid)).toBe(1);

    // 6. Explicit late cancellation marked deduct_class: true -> consumes 1
    const s6 = [
      { student_id: sid, session_status: 'CANCELLED', attendance_status: 'CANCELLED_LATE', deduct_class: true }
    ];
    expect(RenewalSessionTransition._countConsumedCredits(s6, sid)).toBe(1);
  });

  it('Section 6: Requesting-user authorization check', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Auth Student', parent_name: 'P Auth', parent_phone: '+91 9000000000', status: 'ACTIVE', subject: 'Math'
    }, actor);
    const sid = s.data.student_id;
    PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', class_schedule: 'Tue - 16:00, Fri - 16:00' }, actor);

    // Unauthorized actor attempt
    const unauthorizedActor = { actorId: 'UNAUTHORIZED', email: 'intruder@bad.io', requestId: 'req_bad' };
    const res = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid, new_classes_purchased: 10, currency: 'INR'
    }, unauthorizedActor);

    expect(res.success).toBe(false);
    expect(res.code).toBe('FORBIDDEN');
  });
});
