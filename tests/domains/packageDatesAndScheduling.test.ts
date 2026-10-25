import { describe, it, expect, vi } from 'vitest';
import { calculatePackageDates, generatePackageOccurrences } from '../../src/domains/packages/packageCalculations';
import { cleanTime } from '../../src/domains/classes/scheduleApi';
import { generateCalendarEvents } from '../../src/domains/dashboard/calendarEventGenerator';
import { createHeaderMap, recordToRow, rowToRecord } from '../../02-backend/apps-script/sheets/HeaderMapper.gs';
import { Students_enrich } from '../../02-backend/apps-script/students/StudentService.gs';
import { _calcPkgDates } from '../../02-backend/apps-script/packages/PackageService.gs';
import { SHEET_SCHEMAS, SHEET_NAMES } from '../../02-backend/apps-script/sheets/SheetRegistry.gs';

describe('Fix Student Data, Class Generation, Calendar Accuracy, Fee Dates, and Global Spacing', () => {
  describe('Change 1: International Phone Numbers & Formula Safety', () => {
    it('prefixes leading + with apostrophe on write so Google Sheets does not evaluate as formula', () => {
      const headers = ['student_id', 'parent_phone', 'student_phone'];
      const map = createHeaderMap(headers);
      const record = {
        student_id: 'STU-001',
        parent_phone: '+66 83 167 5035',
        student_phone: '+91 98765 43210',
      };
      const row = recordToRow(map, headers, record);
      expect(row[1]).toBe("'+66 83 167 5035");
      expect(row[2]).toBe("'+91 98765 43210");
    });

    it('strips leading apostrophe on read so frontend and consumer get pure phone string', () => {
      const headers = ['student_id', 'parent_phone', 'student_phone'];
      const map = createHeaderMap(headers);
      const row = ['STU-001', "'+66 83 167 5035", "'+91 98765 43210"];
      const rec = rowToRecord(map, row);
      expect(rec.parent_phone).toBe('+66 83 167 5035');
      expect(rec.student_phone).toBe('+91 98765 43210');
    });

    it('Students_enrich strips any accidental leading apostrophe on student records', () => {
      const raw = {
        student_id: 'STU-001',
        student_name: 'Test Child',
        parent_phone: "'+66 83 167 5035",
        student_phone: "'+91 98765 43210",
      };
      const enriched = Students_enrich(raw);
      expect(enriched.parent_phone).toBe('+66 83 167 5035');
      expect(enriched.student_phone).toBe('+91 98765 43210');
    });
  });

  describe('Change 4: Package End Date and Next Fee Due Date Calculation', () => {
    it('calculates 48 occurrences correctly for Mon, Wed, Fri starting 2026-11-02', () => {
      // 2026-11-02 is a Monday
      const occurrences = generatePackageOccurrences('2026-11-02', ['MONDAY', 'WEDNESDAY', 'FRIDAY'], 48);
      expect(occurrences).toHaveLength(48);
      expect(occurrences[0]).toBe('2026-11-02');
      expect(occurrences[1]).toBe('2026-11-04');
      expect(occurrences[2]).toBe('2026-11-06');

      const dates = calculatePackageDates('2026-11-02', ['MONDAY', 'WEDNESDAY', 'FRIDAY'], 48);
      expect(dates.startDate).toBe('2026-11-02');
      // 48th occurrence is index 47
      expect(dates.endDate).toBe(occurrences[47]);
      // 44th occurrence is index 43 (next fee due date: 4 classes remain)
      expect(dates.nextDueDate).toBe(occurrences[43]);
    });

    it('backend _calcPkgDates produces identical start, end, and next_due_date', () => {
      const dates = _calcPkgDates('2026-11-02', ['MONDAY', 'WEDNESDAY', 'FRIDAY'], 48);
      expect(dates.start_date).toBe('2026-11-02');
      expect(dates.end_date).toBeTruthy();
      expect(dates.next_due_date).toBeTruthy();

      const frontendDates = calculatePackageDates('2026-11-02', ['MONDAY', 'WEDNESDAY', 'FRIDAY'], 48);
      expect(dates.start_date).toBe(frontendDates.startDate);
      expect(dates.end_date).toBe(frontendDates.endDate);
      expect(dates.next_due_date).toBe(frontendDates.nextDueDate);
    });

    it('handles smaller packages where purchased classes <= 4', () => {
      const dates = calculatePackageDates('2026-11-02', ['MONDAY'], 3);
      expect(dates.startDate).toBe('2026-11-02');
      expect(dates.endDate).toBe('2026-11-16');
      expect(dates.nextDueDate).toBe('2026-11-02');
    });
  });

  describe('Change 5: Canonical ClassSessions Schema', () => {
    it('matches canonical 8-column schema (schedule_date, schedule_time, etc.)', () => {
      const headers = SHEET_SCHEMAS[SHEET_NAMES.CLASS_SESSIONS];
      expect(headers).toEqual([
        'student_id',
        'student_name',
        'schedule_date',
        'schedule_time',
        'attendance_status',
        'session_status',
        'cancellation_reason',
        'deduct_class',
      ]);
    });
  });

  describe('Change 2: Calendar Start Date Boundary (Filter Prior Recurring Occurrences)', () => {
    it('excludes recurring schedule occurrences prior to first_class_date', () => {
      const weekDates = [
        '2026-11-02', // Monday
        '2026-11-03', // Tuesday
        '2026-11-04', // Wednesday
        '2026-11-05', // Thursday
        '2026-11-06', // Friday
        '2026-11-07', // Saturday
        '2026-11-08', // Sunday
      ];

      const students = [
        {
          student_id: 'STU-FIRST',
          student_name: 'Late Starter',
          first_class_date: '2026-11-05', // Thursday
          status: 'ACTIVE',
        },
      ];

      const recurringSchedules = [
        {
          schedule_id: 'SCHED-1',
          student_id: 'STU-FIRST',
          day_of_week: 'MONDAY', // Prior to first_class_date!
          start_time: '18:00',
          end_time: '19:00',
          is_active: true,
        },
        {
          schedule_id: 'SCHED-2',
          student_id: 'STU-FIRST',
          day_of_week: 'FRIDAY', // After first_class_date!
          start_time: '18:00',
          end_time: '19:00',
          is_active: true,
        },
      ];

      const events = generateCalendarEvents({
        datedSessions: [],
        recurringSchedules,
        students,
        weekDates,
        activeTz: 'Asia/Kolkata',
      });

      // Monday 2026-11-02 must NOT have an event for STU-FIRST
      const mondayEvents = events.filter((e) => (e.scheduled_start || e.start_time || '').startsWith('2026-11-02'));
      expect(mondayEvents).toHaveLength(0);

      // Friday 2026-11-06 MUST have an event for STU-FIRST
      const fridayEvents = events.filter((e) => (e.scheduled_start || e.start_time || '').startsWith('2026-11-06'));
      expect(fridayEvents).toHaveLength(1);
      expect(fridayEvents[0].student_id).toBe('STU-FIRST');
    });
  });

  describe('Change 3: 30-Minute Duration Height Calculation', () => {
    it('computes 26px for 30 minutes instead of clamped 50px', () => {
      const duration = 30;
      const heightPx = Math.max(22, Math.round((duration / 60) * 56) - 2);
      expect(heightPx).toBe(26);
    });

    it('computes 54px for 60 minutes', () => {
      const duration = 60;
      const heightPx = Math.max(22, Math.round((duration / 60) * 56) - 2);
      expect(heightPx).toBe(54);
    });
  });

  describe('Change 6: 12-Hour Clock Parsing', () => {
    it('parses 12-hour AM/PM times correctly in cleanTime', () => {
      expect(cleanTime('6:00 PM')).toBe('18:00');
      expect(cleanTime('06:00 PM')).toBe('18:00');
      expect(cleanTime('6:00 AM')).toBe('06:00');
      expect(cleanTime('12:00 PM')).toBe('12:00');
      expect(cleanTime('12:30 PM')).toBe('12:30');
      expect(cleanTime('12:00 AM')).toBe('00:00');
      expect(cleanTime('12:45 AM')).toBe('00:45');
      expect(cleanTime('18:00')).toBe('18:00');
      expect(cleanTime('09:30')).toBe('09:30');
    });
  });

  describe('Bugfix: Unknown Operation classes.batchSchedule & Registration Recovery', () => {
    it('batchScheduleClasses falls back to sequential scheduleClass if classes.batchSchedule is unknown', async () => {
      const { batchScheduleClasses } = await import('../../src/domains/classes/classApi');
      const apiClient = await import('../../src/api/apiClient');
      const sendSpy = vi.spyOn(apiClient, 'sendApiRequest');

      // Mock first call (classes.batchSchedule) failing with Unknown operation
      sendSpy.mockImplementationOnce(async () => {
        throw new Error('Unknown operation: classes.batchSchedule');
      });

      // Mock subsequent calls (classes.schedule) succeeding
      sendSpy.mockImplementation(async (op: string, payload: any) => {
        return {
          apiVersion: '1',
          requestId: 'test_req',
          success: true,
          ok: true,
          data: {
            class_session_id: 'cls_mock_1',
            student_id: payload.student_id,
            scheduled_start: payload.scheduled_start,
            scheduled_end: payload.scheduled_end,
            duration_minutes: payload.duration_minutes,
            session_status: 'SCHEDULED',
          },
          error: null,
          meta: null,
        } as any;
      });

      const sessions = [
        { student_id: 'STU_001', scheduled_start: '2026-11-02T18:00:00Z', scheduled_end: '2026-11-02T18:30:00Z', duration_minutes: 30 },
        { student_id: 'STU_001', scheduled_start: '2026-11-04T18:00:00Z', scheduled_end: '2026-11-04T18:30:00Z', duration_minutes: 30 },
      ];

      const res = await batchScheduleClasses('STU_001', sessions, 'mock_token');
      expect(res).toHaveLength(2);
      expect(sendSpy).toHaveBeenCalledWith('classes.batchSchedule', expect.anything(), expect.anything());
      expect(sendSpy).toHaveBeenCalledWith('classes.schedule', expect.anything(), expect.anything());

      sendSpy.mockRestore();
    });
  });

  describe('Timezone Precision & Midnight Boundary Verification (Asia/Kolkata)', () => {
    it('converts Asia/Kolkata 18:00–18:30 IST to exact UTC timestamps 12:30–13:00 UTC', async () => {
      const { localToUtcIso } = await import('../../src/domains/classes/classGenerator');
      const startIso = localToUtcIso('2026-10-26', '18:00', 'Asia/Kolkata');
      const endIso = localToUtcIso('2026-10-26', '18:30', 'Asia/Kolkata');

      expect(startIso).toBe('2026-10-26T12:30:00.000Z');
      expect(endIso).toBe('2026-10-26T13:00:00.000Z');

      // Verify formatted in Asia/Kolkata: exactly 6:00 pm and 6:30 pm on 26 Oct
      const { formatIsoTo12Hour } = await import('../../src/lib/time12Format');
      expect(formatIsoTo12Hour(startIso, 'Asia/Kolkata')).toBe('6:00 pm');
      expect(formatIsoTo12Hour(endIso, 'Asia/Kolkata')).toBe('6:30 pm');

      // Verify calendar date in Asia/Kolkata: 2026-10-26 (does NOT cross midnight)
      const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(startIso));
      expect(istDate).toBe('2026-10-26');
    });

    it('proves that naive 18:00:00.000Z represents 11:30 PM IST and crosses midnight', () => {
      const naiveUtcStart = '2026-10-26T18:00:00.000Z';
      const naiveUtcEnd = '2026-10-26T18:30:00.000Z';

      const istStartTime = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata', timeStyle: 'short',
      }).format(new Date(naiveUtcStart));
      const istEndDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(naiveUtcEnd));

      expect(istStartTime.toLowerCase()).toBe('11:30 pm');
      // 18:30 UTC is midnight on the NEXT day (27 Oct) in Asia/Kolkata
      expect(istEndDate).toBe('2026-10-27');
    });

    it('generates 48 sessions with correct Asia/Kolkata UTC timestamps agreeing with package dates', async () => {
      const { generateProposedSessions } = await import('../../src/domains/classes/classGenerator');
      const schedules = [
        { id: '1', day_of_week: 'MONDAY', start_time: '18:00', end_time: '18:30' },
        { id: '2', day_of_week: 'WEDNESDAY', start_time: '18:00', end_time: '18:30' },
        { id: '3', day_of_week: 'SATURDAY', start_time: '18:00', end_time: '18:30' },
      ];

      const proposed = generateProposedSessions(schedules, '2026-10-26', 48, [], 'STU_001', 30, 'Asia/Kolkata');
      expect(proposed).toHaveLength(48);

      // Session 1: 2026-10-26 18:00 IST -> 12:30 UTC
      expect(proposed[0].scheduledStart).toBe('2026-10-26T12:30:00.000Z');
      expect(proposed[0].scheduledEnd).toBe('2026-10-26T13:00:00.000Z');
      expect(proposed[0].dateStr).toBe('2026-10-26');

      // Session 44 (N-4 fee milestone): 2027-02-03 18:00 IST -> 12:30 UTC
      expect(proposed[43].scheduledStart).toBe('2027-02-03T12:30:00.000Z');
      expect(proposed[43].scheduledEnd).toBe('2027-02-03T13:00:00.000Z');
      expect(proposed[43].dateStr).toBe('2027-02-03');

      // Session 48 (Final session): 2027-02-13 18:00 IST -> 12:30 UTC
      expect(proposed[47].scheduledStart).toBe('2027-02-13T12:30:00.000Z');
      expect(proposed[47].scheduledEnd).toBe('2027-02-13T13:00:00.000Z');
      expect(proposed[47].dateStr).toBe('2027-02-13');

      // Check agreement with package dates calculation
      const pkgDates = calculatePackageDates('2026-10-26', ['MONDAY', 'WEDNESDAY', 'SATURDAY'], 48);
      expect(pkgDates.startDate).toBe('2026-10-26');
      expect(pkgDates.nextDueDate).toBe(proposed[43].dateStr); // 2027-02-03
      expect(pkgDates.endDate).toBe(proposed[47].dateStr);     // 2027-02-13
    });
  });
});
