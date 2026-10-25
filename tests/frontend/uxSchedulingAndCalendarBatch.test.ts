import { describe, it, expect } from 'vitest';
import { formatTimeTo12Hour, formatTimeRange12Hour, formatIsoTo12Hour, formatDateTime12Hour } from '../../src/lib/time12Format';
import { generateAttentionAlerts } from '../../src/domains/dashboard/attentionAlerts';
import { buildDayColumns } from '../../src/domains/calendar/calendarGridBuilder';
import { generateProposedSessions } from '../../src/domains/classes/classGenerator';
import { formatWeeklySchedule } from '../../src/domains/students/scheduleFormatter';
import { Student } from '../../src/domains/students/studentTypes';
import { Package } from '../../src/domains/packages/packageTypes';
import { MeetingLink } from '../../src/domains/meeting-links/meetingLinkTypes';
import { WeeklyScheduleEntry } from '../../src/domains/classes/scheduleApi';
import { ClassSession } from '../../src/domains/classes/classTypes';
import { ROUTE_CONFIGS } from '../../src/app/routeAccess';

describe('Next Implementation Batch — UX, Scheduling & Calendar', () => {
  describe('1. Global 12-Hour Clock Formatting & Timezone', () => {
    it('formats 24-hour time strings into 12-hour clock with AM/PM', () => {
      expect(formatTimeTo12Hour('09:00')).toBe('9:00 AM');
      expect(formatTimeTo12Hour('12:00')).toBe('12:00 PM');
      expect(formatTimeTo12Hour('16:00')).toBe('4:00 PM');
      expect(formatTimeTo12Hour('16:40')).toBe('4:40 PM');
      expect(formatTimeTo12Hour('00:15')).toBe('12:15 AM');
      expect(formatTimeTo12Hour('')).toBe('—');
    });

    it('formats start and end time ranges into 12-hour format', () => {
      expect(formatTimeRange12Hour('16:00', '16:40')).toBe('4:00 PM – 4:40 PM');
      expect(formatTimeRange12Hour('09:30', '10:30')).toBe('9:30 AM – 10:30 AM');
    });

    it('formats ISO datetime strings into 12-hour format in Asia/Kolkata', () => {
      // 10:30 UTC is 16:00 (4:00 PM) in Asia/Kolkata (+05:30)
      const iso = '2026-10-25T10:30:00.000Z';
      const time12 = formatIsoTo12Hour(iso, 'Asia/Kolkata');
      expect(time12).toMatch(/4:00\s*(pm|PM)/i);

      const dt12 = formatDateTime12Hour(iso, 'Asia/Kolkata');
      expect(dt12).toContain('2026');
      expect(dt12).toMatch(/4:00\s*(pm|PM)/i);
    });

    it('formats recurring weekly schedules in 12-hour format', () => {
      const sched: WeeklyScheduleEntry[] = [
        { day_of_week: 'MONDAY', start_time: '16:00', end_time: '16:40' },
        { day_of_week: 'WEDNESDAY', start_time: '16:00', end_time: '16:40' },
      ];
      expect(formatWeeklySchedule(sched)).toBe('Mon, Wed 4:00 PM – 4:40 PM');
    });
  });

  describe('2. Dashboard — Things That Need Attention Alerts', () => {
    const activeStudent1: Student = {
      student_id: 'STU_001',
      student_name: 'Aarav Patel',
      status: 'ACTIVE',
      parent_name: 'Pooja Patel',
      parent_phone: '9876543210',
      parent_email: 'pooja@example.com',
      student_phone: '9876543210',
      student_email: 'aarav@example.com',
      subject: 'Maths',
    };

    const activeStudent2: Student = {
      student_id: 'STU_002',
      student_name: 'Diya Sharma',
      status: 'ACTIVE',
      parent_name: 'Rohan Sharma',
      parent_phone: '9876543211',
      parent_email: 'rohan@example.com',
      student_phone: '9876543211',
      student_email: 'diya@example.com',
      subject: 'Physics',
    };

    const archivedStudent: Student = {
      student_id: 'STU_003',
      student_name: 'Archived Student',
      status: 'ARCHIVED',
      parent_name: 'Parent',
      parent_phone: '9876543212',
      parent_email: 'p@example.com',
      student_phone: '9876543212',
      student_email: 's@example.com',
      subject: 'Chemistry',
    };

    it('flags active student with no meeting link configured', () => {
      const alerts = generateAttentionAlerts({
        students: [activeStudent1],
        schedules: [{ schedule_id: 's1', student_id: 'STU_001', day_of_week: 'MONDAY', start_time: '16:00', end_time: '17:00' }],
        meetingLinks: [], // No meeting link
        packages: [{ package_id: 'p1', student_id: 'STU_001', classes_purchased: 10, consumed_classes: 2 }],
      });

      const linkAlert = alerts.find((a) => a.reason.toLowerCase().includes('meeting link'));
      expect(linkAlert).toBeDefined();
      expect(linkAlert?.reason).toBe('Meeting link not configured');
      expect(linkAlert?.actionLabel).toBe('Configure Link');
      expect(linkAlert?.studentId).toBe('STU_001');
      expect(linkAlert?.targetSection).toBe('meeting-links');
    });

    it('flags active student with no class schedule configured', () => {
      const alerts = generateAttentionAlerts({
        students: [activeStudent1],
        schedules: [], // No schedule
        meetingLinks: [{ student_id: 'STU_001', student_name: 'Aarav', meeting_link_1: 'https://meet.google.com/abc' }],
        packages: [{ package_id: 'p1', student_id: 'STU_001', classes_purchased: 10, consumed_classes: 2 }],
      });

      const schedAlert = alerts.find((a) => a.reason.includes('No class schedule'));
      expect(schedAlert).toBeDefined();
      expect(schedAlert?.studentId).toBe('STU_001');
    });

    it('flags active student with four or fewer classes remaining', () => {
      const alerts = generateAttentionAlerts({
        students: [activeStudent2],
        schedules: [{ schedule_id: 's2', student_id: 'STU_002', day_of_week: 'TUESDAY', start_time: '17:00', end_time: '18:00' }],
        meetingLinks: [{ student_id: 'STU_002', student_name: 'Diya', meeting_link_1: 'https://meet.google.com/def' }],
        packages: [{ package_id: 'p2', student_id: 'STU_002', classes_purchased: 12, consumed_classes: 9 }], // 12 - 9 = 3 remaining
      });

      const balAlert = alerts.find((a) => a.reason.includes('remaining'));
      expect(balAlert).toBeDefined();
      expect(balAlert?.reason).toBe('3 classes remaining');
      expect(balAlert?.severity).toBe('warning');
    });

    it('never includes archived or inactive students in attention alerts', () => {
      const alerts = generateAttentionAlerts({
        students: [archivedStudent],
        schedules: [],
        meetingLinks: [],
        packages: [],
      });
      expect(alerts).toHaveLength(0);
    });
  });

  describe('3. Auto-Scheduling Generator & Conflict Handling', () => {
    const schedules: WeeklyScheduleEntry[] = [
      { day_of_week: 'MONDAY', start_time: '16:00', end_time: '16:40' },
      { day_of_week: 'WEDNESDAY', start_time: '16:00', end_time: '16:40' },
    ];

    it('generates dated sessions starting from first class date', () => {
      const sessions = generateProposedSessions(schedules, '2026-10-26', 4, [], 'STU_001', 40);
      expect(sessions).toHaveLength(4);
      expect(sessions[0].dateStr).toBe('2026-10-26'); // Monday
      expect(sessions[0].dayName).toBe('Monday');
      expect(sessions[1].dateStr).toBe('2026-10-28'); // Wednesday
      expect(sessions[2].dateStr).toBe('2026-11-02'); // Monday
      expect(sessions[3].dateStr).toBe('2026-11-04'); // Wednesday
    });

    it('detects duplicate sessions when repeat scheduling occurs', () => {
      const existing: ClassSession[] = [
        {
          session_id: 'cls_1',
          student_id: 'STU_001',
          scheduled_start: '2026-10-26T16:00:00.000Z',
          scheduled_end: '2026-10-26T16:40:00.000Z',
          status: 'SCHEDULED',
        },
      ];
      const sessions = generateProposedSessions(schedules, '2026-10-26', 2, existing, 'STU_001', 40);
      expect(sessions[0].isDuplicate).toBe(true);
      expect(sessions[0].hasConflict).toBe(true);
      expect(sessions[1].isDuplicate).toBe(false);
    });
  });

  describe('4. Full Weekly Calendar Grid Building & Distinction', () => {
    it('builds 7 day columns and distinguishes recurring slots from dated sessions', () => {
      const weekDates = [
        '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29',
        '2026-10-30', '2026-10-31', '2026-11-01',
      ];

      const datedSessions: ClassSession[] = [
        {
          session_id: 'ds_1',
          student_id: 'STU_001',
          student_name: 'Aarav Patel',
          scheduled_start: '2026-10-26T10:30:00.000Z', // 16:00 IST
          scheduled_end: '2026-10-26T11:10:00.000Z',   // 16:40 IST
          duration_minutes: 40,
          status: 'SCHEDULED',
        },
      ];

      const recurringSchedules: WeeklyScheduleEntry[] = [
        // STU_001 recurring slot on Monday (same slot as dated session -> should be suppressed)
        { schedule_id: 'rs_1', student_id: 'STU_001', student_name: 'Aarav Patel', day_of_week: 'MONDAY', start_time: '16:00', end_time: '16:40', is_active: true },
        // STU_002 recurring slot on Wednesday (distinct -> rendered as recurring slot)
        { schedule_id: 'rs_2', student_id: 'STU_002', student_name: 'Diya Sharma', day_of_week: 'WEDNESDAY', start_time: '17:00', end_time: '18:00', is_active: true },
      ];

      const columns = buildDayColumns({
        datedSessions,
        recurringSchedules,
        students: [
          { student_id: 'STU_001', student_name: 'Aarav Patel', status: 'ACTIVE' } as Student,
          { student_id: 'STU_002', student_name: 'Diya Sharma', status: 'ACTIVE' } as Student,
        ],
        weekDates,
        activeTz: 'Asia/Kolkata',
      });

      expect(columns).toHaveLength(7);

      // Monday (2026-10-26) should have the dated session, NOT duplicated recurring
      const monCol = columns[0];
      expect(monCol.events).toHaveLength(1);
      expect(monCol.events[0].isRecurring).toBe(false);
      expect(monCol.events[0].studentName).toBe('Aarav Patel');

      // Wednesday (2026-10-28) should have the recurring slot
      const wedCol = columns[2];
      expect(wedCol.events).toHaveLength(1);
      expect(wedCol.events[0].isRecurring).toBe(true);
      expect(wedCol.events[0].studentName).toBe('Diya Sharma');
    });

    it('supports calendar route registration in routeAccess', () => {
      expect(ROUTE_CONFIGS.calendar).toBeDefined();
      expect(ROUTE_CONFIGS.calendar.id).toBe('calendar');
      expect(ROUTE_CONFIGS.calendar.title).toBe('Weekly Calendar');
    });
  });
});
