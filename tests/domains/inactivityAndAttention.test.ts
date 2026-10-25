import { describe, it, expect } from 'vitest';
import {
  calculateOneCalendarMonthBefore,
  getLatestCompletedClassDate,
  isStudentActive,
} from '../../src/domains/students/studentStatusClassifier';
import { generateAttentionAlerts } from '../../src/domains/dashboard/attentionAlerts';
import { Student } from '../../src/domains/students/studentTypes';
import { ClassSession } from '../../src/domains/classes/classTypes';
import { Package } from '../../src/domains/packages/packageTypes';
import { MeetingLink } from '../../src/domains/meeting-links/meetingLinkTypes';

describe('Fix 3 — Inactivity Calculation & Dashboard Attention Alerts', () => {
  describe('Calendar-month arithmetic with month-end clamping', () => {
    it('calculates 1 calendar month before standard dates', () => {
      expect(calculateOneCalendarMonthBefore('2026-10-25')).toBe('2026-09-25');
      expect(calculateOneCalendarMonthBefore('2026-11-15')).toBe('2026-10-15');
      expect(calculateOneCalendarMonthBefore('2026-01-10')).toBe('2025-12-10');
    });

    it('clamps to month length for shorter previous months (e.g. March 31 -> Feb 28/29)', () => {
      // 2026 is non-leap (Feb has 28 days)
      expect(calculateOneCalendarMonthBefore('2026-03-31')).toBe('2026-02-28');
      expect(calculateOneCalendarMonthBefore('2026-03-30')).toBe('2026-02-28');
      expect(calculateOneCalendarMonthBefore('2026-03-29')).toBe('2026-02-28');

      // 2024 is leap year (Feb has 29 days)
      expect(calculateOneCalendarMonthBefore('2024-03-31')).toBe('2024-02-29');

      // May 31 -> April 30 (April has 30 days)
      expect(calculateOneCalendarMonthBefore('2026-05-31')).toBe('2026-04-30');
    });
  });

  describe('Student inactivity classification', () => {
    const studentActive: Student = { student_id: 'STU_ACTIVE', student_name: 'Active Student', status: 'ACTIVE' };
    const studentInactive: Student = { student_id: 'STU_INACTIVE', student_name: 'Inactive Student', status: 'ACTIVE' };
    const studentArchived: Student = { student_id: 'STU_ARCHIVED', student_name: 'Archived Student', status: 'ARCHIVED' };
    const studentNew: Student = { student_id: 'STU_NEW', student_name: 'Brand New Student', status: 'ACTIVE' };

    it('treats student with 0 completed classes as active', () => {
      // Student has no completed sessions -> lastCompletedDate is null
      expect(isStudentActive(studentNew, { lastCompletedDate: null, referenceDateStr: '2026-10-25' })).toBe(true);
    });

    it('treats student whose last completed class is < 1 calendar month ago as active', () => {
      // Completed on 2026-10-01 (less than 1 month before 2026-10-25)
      expect(isStudentActive(studentActive, { lastCompletedDate: '2026-10-01', referenceDateStr: '2026-10-25' })).toBe(true);
    });

    it('treats student whose last completed class is >= 1 calendar month ago as inactive', () => {
      // Completed on 2026-09-10 (more than 1 month before 2026-10-25, threshold is 2026-09-25)
      expect(isStudentActive(studentInactive, { lastCompletedDate: '2026-09-10', referenceDateStr: '2026-10-25' })).toBe(false);
    });

    it('treats archived or explicitly inactive student as inactive immediately', () => {
      expect(isStudentActive(studentArchived)).toBe(false);
    });
  });

  describe('Attention alerts exclusion for inactive students', () => {
    const students: Student[] = [
      { student_id: 'STU_ACTIVE', student_name: 'Active Student', status: 'ACTIVE' },
      { student_id: 'STU_INACTIVE', student_name: 'Inactive Student', status: 'ACTIVE' },
    ];

    const packages: Package[] = [
      { student_id: 'STU_ACTIVE', classes_purchased: 10, consumed_classes: 9, status: 'ACTIVE' }, // 1 class left
      { student_id: 'STU_INACTIVE', classes_purchased: 10, consumed_classes: 10, status: 'ACTIVE' }, // 0 classes left
    ];

    const sessions: ClassSession[] = [
      // Active student finished class recently: 2026-10-20
      { session_id: 's1', student_id: 'STU_ACTIVE', status: 'COMPLETED', scheduled_start: '2026-10-20T12:30:00.000Z' },
      // Inactive student last finished class 3 months ago: 2026-07-15
      { session_id: 's2', student_id: 'STU_INACTIVE', status: 'COMPLETED', scheduled_start: '2026-07-15T12:30:00.000Z' },
    ];

    const meetingLinks: MeetingLink[] = [
      // Neither student has a meeting link configured
    ];

    it('excludes inactive students from meeting-link and package renewal alerts', () => {
      const alerts = generateAttentionAlerts({
        students,
        schedules: [],
        meetingLinks,
        packages,
        sessions,
        referenceDateStr: '2026-10-25',
      });

      const inactiveAlerts = alerts.filter((a) => a.studentId === 'STU_INACTIVE');
      expect(inactiveAlerts).toHaveLength(0); // Inactive student is completely excluded!

      const activeAlerts = alerts.filter((a) => a.studentId === 'STU_ACTIVE');
      expect(activeAlerts.length).toBeGreaterThan(0);
      expect(activeAlerts.some((a) => a.reason === 'Meeting link not configured')).toBe(true);
      expect(activeAlerts.some((a) => a.reason.includes('1 class remaining'))).toBe(true);
    });
  });
});
