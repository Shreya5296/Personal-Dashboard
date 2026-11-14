import { describe, it, expect, beforeEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/mockSpreadsheet';
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
import RenewalService from '../../02-backend/apps-script/packages/RenewalService.gs';
// @ts-ignore
import RenewalIdempotency from '../../02-backend/apps-script/packages/RenewalIdempotency.gs';
// @ts-ignore
import RenewalSessionTransition from '../../02-backend/apps-script/packages/RenewalSessionTransition.gs';
// @ts-ignore
import PaymentService from '../../02-backend/apps-script/payments/PaymentService.gs';
// @ts-ignore
import PaymentRepository from '../../02-backend/apps-script/payments/PaymentRepository.gs';
// @ts-ignore
import ClassService from '../../02-backend/apps-script/classes/ClassService.gs';
// @ts-ignore
import ClassRepository from '../../02-backend/apps-script/classes/ClassRepository.gs';
// @ts-ignore
import FeeService from '../../02-backend/apps-script/fees/FeeService.gs';
// @ts-ignore
import MeetingLinkService from '../../02-backend/apps-script/meeting-links/MeetingLinkService.gs';
// @ts-ignore
import NoteService from '../../02-backend/apps-script/notes/NoteService.gs';
// @ts-ignore
import IdempotencyRetention from '../../02-backend/apps-script/packages/IdempotencyRetention.gs';

describe('AuditLog Removal Safety & Architecture Verification', () => {
  let spreadsheet: any;
  const adminActor = { actorId: 'usr_admin', email: 'ashreya0502@gmail.com', requestId: 'req_audit_removal_001', isAdmin: true };

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
    const provider = require('../../02-backend/apps-script/sheets/SpreadsheetProvider.gs');
    provider.setMockSpreadsheet(spreadsheet);
    // @ts-ignore
    if (globalThis.__renewalIdempCache) globalThis.__renewalIdempCache = {};
    // @ts-ignore
    if (globalThis.__paymentMemoryCache) globalThis.__paymentMemoryCache = {};
    // @ts-ignore
    if (globalThis.__mockPropertiesStore) globalThis.__mockPropertiesStore = {};
    // @ts-ignore
    if (globalThis.__renewalDurableStore) globalThis.__renewalDurableStore._d = {};
  });

  it('1. Package renewal succeeds without AuditLog sheet', () => {
    expect(spreadsheet.getSheetByName('AuditLog')).toBeNull();
    expect(SheetRegistry.SHEET_NAMES.AUDIT_LOG).toBeUndefined();

    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'No Audit Student', parent_name: 'P NA', parent_phone: '+91 9999000001', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', package_price: 10000
    }, adminActor);

    const renewalRes = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 10,
      currency: 'INR',
      package_price: 10000,
      payment: { amount: 10000, currency: 'INR', record_payment: true, payment_date: '2026-11-14' },
      idempotency_key: 'idemp_no_audit_001',
      start_date: '2026-11-15'
    }, adminActor);

    expect(renewalRes.success).toBe(true);
    expect(renewalRes.data.cumulative_purchased).toBe(20);
    expect(renewalRes.data.new_available_balance).toBe(20);
    expect(spreadsheet.getSheetByName('AuditLog')).toBeNull();
  });

  it('2. Idempotency prevents duplicate renewals without AuditLog', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Idemp Test Student', parent_name: 'P Idemp', parent_phone: '+91 9999000002', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 12, currency: 'INR', package_price: 12000
    }, adminActor);

    const payload = {
      student_id: sid,
      new_classes_purchased: 12,
      currency: 'INR',
      package_price: 12000,
      payment: { amount: 12000, currency: 'INR', record_payment: true, payment_date: '2026-11-14' },
      idempotency_key: 'idemp_duplicate_prevention_001',
      start_date: '2026-11-15'
    };

    const res1 = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
    expect(res1.success).toBe(true);
    expect(res1.data.cumulative_purchased).toBe(24);

    // Attempt second execution with same key and payload
    const res2 = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
    expect(res2.success).toBe(true);
    expect(res2.meta?.idempotentRetry).toBe(true);
    expect(res2.data.cumulative_purchased).toBe(24);

    // Ensure only 1 payment was recorded
    const payments = PaymentRepository.Payments_getByStudentId(spreadsheet, sid);
    expect(payments.length).toBe(1);

    // Ensure package purchased classes is 24, not 36
    const pkg = PackageRepository.Packages_getById(spreadsheet, sid);
    expect(pkg.classes_purchased).toBe(24);
  });

  it('3. Completion is durably persisted before success is cached', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Durable Order Student', parent_name: 'P DO', parent_phone: '+91 9999000003', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 8, currency: 'INR', package_price: 8000
    }, adminActor);

    const key = 'idemp_order_test_001';
    const payload = {
      student_id: sid, new_classes_purchased: 8, currency: 'INR', package_price: 8000, idempotency_key: key
    };

    const ds = RenewalIdempotency._getDurableStore();
    const origSet = ds.setProperty;
    let callCount = 0;
    ds.setProperty = (k: string, v: string) => {
      callCount++;
      if (callCount === 1) return origSet.call(ds, k, v); // Intent save succeeds
      throw new Error('Durable store write failed during completion'); // Completion save fails
    };

    try {
      const res = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
      expect(res.success).toBe(false);
      expect(res.code).toBe('DURABLE_PERSIST_FAILED');

      // Verify success was NOT cached in memory
      // @ts-ignore
      const memEntry = globalThis.__renewalIdempCache[key];
      if (memEntry) {
        expect(memEntry.outcome).not.toBe('SUCCESS');
      }
    } finally {
      ds.setProperty = origSet;
    }

    // Now retry after restoring durable store -> completes and durably stores SUCCESS
    const retryRes = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
    expect(retryRes.success).toBe(true);
    const stored = JSON.parse(ds.getProperty('renewal_idemp_' + key));
    expect(stored.outcome).toBe('SUCCESS');
  });

  it('4. Partial failures remain recoverable across cold restarts', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Recoverable Student', parent_name: 'P Rec', parent_phone: '+91 9999000004', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', package_price: 10000
    }, adminActor);

    const key = 'idemp_cold_recovery_test';
    const schedules = [{ day_of_week: 'MONDAY', start_time: '18:00' }];
    const payload = {
      student_id: sid, new_classes_purchased: 10, currency: 'INR', package_price: 10000,
      payment: { amount: 10000, currency: 'INR', record_payment: true, payment_date: '2026-11-14' },
      schedules: schedules, start_date: '2026-11-16', idempotency_key: key
    };

    // Plan 10 target slots
    const targetSlots = RenewalSessionTransition._planRenewalSlots([], sid, schedules, '2026-11-16', 10);
    expect(targetSlots.length).toBe(10);

    // Pre-seed an interrupted intent in durable store with targetSlots
    const ds = RenewalIdempotency._getDurableStore();
    RenewalIdempotency._recordRenewalInitiated(spreadsheet, key, sid, 10, 20, payload, adminActor, targetSlots);

    // Simulate 3 pre-created sessions by first attempt matching the target slots
    for (let i = 0; i < 3; i++) {
      ClassRepository.Classes_insert(spreadsheet, {
        student_id: sid, student_name: 'Recoverable Student',
        schedule_date: targetSlots[i].schedule_date, schedule_time: targetSlots[i].schedule_time,
        attendance_status: 'NOT_MARKED', session_status: 'SCHEDULED', cancellation_reason: '', deduct_class: false
      });
    }

    // Cold restart: wipe in-memory cache
    // @ts-ignore
    globalThis.__renewalIdempCache = {};

    // Execute retry: should recover intent from durable store and create only remaining 7 sessions
    const retryRes = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
    expect(retryRes.success).toBe(true);
    expect(retryRes.data.cumulative_purchased).toBe(20);

    const scheduled = ClassRepository.Classes_getAll(spreadsheet).filter((s: any) => s.student_id === sid && s.session_status === 'SCHEDULED');
    expect(scheduled.length).toBe(10);
  });

  it('5. Retrying does not duplicate payments or classes', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'No Duplication Student', parent_name: 'P ND', parent_phone: '+91 9999000005', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', package_price: 10000
    }, adminActor);

    const payload = {
      student_id: sid, new_classes_purchased: 10, currency: 'INR', package_price: 10000,
      payment: { amount: 10000, currency: 'INR', record_payment: true, payment_date: '2026-11-14', reference_number: 'REF-ND-001' },
      idempotency_key: 'idemp_nd_retry_001', start_date: '2026-11-15'
    };

    const res1 = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
    expect(res1.success).toBe(true);

    // Wipe memory cache
    // @ts-ignore
    globalThis.__renewalIdempCache = {};

    // Retry
    const res2 = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
    expect(res2.success).toBe(true);

    // Verify payments table has exactly 1 payment
    const allPays = PaymentRepository.Payments_getByStudentId(spreadsheet, sid);
    expect(allPays.length).toBe(1);
    expect(allPays[0].amount).toBe(10000);

    // Verify packages has exactly 20 classes purchased
    const pkg = PackageRepository.Packages_getById(spreadsheet, sid);
    expect(pkg.classes_purchased).toBe(20);
  });

  it('6. Payment recording and voiding works seamlessly without AuditLog', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Payment Test Student', parent_name: 'P Pay', parent_phone: '+91 9999000006', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;

    const payRes = PaymentService.Payments_record(spreadsheet, {
      student_id: sid,
      amount: 5000,
      currency: 'INR',
      payment_method: 'UPI',
      idempotency_key: 'pay_idemp_key_999'
    }, adminActor);

    expect(payRes.success).toBe(true);
    expect(payRes.data.amount).toBe(5000);
    expect(spreadsheet.getSheetByName('AuditLog')).toBeNull();

    // Idempotency check on Payments_record
    const payRetry = PaymentService.Payments_record(spreadsheet, {
      student_id: sid,
      amount: 5000,
      currency: 'INR',
      payment_method: 'UPI',
      idempotency_key: 'pay_idemp_key_999'
    }, adminActor);

    expect(payRetry.success).toBe(true);
    expect(payRetry.meta?.idempotentRetry).toBe(true);

    // Void payment
    const voidRes = PaymentService.Payments_void(spreadsheet, {
      payment_id: payRes.data.payment_id,
      void_reason: 'Mistaken duplicate entry'
    }, adminActor);

    expect(voidRes.success).toBe(true);
    expect(voidRes.data.status).toBe('VOID');
    expect(spreadsheet.getSheetByName('AuditLog')).toBeNull();
  });

  it('7. All other domain workflows function without AuditLog', () => {
    // Student CRUD
    const stuRes = StudentService.Students_create(spreadsheet, {
      first_name: 'Aarav', last_name: 'Sharma', parent_name: 'Mr. Sharma', primary_phone: '+91 9999000007', status: 'ACTIVE', subject: 'Physics'
    }, adminActor);
    expect(stuRes.success).toBe(true);
    const sid = stuRes.data.student_id;

    const updateRes = StudentService.Students_update(spreadsheet, sid, { subject: 'Advanced Physics' }, adminActor);
    expect(updateRes.success).toBe(true);

    // Package CRUD
    const pkgRes = PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 15, currency: 'INR', package_price: 15000
    }, adminActor);
    expect(pkgRes.success).toBe(true);

    // Class scheduling, completion, cancellation
    const schedRes = ClassService.Classes_schedule(spreadsheet, {
      student_id: sid, scheduled_start: '2026-11-20T10:00:00Z', scheduled_end: '2026-11-20T11:00:00Z'
    }, adminActor);
    expect(schedRes.success).toBe(true);
    const sessId = schedRes.data.class_session_id || schedRes.data.session_id;

    const compRes = ClassService.Classes_complete(spreadsheet, {
      session_id: sessId, attendance_status: 'ATTENDED', deduct_class: true
    }, adminActor);
    expect(compRes.success).toBe(true);

    const sched2 = ClassService.Classes_schedule(spreadsheet, {
      student_id: sid, scheduled_start: '2026-11-27T10:00:00Z', scheduled_end: '2026-11-27T11:00:00Z'
    }, adminActor);
    const sess2Id = sched2.data.class_session_id || sched2.data.session_id;

    const cancelRes = ClassService.Classes_cancel(spreadsheet, {
      session_id: sess2Id, cancellation_reason: 'Student unwell', deduct_class: false
    }, adminActor);
    expect(cancelRes.success).toBe(true);

    // Fee obligations
    const feeRes = FeeService.FeeObligations_create(spreadsheet, {
      student_id: sid, amount_due: 3000, due_date: '2026-11-30', obligation_description: 'Lab Materials'
    }, adminActor);
    expect(feeRes.success).toBe(true);

    const voidFee = FeeService.FeeObligations_void(spreadsheet, {
      fee_obligation_id: feeRes.data.fee_obligation_id, void_reason: 'Waived by administrator'
    }, adminActor);
    expect(voidFee.success).toBe(true);

    // Meeting Links
    const mlRes = MeetingLinkService.MeetingLinks_create(spreadsheet, {
      student_id: sid, meeting_link_1: 'https://meet.google.com/test-audit-safety'
    }, adminActor);
    expect(mlRes.success).toBe(true);

    // Notes
    const noteRes = NoteService.Notes_create(spreadsheet, {
      student_id: sid, note_text: 'Student completed first Physics assessment with 95% score.'
    }, adminActor);
    expect(noteRes.success).toBe(true);

    // Archive and reactivate student
    const archiveRes = StudentService.Students_archive(spreadsheet, sid, adminActor);
    expect(archiveRes.success).toBe(true);

    const reactivateRes = StudentService.Students_reactivate(spreadsheet, sid, adminActor);
    expect(reactivateRes.success).toBe(true);

    expect(spreadsheet.getSheetByName('AuditLog')).toBeNull();
  });

  it('8. No application code attempts to read from or write to AuditLog', () => {
    // Wrap getSheetByName in a spy that detects any request for 'AuditLog'
    const origGetSheet = spreadsheet.getSheetByName.bind(spreadsheet);
    let auditLogQueried = false;
    spreadsheet.getSheetByName = (name: string) => {
      if (name === 'AuditLog') {
        auditLogQueried = true;
      }
      return origGetSheet(name);
    };

    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Zero Audit Query Student', parent_name: 'P ZAQ', parent_phone: '+91 9999000008', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', package_price: 10000
    }, adminActor);

    RenewalService.Packages_renew(spreadsheet, {
      student_id: sid, new_classes_purchased: 10, currency: 'INR', package_price: 10000,
      payment: { amount: 10000, currency: 'INR', record_payment: true, payment_date: '2026-11-14' },
      idempotency_key: 'zero_audit_query_key', start_date: '2026-11-15'
    }, adminActor);

    PaymentService.Payments_record(spreadsheet, {
      student_id: sid, amount: 2000, currency: 'INR', idempotency_key: 'pay_zero_query'
    }, adminActor);

    ClassService.Classes_schedule(spreadsheet, {
      student_id: sid, scheduled_start: '2026-11-25T14:00:00Z', scheduled_end: '2026-11-25T15:00:00Z'
    }, adminActor);

    NoteService.Notes_create(spreadsheet, {
      student_id: sid, note_text: 'Zero audit queries confirmed.'
    }, adminActor);

    MeetingLinkService.MeetingLinks_create(spreadsheet, {
      student_id: sid, meeting_link_1: 'https://meet.google.com/zero-audit-test'
    }, adminActor);

    // Verify AuditLog was never queried
    expect(auditLogQueried).toBe(false);
  });

  it('9. Payment idempotency fails closed if durable intent persistence fails before insertion', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Intent Fail Student', parent_name: 'P IF', parent_phone: '+91 9999000009', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;

    const durableStore = PaymentService._getPayDurableStore();
    const origSet = durableStore.setProperty;
    durableStore.setProperty = () => {
      throw new Error('Durable intent write simulated failure');
    };

    try {
      const res = PaymentService.Payments_record(spreadsheet, {
        student_id: sid,
        amount: 4500,
        currency: 'INR',
        idempotency_key: 'idemp_intent_fail_001'
      }, adminActor);

      expect(res.success).toBe(false);
      expect(res.code).toBe('DURABLE_INTENT_FAILED');

      // Crucial assertion: 0 rows inserted into Payments sheet
      const sheet = spreadsheet.getSheetByName('Payments');
      const rows = sheet.getData ? sheet.getData() : sheet.getDataRange().getValues();
      const studentPayments = rows.slice(1).filter((r: any[]) => r[0] === sid);
      expect(studentPayments.length).toBe(0);
    } finally {
      durableStore.setProperty = origSet;
    }
  });

  it('10. Payment row written followed by durable completion failure returns DURABLE_PERSIST_FAILED', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Completion Fail Student', parent_name: 'P CF', parent_phone: '+91 9999000010', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;

    const durableStore = PaymentService._getPayDurableStore();
    const origSet = durableStore.setProperty;
    let callCount = 0;
    durableStore.setProperty = (k: string, v: string) => {
      callCount++;
      if (callCount === 1) {
        return origSet.call(durableStore, k, v); // Intent succeeds
      }
      throw new Error('Durable completion write simulated failure'); // Completion fails
    };

    try {
      const res = PaymentService.Payments_record(spreadsheet, {
        student_id: sid,
        amount: 6000,
        currency: 'INR',
        idempotency_key: 'idemp_completion_fail_001'
      }, adminActor);

      expect(res.success).toBe(false);
      expect(res.code).toBe('DURABLE_PERSIST_FAILED');

      // Row WAS written to sheet
      const sheet = spreadsheet.getSheetByName('Payments');
      const rows = sheet.getData ? sheet.getData() : sheet.getDataRange().getValues();
      const studentPayments = rows.slice(1).filter((r: any[]) => r[0] === sid);
      expect(studentPayments.length).toBe(1);
      expect(Number(studentPayments[0][3])).toBe(6000);
    } finally {
      durableStore.setProperty = origSet;
    }
  });

  it('11. Cold restart followed by retry locates existing payment in sheet and succeeds without duplicate insert', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Recovery Student', parent_name: 'P Rec', parent_phone: '+91 9999000011', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;
    const key = 'idemp_recovery_retry_001';
    const payload = {
      student_id: sid,
      amount: 7500,
      currency: 'INR',
      idempotency_key: key,
      payment_date: '2026-11-14'
    };

    // First attempt: intent succeeds, row written, completion fails
    const durableStore = PaymentService._getPayDurableStore();
    const origSet = durableStore.setProperty;
    let callCount = 0;
    durableStore.setProperty = (k: string, v: string) => {
      callCount++;
      if (callCount === 1) return origSet.call(durableStore, k, v);
      throw new Error('Durable completion write failed');
    };

    try {
      const res1 = PaymentService.Payments_record(spreadsheet, payload, adminActor);
      expect(res1.success).toBe(false);
      expect(res1.code).toBe('DURABLE_PERSIST_FAILED');
    } finally {
      durableStore.setProperty = origSet;
    }

    // Cold restart: wipe all in-memory caches
    // @ts-ignore
    globalThis.__paymentMemoryCache = {};

    // Second attempt: retry with same payload
    const res2 = PaymentService.Payments_record(spreadsheet, payload, adminActor);
    expect(res2.success).toBe(true);
    expect(res2.meta?.idempotentRetry).toBe(true);
    expect(res2.data.amount).toBe(7500);

    // Assert strictly 1 row in Payments sheet (NO duplicate)
    const sheet = spreadsheet.getSheetByName('Payments');
    const rows = sheet.getData ? sheet.getData() : sheet.getDataRange().getValues();
    const studentPayments = rows.slice(1).filter((r: any[]) => r[0] === sid);
    expect(studentPayments.length).toBe(1);
    expect(Number(studentPayments[0][3])).toBe(7500);
  });

  it('12. In-memory cache claims payment success while durable store has no record (unbacked cache rejected)', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Fake Cache Student', parent_name: 'P FC', parent_phone: '+91 9999000012', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;
    const fakeKey = 'pay_unbacked_cache_key';

    // Inject fake record into memory cache only (not in durable store and not in sheet)
    // @ts-ignore
    globalThis.__paymentMemoryCache['payment_idemp_' + fakeKey] = {
      status: 'RECORDED',
      amount: 9999,
      student_id: sid
    };

    const payload = {
      student_id: sid,
      amount: 3000,
      currency: 'INR',
      idempotency_key: fakeKey,
      payment_date: '2026-11-14'
    };

    // Should reject the unbacked cache, write durable intent, insert real row, and complete
    const res = PaymentService.Payments_record(spreadsheet, payload, adminActor);
    expect(res.success).toBe(true);
    expect(res.data.amount).toBe(3000); // Executed fresh with real amount 3000, not fake 9999

    const sheet = spreadsheet.getSheetByName('Payments');
    const rows = sheet.getData ? sheet.getData() : sheet.getDataRange().getValues();
    const studentPayments = rows.slice(1).filter((r: any[]) => r[0] === sid);
    expect(studentPayments.length).toBe(1);
    expect(Number(studentPayments[0][3])).toBe(3000);
  });

  it('13. Payment void retry behavior is idempotent across cold restarts via durable property store', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Void Restart Student', parent_name: 'P VR', parent_phone: '+91 9999000013', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;

    const payRes = PaymentService.Payments_record(spreadsheet, {
      student_id: sid,
      amount: 4000,
      currency: 'INR',
      payment_date: '2026-11-14'
    }, adminActor);
    expect(payRes.success).toBe(true);
    const payId = payRes.data.payment_id;

    // Void payment
    const voidRes = PaymentService.Payments_void(spreadsheet, {
      payment_id: payId,
      void_reason: 'Accidental charge'
    }, adminActor);
    expect(voidRes.success).toBe(true);
    expect(voidRes.data.status).toBe('VOID');

    // Simulate cold restart: clear in-memory caches
    // @ts-ignore
    globalThis.__paymentMemoryCache = {};

    // Retry void with same payment ID
    const retryVoid = PaymentService.Payments_void(spreadsheet, {
      payment_id: payId,
      void_reason: 'Accidental charge'
    }, adminActor);

    expect(retryVoid.success).toBe(true);
    expect(retryVoid.meta?.idempotentRetry).toBe(true);
    expect(retryVoid.data.status).toBe('VOID');
  });

  it('14. Idempotency retention preserves active/recoverable STARTED records and prunes only aged completed records', () => {
    const nowMs = Date.parse('2026-11-14T12:00:00Z');
    const dayMs = 24 * 60 * 60 * 1000;

    const mockStore: any = {
      _data: {
        // Expired completed records (> 90 days old)
        'renewal_idemp_old_1': JSON.stringify({ outcome: 'SUCCESS', timestamp: new Date(nowMs - 100 * dayMs).toISOString() }),
        'payment_idemp_old_2': JSON.stringify({ status: 'RECORDED', recorded_at: new Date(nowMs - 95 * dayMs).toISOString() }),
        'payment_void_old_3': JSON.stringify({ status: 'VOID', voided_at: new Date(nowMs - 120 * dayMs).toISOString() }),

        // In-progress or recoverable STARTED records (> 90 days old, MUST BE PRESERVED)
        'renewal_idemp_started_4': JSON.stringify({ outcome: 'STARTED', inProgress: true, timestamp: new Date(nowMs - 110 * dayMs).toISOString() }),
        'payment_idemp_started_5': JSON.stringify({ status: 'STARTED', timestamp: new Date(nowMs - 130 * dayMs).toISOString() }),

        // Recent completed records (< 90 days old, MUST BE PRESERVED)
        'renewal_idemp_recent_6': JSON.stringify({ outcome: 'SUCCESS', timestamp: new Date(nowMs - 15 * dayMs).toISOString() }),
        'payment_idemp_recent_7': JSON.stringify({ status: 'RECORDED', timestamp: new Date(nowMs - 2 * dayMs).toISOString() }),

        // Corrupted JSON property (MUST BE CONSERVATIVELY PRESERVED)
        'renewal_idemp_corrupt_8': '{ not valid json ... }',

        // Unrelated system property (MUST BE IGNORED)
        'SYSTEM_SCHEMA_VERSION': '1.0.0'
      },
      getProperty: function(k: string) { return this._data[k] || null; },
      setProperty: function(k: string, v: string) { this._data[k] = String(v); },
      deleteProperty: function(k: string) { delete this._data[k]; },
      getProperties: function() { return Object.assign({}, this._data); }
    };

    // 1. Dry run test
    const dryRunRes = IdempotencyRetention.pruneCompletedIdempotencyRecords(mockStore, 90, true, nowMs);
    expect(dryRunRes.success).toBe(true);
    expect(dryRunRes.dryRun).toBe(true);
    expect(dryRunRes.scannedCount).toBe(9);
    expect(dryRunRes.matchingCount).toBe(8);
    expect(dryRunRes.prunedCount).toBe(3);
    expect(dryRunRes.preservedCount).toBe(5);
    expect(dryRunRes.activeIntentsPreservedCount).toBe(2);
    expect(dryRunRes.prunedKeys).toEqual(['renewal_idemp_old_1', 'payment_idemp_old_2', 'payment_void_old_3']);
    // Ensure mockStore was NOT mutated in dryRun
    expect(Object.keys(mockStore._data).length).toBe(9);

    // 2. Live execution test
    const liveRes = IdempotencyRetention.pruneCompletedIdempotencyRecords(mockStore, 90, false, nowMs);
    expect(liveRes.success).toBe(true);
    expect(liveRes.dryRun).toBe(false);
    expect(liveRes.prunedCount).toBe(3);
    expect(liveRes.preservedCount).toBe(5);
    expect(liveRes.activeIntentsPreservedCount).toBe(2);

    // Verify pruned keys are deleted
    expect(mockStore.getProperty('renewal_idemp_old_1')).toBeNull();
    expect(mockStore.getProperty('payment_idemp_old_2')).toBeNull();
    expect(mockStore.getProperty('payment_void_old_3')).toBeNull();

    // Verify preserved keys remain intact
    expect(mockStore.getProperty('renewal_idemp_started_4')).not.toBeNull();
    expect(mockStore.getProperty('payment_idemp_started_5')).not.toBeNull();
    expect(mockStore.getProperty('renewal_idemp_recent_6')).not.toBeNull();
    expect(mockStore.getProperty('payment_idemp_recent_7')).not.toBeNull();
    expect(mockStore.getProperty('renewal_idemp_corrupt_8')).not.toBeNull();
    expect(mockStore.getProperty('SYSTEM_SCHEMA_VERSION')).toBe('1.0.0');
  });

  it('15. Exact payment recovery distinguishing two identical legitimate payments on the same date', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Identical Recovery Student', parent_name: 'P IR', parent_phone: '+91 9999000015', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;
    const paymentDate = '2026-11-14';
    const amount = 2000;

    const payloadAlpha = {
      student_id: sid,
      amount: amount,
      currency: 'INR',
      payment_date: paymentDate,
      idempotency_key: 'pay_key_alpha'
    };

    const payloadBeta = {
      student_id: sid,
      amount: amount,
      currency: 'INR',
      payment_date: paymentDate,
      idempotency_key: 'pay_key_beta'
    };

    const durableStore = PaymentService._getPayDurableStore();
    const origSet = durableStore.setProperty;

    // Transaction 1 (Alpha): Intent succeeds, row inserted, completion save fails
    let callCount = 0;
    durableStore.setProperty = (k: string, v: string) => {
      callCount++;
      if (callCount === 1) return origSet.call(durableStore, k, v);
      throw new Error('Durable completion write failure for Alpha');
    };

    try {
      const resAlpha1 = PaymentService.Payments_record(spreadsheet, payloadAlpha, adminActor);
      expect(resAlpha1.success).toBe(false);
      expect(resAlpha1.code).toBe('DURABLE_PERSIST_FAILED');
    } finally {
      durableStore.setProperty = origSet;
    }

    // Transaction 2 (Beta): Intent succeeds, row inserted, completion save fails
    callCount = 0;
    durableStore.setProperty = (k: string, v: string) => {
      callCount++;
      if (callCount === 1) return origSet.call(durableStore, k, v);
      throw new Error('Durable completion write failure for Beta');
    };

    try {
      const resBeta1 = PaymentService.Payments_record(spreadsheet, payloadBeta, adminActor);
      expect(resBeta1.success).toBe(false);
      expect(resBeta1.code).toBe('DURABLE_PERSIST_FAILED');
    } finally {
      durableStore.setProperty = origSet;
    }

    // At this point, exactly 2 rows have been inserted into Payments sheet
    const sheet = spreadsheet.getSheetByName('Payments');
    const rows = sheet.getData ? sheet.getData() : sheet.getDataRange().getValues();
    const stuRows = rows.slice(1).filter((r: any[]) => r[0] === sid);
    expect(stuRows.length).toBe(2);

    // Simulate cold restart: clear all in-memory caches
    // @ts-ignore
    globalThis.__paymentMemoryCache = {};

    // Retry Transaction 1 (Alpha) independently
    const retryAlpha = PaymentService.Payments_record(spreadsheet, payloadAlpha, adminActor);
    expect(retryAlpha.success).toBe(true);
    expect(retryAlpha.meta?.idempotentRetry).toBe(true);
    expect(retryAlpha.data.pre_insert_count).toBe(0);
    expect(retryAlpha.data.claimed_match_index).toBe(0);

    // Simulate cold restart: clear all in-memory caches
    // @ts-ignore
    globalThis.__paymentMemoryCache = {};

    // Retry Transaction 2 (Beta) independently
    const retryBeta = PaymentService.Payments_record(spreadsheet, payloadBeta, adminActor);
    expect(retryBeta.success).toBe(true);
    expect(retryBeta.meta?.idempotentRetry).toBe(true);
    expect(retryBeta.data.pre_insert_count).toBe(1);
    expect(retryBeta.data.claimed_match_index).toBe(1);

    // CRUCIAL ASSERTION: Payments sheet has EXACTLY 2 rows (neither retry created a duplicate)
    const finalRows = (sheet.getData ? sheet.getData() : sheet.getDataRange().getValues()).slice(1).filter((r: any[]) => r[0] === sid);
    expect(finalRows.length).toBe(2);

    // Assert neither transaction stole or confused the other's payment identity
    expect(retryAlpha.data.idempotency_key).toBe('pay_key_alpha');
    expect(retryBeta.data.idempotency_key).toBe('pay_key_beta');
    expect(retryAlpha.data.payment_id).not.toBe(retryBeta.data.payment_id);
  });

  it('16. Interruption before row insertion does not falsely claim existing row', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Pre-Crash Student', parent_name: 'P PC', parent_phone: '+91 9999000016', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;
    const paymentDate = '2026-11-14';
    const amount = 1500;

    // Simulate Payment 1 writing intent with pre_insert_count: 0, then crashing before Payments_insert
    const durableStore = PaymentService._getPayDurableStore();
    durableStore.setProperty('payment_idemp_key_crashed', JSON.stringify({
      student_id: sid,
      amount: amount,
      currency: 'INR',
      payment_date: paymentDate,
      status: 'STARTED',
      created_at: new Date().toISOString(),
      pre_insert_count: 0
    }));

    // When key_crashed retries, matching rows count in sheet is 0 (0 <= pre_insert_count: 0)
    // Thus it detects its row was never inserted, proceeds to insert, and completes cleanly
    const retryCrashed = PaymentService.Payments_record(spreadsheet, {
      student_id: sid,
      amount: amount,
      currency: 'INR',
      payment_date: paymentDate,
      idempotency_key: 'key_crashed'
    }, adminActor);

    expect(retryCrashed.success).toBe(true);

    const sheet = spreadsheet.getSheetByName('Payments');
    const finalRows = (sheet.getData ? sheet.getData() : sheet.getDataRange().getValues()).slice(1).filter((r: any[]) => r[0] === sid);
    expect(finalRows.length).toBe(1);
    expect(Number(finalRows[0][3])).toBe(1500);
  });

  it('17. Retention cleanup defaults to disabled/dry-run and preserves all STARTED and unparseable records', () => {
    const mockStore: any = {
      _data: {
        'renewal_idemp_old': JSON.stringify({ outcome: 'SUCCESS', timestamp: '2026-01-01T00:00:00Z' }),
        'payment_idemp_started': JSON.stringify({ status: 'STARTED', timestamp: '2026-01-01T00:00:00Z' }),
        'payment_idemp_corrupt': '{ corrupt json ...'
      },
      getProperty: function(k: string) { return this._data[k] || null; },
      setProperty: function(k: string, v: string) { this._data[k] = String(v); },
      deleteProperty: function(k: string) { delete this._data[k]; },
      getProperties: function() { return Object.assign({}, this._data); }
    };

    // Invocation without dryRun argument MUST default to dryRun: true (disabled by default)
    const result = IdempotencyRetention.pruneCompletedIdempotencyRecords(mockStore, 90);
    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.prunedCount).toBe(1);
    expect(result.preservedCount).toBe(2);
    expect(result.activeIntentsPreservedCount).toBe(1);

    // Verify ZERO mutations occurred in store
    expect(Object.keys(mockStore._data).length).toBe(3);
    expect(mockStore.getProperty('renewal_idemp_old')).not.toBeNull();
  });

  it('18. Compact tombstone protects against stale-replay after pruning across cold restarts', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Tombstone Student', parent_name: 'P TS', parent_phone: '+91 9999000018', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;
    const nowMs = Date.parse('2026-11-14T12:00:00Z');

    // Setup durable store with completed payment and renewal records
    const durableStore = PaymentService._getPayDurableStore();
    const payKey = 'pay_tombstone_key_01';
    durableStore.setProperty('payment_idemp_' + payKey, JSON.stringify({
      student_id: sid,
      amount: 5000,
      currency: 'INR',
      status: 'RECORDED',
      recorded_at: '2026-06-01T00:00:00Z' // 166 days old
    }));

    // Compact records into permanent tombstones
    const pruneRes = IdempotencyRetention.pruneCompletedIdempotencyRecords(durableStore, 90, false, nowMs, { compact: true });
    expect(pruneRes.success).toBe(true);
    expect(pruneRes.compactMode).toBe(true);
    expect(pruneRes.prunedCount).toBe(1);

    // Verify property was compacted to tombstone (not deleted)
    const tombVal = JSON.parse(durableStore.getProperty('payment_idemp_' + payKey));
    expect(tombVal.tombstone).toBe(true);
    expect(tombVal.status).toBe('COMPLETED');

    // Simulate cold restart: clear in-memory caches
    // @ts-ignore
    globalThis.__paymentMemoryCache = {};

    // Attempt stale replay with payKey -> must be recognized as idempotent completion and NOT insert row
    const replayRes = PaymentService.Payments_record(spreadsheet, {
      student_id: sid,
      amount: 5000,
      currency: 'INR',
      idempotency_key: payKey
    }, adminActor);

    expect(replayRes.success).toBe(true);
    expect(replayRes.meta?.idempotentRetry).toBe(true);
    expect(replayRes.meta?.tombstone).toBe(true);

    // Payments sheet has 0 rows inserted from this replayed transaction
    const sheet = spreadsheet.getSheetByName('Payments');
    const rows = (sheet.getData ? sheet.getData() : sheet.getDataRange().getValues()).slice(1).filter((r: any[]) => r[0] === sid);
    expect(rows.length).toBe(0);

    // Fresh legitimate transaction with a new key executes normally and inserts exactly 1 row
    const freshRes = PaymentService.Payments_record(spreadsheet, {
      student_id: sid,
      amount: 5000,
      currency: 'INR',
      idempotency_key: 'pay_fresh_key_02'
    }, adminActor);

    expect(freshRes.success).toBe(true);
    const updatedRows = (sheet.getData ? sheet.getData() : sheet.getDataRange().getValues()).slice(1).filter((r: any[]) => r[0] === sid);
    expect(updatedRows.length).toBe(1);
    expect(Number(updatedRows[0][3])).toBe(5000);
  });

  it('19. Sheet ordering changes: reordered identical rows still recover distinctly without duplication', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Reorder Student', parent_name: 'P RO', parent_phone: '+91 9999000019', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;
    const paymentDate = '2026-11-14';
    const amount = 3500;

    const payloadAlpha = { student_id: sid, amount, currency: 'INR', payment_date: paymentDate, idempotency_key: 'reorder_alpha' };
    const payloadBeta = { student_id: sid, amount, currency: 'INR', payment_date: paymentDate, idempotency_key: 'reorder_beta' };

    const durableStore = PaymentService._getPayDurableStore();
    const origSet = durableStore.setProperty;

    // Alpha inserts, completion fails
    let count = 0;
    durableStore.setProperty = (k: string, v: string) => {
      count++;
      if (count === 1) return origSet.call(durableStore, k, v);
      throw new Error('Alpha completion failed');
    };
    try {
      PaymentService.Payments_record(spreadsheet, payloadAlpha, adminActor);
    } finally {
      durableStore.setProperty = origSet;
    }

    // Beta inserts, completion fails
    count = 0;
    durableStore.setProperty = (k: string, v: string) => {
      count++;
      if (count === 1) return origSet.call(durableStore, k, v);
      throw new Error('Beta completion failed');
    };
    try {
      PaymentService.Payments_record(spreadsheet, payloadBeta, adminActor);
    } finally {
      durableStore.setProperty = origSet;
    }

    // Swap the order of rows in the Payments sheet
    const sheet = spreadsheet.getSheetByName('Payments');
    const rows = sheet.getData ? sheet.getData() : sheet.getDataRange().getValues();
    // Swap the two rows
    const lastRowIdx = rows.length - 1;
    const prevRowIdx = rows.length - 2;
    const tmp = rows[lastRowIdx];
    rows[lastRowIdx] = rows[prevRowIdx];
    rows[prevRowIdx] = tmp;

    // Simulate cold restart
    // @ts-ignore
    globalThis.__paymentMemoryCache = {};

    // Both retries execute
    const resA = PaymentService.Payments_record(spreadsheet, payloadAlpha, adminActor);
    expect(resA.success).toBe(true);
    expect(resA.meta?.idempotentRetry).toBe(true);

    // @ts-ignore
    globalThis.__paymentMemoryCache = {};
    const resB = PaymentService.Payments_record(spreadsheet, payloadBeta, adminActor);
    expect(resB.success).toBe(true);
    expect(resB.meta?.idempotentRetry).toBe(true);

    // Still exactly 2 rows in sheet
    const finalRows = (sheet.getData ? sheet.getData() : sheet.getDataRange().getValues()).slice(1).filter((r: any[]) => r[0] === sid);
    expect(finalRows.length).toBe(2);
    expect(resA.data.payment_id).not.toBe(resB.data.payment_id);
  });

  it('20. Row deletion: out-of-band deletion makes recovery ambiguous and fails closed', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Delete Ambiguity Student', parent_name: 'P DA', parent_phone: '+91 9999000020', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;
    const paymentDate = '2026-11-14';
    const amount = 2200;

    const payloadAlpha = { student_id: sid, amount, currency: 'INR', payment_date: paymentDate, idempotency_key: 'del_alpha' };
    const payloadBeta = { student_id: sid, amount, currency: 'INR', payment_date: paymentDate, idempotency_key: 'del_beta' };

    const durableStore = PaymentService._getPayDurableStore();
    const origSet = durableStore.setProperty;

    // Alpha inserts, completion fails
    let count = 0;
    durableStore.setProperty = (k: string, v: string) => {
      count++;
      if (count === 1) return origSet.call(durableStore, k, v);
      throw new Error('Alpha completion failed');
    };
    try {
      PaymentService.Payments_record(spreadsheet, payloadAlpha, adminActor);
    } finally {
      durableStore.setProperty = origSet;
    }

    // Beta inserts, completion fails
    count = 0;
    durableStore.setProperty = (k: string, v: string) => {
      count++;
      if (count === 1) return origSet.call(durableStore, k, v);
      throw new Error('Beta completion failed');
    };
    try {
      PaymentService.Payments_record(spreadsheet, payloadBeta, adminActor);
    } finally {
      durableStore.setProperty = origSet;
    }

    // Out-of-band mutation: Administrator deletes one of the matching rows directly in the sheet!
    const sheet = spreadsheet.getSheetByName('Payments');
    if (typeof sheet.deleteRow === 'function') {
      sheet.deleteRow(sheet.rows ? sheet.rows.length : 2);
    }

    // Simulate cold restart
    // @ts-ignore
    globalThis.__paymentMemoryCache = {};

    // When retry occurs, the system detects fewer rows than registered transactions for this tuple
    // It MUST FAIL CLOSED with AMBIGUOUS_RECOVERY to prevent falsely claiming another payment!
    const resA = PaymentService.Payments_record(spreadsheet, payloadAlpha, adminActor);
    expect(resA.success).toBe(false);
    expect(resA.code).toBe('AMBIGUOUS_RECOVERY');
  });

  it('21. Renewal tombstone preserves fingerprint: identical retry succeeds, altered payload is rejected', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Renewal Tombstone Student', parent_name: 'P RT', parent_phone: '+91 9999000021', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', package_price: 10000
    }, adminActor);

    const renKey = 'renewal_tombstone_fp_01';
    const payload = {
      student_id: sid,
      new_classes_purchased: 10,
      currency: 'INR',
      package_price: 10000,
      idempotency_key: renKey,
      start_date: '2026-11-15'
    };

    // 1. Initial renewal succeeds
    const renRes = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
    expect(renRes.success).toBe(true);
    expect(renRes.data.cumulative_purchased).toBe(20);

    // 2. Compact detailed renewal record into a tombstone
    const ds = RenewalIdempotency._getDurableStore();
    const pruneRes = IdempotencyRetention.pruneCompletedIdempotencyRecords(ds, 0, false, Date.now() + 1000, { compact: true });
    expect(pruneRes.success).toBe(true);
    expect(pruneRes.compactMode).toBe(true);

    // Verify tombstone preserved fingerprint
    const tomb = JSON.parse(ds.getProperty('renewal_idemp_' + renKey));
    expect(tomb.tombstone).toBe(true);
    expect(tomb.new_classes).toBe(10);
    expect(tomb.package_price).toBe(10000);

    // 3. Cold restart
    // @ts-ignore
    globalThis.__renewalIdempCache = {};

    // 4. Identical retry returns idempotent success
    const retryRes = RenewalService.Packages_renew(spreadsheet, payload, adminActor);
    expect(retryRes.success).toBe(true);
    expect(retryRes.meta?.idempotentRetry).toBe(true);

    // Package purchased classes remains 20 (no mutation)
    const pkg = PackageRepository.Packages_getById(spreadsheet, sid);
    expect(pkg.classes_purchased).toBe(20);

    // 5. Modified payload with same key (e.g. 20 classes instead of 10) MUST BE REJECTED
    const conflictRes = RenewalService.Packages_renew(spreadsheet, Object.assign({}, payload, { new_classes_purchased: 20 }), adminActor);
    expect(conflictRes.success).toBe(false);
    expect(conflictRes.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('22. Payment tombstone preserves fingerprint: identical retry succeeds, altered payload is rejected', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Payment Tombstone Student', parent_name: 'P PT', parent_phone: '+91 9999000022', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;

    const payKey = 'payment_tombstone_fp_02';
    const payload = {
      student_id: sid,
      amount: 4000,
      currency: 'INR',
      payment_date: '2026-11-14',
      idempotency_key: payKey
    };

    // 1. Initial payment succeeds
    const payRes = PaymentService.Payments_record(spreadsheet, payload, adminActor);
    expect(payRes.success).toBe(true);

    // 2. Compact payment record into tombstone
    const ds = PaymentService._getPayDurableStore();
    IdempotencyRetention.pruneCompletedIdempotencyRecords(ds, 0, false, Date.now() + 1000, { compact: true });

    // 3. Cold restart
    // @ts-ignore
    globalThis.__paymentMemoryCache = {};

    // 4. Identical retry returns idempotent success
    const retryRes = PaymentService.Payments_record(spreadsheet, payload, adminActor);
    expect(retryRes.success).toBe(true);
    expect(retryRes.meta?.idempotentRetry).toBe(true);

    // 5. Modified payload with same key (e.g. amount: 9000 instead of 4000) MUST BE REJECTED
    const conflictRes = PaymentService.Payments_record(spreadsheet, Object.assign({}, payload, { amount: 9000 }), adminActor);
    expect(conflictRes.success).toBe(false);
    expect(conflictRes.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('23. LockManager fail-closed behavior: 7 comprehensive safety test cases', () => {
    const LockManager = require('../../02-backend/apps-script/sheets/LockManager.gs');
    const origLS = (globalThis as any).LockService;

    // Case 1: LockService unavailable
    try {
      delete (globalThis as any).LockService;
      let executed = false;
      const res = LockManager.withLock(5000, () => { executed = true; });
      expect(res.success).toBe(false);
      expect(res.code).toBe('LOCK_UNAVAILABLE');
      expect(res.message).toContain('LockService is not available');
      expect(executed).toBe(false);
    } finally {
      (globalThis as any).LockService = origLS;
    }

    // Case 2: getScriptLock unavailable
    try {
      (globalThis as any).LockService = {};
      let executed = false;
      const res = LockManager.withLock(5000, () => { executed = true; });
      expect(res.success).toBe(false);
      expect(res.code).toBe('LOCK_UNAVAILABLE');
      expect(res.message).toContain('LockService.getScriptLock is not available');
      expect(executed).toBe(false);
    } finally {
      (globalThis as any).LockService = origLS;
    }

    // Case 3: tryLock returns false
    try {
      (globalThis as any).LockService = {
        getScriptLock: () => ({
          tryLock: () => false,
          releaseLock: () => {}
        })
      };
      let executed = false;
      const res = LockManager.withLock(5000, () => { executed = true; });
      expect(res.success).toBe(false);
      expect(res.code).toBe('CONFLICT');
      expect(res.message).toContain('Could not acquire script lock');
      expect(executed).toBe(false);
    } finally {
      (globalThis as any).LockService = origLS;
    }

    // Case 4: tryLock throws
    try {
      (globalThis as any).LockService = {
        getScriptLock: () => ({
          tryLock: () => { throw new Error('Underlying lock acquisition exception'); },
          releaseLock: () => {}
        })
      };
      let executed = false;
      const res = LockManager.withLock(5000, () => { executed = true; });
      expect(res.success).toBe(false);
      expect(res.code).toBe('CONFLICT');
      expect(res.message).toContain('Exception during tryLock');
      expect(executed).toBe(false);
    } finally {
      (globalThis as any).LockService = origLS;
    }

    // Case 5: Nested successful acquisition
    let releaseCalls = 0;
    let tryLockCalls = 0;
    try {
      (globalThis as any).LockService = {
        getScriptLock: () => ({
          tryLock: () => { tryLockCalls++; return true; },
          releaseLock: () => { releaseCalls++; }
        })
      };
      const outerRes = LockManager.withLock(5000, () => {
        expect(LockManager._getLockDepth()).toBe(1);
        const innerRes = LockManager.withLock(5000, () => {
          expect(LockManager._getLockDepth()).toBe(2);
          return 'inner_success';
        });
        expect(innerRes.success).toBe(true);
        expect(innerRes.result).toBe('inner_success');
        expect(releaseCalls).toBe(0); // Not released while inner exits
        return 'outer_success';
      });
      expect(outerRes.success).toBe(true);
      expect(outerRes.result).toBe('outer_success');
      expect(LockManager._getLockDepth()).toBe(0);
      expect(tryLockCalls).toBe(1); // ScriptLock acquired exactly once
      expect(releaseCalls).toBe(1); // ScriptLock released exactly once
    } finally {
      (globalThis as any).LockService = origLS;
    }

    // Case 6: Exception inside nested action
    let nestedReleaseCalls = 0;
    try {
      (globalThis as any).LockService = {
        getScriptLock: () => ({
          tryLock: () => true,
          releaseLock: () => { nestedReleaseCalls++; }
        })
      };
      expect(LockManager._getLockDepth()).toBe(0);
      const outerRes = LockManager.withLock(5000, () => {
        const innerRes = LockManager.withLock(5000, () => {
          throw new Error('Nested action error');
        });
        expect(innerRes.success).toBe(false);
        expect(innerRes.code).toBe('EXECUTION_ERROR');
        expect(LockManager._getLockDepth()).toBe(1);
        return 'outer_recovered';
      });
      expect(outerRes.success).toBe(true);
      expect(LockManager._getLockDepth()).toBe(0);
      expect(nestedReleaseCalls).toBe(1);
    } finally {
      (globalThis as any).LockService = origLS;
    }

    // Case 7: Exception during release
    try {
      (globalThis as any).LockService = {
        getScriptLock: () => ({
          tryLock: () => true,
          releaseLock: () => { throw new Error('ScriptLock release failure'); }
        })
      };
      const res = LockManager.withLock(5000, () => {
        return 'action_result';
      });
      expect(res.success).toBe(false);
      expect(res.code).toBe('LOCK_RELEASE_ERROR');
      expect(res.message).toContain('Exception during lock release');
      expect(LockManager._getLockDepth()).toBe(0);
    } finally {
      (globalThis as any).LockService = origLS;
    }
  });

  it('24. Complete canonical fingerprint matrix: renewals & payments before and after tombstone compaction', () => {
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Matrix Student', parent_name: 'P MS', parent_phone: '+91 9999000025', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;
    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', package_price: 10000
    }, adminActor);

    // -------------------------------------------------------------
    // PART A: RENEWAL FINGERPRINT MATRIX
    // -------------------------------------------------------------
    const renKey = 'matrix_ren_key_01';
    const baseRenPayload = {
      student_id: sid,
      new_classes_purchased: 10,
      package_price: 10000,
      currency: 'INR',
      schedule_key: 'MONDAY@10:00-11:00',
      start_date: '2026-11-15',
      payment: {
        amount: 10000,
        currency: 'INR',
        record_payment: true,
        payment_date: '2026-11-15'
      },
      idempotency_key: renKey
    };

    // Initial renewal execution
    const initRen = RenewalService.Packages_renew(spreadsheet, baseRenPayload, adminActor);
    expect(initRen.success).toBe(true);

    // 1. Equivalent representations (MUST SUCCEED)
    // - Currency: lowercase, whitespace-padded (' inr ')
    // - Date: ISO full timestamp vs YYYY-MM-DD
    const equivRenPayload = Object.assign({}, baseRenPayload, {
      currency: ' inr ',
      start_date: '2026-11-15T00:00:00.000Z',
      payment: Object.assign({}, baseRenPayload.payment, { currency: 'inr' })
    });
    const equivRen = RenewalService.Packages_renew(spreadsheet, equivRenPayload, adminActor);
    expect(equivRen.success).toBe(true);
    expect(equivRen.meta?.idempotentRetry).toBe(true);

    // 2. Conflicting representations (MUST RETURN IDEMPOTENCY_CONFLICT)
    // - Different student_id (populated string vs different student)
    const confStu = RenewalService.Packages_renew(spreadsheet, Object.assign({}, baseRenPayload, { student_id: 'STU_OTHER' }), adminActor);
    expect(confStu.success).toBe(false);
    expect(confStu.code).toBe('IDEMPOTENCY_CONFLICT');

    // - student_id omitted / empty string / whitespace tested against fingerprint comparator
    const confStuEmpty = RenewalIdempotency._checkRenewalIdempotency(spreadsheet, renKey, Object.assign({}, baseRenPayload, { student_id: '   ' }));
    expect(confStuEmpty.mismatch).toBe(true);
    expect(confStuEmpty.code).toBe('IDEMPOTENCY_CONFLICT');

    // - new_classes altered (12 instead of 10)
    const confClasses = RenewalService.Packages_renew(spreadsheet, Object.assign({}, baseRenPayload, { new_classes_purchased: 12 }), adminActor);
    expect(confClasses.success).toBe(false);
    expect(confClasses.code).toBe('IDEMPOTENCY_CONFLICT');

    // - package_price altered (zero vs positive)
    const confPriceZero = RenewalService.Packages_renew(spreadsheet, Object.assign({}, baseRenPayload, { package_price: 0 }), adminActor);
    expect(confPriceZero.success).toBe(false);
    expect(confPriceZero.code).toBe('IDEMPOTENCY_CONFLICT');

    // - package_price null
    const confPriceNull = RenewalService.Packages_renew(spreadsheet, Object.assign({}, baseRenPayload, { package_price: null }), adminActor);
    expect(confPriceNull.success).toBe(false);
    expect(confPriceNull.code).toBe('IDEMPOTENCY_CONFLICT');

    // - currency altered ('USD' vs 'INR')
    const confCurUSD = RenewalService.Packages_renew(spreadsheet, Object.assign({}, baseRenPayload, { currency: 'USD' }), adminActor);
    expect(confCurUSD.success).toBe(false);
    expect(confCurUSD.code).toBe('IDEMPOTENCY_CONFLICT');

    // - start_date altered
    const confStartDate = RenewalService.Packages_renew(spreadsheet, Object.assign({}, baseRenPayload, { start_date: '2026-11-20' }), adminActor);
    expect(confStartDate.success).toBe(false);
    expect(confStartDate.code).toBe('IDEMPOTENCY_CONFLICT');

    // - record_payment toggled to false (when original had payment recorded)
    const confRecPayFalse = RenewalService.Packages_renew(spreadsheet, Object.assign({}, baseRenPayload, {
      payment: { amount: 0, record_payment: false }
    }), adminActor);
    expect(confRecPayFalse.success).toBe(false);
    expect(confRecPayFalse.code).toBe('IDEMPOTENCY_CONFLICT');

    // - payment omitted entirely (when original had payment recorded)
    const confPayOmitted = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 10,
      package_price: 10000,
      currency: 'INR',
      start_date: '2026-11-15',
      idempotency_key: renKey
    }, adminActor);
    expect(confPayOmitted.success).toBe(false);
    expect(confPayOmitted.code).toBe('IDEMPOTENCY_CONFLICT');

    // - payment_amount altered (8000 vs 10000)
    const confPayAmt = RenewalService.Packages_renew(spreadsheet, Object.assign({}, baseRenPayload, {
      payment: Object.assign({}, baseRenPayload.payment, { amount: 8000 })
    }), adminActor);
    expect(confPayAmt.success).toBe(false);
    expect(confPayAmt.code).toBe('IDEMPOTENCY_CONFLICT');

    // - payment_date altered
    const confPayDate = RenewalService.Packages_renew(spreadsheet, Object.assign({}, baseRenPayload, {
      payment: Object.assign({}, baseRenPayload.payment, { payment_date: '2026-11-20' })
    }), adminActor);
    expect(confPayDate.success).toBe(false);
    expect(confPayDate.code).toBe('IDEMPOTENCY_CONFLICT');

    // -------------------------------------------------------------
    // Compact renewal to tombstone and test post-compaction & cold restart
    // -------------------------------------------------------------
    const renDs = RenewalIdempotency._getDurableStore();
    IdempotencyRetention.pruneCompletedIdempotencyRecords(renDs, 0, false, Date.now() + 1000, { compact: true });
    // @ts-ignore
    globalThis.__renewalIdempCache = {};

    // Post-compaction: identical replay succeeds with tombstone
    const postCompactionRen = RenewalService.Packages_renew(spreadsheet, baseRenPayload, adminActor);
    expect(postCompactionRen.success).toBe(true);
    expect(postCompactionRen.meta?.idempotentRetry).toBe(true);

    // Post-compaction: equivalent representations still succeed
    const postCompactionEquiv = RenewalService.Packages_renew(spreadsheet, equivRenPayload, adminActor);
    expect(postCompactionEquiv.success).toBe(true);
    expect(postCompactionEquiv.meta?.idempotentRetry).toBe(true);

    // Post-compaction: conflicts are still rejected with IDEMPOTENCY_CONFLICT across all fields
    const postCompactionConfClasses = RenewalService.Packages_renew(spreadsheet, Object.assign({}, baseRenPayload, { new_classes_purchased: 99 }), adminActor);
    expect(postCompactionConfClasses.success).toBe(false);
    expect(postCompactionConfClasses.code).toBe('IDEMPOTENCY_CONFLICT');

    const postCompactionConfPrice = RenewalService.Packages_renew(spreadsheet, Object.assign({}, baseRenPayload, { package_price: 20000 }), adminActor);
    expect(postCompactionConfPrice.success).toBe(false);
    expect(postCompactionConfPrice.code).toBe('IDEMPOTENCY_CONFLICT');

    const postCompactionConfCur = RenewalService.Packages_renew(spreadsheet, Object.assign({}, baseRenPayload, { currency: 'USD' }), adminActor);
    expect(postCompactionConfCur.success).toBe(false);
    expect(postCompactionConfCur.code).toBe('IDEMPOTENCY_CONFLICT');

    // -------------------------------------------------------------
    // PART B: PAYMENT FINGERPRINT MATRIX
    // -------------------------------------------------------------
    const payKey = 'matrix_pay_key_01';
    const basePayPayload = {
      student_id: sid,
      amount: 4500,
      currency: 'INR',
      payment_date: '2026-11-15',
      idempotency_key: payKey
    };

    // Initial payment execution
    const initPay = PaymentService.Payments_record(spreadsheet, basePayPayload, adminActor);
    expect(initPay.success).toBe(true);

    // 1. Equivalent representations (MUST SUCCEED)
    // - Omitted currency defaults canonically to INR
    // - Whitespace in currency
    const equivPay = PaymentService.Payments_record(spreadsheet, {
      student_id: sid,
      amount: 4500,
      currency: '  inr  ',
      payment_date: '2026-11-15',
      idempotency_key: payKey
    }, adminActor);
    expect(equivPay.success).toBe(true);
    expect(equivPay.meta?.idempotentRetry).toBe(true);

    // 2. Conflicting representations (MUST RETURN IDEMPOTENCY_CONFLICT)
    // - Different student_id (populated string)
    const confPayStu = PaymentService.Payments_record(spreadsheet, Object.assign({}, basePayPayload, { student_id: 'STU_DIFFERENT' }), adminActor);
    expect(confPayStu.success).toBe(false);
    expect(confPayStu.code).toBe('IDEMPOTENCY_CONFLICT');

    // - amount altered (positive numeric: 5000 vs 4500)
    const confPayDiffAmt = PaymentService.Payments_record(spreadsheet, Object.assign({}, basePayPayload, { amount: 5000 }), adminActor);
    expect(confPayDiffAmt.success).toBe(false);
    expect(confPayDiffAmt.code).toBe('IDEMPOTENCY_CONFLICT');

    // - amount zero fails validation closed
    const confPayZero = PaymentService.Payments_record(spreadsheet, Object.assign({}, basePayPayload, { amount: 0 }), adminActor);
    expect(confPayZero.success).toBe(false);
    expect(confPayZero.code).toBe('VALIDATION_ERROR');

    // - currency altered ('USD' vs 'INR')
    const confPayCurUSD = PaymentService.Payments_record(spreadsheet, Object.assign({}, basePayPayload, { currency: 'USD' }), adminActor);
    expect(confPayCurUSD.success).toBe(false);
    expect(confPayCurUSD.code).toBe('IDEMPOTENCY_CONFLICT');

    // - payment_date altered
    const confPayDateAlt = PaymentService.Payments_record(spreadsheet, Object.assign({}, basePayPayload, { payment_date: '2026-11-20' }), adminActor);
    expect(confPayDateAlt.success).toBe(false);
    expect(confPayDateAlt.code).toBe('IDEMPOTENCY_CONFLICT');

    // -------------------------------------------------------------
    // Compact payment to tombstone and test post-compaction & cold restart
    // -------------------------------------------------------------
    const payDs = PaymentService._getPayDurableStore();
    IdempotencyRetention.pruneCompletedIdempotencyRecords(payDs, 0, false, Date.now() + 1000, { compact: true });
    // @ts-ignore
    globalThis.__paymentMemoryCache = {};

    // Post-compaction: identical replay succeeds with tombstone
    const postCompactionPay = PaymentService.Payments_record(spreadsheet, basePayPayload, adminActor);
    expect(postCompactionPay.success).toBe(true);
    expect(postCompactionPay.meta?.idempotentRetry).toBe(true);

    // Post-compaction: altered amount is rejected with IDEMPOTENCY_CONFLICT
    const postCompactionPayConflict = PaymentService.Payments_record(spreadsheet, Object.assign({}, basePayPayload, { amount: 9999 }), adminActor);
    expect(postCompactionPayConflict.success).toBe(false);
    expect(postCompactionPayConflict.code).toBe('IDEMPOTENCY_CONFLICT');

    const postCompactionPayCurConflict = PaymentService.Payments_record(spreadsheet, Object.assign({}, basePayPayload, { currency: 'EUR' }), adminActor);
    expect(postCompactionPayCurConflict.success).toBe(false);
    expect(postCompactionPayCurConflict.code).toBe('IDEMPOTENCY_CONFLICT');

    // -------------------------------------------------------------
    // PART C: OMITTED PAYMENT vs RECORD_PAYMENT=FALSE WHERE NO PAYMENT RECORDED
    // -------------------------------------------------------------
    const renNoPayKey = 'matrix_ren_no_pay_01';
    const noPayPayload = {
      student_id: sid,
      new_classes_purchased: 5,
      package_price: 5000,
      currency: 'INR',
      start_date: '2026-11-15',
      idempotency_key: renNoPayKey
    };

    const initNoPay = RenewalService.Packages_renew(spreadsheet, noPayPayload, adminActor);
    expect(initNoPay.success).toBe(true);

    // Replay with record_payment: false and amount: 0 MUST SUCCEED as equivalent
    const replayNoPayFalse = RenewalService.Packages_renew(spreadsheet, Object.assign({}, noPayPayload, {
      payment: { amount: 0, record_payment: false }
    }), adminActor);
    expect(replayNoPayFalse.success).toBe(true);
    expect(replayNoPayFalse.meta?.idempotentRetry).toBe(true);

    // Replay with positive payment amount (e.g. 5000) MUST FAIL with IDEMPOTENCY_CONFLICT
    const replayNoPayPositive = RenewalService.Packages_renew(spreadsheet, Object.assign({}, noPayPayload, {
      payment: { amount: 5000, record_payment: true }
    }), adminActor);
    expect(replayNoPayPositive.success).toBe(false);
    expect(replayNoPayPositive.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('25. Lock release failure recovery: payment and renewal retry safely after LOCK_RELEASE_ERROR', () => {
    const origLS = (globalThis as any).LockService;
    const stu = StudentService.Students_create(spreadsheet, {
      student_name: 'Release Recovery Student', parent_name: 'P RR', parent_phone: '+91 9999000026', status: 'ACTIVE', subject: 'Math'
    }, adminActor);
    const sid = stu.data.student_id;
    PackageService.Packages_create(spreadsheet, {
      student_id: sid, plan_type: 'Per Class', classes_purchased: 10, currency: 'INR', package_price: 10000
    }, adminActor);

    // 1. PAYMENT OPERATION: Mutation succeeds, completion persisted, releaseLock throws
    let paymentReleaseAttempts = 0;
    (globalThis as any).LockService = {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {
          paymentReleaseAttempts++;
          if (paymentReleaseAttempts === 1) {
            throw new Error('Google Apps Script transient release error on payment');
          }
        }
      })
    };

    const payKey = 'pay_lock_release_err_01';
    const payPayload = {
      student_id: sid,
      amount: 3000,
      currency: 'INR',
      payment_date: '2026-11-15',
      idempotency_key: payKey
    };

    // Caller receives LOCK_RELEASE_ERROR
    const payRes1 = PaymentService.Payments_record(spreadsheet, payPayload, adminActor);
    expect(payRes1.success).toBe(false);
    expect(payRes1.code).toBe('LOCK_RELEASE_ERROR');

    // Simulate cold restart
    // @ts-ignore
    globalThis.__paymentMemoryCache = {};

    // Retry the identical request with normal lock service
    (globalThis as any).LockService = origLS;
    const payRes2 = PaymentService.Payments_record(spreadsheet, payPayload, adminActor);
    expect(payRes2.success).toBe(true);
    expect(payRes2.meta?.idempotentRetry).toBe(true);

    // Verify NO duplicate payment row was inserted into the sheet
    const paySheet = spreadsheet.getSheetByName('Payments');
    const payRows = (paySheet.getData ? paySheet.getData() : paySheet.getDataRange().getValues()).slice(1).filter((r: any[]) => r[0] === sid);
    expect(payRows.length).toBe(1);

    // 2. RENEWAL OPERATION: Mutation succeeds, completion persisted, releaseLock throws
    let renewalReleaseAttempts = 0;
    (globalThis as any).LockService = {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {
          renewalReleaseAttempts++;
          if (renewalReleaseAttempts === 1) {
            throw new Error('Google Apps Script transient release error on renewal');
          }
        }
      })
    };

    const renKey = 'ren_lock_release_err_01';
    const renPayload = {
      student_id: sid,
      new_classes_purchased: 10,
      currency: 'INR',
      package_price: 10000,
      idempotency_key: renKey,
      start_date: '2026-11-16'
    };

    // Caller receives LOCK_RELEASE_ERROR
    const renRes1 = RenewalService.Packages_renew(spreadsheet, renPayload, adminActor);
    expect(renRes1.success).toBe(false);
    expect(renRes1.code).toBe('LOCK_RELEASE_ERROR');

    // Simulate cold restart
    // @ts-ignore
    globalThis.__renewalIdempCache = {};

    // Retry the identical request with normal lock service
    (globalThis as any).LockService = origLS;
    const renRes2 = RenewalService.Packages_renew(spreadsheet, renPayload, adminActor);
    expect(renRes2.success).toBe(true);
    expect(renRes2.meta?.idempotentRetry).toBe(true);

    // Verify package credits were NOT duplicated (10 initial + 10 renewed = 20, NOT 30)
    const pkg = PackageRepository.Packages_getById(spreadsheet, sid);
    expect(pkg.classes_purchased).toBe(20);
  });

  it('26. Mutation failure before completion persistence and lock release subsequently throws', () => {
    const origLS = (globalThis as any).LockService;
    const LockManager = require('../../02-backend/apps-script/sheets/LockManager.gs');

    let releaseAttempts = 0;
    (globalThis as any).LockService = {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {
          releaseAttempts++;
          throw new Error('Simulated releaseLock failure in infrastructure');
        }
      })
    };

    try {
      expect(LockManager._getLockDepth()).toBe(0);
      const res = LockManager.withLock(5000, () => {
        // Mutation throws before any completion state can be saved
        throw new Error('Database write constraint violation');
      });

      // When the action fails, LockManager prioritizes the primary action failure
      expect(res.success).toBe(false);
      expect(res.code).toBe('EXECUTION_ERROR');
      expect(res.message).toContain('Database write constraint violation');

      // Lock state is cleanly unwound
      expect(LockManager._getLockDepth()).toBe(0);
      expect(releaseAttempts).toBe(1);
    } finally {
      (globalThis as any).LockService = origLS;
    }
  });
});
