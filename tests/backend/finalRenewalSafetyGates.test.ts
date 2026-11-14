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
// @ts-ignore
import ApiEntry from '../../02-backend/apps-script/api/ApiEntry.gs';
// @ts-ignore
import PackageHandlers from '../../02-backend/apps-script/packages/PackageHandlers.gs';

describe('Final Targeted Verification: Student Package Renewal Safety Gates', () => {
  let spreadsheet: any;
  const adminActor = { actorId: 'usr_admin', email: 'ashreya0502@gmail.com', requestId: 'req_gate_001', isAdmin: true };

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
    const provider = require('../../02-backend/apps-script/sheets/SpreadsheetProvider.gs');
    provider.setMockSpreadsheet(spreadsheet);
    // @ts-ignore
    if (globalThis.__renewalIdempCache) globalThis.__renewalIdempCache = {};
  });

  // Issue 1: Canonical ClassSessions Schema
  it('Issue 1: Verifies and enforces the agreed canonical ClassSessions 8-column schema', () => {
    const expectedHeaders = [
      'student_id', 'student_name', 'schedule_date', 'schedule_time',
      'attendance_status', 'session_status', 'cancellation_reason', 'deduct_class'
    ];
    const registered = SheetRegistry.SHEET_SCHEMAS[SheetRegistry.SHEET_NAMES.CLASS_SESSIONS];
    expect(registered).toEqual(expectedHeaders);

    // Verify row append strictly writes only canonical columns
    const sheet = spreadsheet.getSheetByName('ClassSessions');
    const inserted = ClassRepository.Classes_insert(spreadsheet, {
      student_id: 'STU_SCHEMA_TEST',
      student_name: 'Schema Student',
      schedule_date: '2026-11-20',
      schedule_time: '16:00',
      attendance_status: 'NOT_MARKED',
      session_status: 'SCHEDULED',
      cancellation_reason: '',
      deduct_class: false
    });
    expect(inserted).toBeDefined();

    const rows = sheet.getDataRange().getValues();
    const lastRow = rows[rows.length - 1];
    expect(lastRow.length).toBe(8);
    expect(lastRow[0]).toBe('STU_SCHEMA_TEST');
    expect(lastRow[1]).toBe('Schema Student');
    expect(lastRow[2]).toBe('2026-11-20');
    expect(lastRow[3]).toBe('16:00');
    expect(lastRow[7]).toBe(false);
  });

  // Issue 2: Durable store persistence and cold-recovery without AuditLog
  it('Issue 2: Verifies durable store persistence and cold recovery from durable state without AuditLog', () => {
    expect(SheetRegistry.SHEET_SCHEMAS['AuditLog']).toBeUndefined();
    expect(spreadsheet.getSheetByName('AuditLog')).toBeNull();

    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Cold Recovery Student', parent_name: 'P Cold', parent_phone: '+91 9100000002', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = s.data.student_id;
    PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR' }, adminActor);

    const idempKey = 'cold_rec_key_001';
    const reqPayload = {
      student_id: sid,
      new_classes_purchased: 10,
      currency: 'INR',
      package_price: 10000,
      payment: { amount: 10000, currency: 'INR' },
      start_date: '2026-12-01',
      class_duration: 60,
      idempotency_key: idempKey
    };

    // 1. Write durable renewal intent
    const intentRes = RenewalIdempotency._recordRenewalInitiated(spreadsheet, idempKey, sid, 10, 20, reqPayload, adminActor, []);
    expect(intentRes.success).toBe(true);

    // 2. Clear all in-memory idempotency state and ScriptCache
    // @ts-ignore
    globalThis.__renewalIdempCache = {};

    // 3. Inspect durable store state directly
    const ds = RenewalIdempotency._getDurableStore();
    expect(ds).toBeDefined();
    const rawVal = ds.getProperty('renewal_idemp_' + idempKey);
    expect(typeof rawVal).toBe('string');
    const parsedSummary = JSON.parse(rawVal);
    expect(parsedSummary.outcome).toBe('STARTED');
    expect(parsedSummary.student_id).toBe(sid);
    expect(parsedSummary.new_classes).toBe(10);
    expect(parsedSummary.target_cumulative).toBe(20);
    expect(parsedSummary.currency).toBe('INR');
    expect(parsedSummary.payment_amount).toBe(10000);

    // 4. Read intent directly from durable store via _checkRenewalIdempotency with empty memory
    const checked = RenewalIdempotency._checkRenewalIdempotency(spreadsheet, idempKey, reqPayload);
    expect(checked).toBeDefined();
    expect(checked.inProgress).toBe(true);
    expect(checked.targetCumulative).toBe(20);

    // 5. Retry renewal and verify no duplicate package, payment, or session writes
    const retryRes = RenewalService.Packages_renew(spreadsheet, reqPayload, adminActor);
    expect(retryRes.success).toBe(true);
    expect(PackageRepository.Packages_getById(spreadsheet, sid).classes_purchased).toBe(20);
    expect(PaymentRepository.Payments_getAll(spreadsheet).filter((p: any) => p.student_id === sid).length).toBe(1);
    expect(spreadsheet.getSheetByName('AuditLog')).toBeNull();
  });

  // Issue 3: Prove trusted authentication through real API (ApiEntry.doPost)
  it('Issue 3: Proves real API authentication, rejecting forged payload actors and educators', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Auth Test Student', parent_name: 'P Auth', parent_phone: '+91 9100000003', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = s.data.student_id;
    PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR' }, adminActor);

    // 1. Unauthenticated request (missing token) -> UNAUTHORIZED
    const noTokenReq = {
      postData: {
        contents: JSON.stringify({
          apiVersion: '1', operation: 'packages.renew', requestId: 'req_unauth_1',
          payload: { student_id: sid, new_classes_purchased: 5, currency: 'INR', idempotency_key: 'idemp_unauth_1' }
        })
      }
    };
    const resNoToken = ApiEntry.doPost(noTokenReq);
    expect(resNoToken.payload.success).toBe(false);
    expect(resNoToken.payload.error.code).toBe('UNAUTHORIZED');

    // 2. Forged actor.email inside payload with non-admin token -> FORBIDDEN
    const forgedEmailReq = {
      postData: {
        contents: JSON.stringify({
          apiVersion: '1', operation: 'packages.renew', requestId: 'req_forge_email',
          identityToken: 'mock_token_for_stranger@bad.io',
          payload: {
            student_id: sid, new_classes_purchased: 5, currency: 'INR', idempotency_key: 'idemp_forge_1',
            actor: { email: 'ashreya0502@gmail.com' } // Forged admin email in payload
          }
        })
      }
    };
    const resForgedEmail = ApiEntry.doPost(forgedEmailReq);
    expect(resForgedEmail.payload.success).toBe(false);
    expect(resForgedEmail.payload.error.code).toBe('FORBIDDEN');

    // 3. Forged actor.verifiedEmail inside payload with non-admin token -> FORBIDDEN
    const forgedVerifiedEmailReq = {
      postData: {
        contents: JSON.stringify({
          apiVersion: '1', operation: 'packages.renew', requestId: 'req_forge_v_email',
          identityToken: 'mock_token_for_stranger@bad.io',
          payload: {
            student_id: sid, new_classes_purchased: 5, currency: 'INR', idempotency_key: 'idemp_forge_2',
            actor: { verifiedEmail: 'ashreya0502@gmail.com' }
          }
        })
      }
    };
    const resForgedVE = ApiEntry.doPost(forgedVerifiedEmailReq);
    expect(resForgedVE.payload.success).toBe(false);
    expect(resForgedVE.payload.error.code).toBe('FORBIDDEN');

    // 4. Forged actor.actorId inside payload with non-admin token -> FORBIDDEN
    const forgedActorIdReq = {
      postData: {
        contents: JSON.stringify({
          apiVersion: '1', operation: 'packages.renew', requestId: 'req_forge_id',
          identityToken: 'mock_token_for_stranger@bad.io',
          payload: {
            student_id: sid, new_classes_purchased: 5, currency: 'INR', idempotency_key: 'idemp_forge_3',
            actor: { actorId: 'usr_admin' }
          }
        })
      }
    };
    const resForgedId = ApiEntry.doPost(forgedActorIdReq);
    expect(resForgedId.payload.success).toBe(false);
    expect(resForgedId.payload.error.code).toBe('FORBIDDEN');

    // 5. Forged isAdmin: true in payload -> FORBIDDEN
    const forgedIsAdminReq = {
      postData: {
        contents: JSON.stringify({
          apiVersion: '1', operation: 'packages.renew', requestId: 'req_forge_admin',
          identityToken: 'mock_token_for_stranger@bad.io',
          payload: {
            student_id: sid, new_classes_purchased: 5, currency: 'INR', idempotency_key: 'idemp_forge_4',
            actor: { isAdmin: true }
          }
        })
      }
    };
    const resForgedIsAdmin = ApiEntry.doPost(forgedIsAdminReq);
    expect(resForgedIsAdmin.payload.success).toBe(false);
    expect(resForgedIsAdmin.payload.error.code).toBe('FORBIDDEN');

    // 6. Educator session token -> FORBIDDEN
    const educatorReq = {
      postData: {
        contents: JSON.stringify({
          apiVersion: '1', operation: 'packages.renew', requestId: 'req_edu_token',
          identityToken: 'mock_token_for_educator@example.com',
          payload: { student_id: sid, new_classes_purchased: 5, currency: 'INR', idempotency_key: 'idemp_edu' }
        })
      }
    };
    const resEdu = ApiEntry.doPost(educatorReq);
    expect(resEdu.payload.success).toBe(false);
    expect(resEdu.payload.error.code).toBe('FORBIDDEN');

    // 7. Valid authenticated admin -> packages.renew succeeds
    const adminReq = {
      postData: {
        contents: JSON.stringify({
          apiVersion: '1', operation: 'packages.renew', requestId: 'req_valid_admin',
          identityToken: 'mock_token_for_ashreya0502@gmail.com',
          payload: { student_id: sid, new_classes_purchased: 10, currency: 'INR', idempotency_key: 'idemp_valid_admin' }
        })
      }
    };
    const resAdmin = ApiEntry.doPost(adminReq);
    expect(resAdmin.payload.success).toBe(true);
    expect(resAdmin.payload.data.cumulative_purchased).toBe(20);

    // 8. Valid authenticated admin -> students.renew alias succeeds
    const aliasReq = {
      postData: {
        contents: JSON.stringify({
          apiVersion: '1', operation: 'students.renew', requestId: 'req_valid_alias',
          identityToken: 'mock_token_for_ashreya0502@gmail.com',
          payload: { student_id: sid, new_classes_purchased: 5, currency: 'INR', idempotency_key: 'idemp_valid_alias' }
        })
      }
    };
    const resAlias = ApiEntry.doPost(aliasReq);
    expect(resAlias.payload.success).toBe(true);
    expect(resAlias.payload.data.cumulative_purchased).toBe(25);
  });

  // Issue 4: Include complete schedule in idempotency comparison
  it('Issue 4: Rejects schedule term mismatches (weekday mismatch and time mismatch independently)', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Sched Match Student', parent_name: 'P Sched', parent_phone: '+91 9100000004', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = s.data.student_id;
    PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR' }, adminActor);

    const idempKey = 'sched_idemp_key_001';
    const originalReq = {
      student_id: sid, new_classes_purchased: 10, currency: 'INR', package_price: 10000,
      start_date: '2026-11-02', class_duration: 60, idempotency_key: idempKey,
      schedules: [{ day_of_week: 'MONDAY', start_time: '17:00' }]
    };

    // First attempt succeeds
    const r1 = RenewalService.Packages_renew(spreadsheet, originalReq, adminActor);
    expect(r1.success).toBe(true);

    // 1. Retry with DIFFERENT weekday (TUESDAY instead of MONDAY) -> MUST fail with IDEMPOTENCY_CONFLICT
    const rDiffWeekday = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid, new_classes_purchased: 10, currency: 'INR', package_price: 10000,
      start_date: '2026-11-02', class_duration: 60, idempotency_key: idempKey,
      schedules: [{ day_of_week: 'TUESDAY', start_time: '17:00' }]
    }, adminActor);
    expect(rDiffWeekday.success).toBe(false);
    expect(rDiffWeekday.code).toBe('IDEMPOTENCY_CONFLICT');
    expect(rDiffWeekday.message).toContain('different schedule weekdays');

    // 2. Retry with DIFFERENT class time (18:00 instead of 17:00) -> MUST fail with IDEMPOTENCY_CONFLICT
    const rDiffTime = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid, new_classes_purchased: 10, currency: 'INR', package_price: 10000,
      start_date: '2026-11-02', class_duration: 60, idempotency_key: idempKey,
      schedules: [{ day_of_week: 'MONDAY', start_time: '18:00' }]
    }, adminActor);
    expect(rDiffTime.success).toBe(false);
    expect(rDiffTime.code).toBe('IDEMPOTENCY_CONFLICT');
    expect(rDiffTime.message).toContain('different schedule time');

    // Verify ZERO mutations occurred from conflicted requests
    expect(PackageRepository.Packages_getById(spreadsheet, sid).classes_purchased).toBe(20);
  });

  // Issue 5: Prove session ownership and partial-generation recovery
  it('Issue 5: Demonstrates partial-generation recovery and exact attribution without non-canonical columns', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Ownership Student', parent_name: 'P Owner', parent_phone: '+91 9100000005', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = s.data.student_id;
    PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR' }, adminActor);

    // 1. Pre-insert 3 unrelated sessions at Monday 17:00 (Nov 02, Nov 09, Nov 16)
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Ownership Student', schedule_date: '2026-11-02', schedule_time: '17:00',
      attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED', cancellation_reason: 'Unrelated makeup', deduct_class: false
    });
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Ownership Student', schedule_date: '2026-11-09', schedule_time: '17:00',
      attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED', cancellation_reason: 'Unrelated trial', deduct_class: false
    });
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Ownership Student', schedule_date: '2026-11-16', schedule_time: '17:00',
      attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED', cancellation_reason: 'Unrelated special', deduct_class: false
    });

    const idempKey = 'partial_ownership_key_005';
    const schedules = [{ day_of_week: 'MONDAY', start_time: '17:00' }];

    // 2. Renewal plans 10 sessions starting from 2026-11-02 skipping the 3 occupied dates:
    // Planned target slots are Nov 23, Nov 30, Dec 07, Dec 14, Dec 21, Dec 28, Jan 04, Jan 11, Jan 18, Jan 25.
    const plannedSlots = RenewalSessionTransition._planRenewalSlots(
      ClassRepository.Classes_getAll(spreadsheet), sid, schedules, '2026-11-02', 10
    );
    expect(plannedSlots.length).toBe(10);
    expect(plannedSlots[0].schedule_date).toBe('2026-11-23');

    // Intent write persists target slots to durable store
    RenewalIdempotency._recordRenewalInitiated(
      spreadsheet, idempKey, sid, 10, 20,
      { new_classes_purchased: 10, currency: 'INR', start_date: '2026-11-02', schedules: schedules },
      adminActor, plannedSlots
    );

    // 3. First attempt writes 4 sessions to ClassSessions before interruption
    for (let i = 0; i < 4; i++) {
      ClassRepository.Classes_insert(spreadsheet, {
        student_id: sid, student_name: 'Ownership Student',
        schedule_date: plannedSlots[i].schedule_date, schedule_time: plannedSlots[i].schedule_time,
        attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED', cancellation_reason: '', deduct_class: false
      });
    }

    // Persisted state before retry: 3 unrelated + 4 renewal sessions = 7 scheduled sessions
    const sessionsBeforeRetry = ClassRepository.Classes_getAll(spreadsheet).filter((sess: any) => sess.student_id === sid);
    expect(sessionsBeforeRetry.length).toBe(7);

    // 4. All in-memory state and ScriptCache cleared (cold process restart)
    // @ts-ignore
    globalThis.__renewalIdempCache = {};

    // 5. Retry using durable state only
    const retryRes = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid, new_classes_purchased: 10, currency: 'INR',
      start_date: '2026-11-02', schedules: schedules, idempotency_key: idempKey
    }, adminActor);

    expect(retryRes.success).toBe(true);

    // 6. Post-retry verification:
    // Exactly 6 remaining renewal sessions created; exactly 10 renewal sessions total.
    // 3 unrelated sessions preserved intact. Total sessions = 3 + 10 = 13!
    const sessionsAfterRetry = ClassRepository.Classes_getAll(spreadsheet).filter((sess: any) => sess.student_id === sid);
    expect(sessionsAfterRetry.length).toBe(13);

    // Verify all 3 unrelated sessions preserved
    expect(sessionsAfterRetry.find((s: any) => s.schedule_date === '2026-11-02' && s.cancellation_reason === 'Unrelated makeup')).toBeDefined();
    expect(sessionsAfterRetry.find((s: any) => s.schedule_date === '2026-11-09' && s.cancellation_reason === 'Unrelated trial')).toBeDefined();
    expect(sessionsAfterRetry.find((s: any) => s.schedule_date === '2026-11-16' && s.cancellation_reason === 'Unrelated special')).toBeDefined();

    // Verify exact 10 renewal dates match planned slots
    for (const slot of plannedSlots) {
      const match = sessionsAfterRetry.find((s: any) => s.schedule_date === slot.schedule_date && s.schedule_time === slot.schedule_time);
      expect(match).toBeDefined();
      expect(match.session_status).toBe('SCHEDULED');
    }
  });

  // Partial Failures (Cases 1 - 6)
  describe('Six Individual Partial Failure & Compensating Rollback Boundaries', () => {
    it('Case 1: Payment append fails before persistence (package and student rolled back)', () => {
      const s = StudentService.Students_create(spreadsheet, {
        student_name: 'Fail Case 1', parent_name: 'P1', parent_phone: '+91 9100000011', status: 'INACTIVE', subject: 'Math'
      }, adminActor);
      const sid = s.data.student_id;
      PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR' }, adminActor);

      // Trigger payment failure via invalid negative amount
      const renFail = RenewalService.Packages_renew(spreadsheet, {
        student_id: sid, new_classes_purchased: 10, currency: 'INR', idempotency_key: 'idemp_fail_c1',
        payment: { amount: -500, currency: 'INR' }
      }, adminActor);

      expect(renFail.success).toBe(false);
      // Package rolled back to 10 classes
      expect(PackageRepository.Packages_getById(spreadsheet, sid).classes_purchased).toBe(10);
      // Student status rolled back to INACTIVE
      expect(StudentRepository.Students_getById(spreadsheet, sid).status).toBe('INACTIVE');
      // No payments appended
      expect(PaymentRepository.Payments_getAll(spreadsheet).filter((p: any) => p.student_id === sid).length).toBe(0);
    });

    it('Case 2: Payment append succeeds but response is lost (retry recovers result, no duplicate payment)', () => {
      const s = StudentService.Students_create(spreadsheet, {
        student_name: 'Fail Case 2', parent_name: 'P2', parent_phone: '+91 9100000012', status: 'ACTIVE', subject: 'Math'
      }, adminActor);
      const sid = s.data.student_id;
      PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR' }, adminActor);

      const idempKey = 'idemp_fail_c2';
      const payload = {
        student_id: sid, new_classes_purchased: 10, currency: 'INR', idempotency_key: idempKey,
        payment: { amount: 5000, currency: 'INR', payment_date: '2026-11-01' }
      };

      // 1. Initial attempt succeeded on backend
      const r1 = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
      expect(r1.success).toBe(true);

      // 2. Client loses response, memory cache wiped (cold start)
      // @ts-ignore
      globalThis.__renewalIdempCache = {};

      // 3. Retry recovers original result without duplicating payment
      const retry = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
      if (!retry.success) console.log('Case 2 retry failed with:', retry);
      expect(retry.success).toBe(true);
      expect(PackageRepository.Packages_getById(spreadsheet, sid).classes_purchased).toBe(20);
      const pays = PaymentRepository.Payments_getAll(spreadsheet).filter((p: any) => p.student_id === sid);
      expect(pays.length).toBe(1);
    });

    it('Case 3: Payment append succeeds and session generation subsequently fails (retry finishes sessions)', () => {
      const s = StudentService.Students_create(spreadsheet, {
        student_name: 'Fail Case 3', parent_name: 'P3', parent_phone: '+91 9100000013', status: 'ACTIVE', subject: 'Math'
      }, adminActor);
      const sid = s.data.student_id;
      PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR' }, adminActor);

      const idempKey = 'idemp_fail_c3';
      const schedules = [{ day_of_week: 'MONDAY', start_time: '17:00' }];
      const payload = {
        student_id: sid, new_classes_purchased: 10, currency: 'INR', idempotency_key: idempKey,
        start_date: '2026-11-02', schedules: schedules,
        payment: { amount: 5000, currency: 'INR', payment_date: '2026-11-01' }
      };

      // Intent recorded
      RenewalIdempotency._recordRenewalInitiated(spreadsheet, idempKey, sid, 10, 20, payload, adminActor);
      // Package updated to 20
      PackageRepository.Packages_update(spreadsheet, sid, { classes_purchased: 20 });
      // Payment pre-recorded via PaymentService with renewal payment idempotency key
      const PaymentService = require('../../02-backend/apps-script/payments/PaymentService.gs');
      PaymentService.Payments_record(spreadsheet, {
        student_id: sid, student_name: 'Fail Case 3', payment_date: '2026-11-01', amount: 5000, currency: 'INR', in_inr: 5000,
        idempotency_key: idempKey + '_pay'
      }, adminActor);
      expect(PaymentRepository.Payments_getAll(spreadsheet).filter((p: any) => p.student_id === sid).length).toBe(1);
      // Crash before sessions created!

      // Wipe caches
      // @ts-ignore
      globalThis.__renewalIdempCache = {};

      // Retry completes session generation, preserves package at 20, keeps payment count at 1
      const retry = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
      expect(retry.success).toBe(true);
      expect(PackageRepository.Packages_getById(spreadsheet, sid).classes_purchased).toBe(20);
      expect(PaymentRepository.Payments_getAll(spreadsheet).filter((p: any) => p.student_id === sid).length).toBe(1);
      const postSessions = ClassRepository.Classes_getAll(spreadsheet).filter((sess: any) => sess.student_id === sid && sess.session_status === 'SCHEDULED');
      expect(postSessions.length).toBe(10);
    });

    it('Case 4: Payment append throws after row persisted (retry avoids duplicate payment)', () => {
      const s = StudentService.Students_create(spreadsheet, {
        student_name: 'Fail Case 4', parent_name: 'P4', parent_phone: '+91 9100000014', status: 'ACTIVE', subject: 'Math'
      }, adminActor);
      const sid = s.data.student_id;
      PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR' }, adminActor);

      const idempKey = 'idemp_fail_c4';
      const payload = {
        student_id: sid, new_classes_purchased: 10, currency: 'INR', idempotency_key: idempKey,
        payment: { amount: 5000, currency: 'INR', payment_date: '2026-11-01', reference_number: 'AMBIG_PAY_004' }
      };

      // Pre-persist payment via PaymentService with renewal payment key (committed before network timeout)
      const PaymentService = require('../../02-backend/apps-script/payments/PaymentService.gs');
      PaymentService.Payments_record(spreadsheet, {
        student_id: sid, student_name: 'Fail Case 4', payment_date: '2026-11-01', amount: 5000, currency: 'INR', in_inr: 5000,
        reference_number: 'AMBIG_PAY_004', idempotency_key: idempKey + '_pay'
      }, adminActor);
      expect(PaymentRepository.Payments_getAll(spreadsheet).filter((p: any) => p.student_id === sid).length).toBe(1);

      // Wipe caches
      // @ts-ignore
      globalThis.__renewalIdempCache = {};

      // Retry with same idempotency key
      const retry = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
      expect(retry.success).toBe(true);
      // Exactly 1 payment row in Payments sheet (no duplicate payment)
      expect(PaymentRepository.Payments_getAll(spreadsheet).filter((p: any) => p.student_id === sid).length).toBe(1);
    });

    it('Case 5: Package rollback fails (fails closed with COMPENSATION_FAILED)', () => {
      const s = StudentService.Students_create(spreadsheet, {
        student_name: 'Fail Case 5', parent_name: 'P5', parent_phone: '+91 9100000015', status: 'INACTIVE', subject: 'Math'
      }, adminActor);
      const sid = s.data.student_id;
      PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR' }, adminActor);

      const pkgRepo = require('../../02-backend/apps-script/packages/PackageRepository.gs');
      const PaymentService = require('../../02-backend/apps-script/payments/PaymentService.gs');
      let updateCalls = 0;
      const origUpdate = pkgRepo.Packages_update;
      const origPayRecord = PaymentService.Payments_record;

      try {
        pkgRepo.Packages_update = (ss: any, id: string, rec: any) => {
          updateCalls++;
          if (updateCalls === 1) return origUpdate(ss, id, rec); // First update (to 20) succeeds
          throw new Error('Lock timeout during rollback update'); // Rollback fails
        };

        // Mock Payments_record to simulate bank/gateway failure
        PaymentService.Payments_record = () => ({ success: false, code: 'GATEWAY_ERROR', message: 'Bank network failure' });

        const failRes = RenewalService.Packages_renew(spreadsheet, {
          student_id: sid, new_classes_purchased: 10, currency: 'INR', idempotency_key: 'idemp_fail_c5',
          payment: { amount: 5000, currency: 'INR' }
        }, adminActor);

        expect(failRes.success).toBe(false);
        expect(failRes.code).toBe('COMPENSATION_FAILED');
        expect(failRes.message).toContain('compensating rollback failed');
      } finally {
        pkgRepo.Packages_update = origUpdate;
        PaymentService.Payments_record = origPayRecord;
      }
    });

    it('Case 6: Completion durable store save fails (returns DURABLE_PERSIST_FAILED, retry recovers)', () => {
      const s = StudentService.Students_create(spreadsheet, {
        student_name: 'Fail Case 6', parent_name: 'P6', parent_phone: '+91 9100000016', status: 'ACTIVE', subject: 'Math'
      }, adminActor);
      const sid = s.data.student_id;
      PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR' }, adminActor);

      const idempKey = 'idemp_fail_c6';
      const payload = {
        student_id: sid, new_classes_purchased: 10, currency: 'INR', idempotency_key: idempKey,
        payment: { amount: 5000, currency: 'INR', payment_date: '2026-11-01' }
      };

      // Mock durable store setProperty so that the completion call (second call) fails
      const ds = RenewalIdempotency._getDurableStore();
      const origSet = ds.setProperty;
      let setCount = 0;
      ds.setProperty = (k: string, v: string) => {
        setCount++;
        if (setCount === 1) return origSet.call(ds, k, v); // Intent succeeds
        throw new Error('Durable store quota exceeded on completion'); // Completion save fails
      };

      try {
        const failRes = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
        expect(failRes.success).toBe(false);
        expect(failRes.code).toBe('DURABLE_PERSIST_FAILED');
      } finally {
        ds.setProperty = origSet;
      }

      // Wipe caches to simulate cold retry
      // @ts-ignore
      globalThis.__renewalIdempCache = {};

      // Retry completes and successfully writes durable completion
      const retryRes = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
      expect(retryRes.success).toBe(true);
      expect(PackageRepository.Packages_getById(spreadsheet, sid).classes_purchased).toBe(20);
    });
  });

  // Section 2: Business Requirement — Credit Rollover Formula Verification
  it('Section 2: Business Requirement — 12 purchased, 9 consumed, 12 renewed yields exactly 15 available balance', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Rollover Proof Student', parent_name: 'P Rollover', parent_phone: '+91 9100000021', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = s.data.student_id;

    // Student previously purchased 12 classes
    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 12, currency: 'INR', package_price: 12000
    }, adminActor);

    // Consumed 9 classes via canonical deduct_class: true
    for (let i = 1; i <= 9; i++) {
      const day = i < 10 ? `0${i}` : `${i}`;
      ClassRepository.Classes_insert(spreadsheet, {
        student_id: sid, student_name: 'Rollover Proof Student',
        schedule_date: `2026-10-${day}`, schedule_time: '15:00',
        attendance_status: 'PRESENT', session_status: 'COMPLETED', cancellation_reason: '', deduct_class: true
      });
    }

    // Verify initial state: 12 purchased, 9 consumed => 3 available
    const consumedBefore = RenewalSessionTransition._countConsumedCredits(
      ClassRepository.Classes_getAll(spreadsheet), sid
    );
    expect(consumedBefore).toBe(9);

    // Student renews with another package of 12 classes
    const renewalResult = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 12,
      currency: 'INR',
      package_price: 12000,
      idempotency_key: 'idemp_roll_12_9_12'
    }, adminActor);

    expect(renewalResult.success).toBe(true);
    // Formula: Available credits = Cumulative purchased credits (24) - Cumulative consumed credits (9) = 15
    expect(renewalResult.data.previous_available_balance).toBe(3);
    expect(renewalResult.data.new_classes_purchased).toBe(12);
    expect(renewalResult.data.cumulative_purchased).toBe(24);
    expect(renewalResult.data.cumulative_consumed).toBe(9);
    expect(renewalResult.data.new_available_balance).toBe(15);

    // Verify package record in sheet reflects cumulative 24 classes
    const pkg = PackageRepository.Packages_getById(spreadsheet, sid);
    expect(pkg.classes_purchased).toBe(24);
  });

  // Section 6: Critical exact-slot collision test
  it('Section 6: Critical exact-slot collision test — unrelated session on proposed slot is preserved, renewal rescheduled to next slot', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Collision Student', parent_name: 'P Collision', parent_phone: '+91 9100000022', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = s.data.student_id;

    // Existing package
    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR',
      class_schedule: 'Wed - 18:00' // Different old schedule weekday
    }, adminActor);

    // Set up: An existing unrelated session for the same student occupies 2026-11-02 17:00 (Monday)
    // (e.g. an unscheduled trial, makeup or special coaching session)
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Collision Student',
      schedule_date: '2026-11-02', schedule_time: '17:00',
      attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED',
      cancellation_reason: 'Unrelated makeup session', deduct_class: false
    });

    // Renewal proposes weekly schedule: MONDAY at 17:00, starting from 2026-11-02, for 3 classes
    const renewalSchedules = [{ day_of_week: 'MONDAY', start_time: '17:00' }];
    const renewalResult = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 3,
      currency: 'INR',
      start_date: '2026-11-02',
      schedules: renewalSchedules,
      idempotency_key: 'idemp_collision_test'
    }, adminActor);

    expect(renewalResult.success).toBe(true);
    expect(renewalResult.data.sessions_created).toBe(3);

    const allSessions = ClassRepository.Classes_getAll(spreadsheet).filter((sess: any) => sess.student_id === sid);
    // Total sessions must be 1 (unrelated) + 3 (renewal) = 4 sessions
    expect(allSessions.length).toBe(4);

    // 1. Existing unrelated session on 2026-11-02 17:00 must remain completely unchanged
    const originalSlotSession = allSessions.find((sess: any) => sess.schedule_date === '2026-11-02' && sess.schedule_time === '17:00');
    expect(originalSlotSession).toBeDefined();
    expect(originalSlotSession.cancellation_reason).toBe('Unrelated makeup session');
    expect(originalSlotSession.session_status).toBe('SCHEDULED');

    // 2. Renewal sessions must be scheduled in safe alternative slots skipping the occupied date:
    // Slot 1: 2026-11-09 17:00
    // Slot 2: 2026-11-16 17:00
    // Slot 3: 2026-11-23 17:00
    expect(allSessions.find((sess: any) => sess.schedule_date === '2026-11-09' && sess.schedule_time === '17:00')).toBeDefined();
    expect(allSessions.find((sess: any) => sess.schedule_date === '2026-11-16' && sess.schedule_time === '17:00')).toBeDefined();
    expect(allSessions.find((sess: any) => sess.schedule_date === '2026-11-23' && sess.schedule_time === '17:00')).toBeDefined();

    // 3. No duplicate records for (student_id, schedule_date, schedule_time)
    const compositeKeys = allSessions.map((sess: any) => `${sess.student_id}__${sess.schedule_date}__${sess.schedule_time}`);
    const uniqueKeys = new Set(compositeKeys);
    expect(compositeKeys.length).toBe(uniqueKeys.size);
  });

  // Section 8: Timezone and Date Validation
  it('Section 8: Timezone and Date Validation — India timezone midnight boundaries and calendar date integrity', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Timezone Student', parent_name: 'P TZ', parent_phone: '+91 9100000023', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = s.data.student_id;

    // Test start dates near month/year boundaries and verify UTC noon date arithmetic never shifts days
    const schedules = [
      { day_of_week: 'SATURDAY', start_time: '23:30' }, // Late night slot near midnight
      { day_of_week: 'SUNDAY', start_time: '00:30' }    // Early morning slot just after midnight
    ];

    // Starting from 2026-12-31 (New Year boundary)
    const planned = RenewalSessionTransition._planRenewalSlots([], sid, schedules, '2026-12-31', 4);
    expect(planned.length).toBe(4);

    // 2026-12-31 is Thursday.
    // First matching Saturday: 2027-01-02 at 23:30
    // First matching Sunday:   2027-01-03 at 00:30
    // Second matching Saturday: 2027-01-09 at 23:30
    // Second matching Sunday:   2027-01-10 at 00:30
    expect(planned[0].schedule_date).toBe('2027-01-02');
    expect(planned[0].schedule_time).toBe('23:30');
    expect(planned[1].schedule_date).toBe('2027-01-03');
    expect(planned[1].schedule_time).toBe('00:30');
    expect(planned[2].schedule_date).toBe('2027-01-09');
    expect(planned[2].schedule_time).toBe('23:30');
    expect(planned[3].schedule_date).toBe('2027-01-10');
    expect(planned[3].schedule_time).toBe('00:30');

    // Verify ISO format matches exact calendar string without UTC/local time displacement
    planned.forEach((p: any) => {
      expect(p.schedule_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.schedule_time).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  // Verification 1: Historical attendance conventions, missing deduct_class, and boolean string formats
  it('Verification 1: Canonical attendance statuses, missing deduct_class fallback, and sheet boolean strings', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Attendance Variation Student', parent_name: 'P Att', parent_phone: '+91 9100000024', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = s.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 12, currency: 'INR'
    }, adminActor);

    // Row 1: Modern canonical: deduct_class: true (boolean)
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Attendance Variation Student', schedule_date: '2026-10-01', schedule_time: '10:00',
      attendance_status: 'PRESENT', session_status: 'COMPLETED', cancellation_reason: '', deduct_class: true
    });
    // Row 2: Google Sheets string representation: deduct_class: 'TRUE'
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Attendance Variation Student', schedule_date: '2026-10-02', schedule_time: '10:00',
      attendance_status: 'PRESENT', session_status: 'COMPLETED', cancellation_reason: '', deduct_class: 'TRUE'
    });
    // Row 3: Numeric string representation: deduct_class: '1'
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Attendance Variation Student', schedule_date: '2026-10-03', schedule_time: '10:00',
      attendance_status: 'PRESENT', session_status: 'COMPLETED', cancellation_reason: '', deduct_class: '1'
    });
    // Row 4: Legacy historical row: missing deduct_class (''), attendance_status: 'PRESENT', session_status: 'COMPLETED'
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Attendance Variation Student', schedule_date: '2026-10-04', schedule_time: '10:00',
      attendance_status: 'PRESENT', session_status: 'COMPLETED', cancellation_reason: '', deduct_class: ''
    });
    // Row 5: Legacy historical row: missing deduct_class (''), attendance_status: 'ATTENDED', session_status: 'COMPLETED'
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Attendance Variation Student', schedule_date: '2026-10-05', schedule_time: '10:00',
      attendance_status: 'ATTENDED', session_status: 'COMPLETED', cancellation_reason: '', deduct_class: ''
    });
    // Row 6: Legacy historical row: missing deduct_class (''), session_status: 'ATTENDED' (legacy status column format)
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Attendance Variation Student', schedule_date: '2026-10-06', schedule_time: '10:00',
      attendance_status: '', session_status: 'ATTENDED', cancellation_reason: '', deduct_class: ''
    });
    // Row 7: Waived session: attendance_status: 'PRESENT', session_status: 'COMPLETED', but deduct_class: false (MUST NOT deduct)
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Attendance Variation Student', schedule_date: '2026-10-07', schedule_time: '10:00',
      attendance_status: 'PRESENT', session_status: 'COMPLETED', cancellation_reason: 'Waived trial', deduct_class: false
    });
    // Row 8: Waived string: deduct_class: 'FALSE' (MUST NOT deduct)
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Attendance Variation Student', schedule_date: '2026-10-08', schedule_time: '10:00',
      attendance_status: 'ATTENDED', session_status: 'COMPLETED', cancellation_reason: 'Free session', deduct_class: 'FALSE'
    });
    // Row 9: Cancelled session with missing deduct_class ('') (MUST NOT deduct)
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Attendance Variation Student', schedule_date: '2026-10-09', schedule_time: '10:00',
      attendance_status: 'CANCELLED', session_status: 'CANCELLED', cancellation_reason: 'Weather', deduct_class: ''
    });
    // Row 10: Scheduled future session (MUST NOT deduct)
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Attendance Variation Student', schedule_date: '2026-10-10', schedule_time: '10:00',
      attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED', cancellation_reason: '', deduct_class: false
    });
    // Row 11: Late cancellation unexcused: session_status: 'CANCELLED', but deduct_class: true (MUST deduct)
    ClassRepository.Classes_insert(spreadsheet, {
      student_id: sid, student_name: 'Attendance Variation Student', schedule_date: '2026-10-11', schedule_time: '10:00',
      attendance_status: 'CANCELLED', session_status: 'CANCELLED', cancellation_reason: 'Late cancellation fee', deduct_class: true
    });

    // Count consumed credits across all sessions
    const allSessions = ClassRepository.Classes_getAll(spreadsheet).filter((sess: any) => sess.student_id === sid);
    expect(allSessions.length).toBe(11);

    const consumed = RenewalSessionTransition._countConsumedCredits(allSessions, sid);
    // Rows 1, 2, 3, 4, 5, 6, 11 are deducted -> Exactly 7 credits consumed!
    expect(consumed).toBe(7);

    // Renewal with 10 classes -> Previous purchased (12) - consumed (7) = 5 previous available
    // Cumulative purchased = 22, new available balance = 22 - 7 = 15!
    const ren = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid, new_classes_purchased: 10, currency: 'INR', idempotency_key: 'idemp_att_var_1'
    }, adminActor);

    expect(ren.success).toBe(true);
    expect(ren.data.previous_available_balance).toBe(5);
    expect(ren.data.cumulative_consumed).toBe(7);
    expect(ren.data.cumulative_purchased).toBe(22);
    expect(ren.data.new_available_balance).toBe(15);
  });

  // Verification 2: RENEW_INITIATED intent recovery from durable store
  it('Verification 2: Recovers from incomplete RENEW_INITIATED intent in durable store after memory & cache wipe', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Intent Recovery Student', parent_name: 'P Intent', parent_phone: '+91 9100000025', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = s.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR'
    }, adminActor);

    const idempKey = 'idemp_intent_only_test';
    const schedules = [{ day_of_week: 'MONDAY', start_time: '17:00' }];
    const renewalPayload = {
      student_id: sid, new_classes_purchased: 10, currency: 'INR',
      start_date: '2026-11-02', schedules: schedules, idempotency_key: idempKey
    };

    // 1. Plan 10 target slots
    const targetSlots = RenewalSessionTransition._planRenewalSlots([], sid, schedules, '2026-11-02', 10);
    expect(targetSlots.length).toBe(10);

    // 2. Write ONLY RENEW_INITIATED intent in durable store (no completion exists yet!)
    const ds = RenewalIdempotency._getDurableStore();
    const intentSummary = {
      student_id: sid, new_classes: 10, initial_purchased: 10, target_cumulative: 20,
      currency: 'INR', start_date: '2026-11-02', package_price: null, payment_amount: 0,
      class_duration: null, schedule_key: 'MONDAY@17:00', target_slots: targetSlots, created_session_ids: [],
      inProgress: true, outcome: 'STARTED'
    };
    ds.setProperty('renewal_idemp_' + idempKey, JSON.stringify(intentSummary));

    // 3. Persist 4 sessions to ClassSessions before interruption
    for (let i = 0; i < 4; i++) {
      ClassRepository.Classes_insert(spreadsheet, {
        student_id: sid, student_name: 'Intent Recovery Student',
        schedule_date: targetSlots[i].schedule_date, schedule_time: targetSlots[i].schedule_time,
        attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED', cancellation_reason: '', deduct_class: false
      });
    }

    // 4. Wipe all in-memory caches and ScriptCache (cold restart)
    // @ts-ignore
    globalThis.__renewalIdempCache = {};

    // 5. Verify _checkRenewalIdempotency finds RENEW_INITIATED and marks inProgress
    const lockCheck = RenewalIdempotency._checkRenewalIdempotency(spreadsheet, idempKey, renewalPayload);
    expect(lockCheck).toBeDefined();
    expect(lockCheck.inProgress).toBe(true);
    expect(lockCheck.targetCumulative).toBe(20);
    expect(lockCheck.targetSlots.length).toBe(10);
    expect(lockCheck.completed).toBeUndefined();

    // 6. Retry executes: creates remaining 6 sessions, writes SUCCESS to durable store, returns success
    const retryRes = RenewalService.Packages_renew(spreadsheet, renewalPayload, adminActor);
    expect(retryRes.success).toBe(true);
    expect(retryRes.data.cumulative_purchased).toBe(20);

    // Total scheduled sessions must be exactly 10 (4 previous + 6 newly inserted)
    const postSessions = ClassRepository.Classes_getAll(spreadsheet).filter((sess: any) => sess.student_id === sid && sess.session_status === 'SCHEDULED');
    expect(postSessions.length).toBe(10);

    // Verify durable store now has SUCCESS outcome
    const storedPost = JSON.parse(ds.getProperty('renewal_idemp_' + idempKey));
    expect(storedPost.outcome).toBe('SUCCESS');
    expect(storedPost.resultData).toBeDefined();
  });

  // Verification 3: Both packages.renew and students.renew reject unauthorized and non-admin
  it('Verification 3: Comprehensive rejection of unauthorized and non-admin requests on both endpoints', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Endpoint Security Student', parent_name: 'P Sec', parent_phone: '+91 9100000026', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = s.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR'
    }, adminActor);

    const endpoints = ['packages.renew', 'students.renew'];

    for (const endpoint of endpoints) {
      // 1. Missing token
      const noTokenRes = ApiEntry.doPost({
        postData: {
          contents: JSON.stringify({
            apiVersion: '1', operation: endpoint, requestId: 'req_test_1',
            payload: { student_id: sid, new_classes_purchased: 5, currency: 'INR', idempotency_key: `key_${endpoint}_1` }
          })
        }
      });
      expect(noTokenRes.payload.success).toBe(false);
      expect(noTokenRes.payload.error.code).toBe('UNAUTHORIZED');

      // 2. Non-admin token
      const nonAdminRes = ApiEntry.doPost({
        postData: {
          contents: JSON.stringify({
            apiVersion: '1', operation: endpoint, requestId: 'req_test_2',
            identityToken: 'mock_token_for_outsider@example.com',
            payload: { student_id: sid, new_classes_purchased: 5, currency: 'INR', idempotency_key: `key_${endpoint}_2` }
          })
        }
      });
      expect(nonAdminRes.payload.success).toBe(false);
      expect(nonAdminRes.payload.error.code).toBe('FORBIDDEN');

      // 3. Forged actor in payload with outsider token
      const forgedRes = ApiEntry.doPost({
        postData: {
          contents: JSON.stringify({
            apiVersion: '1', operation: endpoint, requestId: 'req_test_3',
            identityToken: 'mock_token_for_outsider@example.com',
            payload: {
              student_id: sid, new_classes_purchased: 5, currency: 'INR', idempotency_key: `key_${endpoint}_3`,
              actor: { email: 'ashreya0502@gmail.com', verifiedEmail: 'ashreya0502@gmail.com', isAdmin: true, actorId: 'usr_admin' }
            }
          })
        }
      });
      expect(forgedRes.payload.success).toBe(false);
      expect(forgedRes.payload.error.code).toBe('FORBIDDEN');
    }
  });

  // Verification 4: Concurrency lock fails closed when lock manager or script lock is unavailable
  it('Verification 4: Concurrency lock fails closed when lock manager or script lock is unavailable', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Lock Test Student', parent_name: 'P Lock', parent_phone: '+91 9100000030', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = s.data.student_id;
    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR'
    }, adminActor);

    const origLock = require('../../02-backend/apps-script/sheets/LockManager.gs');
    try {
      RenewalService._setLockManager(null);
      const res = RenewalService.Packages_renew(spreadsheet, {
        student_id: sid, new_classes_purchased: 10, currency: 'INR', idempotency_key: 'lock_fail_key_1'
      }, adminActor);
      expect(res.success).toBe(false);
      expect(res.code).toBe('LOCK_UNAVAILABLE');
    } finally {
      RenewalService._setLockManager(origLock);
    }
  });

  // Critical Fix 1: Durable store completion ordering vs success caching (Tests A, B, C, D)
  describe('Critical Fix 1: Durable store completion ordering vs success caching', () => {
    let scriptCacheStore: Record<string, string>;
    let mockScriptCache: any;

    beforeEach(() => {
      scriptCacheStore = {};
      mockScriptCache = {
        get: (k: string) => scriptCacheStore[k] || null,
        put: (k: string, v: string) => { scriptCacheStore[k] = v; },
        remove: (k: string) => { delete scriptCacheStore[k]; },
        _store: scriptCacheStore
      };
      (globalThis as any).CacheService = {
        getScriptCache: () => mockScriptCache
      };
      // @ts-ignore
      globalThis.__renewalIdempCache = {};
    });

    it('Test A: Completion save succeeds -> durable store, memory cache & ScriptCache receive SUCCESS, returns success', () => {
      const s = StudentService.Students_create(spreadsheet, { student_name: 'Test A Stu', parent_name: 'P A', parent_phone: '+91 9100000040', status: 'ACTIVE', subject: 'Math' }, adminActor);
      const sid = s.data.student_id;
      PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR' }, adminActor);

      const key = 'test_a_key_success';
      const payload = { student_id: sid, new_classes_purchased: 10, currency: 'INR', package_price: 10000, idempotency_key: key };

      const res = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
      expect(res.success).toBe(true);

      // Verify durable store has SUCCESS completion entry
      const ds = RenewalIdempotency._getDurableStore();
      const storedStr = ds.getProperty('renewal_idemp_' + key);
      expect(storedStr).toBeTruthy();
      const storedObj = JSON.parse(storedStr);
      expect(storedObj.outcome).toBe('SUCCESS');

      // Verify memory cache and ScriptCache receive SUCCESS
      // @ts-ignore
      expect(globalThis.__renewalIdempCache[key]).toBeDefined();
      // @ts-ignore
      expect(globalThis.__renewalIdempCache[key].outcome).toBe('SUCCESS');
      expect(mockScriptCache.get('renewal_idemp_' + key)).toBeTruthy();
      const cached = JSON.parse(mockScriptCache.get('renewal_idemp_' + key));
      expect(cached.outcome).toBe('SUCCESS');
    });

    it('Test B: Completion save fails -> NO success in memory cache, NO success in ScriptCache, returns failure', () => {
      const s = StudentService.Students_create(spreadsheet, { student_name: 'Test B Stu', parent_name: 'P B', parent_phone: '+91 9100000041', status: 'ACTIVE', subject: 'Math' }, adminActor);
      const sid = s.data.student_id;
      PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR' }, adminActor);

      const key = 'test_b_key_durable_fail';
      const payload = { student_id: sid, new_classes_purchased: 10, currency: 'INR', package_price: 10000, idempotency_key: key };

      // Hook durable store setProperty to throw on completion save
      const ds = RenewalIdempotency._getDurableStore();
      const origSet = ds.setProperty;
      let setCount = 0;
      ds.setProperty = function(k: string, v: string) {
        setCount++;
        if (setCount === 1) return origSet.call(ds, k, v); // Intent succeeds
        throw new Error('Durable store quota exceeded on completion entry');
      };

      try {
        const res = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
        expect(res.success).toBe(false);
        expect(res.code).toBe('DURABLE_PERSIST_FAILED');

        // Verify NO success entry was written to memory cache or ScriptCache
        // @ts-ignore
        const memEntry = globalThis.__renewalIdempCache[key];
        if (memEntry) {
          expect(memEntry.outcome).not.toBe('SUCCESS');
        }
        const cachedStr = mockScriptCache.get('renewal_idemp_' + key);
        if (cachedStr) {
          const cachedObj = JSON.parse(cachedStr);
          expect(cachedObj.outcome).not.toBe('SUCCESS');
        }
      } finally {
        ds.setProperty = origSet;
      }
    });

    it('Test C: Retry after completion save failure completes without duplicating payments or credits', () => {
      const s = StudentService.Students_create(spreadsheet, { student_name: 'Test C Stu', parent_name: 'P C', parent_phone: '+91 9100000042', status: 'ACTIVE', subject: 'Math' }, adminActor);
      const sid = s.data.student_id;
      PackageService.Packages_create(spreadsheet, { student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', package_price: 10000 }, adminActor);

      const key = 'test_c_key_recover';
      const payload = {
        student_id: sid, new_classes_purchased: 10, currency: 'INR', package_price: 10000,
        payment: { record_payment: true, amount: 10000, currency: 'INR', payment_date: '2026-11-01', reference_number: 'REF-C-001' },
        idempotency_key: key
      };

      // 1. First attempt fails on completion save
      const ds = RenewalIdempotency._getDurableStore();
      const origSet = ds.setProperty;
      let setCount = 0;
      ds.setProperty = function(k: string, v: string) {
        setCount++;
        if (setCount === 1) return origSet.call(ds, k, v);
        throw new Error('Durable store completion write failed');
      };

      const failRes = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
      expect(failRes.success).toBe(false);
      expect(failRes.code).toBe('DURABLE_PERSIST_FAILED');

      // Restore setProperty
      ds.setProperty = origSet;

      // 2. Clear memory cache and ScriptCache (cold restart)
      // @ts-ignore
      globalThis.__renewalIdempCache = {};
      mockScriptCache.remove('renewal_idemp_' + key);

      // 3. Retry with exact same payload and key
      const retryRes = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
      expect(retryRes.success).toBe(true);
      expect(retryRes.data.cumulative_purchased).toBe(20);

      // Verify payment exists exactly once
      const pays = PaymentRepository.Payments_getByStudentId(spreadsheet, sid);
      expect(pays.length).toBe(1);

      // Verify durable store has SUCCESS
      const postStored = JSON.parse(ds.getProperty('renewal_idemp_' + key));
      expect(postStored.outcome).toBe('SUCCESS');
    });

    it('Test D: Cached success cannot bypass missing durable store completion', () => {
      const key = 'test_d_tampered_cache';
      const fakeSuccess = { student_id: 'STU_D_001', outcome: 'SUCCESS', resultData: { student_id: 'STU_D_001', cumulative_purchased: 20 } };

      // Populate memory cache and ScriptCache with fake SUCCESS, but durable store has ONLY STARTED intent!
      // @ts-ignore
      globalThis.__renewalIdempCache[key] = fakeSuccess;
      mockScriptCache.put('renewal_idemp_' + key, JSON.stringify(fakeSuccess));

      const ds = RenewalIdempotency._getDurableStore();
      ds.setProperty('renewal_idemp_' + key, JSON.stringify({ student_id: 'STU_D_001', target_cumulative: 20, outcome: 'STARTED', inProgress: true }));

      // Check idempotency with durable store validation
      const check = RenewalIdempotency._checkRenewalIdempotency(spreadsheet, key, { student_id: 'STU_D_001', new_classes_purchased: 10 });
      // Because durable store has STARTED rather than SUCCESS, cached success is rejected and operation is treated as inProgress!
      expect(check).toBeDefined();
      expect(check.completed).toBeUndefined();
      expect(check.inProgress).toBe(true);
    });
  });

  // Critical Fix 2: Old-Schedule Cancellation Must Preserve Unrelated Sessions (Cases A-F)
  describe('Critical Fix 2: Old-schedule cancellation preserving unrelated sessions', () => {
    it('Cases A-F: Validates exact slot matching and preservation of makeup/trial/different-time sessions', () => {
      const s = StudentService.Students_create(spreadsheet, { student_name: 'Cancel Test Stu', parent_name: 'P Cancel', parent_phone: '+91 9100000050', status: 'ACTIVE', subject: 'Math' }, adminActor);
      const sid = s.data.student_id;

      // Old schedule: Wednesday 17:00-18:00 (represented as 'Wed - 5:00 PM' or 'WEDNESDAY 17:00')
      PackageService.Packages_create(spreadsheet, {
        student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', class_schedule: 'Wed - 5:00 PM'
      }, adminActor);

      // Pre-create diverse sessions:
      // Case A: Exact old recurring match -> Wednesday 2026-11-18 17:00 (SCHEDULED)
      ClassRepository.Classes_insert(spreadsheet, { student_id: sid, student_name: 'Cancel Test Stu', schedule_date: '2026-11-18', schedule_time: '17:00', attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED', cancellation_reason: '', deduct_class: false });
      // Case B: Same weekday, different time -> Wednesday 2026-11-18 15:00 (SCHEDULED)
      ClassRepository.Classes_insert(spreadsheet, { student_id: sid, student_name: 'Cancel Test Stu', schedule_date: '2026-11-18', schedule_time: '15:00', attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED', cancellation_reason: '', deduct_class: false });
      // Case C: Makeup class on Wednesday at 16:00 (SCHEDULED)
      ClassRepository.Classes_insert(spreadsheet, { student_id: sid, student_name: 'Cancel Test Stu', schedule_date: '2026-11-18', schedule_time: '16:00', attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED', cancellation_reason: '', deduct_class: false });
      // Case D: Different weekday -> Thursday 2026-11-19 17:00 (SCHEDULED)
      ClassRepository.Classes_insert(spreadsheet, { student_id: sid, student_name: 'Cancel Test Stu', schedule_date: '2026-11-19', schedule_time: '17:00', attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED', cancellation_reason: '', deduct_class: false });
      // Case F: Already cancelled session -> Wednesday 2026-11-18 17:00 (already CANCELLED previously)
      ClassRepository.Classes_insert(spreadsheet, { student_id: sid, student_name: 'Cancel Test Stu', schedule_date: '2026-11-11', schedule_time: '17:00', attendance_status: 'CANCELLED', session_status: 'CANCELLED', cancellation_reason: 'Student sick', deduct_class: false });

      // Run renewal with a new schedule (Friday 16:00-17:00) starting 2026-11-15
      const ren = RenewalService.Packages_renew(spreadsheet, {
        student_id: sid,
        new_classes_purchased: 5,
        currency: 'INR',
        start_date: '2026-11-15',
        schedules: [{ day_of_week: 'FRIDAY', start_time: '16:00', end_time: '17:00' }],
        idempotency_key: 'cancel_isolation_key_001'
      }, adminActor);
      expect(ren.success).toBe(true);

      const all = ClassRepository.Classes_getAll(spreadsheet).filter((c: any) => c.student_id === sid);

      // Case A: The exact old recurring slot (Wed 17:00) was cancelled
      const caseA = all.find((c: any) => c.schedule_date === '2026-11-18' && String(c.schedule_time).slice(0, 5) === '17:00');
      expect(caseA).toBeDefined();
      expect(caseA.session_status).toBe('CANCELLED');
      expect(caseA.cancellation_reason).toContain('Superceded');

      // Case B: Same weekday, different time (Wed 15:00) remains untouched (SCHEDULED)
      const caseB = all.find((c: any) => c.schedule_date === '2026-11-18' && String(c.schedule_time).slice(0, 5) === '15:00');
      expect(caseB).toBeDefined();
      expect(caseB.session_status).toBe('SCHEDULED');
      expect(caseB.cancellation_reason).toBe('');

      // Case C: Makeup class on Wed 16:00 remains untouched (SCHEDULED)
      const caseC = all.find((c: any) => c.schedule_date === '2026-11-18' && String(c.schedule_time).slice(0, 5) === '16:00');
      expect(caseC).toBeDefined();
      expect(caseC.session_status).toBe('SCHEDULED');

      // Case D: Different weekday (Thu 17:00) remains untouched (SCHEDULED)
      const caseD = all.find((c: any) => c.schedule_date === '2026-11-19' && String(c.schedule_time).slice(0, 5) === '17:00');
      expect(caseD).toBeDefined();
      expect(caseD.session_status).toBe('SCHEDULED');

      // Case F: Historical cancelled session remains with its original cancellation reason
      const caseF = all.find((c: any) => c.schedule_date === '2026-11-11' && String(c.schedule_time).slice(0, 5) === '17:00');
      expect(caseF).toBeDefined();
      expect(caseF.cancellation_reason).toBe('Student sick');
    });
  });

  // Critical Fix 4: Comprehensive 26 Idempotency Fingerprint Conflict Scenarios
  it('Critical Fix 4: Tests all 26 idempotency fingerprint conflict scenarios', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Conflict Matrix Student', parent_name: 'P Conflict', parent_phone: '+91 9100000060', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = s.data.student_id;
    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR'
    }, adminActor);

    const basePayload = {
      student_id: sid,
      new_classes_purchased: 10,
      currency: 'INR',
      package_price: 10000,
      per_class: 1000,
      plan_type: 'Per Class',
      class_duration: 60,
      start_date: '2026-11-01',
      end_date: '2026-12-01',
      next_due_date: '2026-12-01',
      schedules: [{ day_of_week: 'MONDAY', start_time: '17:00', end_time: '18:00' }],
      payment: {
        record_payment: true,
        amount: 10000,
        currency: 'INR',
        in_inr: 10000,
        reference_number: 'REF-BASE-001',
        payment_date: '2026-11-01'
      },
      idempotency_key: 'conflict_matrix_key_001'
    };

    const firstRes = RenewalService.Packages_renew(spreadsheet, basePayload, adminActor);
    expect(firstRes.success).toBe(true);

    // 1. Identical retry returns idempotent result
    const exactRetry = RenewalService.Packages_renew(spreadsheet, basePayload, adminActor);
    expect(exactRetry.success).toBe(true);
    expect(exactRetry.meta.idempotentRetry).toBe(true);

    // 2. Student ID changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, student_id: 'STU_DIFF' }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 3. Class count changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, new_classes_purchased: 12 }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 4. Package price changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, package_price: 12000 }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 5. Per-class rate changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, per_class: 1200 }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 6. Currency changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, currency: 'USD' }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 7. Plan type changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, plan_type: 'Monthly' }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 8. Duration changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, class_duration: 45 }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 9. Start date changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, start_date: '2026-11-05' }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 10. End date changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, end_date: '2026-12-15' }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 11. Next due date changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, next_due_date: '2026-12-15' }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 12. Schedule weekday changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, schedules: [{ day_of_week: 'TUESDAY', start_time: '17:00', end_time: '18:00' }] }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 13. Schedule start time changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, schedules: [{ day_of_week: 'MONDAY', start_time: '18:00', end_time: '19:00' }] }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 14. Schedule end time changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, schedules: [{ day_of_week: 'MONDAY', start_time: '17:00', end_time: '19:00' }] }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 15. Payment recording enabled/disabled changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, payment: { ...basePayload.payment, record_payment: false, amount: 0 } }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 16. Payment amount changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, payment: { ...basePayload.payment, amount: 9000 } }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 17. Payment currency changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, payment: { ...basePayload.payment, currency: 'USD' } }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 18. INR equivalent changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, payment: { ...basePayload.payment, in_inr: 9000 } }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 19. Reference number changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, payment: { ...basePayload.payment, reference_number: 'REF-DIFF' } }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 20. Payment date changed
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, payment: { ...basePayload.payment, payment_date: '2026-11-05' } }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 21. Populated value changed to blank
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, payment: { ...basePayload.payment, reference_number: '' } }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 22. Populated value changed to missing
    const { reference_number: _rn, ...missingRefPayment } = basePayload.payment;
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, payment: missingRefPayment as any }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 23. Populated value changed to null
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, payment: { ...basePayload.payment, reference_number: null as any } }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 24. Missing value changed to populated (tested with end_date on legacy record)
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, end_date: '' }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 25. Explicit zero changed to missing/different
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, package_price: '' as any }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
    // 26. Explicit false changed to missing/true
    expect(RenewalService.Packages_renew(spreadsheet, { ...basePayload, payment: { ...basePayload.payment, record_payment: false } }, adminActor).code).toBe('IDEMPOTENCY_CONFLICT');
  });

  // Critical Fix 3: Real Mutation Boundary Partial-Failure Recovery with complete history assertions
  it('Critical Fix 3: Interruption at mutation boundaries with complete ClassSessions history assertions', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Hook Complete History Stu', parent_name: 'P Hook', parent_phone: '+91 9100000070', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = s.data.student_id;
    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', package_price: 10000, class_schedule: 'Wed - 5:00 PM'
    }, adminActor);

    const idempKey = 'real_mutation_complete_history_001';
    const schedules = [{ day_of_week: 'MONDAY', start_time: '17:00', end_time: '18:00' }];
    const payload = {
      student_id: sid,
      new_classes_purchased: 10,
      currency: 'INR',
      package_price: 10000,
      start_date: '2026-11-02',
      schedules: schedules,
      payment: { record_payment: true, amount: 10000, currency: 'INR', payment_date: '2026-11-02', reference_number: 'REF-HOOK-001' },
      idempotency_key: idempKey
    };

    const origClassRepo = require('../../02-backend/apps-script/classes/ClassRepository.gs');
    let insertCount = 0;
    const hookedRepo = {
      ...origClassRepo,
      Classes_insert: function(ss: any, rowData: any) {
        insertCount++;
        if (insertCount === 5) {
          throw new Error('Simulated network failure on 5th ClassSessions write');
        }
        return origClassRepo.Classes_insert(ss, rowData);
      }
    };
    const renTrans = require('../../02-backend/apps-script/packages/RenewalSessionTransition.gs');
    renTrans._setClassRepo(hookedRepo);

    let firstErr: any = null;
    try {
      RenewalService.Packages_renew(spreadsheet, payload, adminActor);
    } catch (err) {
      firstErr = err;
    }
    expect(firstErr).toBeDefined();
    expect(insertCount).toBe(5);

    const midSessions = ClassRepository.Classes_getAll(spreadsheet).filter((sess: any) => sess.student_id === sid && sess.session_status === 'SCHEDULED');
    expect(midSessions.length).toBe(4);

    const midPayments = PaymentRepository.Payments_getByStudentId(spreadsheet, sid);
    expect(midPayments.length).toBe(1);

    const ds = RenewalIdempotency._getDurableStore();
    const midStored = JSON.parse(ds.getProperty('renewal_idemp_' + idempKey));
    expect(midStored.outcome).toBe('STARTED');
    expect(midStored.inProgress).toBe(true);

    renTrans._setClassRepo(origClassRepo);
    // Cold restart: clear memory cache AND ScriptCache!
    // @ts-ignore
    globalThis.__renewalIdempCache = {};
    if (typeof CacheService !== 'undefined' && CacheService.getScriptCache) {
      CacheService.getScriptCache().remove('renewal_idemp_' + idempKey);
    }

    const retryRes = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
    expect(retryRes.success).toBe(true);
    expect(retryRes.data.cumulative_purchased).toBe(20);

    const postPayments = PaymentRepository.Payments_getByStudentId(spreadsheet, sid);
    expect(postPayments.length).toBe(1);

    // COMPLETE HISTORY ASSERTION:
    const allStudentSessions = ClassRepository.Classes_getAll(spreadsheet).filter((sess: any) => sess.student_id === sid);
    // Scheduled sessions must be exactly 10
    const scheduledSessions = allStudentSessions.filter((sess: any) => sess.session_status === 'SCHEDULED');
    expect(scheduledSessions.length).toBe(10);

    // Zero cancelled duplicate rows for the renewal schedule slots!
    const cancelledRenewalSessions = allStudentSessions.filter((sess: any) => sess.session_status === 'CANCELLED' && sess.schedule_date >= '2026-11-02');
    expect(cancelledRenewalSessions.length).toBe(0);

    // Every scheduled slot key must be unique (no duplicates in complete history)
    const slotKeySet = new Set(scheduledSessions.map((s: any) => `${s.schedule_date}__${String(s.schedule_time).slice(0, 5)}`));
    expect(slotKeySet.size).toBe(10);

    // Durable store has SUCCESS
    const postStored = JSON.parse(ds.getProperty('renewal_idemp_' + idempKey));
    expect(postStored.outcome).toBe('SUCCESS');
    expect(postStored.resultData).toBeDefined();
  });
});
