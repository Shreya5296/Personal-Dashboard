import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renewStudentPackage } from '../../src/domains/packages/renewalApi';
import { MOCK_STUDENTS, MOCK_PACKAGES, MOCK_CLASSES, MOCK_PAYMENTS } from '../../src/api/mockDataInitial';
import * as configModule from '../../src/config/runtimeConfig';

describe('Frontend Student Renewal Workflow & Mock Store Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(configModule, 'getRuntimeConfig').mockReturnValue({
      appsScriptUrl: '',
      enableMockAuth: true,
      useMockData: true,
      appEnv: 'test',
    });
  });

  it('renews an existing active student and performs cumulative credit rollover in mock mode', async () => {
    const student = MOCK_STUDENTS.find((s) => s.student_id === 'STU_001')!;
    expect(student).toBeDefined();

    // Initial state: STU_001 has 1 consumed class in MOCK_CLASSES (cls_403) and 12 purchased in MOCK_PACKAGES (pkg_601)
    const result = await renewStudentPackage({
      student,
      new_classes_purchased: '12',
      plan_type: 'Per Class',
      currency: 'INR',
      per_class: '1000',
      package_price: '12000',
      class_duration: '60',
      start_date: '2026-04-01',
      end_date: '2026-05-15',
      next_due_date: '2026-05-01',
      schedules: [
        { day_of_week: 'MONDAY', start_time: '17:00', end_time: '18:00' },
        { day_of_week: 'THURSDAY', start_time: '17:00', end_time: '18:00' }
      ],
      payment: {
        record_payment: true,
        amount: '12000',
        currency: 'INR',
        payment_date: '2026-04-01',
        reference_number: 'MOCK-PAY-001'
      },
      confirmed: true
    });

    expect(result.student_id).toBe('STU_001');
    expect(result.status).toBe('ACTIVE');
    expect(result.new_classes_purchased).toBe(12);
    // 1 consumed previously, 12 + 12 = 24 cumulative purchased -> 23 available!
    expect(result.cumulative_purchased).toBe(24);
    expect(result.cumulative_consumed).toBe(1);
    expect(result.new_available_balance).toBe(23);

    // Verify payment was recorded in mock store
    const pay = MOCK_PAYMENTS.find((p: any) => p.reference_number === 'MOCK-PAY-001');
    expect(pay).toBeDefined();
    expect(pay!.amount).toBe(12000);

    // Verify sessions generated
    expect(result.sessions_created).toBeGreaterThan(0);
    const newSessions = MOCK_CLASSES.filter((c: any) => c.student_id === 'STU_001' && c.session_status === 'SCHEDULED');
    expect(newSessions.length).toBeGreaterThan(0);
  });

  it('reactivates an INACTIVE student on renewal without modifying their student ID', async () => {
    // STU_004 is INACTIVE in initial mock data
    const inactiveStudent = MOCK_STUDENTS.find((s) => s.student_id === 'STU_004')!;
    expect(inactiveStudent.status).toBe('INACTIVE');

    const result = await renewStudentPackage({
      student: inactiveStudent,
      new_classes_purchased: '10',
      plan_type: 'Per Class',
      currency: 'AUD',
      per_class: '15',
      package_price: '150',
      class_duration: '40',
      start_date: '2026-05-01',
      end_date: '',
      next_due_date: '',
      schedules: [
        { day_of_week: 'WEDNESDAY', start_time: '16:00', end_time: '16:40' }
      ],
      payment: {
        record_payment: true,
        amount: '150',
        currency: 'AUD',
        in_inr: '8250',
        payment_date: '2026-05-01'
      },
      confirmed: true
    });

    expect(result.student_id).toBe('STU_004');
    expect(result.status).toBe('ACTIVE');
    expect(inactiveStudent.status).toBe('ACTIVE');
    expect(result.new_classes_purchased).toBe(10);
    expect(result.new_available_balance).toBe(10);

    // Ensure STU_004 was NOT duplicated in MOCK_STUDENTS
    const count = MOCK_STUDENTS.filter((s) => s.student_id === 'STU_004').length;
    expect(count).toBe(1);
  });

  it('cancels old future sessions on renewal schedule transition and preserves credit', async () => {
    const student = MOCK_STUDENTS.find((s) => s.student_id === 'STU_002')!;

    // Create a future scheduled session on 2026-06-10
    MOCK_CLASSES.push({
      session_id: 'cls_future_old',
      class_session_id: 'cls_future_old',
      student_id: 'STU_002',
      topic: 'Old scheduled physics',
      start_time: '2026-06-10T14:00:00.000Z',
      scheduled_start: '2026-06-10T14:00:00.000Z',
      duration_minutes: 60,
      status: 'SCHEDULED',
      session_status: 'SCHEDULED',
      attendance_status: 'NOT_MARKED',
      deduct_class: false,
      meeting_url: '',
      class_credit_effect: 'NONE'
    });

    const result = await renewStudentPackage({
      student,
      new_classes_purchased: '6',
      plan_type: 'Per Class',
      currency: 'INR',
      start_date: '2026-06-01',
      class_duration: '60',
      schedules: [
        { day_of_week: 'FRIDAY', start_time: '15:00', end_time: '16:00' }
      ],
      payment: { record_payment: false, amount: '', currency: 'INR', payment_date: '' },
      confirmed: true
    });

    expect(result.success !== false).toBe(true);

    // Old future session must be cancelled with deduct_class: false
    const oldFuture = MOCK_CLASSES.find((c: any) => c.session_id === 'cls_future_old');
    expect(oldFuture).toBeDefined();
    expect(oldFuture!.session_status).toBe('CANCELLED');
    expect(oldFuture!.deduct_class).toBe(false);
  });
});
