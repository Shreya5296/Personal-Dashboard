import { describe, it, expect } from 'vitest';
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

  describe('Change 5: ClassSessions Schema Contains class_date', () => {
    it('includes class_date in ClassSessions schema', () => {
      const headers = SHEET_SCHEMAS[SHEET_NAMES.CLASS_SESSIONS];
      expect(headers).toContain('class_date');
      expect(headers).toContain('class_session_id');
      expect(headers).toContain('student_id');
      expect(headers).toContain('scheduled_start');
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
});
