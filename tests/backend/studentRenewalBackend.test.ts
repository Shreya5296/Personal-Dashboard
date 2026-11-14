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
import RenewalService from '../../02-backend/apps-script/packages/RenewalService.gs';
// @ts-ignore
import ClassService from '../../02-backend/apps-script/classes/ClassService.gs';
// @ts-ignore
import ClassRepository from '../../02-backend/apps-script/classes/ClassRepository.gs';
// @ts-ignore
import PaymentService from '../../02-backend/apps-script/payments/PaymentService.gs';
// @ts-ignore
import PaymentRepository from '../../02-backend/apps-script/payments/PaymentRepository.gs';

describe('Student Renewal, Cumulative Credits, and Schedule Backend', () => {
  let spreadsheet: any;
  const actor = { actorId: 'usr_admin', email: 'ashreya0502@gmail.com', requestId: 'req_ren_001' };

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
  });

  it('Example A: Rollover with unused credits (12 purchased, 9 consumed, 3 remaining + 12 = 15)', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Aarav Student',
      parent_name: 'Priya',
      parent_phone: '+91 9876543210',
      subject: 'Math',
      status: 'ACTIVE'
    }, actor);
    const sid = s.data.student_id;

    // First package of 12 classes
    const p1 = PackageService.Packages_create(spreadsheet, {
      student_id: sid,
      plan_type: 'Per Class',
      classes_purchased: 12,
      currency: 'INR',
      package_price: 12000,
      start_date: '2026-06-01'
    }, actor);
    expect(p1.success).toBe(true);

    // Consume 9 classes
    for (let i = 1; i <= 9; i++) {
      const day = i < 10 ? `0${i}` : `${i}`;
      ClassService.Classes_schedule(spreadsheet, {
        student_id: sid,
        scheduled_start: `2026-06-${day}T10:00:00.000Z`,
        scheduled_end: `2026-06-${day}T11:00:00.000Z`,
        duration_minutes: 60
      }, actor);
      ClassService.Classes_complete(spreadsheet, {
        class_session_id: `${sid}__2026-06-${day}__10:00`,
        attendance_status: 'PRESENT',
        deduct_class: true
      }, actor);
    }

    // Renewal with 12 new classes
    const renewalRes = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 12,
      currency: 'INR',
      package_price: 12000,
      start_date: '2026-07-01',
      idempotency_key: 'idemp_backend_1'
    }, actor);

    expect(renewalRes.success).toBe(true);
    expect(renewalRes.data.previous_available_balance).toBe(3);
    expect(renewalRes.data.new_classes_purchased).toBe(12);
    expect(renewalRes.data.new_available_balance).toBe(15);
    expect(renewalRes.data.cumulative_purchased).toBe(24);
    expect(renewalRes.data.cumulative_consumed).toBe(9);
  });

  it('Example B: Renewal after exhaustion (12 purchased, 12 consumed, 0 remaining + 12 = 12)', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Bhavna Student',
      parent_name: 'Ramesh',
      parent_phone: '+91 9876543211',
      subject: 'Science',
      status: 'ACTIVE'
    }, actor);
    const sid = s.data.student_id;

    const pB = PackageService.Packages_create(spreadsheet, {
      student_id: sid,
      plan_type: 'Per Class',
      classes_purchased: 12,
      currency: 'AUD',
      package_price: 144,
      start_date: '2026-05-01'
    }, actor);
    expect(pB.success).toBe(true);

    // Consume all 12
    for (let i = 1; i <= 12; i++) {
      const day = i < 10 ? `0${i}` : `${i}`;
      ClassService.Classes_schedule(spreadsheet, {
        student_id: sid,
        scheduled_start: `2026-05-${day}T15:00:00.000Z`,
        scheduled_end: `2026-05-${day}T16:00:00.000Z`,
        duration_minutes: 60
      }, actor);
      ClassService.Classes_complete(spreadsheet, {
        class_session_id: `${sid}__2026-05-${day}__15:00`,
        attendance_status: 'PRESENT',
        deduct_class: true
      }, actor);
    }

    const ren = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 12,
      currency: 'AUD',
      package_price: 144,
      start_date: '2026-06-01',
      idempotency_key: 'idemp_backend_2'
    }, actor);

    expect(ren.success).toBe(true);
    expect(ren.data.previous_available_balance).toBe(0);
    expect(ren.data.new_classes_purchased).toBe(12);
    expect(ren.data.new_available_balance).toBe(12);
    expect(ren.data.cumulative_purchased).toBe(24);
    expect(ren.data.cumulative_consumed).toBe(12);
  });

  it('Example C: Multiple consecutive renewals (12 p - 9 c = 3 rem; + 12 p - 5 c = 10 rem; + 10 p = 20 rem)', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Charan Student',
      parent_name: 'Deepa',
      parent_phone: '+91 9876543212',
      subject: 'English'
    }, actor);
    const sid = s.data.student_id;

    // Package 1: 12 purchased
    const pC = PackageService.Packages_create(spreadsheet, {
      student_id: sid,
      plan_type: 'Per Class',
      classes_purchased: 12,
      currency: 'INR'
    }, actor);
    expect(pC.success).toBe(true);

    // Consumed 9
    for (let i = 1; i <= 9; i++) {
      const day = i < 10 ? `0${i}` : `${i}`;
      ClassService.Classes_schedule(spreadsheet, {
        student_id: sid,
        scheduled_start: `2026-01-${day}T10:00:00.000Z`
      }, actor);
      ClassService.Classes_complete(spreadsheet, {
        class_session_id: `${sid}__2026-01-${day}__10:00`,
        attendance_status: 'PRESENT',
        deduct_class: true
      }, actor);
    }

    // Renewal 2: +12 purchased
    const r2 = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 12,
      currency: 'INR',
      idempotency_key: 'idemp_backend_3'
    }, actor);
    expect(r2.data.new_available_balance).toBe(15);

    // Consume 5 more classes after renewal
    for (let i = 1; i <= 5; i++) {
      const day = i < 10 ? `0${i}` : `${i}`;
      ClassService.Classes_schedule(spreadsheet, {
        student_id: sid,
        scheduled_start: `2026-02-${day}T10:00:00.000Z`
      }, actor);
      ClassService.Classes_complete(spreadsheet, {
        class_session_id: `${sid}__2026-02-${day}__10:00`,
        attendance_status: 'PRESENT',
        deduct_class: true
      }, actor);
    }

    // Renewal 3: +10 purchased
    const r3 = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 10,
      currency: 'INR',
      idempotency_key: 'idemp_backend_4'
    }, actor);
    expect(r3.data.previous_available_balance).toBe(10);
    expect(r3.data.new_classes_purchased).toBe(10);
    expect(r3.data.new_available_balance).toBe(20);
    expect(r3.data.cumulative_purchased).toBe(34);
    expect(r3.data.cumulative_consumed).toBe(14);
  });

  it('Business Case Saieesh (STU_006): Per Class AUD, changed rate, payment, reactivation, schedule transition', () => {
    // 1. Create Saieesh
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Saieesh',
      parent_name: 'Vinay',
      parent_phone: '+61 412 345 678',
      subject: 'Geeta',
      status: 'INACTIVE' // Test reactivating an inactive student
    }, actor);
    const sid = s.data.student_id;
    expect(sid).toBeDefined();

    // Previous package: 12 classes AUD 141 (11.75/class), 40 min, Tue & Fri 4:00 PM
    PackageService.Packages_create(spreadsheet, {
      student_id: sid,
      plan_type: 'Per Class',
      currency: 'AUD',
      package_price: 141,
      per_class: 11.75,
      classes_purchased: 12,
      class_duration: 40,
      class_schedule: 'Tue - 4:00 PM, Fri - 4:00 PM',
      start_date: '2026-07-10',
      end_date: '2026-08-18'
    }, actor);

    // Previous payment: AUD 141 on 2026-07-08
    PaymentService.Payments_record(spreadsheet, {
      student_id: sid,
      amount: 141,
      currency: 'AUD',
      in_inr: 7755,
      payment_date: '2026-07-08'
    }, actor);

    // Attend and complete all 12 classes
    for (let i = 1; i <= 12; i++) {
      const day = i < 10 ? `0${i}` : `${i}`;
      ClassService.Classes_schedule(spreadsheet, {
        student_id: sid,
        scheduled_start: `2026-07-${day}T16:00:00.000Z`,
        scheduled_end: `2026-07-${day}T16:40:00.000Z`,
        duration_minutes: 40
      }, actor);
      ClassService.Classes_complete(spreadsheet, {
        class_session_id: `${sid}__2026-07-${day}__16:00`,
        attendance_status: 'PRESENT',
        deduct_class: true
      }, actor);
    }

    // Also simulate an old future session that should be cleaned up on renewal
    ClassService.Classes_schedule(spreadsheet, {
      student_id: sid,
      scheduled_start: '2026-09-04T16:00:00.000Z',
      scheduled_end: '2026-09-04T16:40:00.000Z',
      duration_minutes: 40
    }, actor);

    // Execute renewal: 12 classes @ AUD 10.50 = AUD 126, new schedule Wednesday 17:00, paid on 02/09/2026
    const renewalRes = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 12,
      plan_type: 'Per Class',
      currency: 'AUD',
      per_class: 10.50,
      package_price: 126,
      class_duration: 40,
      start_date: '2026-09-02',
      schedules: [
        { day_of_week: 'WEDNESDAY', start_time: '17:00', end_time: '17:40' }
      ],
      payment: {
        amount: 126,
        currency: 'AUD',
        in_inr: 6930,
        payment_date: '2026-09-02',
        reference_number: 'AUD-REC-902'
      },
      idempotency_key: 'idemp_saieesh_renewal_001'
    }, actor);

    expect(renewalRes.success).toBe(true);
    expect(renewalRes.data.student_id).toBe(sid);
    expect(renewalRes.data.status).toBe('ACTIVE');
    expect(renewalRes.data.previous_available_balance).toBe(0);
    expect(renewalRes.data.new_classes_purchased).toBe(12);
    expect(renewalRes.data.new_available_balance).toBe(12);
    expect(renewalRes.data.cumulative_purchased).toBe(24);
    expect(renewalRes.data.cumulative_consumed).toBe(12);

    // Verify student is reactivated in Students table
    const stuCheck = StudentService.Students_getById(spreadsheet, sid);
    expect(stuCheck.status).toBe('ACTIVE');
    expect(stuCheck.student_id).toBe(sid);

    // Verify payment history: 2 payments exist (141 and 126)
    const payRows = PaymentRepository.Payments_getAll(spreadsheet);
    const stuPays = payRows.filter((p: any) => p.student_id === sid);
    expect(stuPays.length).toBe(2);
    expect(stuPays.map((p: any) => Number(p.amount)).sort((a: number, b: number) => a - b)).toEqual([126, 141]);

    // Verify old future session on 2026-09-04 was cancelled without deducting credit
    const allSessions = ClassRepository.Classes_getAll(spreadsheet);
    const oldFuture = allSessions.find((s: any) => s.student_id === sid && s.schedule_date === '2026-09-04');
    expect(oldFuture).toBeDefined();
    expect(oldFuture.session_status).toBe('CANCELLED');
    expect(oldFuture.deduct_class).toBe(false);

    // Verify idempotency retry does not add duplicate credits
    const retryRes = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 12,
      plan_type: 'Per Class',
      currency: 'AUD',
      per_class: 10.50,
      package_price: 126,
      class_duration: 40,
      start_date: '2026-09-02',
      payment: {
        amount: 126,
        currency: 'AUD',
        in_inr: 6930,
        payment_date: '2026-09-02',
        reference_number: 'AUD-REC-902'
      },
      idempotency_key: 'idemp_saieesh_renewal_001'
    }, actor);
    expect(retryRes.success).toBe(true);
    expect(retryRes.data.new_available_balance).toBe(12);
    expect(retryRes.data.cumulative_purchased).toBe(24);
  });
});
