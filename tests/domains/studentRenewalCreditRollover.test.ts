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
import ClassService from '../../02-backend/apps-script/classes/ClassService.gs';
// @ts-ignore
import ClassRepository from '../../02-backend/apps-script/classes/ClassRepository.gs';
// @ts-ignore
import PaymentService from '../../02-backend/apps-script/payments/PaymentService.gs';
// @ts-ignore
import PaymentRepository from '../../02-backend/apps-script/payments/PaymentRepository.gs';

describe('Credit Rollover, Identity Preservation, and Invariant Rules', () => {
  let spreadsheet: any;
  const actor = { actorId: 'usr_admin', email: 'ashreya0502@gmail.com', requestId: 'req_ren_invariants' };

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
  });

  it('preserves student identity, contact info, and does not create duplicate Students rows', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Devika Sharma',
      parent_name: 'Alok Sharma',
      parent_phone: '+91 98765 11111',
      student_phone: '+91 98765 22222',
      parent_email: 'alok@example.com',
      student_email: 'devika@example.com',
      subject: 'Vedic Math',
      status: 'INACTIVE'
    }, actor);
    const sid = s.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid,
      plan_type: 'Per Class',
      classes_purchased: 10,
      currency: 'INR',
      package_price: 8000,
      start_date: '2026-01-01'
    }, actor);

    const ren = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 10,
      currency: 'INR',
      package_price: 9000,
      idempotency_key: 'idemp_roll_1'
    }, actor);

    expect(ren.success).toBe(true);
    expect(ren.data.student_id).toBe(sid);
    expect(ren.data.status).toBe('ACTIVE');

    // Verify exactly 1 student record exists
    const allStudents = StudentRepository.Students_getAll(spreadsheet);
    const matches = allStudents.filter((st: any) => st.student_id === sid);
    expect(matches.length).toBe(1);

    const studentRecord = matches[0];
    expect(studentRecord.student_id).toBe(sid);
    expect(studentRecord.status).toBe('ACTIVE');
    expect(studentRecord.parent_name).toBe('Alok Sharma');
    expect(studentRecord.parent_phone).toBe('+91 98765 11111');
    expect(studentRecord.parent_email).toBe('alok@example.com');
    expect(studentRecord.student_email).toBe('devika@example.com');
    expect(studentRecord.subject).toBe('Vedic Math');
  });

  it('no credit loss when changing package price, currency, duration, or weekly schedule', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Eshan Roy',
      parent_name: 'Manoj',
      parent_phone: '+91 99999 88888',
      subject: 'Physics'
    }, actor);
    const sid = s.data.student_id;

    // Initial package: 12 classes, AUD 141, 40 min, Tue 4 PM
    PackageService.Packages_create(spreadsheet, {
      student_id: sid,
      plan_type: 'Per Class',
      currency: 'AUD',
      package_price: 141,
      per_class: 11.75,
      classes_purchased: 12,
      class_duration: 40,
      class_schedule: 'Tue - 4:00 PM',
      start_date: '2026-03-01'
    }, actor);

    // Attend 5 classes
    for (let i = 1; i <= 5; i++) {
      const day = `0${i}`;
      ClassService.Classes_schedule(spreadsheet, {
        student_id: sid,
        scheduled_start: `2026-03-${day}T16:00:00.000Z`,
        duration_minutes: 40
      }, actor);
      ClassService.Classes_complete(spreadsheet, {
        class_session_id: `${sid}__2026-03-${day}__16:00`,
        attendance_status: 'PRESENT',
        deduct_class: true
      }, actor);
    }

    // Renewal with different currency (INR), different price (15000), different duration (60 min), and new schedule (Fri 5 PM)
    const ren = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 10,
      currency: 'INR',
      package_price: 15000,
      per_class: 1500,
      class_duration: 60,
      start_date: '2026-04-01',
      schedules: [
        { day_of_week: 'FRIDAY', start_time: '17:00', end_time: '18:00' }
      ],
      idempotency_key: 'idemp_roll_2'
    }, actor);

    expect(ren.success).toBe(true);
    // 12 - 5 = 7 remaining + 10 newly purchased = 17 available classes!
    expect(ren.data.previous_available_balance).toBe(7);
    expect(ren.data.new_classes_purchased).toBe(10);
    expect(ren.data.new_available_balance).toBe(17);
    expect(ren.data.cumulative_purchased).toBe(22);
    expect(ren.data.cumulative_consumed).toBe(5);

    // Verify package configuration updated without corrupting credit counts
    const pkg = PackageRepository.Packages_getById(spreadsheet, sid);
    expect(pkg.currency).toBe('INR');
    expect(pkg.class_duration).toBe(60);
    expect(pkg.classes_purchased).toBe(22);
  });

  it('attendance rules: PRESENT consumes credit, timely and waived cancellations preserve credit, late cancellation consumes credit', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Gaurav K',
      parent_name: 'Sunil',
      parent_phone: '+91 97777 66666',
      subject: 'Math'
    }, actor);
    const sid = s.data.student_id;

    PackageService.Packages_create(spreadsheet, {
      student_id: sid,
      plan_type: 'Per Class',
      classes_purchased: 12,
      currency: 'INR',
      package_price: 12000,
      start_date: '2026-01-01'
    }, actor);

    // Session 1: PRESENT -> deducts 1
    ClassService.Classes_schedule(spreadsheet, {
      student_id: sid,
      scheduled_start: '2026-01-05T10:00:00.000Z'
    }, actor);
    ClassService.Classes_complete(spreadsheet, {
      class_session_id: `${sid}__2026-01-05__10:00`,
      attendance_status: 'PRESENT',
      deduct_class: true
    }, actor);

    // Session 2: Timely cancellation (waived) -> preserves credit (deduct_class: false)
    ClassService.Classes_schedule(spreadsheet, {
      student_id: sid,
      scheduled_start: '2026-01-08T10:00:00.000Z'
    }, actor);
    ClassService.Classes_cancel(spreadsheet, {
      class_session_id: `${sid}__2026-01-08__10:00`,
      cancellation_time: '2026-01-06T10:00:00.000Z', // 48h prior
      credit_waiver: true,
      deduct_class: false
    }, actor);

    // Session 3: Late cancellation without waiver -> deducts 1 credit
    ClassService.Classes_schedule(spreadsheet, {
      student_id: sid,
      scheduled_start: '2026-01-12T10:00:00.000Z'
    }, actor);
    ClassService.Classes_cancel(spreadsheet, {
      class_session_id: `${sid}__2026-01-12__10:00`,
      cancellation_time: '2026-01-12T08:00:00.000Z', // 2h prior, no waiver
      credit_waiver: false,
      deduct_class: true
    }, actor);

    // Total consumed should be 2 (Session 1 + Session 3)
    // 12 - 2 = 10 remaining
    // Renewal with 8 classes -> 10 + 8 = 18 available
    const ren = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 8,
      currency: 'INR',
      idempotency_key: 'idemp_roll_3'
    }, actor);

    expect(ren.success).toBe(true);
    expect(ren.data.cumulative_consumed).toBe(2);
    expect(ren.data.previous_available_balance).toBe(10);
    expect(ren.data.new_classes_purchased).toBe(8);
    expect(ren.data.new_available_balance).toBe(18);
    expect(ren.data.cumulative_purchased).toBe(20);
  });

  it('payment handling: preserves previous payments, records new payment, supports partial payment and INR conversion', () => {
    const s = StudentService.Students_create(spreadsheet, {
      student_name: 'Hina Patel',
      parent_name: 'Kiran',
      parent_phone: '+61 400 111 222',
      subject: 'Hindi'
    }, actor);
    const sid = s.data.student_id;

    // Previous package and payment 1
    PackageService.Packages_create(spreadsheet, {
      student_id: sid,
      plan_type: 'Per Class',
      classes_purchased: 10,
      currency: 'AUD',
      package_price: 150
    }, actor);

    PaymentService.Payments_record(spreadsheet, {
      student_id: sid,
      amount: 150,
      currency: 'AUD',
      in_inr: 8250,
      payment_date: '2026-05-10'
    }, actor);

    // Partial renewal payment: AUD 60 of AUD 120 total
    const ren = RenewalService.Packages_renew(spreadsheet, {
      student_id: sid,
      new_classes_purchased: 10,
      currency: 'AUD',
      package_price: 120,
      idempotency_key: 'idemp_roll_4',
      payment: {
        amount: 60,
        currency: 'AUD',
        in_inr: 3300,
        payment_date: '2026-06-15',
        reference_number: 'PARTIAL-60'
      }
    }, actor);

    expect(ren.success).toBe(true);
    expect(ren.data.payment).toBeDefined();
    expect(ren.data.payment.amount).toBe(60);

    // Verify both payments exist in sheet
    const payments = PaymentRepository.Payments_getAll(spreadsheet).filter((p: any) => p.student_id === sid);
    expect(payments.length).toBe(2);
    expect(payments[0].amount).toBe(150);
    expect(payments[0].in_inr).toBe(8250);
    expect(payments[1].amount).toBe(60);
    expect(payments[1].in_inr).toBe(3300);
  });
});
