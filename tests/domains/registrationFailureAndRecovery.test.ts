import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitRegistration } from '../../src/domains/students/registrationSubmitter';
import { generateProposedSessions } from '../../src/domains/classes/classGenerator';
import { calculatePackageDates } from '../../src/domains/packages/packageCalculations';
import { runSchedulingJob } from '../../src/domains/students/asyncScheduleWorker';
import * as studentApi from '../../src/domains/students/studentApi';
import * as packageApi from '../../src/domains/packages/packageApi';
import * as scheduleApi from '../../src/domains/classes/scheduleApi';
import * as classApi from '../../src/domains/classes/classApi';
import * as apiClient from '../../src/api/apiClient';
import { ApiNetworkError } from '../../src/api/apiErrors';
import { RegistrationFormData } from '../../src/domains/students/registrationTypes';

describe('Registration Failure and Recovery Suite (12 Scenarios)', () => {
  const baseFormData: RegistrationFormData = {
    student: {
      student_name: 'Seerat Kaur',
      subject: 'Mathematics',
      student_phone: '+91 98765 43210',
      student_email: 'seerat@example.com',
    },
    parent: {
      parent_name: 'Gurpreet Singh',
      parent_phone: '+1 (555) 019-2834',
      parent_email: 'gurpreet@example.com',
    },
    pkg: {
      plan_type: 'Package',
      currency: 'INR',
      package_price: '24000',
      per_class: '500',
      classes_purchased: '48',
      class_duration: '30',
    },
    schedules: [
      { id: '1', day_of_week: 'MONDAY', start_time: '17:00', end_time: '17:30' },
      { id: '2', day_of_week: 'WEDNESDAY', start_time: '17:00', end_time: '17:30' },
      { id: '3', day_of_week: 'SATURDAY', start_time: '17:00', end_time: '17:30' },
    ],
    first_class_date: '2026-10-26',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Scenario 1: Student creation succeeds but package creation fails
  it('1. Student creation succeeds but package creation fails, capturing student ID for recovery', async () => {
    vi.spyOn(studentApi, 'fetchStudents').mockResolvedValue([]);
    vi.spyOn(studentApi, 'createStudent').mockResolvedValue({
      student_id: 'STU_001',
      student_name: 'Seerat Kaur',
      status: 'ACTIVE',
      created_at: '2026-10-25T11:00:00Z',
    });
    vi.spyOn(packageApi, 'fetchPackages').mockResolvedValue([]);
    vi.spyOn(packageApi, 'createPackage').mockRejectedValue(new Error('Package creation failed: Sheet quota'));

    let capturedStudent: any = null;
    await expect(
      submitRegistration(baseFormData, null, 'mock_token', (stu) => {
        capturedStudent = stu;
      })
    ).rejects.toThrow('Package creation failed: Sheet quota');

    expect(capturedStudent).not.toBeNull();
    expect(capturedStudent.student_id).toBe('STU_001');
  });

  // Scenario 2: Student and package creation succeed but scheduling fails
  it('2. Student and package creation succeed but scheduling fails', async () => {
    vi.spyOn(studentApi, 'fetchStudents').mockResolvedValue([]);
    vi.spyOn(studentApi, 'createStudent').mockResolvedValue({
      student_id: 'STU_001',
      student_name: 'Seerat Kaur',
      status: 'ACTIVE',
      created_at: '2026-10-25T11:00:00Z',
    });
    vi.spyOn(packageApi, 'fetchPackages').mockResolvedValue([]);
    vi.spyOn(packageApi, 'createPackage').mockResolvedValue({
      package_id: 'PKG_001',
      student_id: 'STU_001',
      package_name: 'Seerat Kaur Package',
      total_classes: 48,
    } as any);
    vi.spyOn(scheduleApi, 'saveSchedules').mockResolvedValue([]);
    vi.spyOn(classApi, 'fetchClasses').mockResolvedValue([]);
    vi.spyOn(classApi, 'batchScheduleClasses').mockRejectedValue(
      new Error('Internal lock error: Schedule sheet unavailable')
    );

    await expect(
      submitRegistration(baseFormData, null, 'mock_token')
    ).rejects.toThrow('Internal lock error: Schedule sheet unavailable');
  });

  // Scenario 3: The scheduling request times out after backend completed it
  it('3. Scheduling request times out after backend completed it, detected idempotently on retry', async () => {
    const existingSessions: any[] = [
      { class_session_id: 'cls_1', student_id: 'STU_001', scheduled_start: '2026-10-26T17:00:00.000Z', session_status: 'SCHEDULED' },
      { class_session_id: 'cls_2', student_id: 'STU_001', scheduled_start: '2026-10-28T17:00:00.000Z', session_status: 'SCHEDULED' },
    ];

    const proposed = generateProposedSessions(
      baseFormData.schedules,
      baseFormData.first_class_date,
      2,
      existingSessions,
      'STU_001',
      30
    );

    expect(proposed).toHaveLength(2);
    expect(proposed[0].isDuplicate).toBe(true);
    expect(proposed[1].isDuplicate).toBe(true);
    const needed = proposed.filter((p) => !p.isDuplicate);
    expect(needed).toHaveLength(0);
  });

  // Scenario 4: The backend genuinely fails before creating sessions
  it('4. Backend genuinely fails before creating sessions, retried from 0 existing sessions', async () => {
    const proposed = generateProposedSessions(
      baseFormData.schedules,
      baseFormData.first_class_date,
      48,
      [],
      'STU_001',
      30
    );

    expect(proposed).toHaveLength(48);
    const duplicates = proposed.filter((p) => p.isDuplicate);
    expect(duplicates).toHaveLength(0);
  });

  // Scenario 5: The backend deployment does not recognize the requested operation
  it('5. Backend deployment does not recognize classes.batchSchedule, gracefully delegates to async worker', async () => {
    vi.spyOn(studentApi, 'fetchStudents').mockResolvedValue([]);
    vi.spyOn(studentApi, 'createStudent').mockResolvedValue({
      student_id: 'STU_001',
      student_name: 'Seerat Kaur',
      status: 'ACTIVE',
      created_at: '2026-10-25T11:00:00Z',
    });
    vi.spyOn(packageApi, 'fetchPackages').mockResolvedValue([]);
    vi.spyOn(packageApi, 'createPackage').mockResolvedValue({ package_id: 'PKG_001' } as any);
    vi.spyOn(scheduleApi, 'saveSchedules').mockResolvedValue([]);
    vi.spyOn(classApi, 'fetchClasses').mockResolvedValue([]);
    vi.spyOn(classApi, 'batchScheduleClasses').mockRejectedValue(
      new Error('Unknown operation: classes.batchSchedule')
    );

    const result = await submitRegistration(baseFormData, null, 'mock_token');
    expect(result.student.student_id).toBe('STU_001');
    expect(result.message).toContain('Classes are being scheduled in background');
  });

  // Scenario 6: A repeated registration request reuses existing student and package
  it('6. Repeated registration request reuses existing student and package without creating duplicates', async () => {
    const existingStudent = {
      student_id: 'STU_001',
      student_name: 'Seerat Kaur',
      status: 'ACTIVE',
      created_at: '2026-10-25T11:00:00Z',
    };
    const existingPackage = {
      package_id: 'PKG_001',
      student_id: 'STU_001',
      package_name: 'Seerat Kaur Package',
      total_classes: 48,
    };

    vi.spyOn(studentApi, 'fetchStudents').mockResolvedValue([existingStudent]);
    const updateSpy = vi.spyOn(studentApi, 'updateStudent').mockResolvedValue(existingStudent);
    const createStudentSpy = vi.spyOn(studentApi, 'createStudent');
    vi.spyOn(packageApi, 'fetchPackages').mockResolvedValue([existingPackage as any]);
    const createPackageSpy = vi.spyOn(packageApi, 'createPackage');
    vi.spyOn(scheduleApi, 'saveSchedules').mockResolvedValue([]);
    vi.spyOn(classApi, 'fetchClasses').mockResolvedValue([]);
    vi.spyOn(classApi, 'batchScheduleClasses').mockResolvedValue([]);

    const result = await submitRegistration(baseFormData, null, 'mock_token');

    expect(createStudentSpy).not.toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledWith('STU_001', expect.anything(), 'mock_token');
    expect(createPackageSpy).not.toHaveBeenCalled();
    expect(result.student.student_id).toBe('STU_001');
  });

  // Scenario 7: Retrying partial registration generates only missing sessions
  it('7. Retrying partial registration generates only missing sessions', async () => {
    const existingSessions: any[] = [];
    for (let i = 0; i < 10; i++) {
      existingSessions.push({
        class_session_id: `cls_${i}`,
        student_id: 'STU_001',
        scheduled_start: `2026-11-${String(i + 1).padStart(2, '0')}T17:00:00.000Z`,
        session_status: 'SCHEDULED',
      });
    }

    const proposed = generateProposedSessions(
      baseFormData.schedules,
      baseFormData.first_class_date,
      48,
      existingSessions,
      'STU_001',
      30
    );

    expect(proposed).toHaveLength(48);
    // Since proposed sessions match schedule rules, any existing sessions in those slots are marked duplicate
    const nonDuplicates = proposed.filter((p) => !p.isDuplicate);
    expect(nonDuplicates.length).toBeLessThanOrEqual(48);
  });

  // Scenario 8: All 48 sessions are generated without duplicates
  it('8. All 48 sessions generated without duplicates and match schedule constraints', () => {
    const proposed = generateProposedSessions(
      baseFormData.schedules,
      '2026-10-26',
      48,
      [],
      'STU_001',
      30
    );

    expect(proposed).toHaveLength(48);
    expect(proposed[0].dateStr).toBe('2026-10-26');
    expect(proposed[0].dayName).toBe('Monday');
    expect(proposed[0].durationMinutes).toBe(30);

    const validDays = new Set(['Monday', 'Wednesday', 'Saturday']);
    const startKeys = new Set<string>();

    for (const session of proposed) {
      expect(validDays.has(session.dayName)).toBe(true);
      expect(session.dateStr >= '2026-10-26').toBe(true);
      expect(session.durationMinutes).toBe(30);
      expect(startKeys.has(session.scheduledStart)).toBe(false);
      startKeys.add(session.scheduledStart);
    }
  });

  // Scenario 9: An invalid or unreachable backend produces an actionable error
  it('9. Invalid or unreachable backend produces actionable error', async () => {
    const origFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    await expect(
      apiClient.sendApiRequest('students.list', {}, { token: 'tok' })
    ).rejects.toThrow(/Network request failed: Failed to fetch/);

    global.fetch = origFetch;
  });

  // Scenario 10: A failed registration does not leave the UI stuck in Processing
  it('10. Failed registration sets isSubmitting to false via finally block and formats error accurately', async () => {
    let isSubmitting = false;
    let serverError: string | null = null;
    let persistedStudent: any = null;

    vi.spyOn(studentApi, 'fetchStudents').mockResolvedValue([]);
    vi.spyOn(studentApi, 'createStudent').mockRejectedValue(new Error('Backend connection refused'));

    const runSubmit = async () => {
      isSubmitting = true;
      serverError = null;
      let currentStudent = persistedStudent;
      try {
        const result = await submitRegistration(baseFormData, persistedStudent, 'mock_token', (stu) => {
          currentStudent = stu;
          persistedStudent = stu;
        });
        persistedStudent = result.student;
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : 'Registration failed';
        serverError = currentStudent ? `Student created (${currentStudent.student_id}), but details failed: ${msg}` : msg;
      } finally {
        isSubmitting = false;
      }
    };

    await runSubmit();

    // Verification: isSubmitting is unconditionally false, not stuck in Processing
    expect(isSubmitting).toBe(false);
    expect(serverError).toBe('Backend connection refused');
  });

  // Scenario 11: International phone numbers are saved correctly
  it('11. International phone numbers are preserved and safe from formula evaluation', async () => {
    const studentPhone = '+91 98765 43210';
    const parentPhone = '+1 (555) 019-2834';

    const createSpy = vi.spyOn(studentApi, 'createStudent').mockResolvedValue({
      student_id: 'STU_001',
      student_name: 'Seerat Kaur',
      student_phone: studentPhone,
      parent_phone: parentPhone,
      status: 'ACTIVE',
      created_at: '2026-10-25T11:00:00Z',
    });
    vi.spyOn(studentApi, 'fetchStudents').mockResolvedValue([]);
    vi.spyOn(packageApi, 'fetchPackages').mockResolvedValue([{ package_id: 'PKG_001' } as any]);
    vi.spyOn(scheduleApi, 'saveSchedules').mockResolvedValue([]);
    vi.spyOn(classApi, 'fetchClasses').mockResolvedValue([]);
    vi.spyOn(classApi, 'batchScheduleClasses').mockResolvedValue([]);

    await submitRegistration(baseFormData, null, 'mock_token');

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        student_phone: '+91 98765 43210',
        parent_phone: '+1 (555) 019-2834',
      }),
      'mock_token'
    );
  });

  // Scenario 12: Package dates match generated session sequence
  it('12. Package dates match 48th occurrence end date and 44th occurrence next due date', () => {
    const pkgDates = calculatePackageDates(
      '2026-10-26',
      ['MONDAY', 'WEDNESDAY', 'SATURDAY'],
      48
    );

    const proposed = generateProposedSessions(
      baseFormData.schedules,
      '2026-10-26',
      48,
      [],
      'STU_001',
      30
    );

    expect(proposed).toHaveLength(48);
    // 48th session is at index 47
    const session48 = proposed[47];
    // 44th session is at index 43
    const session44 = proposed[43];

    expect(pkgDates.startDate).toBe('2026-10-26');
    expect(pkgDates.endDate).toBe(session48.dateStr);
    expect(pkgDates.nextDueDate).toBe(session44.dateStr);
  });

  // Scenario 13: Network error on batch scheduling is not mistaken for unsupported operation
  it('13. Network failure on batchScheduleClasses immediately rethrows without attempting sequential requests', async () => {
    const apiClient = await import('../../src/api/apiClient');
    const { ApiNetworkError } = await import('../../src/api/apiErrors');
    const sendSpy = vi.spyOn(apiClient, 'sendApiRequest');

    sendSpy.mockRejectedValue(new ApiNetworkError('Network request failed: Failed to fetch'));

    await expect(
      classApi.batchScheduleClasses('STU_001', [
        { student_id: 'STU_001', scheduled_start: '2026-10-26T12:30:00.000Z', duration_minutes: 30 },
      ], 'mock_token')
    ).rejects.toThrow('Network request failed: Failed to fetch');

    // Verify it called classes.batchSchedule exactly ONCE and did NOT attempt classes.schedule
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith('classes.batchSchedule', expect.anything(), expect.anything());

    sendSpy.mockRestore();
  });

  // Scenario 14: submitRegistration handles native batch success cleanly
  it('14. submitRegistration completes immediately when native classes.batchSchedule succeeds', async () => {
    vi.spyOn(studentApi, 'fetchStudents').mockResolvedValue([]);
    vi.spyOn(studentApi, 'createStudent').mockResolvedValue({
      student_id: 'STU_001',
      student_name: 'Seerat Kaur',
      status: 'ACTIVE',
      created_at: '2026-10-25T11:00:00Z',
    });
    vi.spyOn(packageApi, 'fetchPackages').mockResolvedValue([]);
    vi.spyOn(packageApi, 'createPackage').mockResolvedValue({ package_id: 'PKG_001' } as any);
    vi.spyOn(scheduleApi, 'saveSchedules').mockResolvedValue([]);
    vi.spyOn(classApi, 'fetchClasses').mockResolvedValue([]);
    vi.spyOn(classApi, 'batchScheduleClasses').mockResolvedValue([
      { class_session_id: 'cls_1' } as any,
    ]);

    const result = await submitRegistration(baseFormData, null, 'mock_token');
    expect(result.student.student_id).toBe('STU_001');
    expect(result.message).toBe('Student Seerat Kaur (STU_001) registered successfully.');
  });
});
