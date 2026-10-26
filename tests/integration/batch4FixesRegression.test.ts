import { describe, it, expect } from 'vitest';
import { formatWeekRangeTitle } from '../../src/domains/calendar/calendarDateUtils';
import { formatDateDdMmYyyy } from '../../src/lib/dateFormat';
import { getMonthSessionStyle } from '../../src/domains/calendar/monthEventStyle';
import { buildClassScheduleColumns } from '../../src/domains/classes/classScheduleColumns';
import { formatCurrency } from '../../src/lib/currencyFormat';
import { formatOutstandingBalance } from '../../src/lib/balanceFormat';
import { ClassSession } from '../../src/domains/classes/classTypes';

describe('Fix Batch 4 — Calendar, Tables, Finance Currency & Navigation', () => {
  it('Fix 1: past completed month sessions are muted and cancelled are semantic red', () => {
    const completedSession: ClassSession = {
      session_id: 'SESS_001', student_id: 'STU_001', status: 'COMPLETED', session_status: 'COMPLETED',
      attendance_status: 'PRESENT',
    };
    const pastStyle = getMonthSessionStyle(completedSession, true);
    expect(pastStyle.bg).toBe('#e5f4ea');
    expect(pastStyle.border).toContain('#b7dfc4');
    expect(pastStyle.color).toBe('#276749');
    expect(pastStyle.opacity).toBeLessThanOrEqual(0.85);

    const cancelledSession: ClassSession = {
      session_id: 'SESS_002', student_id: 'STU_002', status: 'CANCELLED', session_status: 'CANCELLED',
      attendance_status: 'CANCELLED',
    };
    const cancelStyle = getMonthSessionStyle(cancelledSession, false);
    expect(cancelStyle.bg).toBe('#fbe7e7');
    expect(cancelStyle.color).toBe('#a63f3f');
    expect(cancelStyle.border).toContain('#eab4b4');
  });

  it('Fix 2: formatWeekRangeTitle formats human-friendly week titles with month names', () => {
    expect(formatWeekRangeTitle('2026-09-28', '2026-10-04')).toBe('28 Sep – 04 Oct 2026');
    expect(formatWeekRangeTitle('2026-10-26', '2026-10-31')).toBe('26 – 31 Oct 2026');
    expect(formatWeekRangeTitle('2026-12-28', '2027-01-03')).toBe('28 Dec 2026 – 03 Jan 2027');
  });

  it('Fix 2: formatDateDdMmYyyy formats full dates as dd/mm/yyyy', () => {
    expect(formatDateDdMmYyyy('2026-10-04')).toBe('04/10/2026');
    expect(formatDateDdMmYyyy('2026-01-05')).toBe('05/01/2026');
    expect(formatDateDdMmYyyy(new Date(Date.UTC(2026, 9, 26, 12, 0, 0)))).toBe('26/10/2026');
    expect(formatDateDdMmYyyy(null)).toBe('—');
  });

  it('Fix 5: class schedule columns define balanced proportional widths summing to 100%', () => {
    const cols = buildClassScheduleColumns({
      todayKey: '2026-10-26',
      nowMs: Date.now(),
      getStudentConsumedClasses: () => ({ consumed: 2, purchased: 10 }),
      getStudentMeetingLink: () => undefined,
      handleUpdateStatus: async () => {},
      handleRestore: async () => {},
    });

    const widths = cols.map((c) => parseInt(c.width || '0', 10));
    const totalWidth = widths.reduce((sum, w) => sum + w, 0);
    expect(totalWidth).toBe(100);
    expect(cols.find((c) => c.key === 'student')?.width).toBe('18%');
    expect(cols.find((c) => c.key === 'date')?.width).toBe('17%');
    expect(cols.find((c) => c.key === 'start_time')?.width).toBe('15%');
    expect(cols.find((c) => c.key === 'consumed')?.width).toBe('14%');
    expect(cols.find((c) => c.key === 'join')?.width).toBe('12%');
    expect(cols.find((c) => c.key === 'attendance')?.width).toBe('24%');
  });

  it('Fix 6: foreign student currency (STU_005 GBP) formats correctly and balances balance', () => {
    const stu5InvoicedGbp = formatCurrency(150, true, 'GBP');
    expect(stu5InvoicedGbp).toBe('£150');

    const inrEquiv = formatCurrency(19000, true, 'INR');
    expect(inrEquiv).toBe('₹19,000');

    const outGbp = formatOutstandingBalance(0, 'GBP');
    expect(outGbp.text).toBe('NIL');
    expect(outGbp.color).toBe('#64748b');

    const outDueGbp = formatOutstandingBalance(50, 'GBP');
    expect(outDueGbp.text).toBe('£50');
    expect(outDueGbp.color).toBe('#dc2626');
  });
});
