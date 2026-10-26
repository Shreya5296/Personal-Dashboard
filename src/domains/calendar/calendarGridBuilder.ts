import { ClassSession } from '../classes/classTypes';
import { WeeklyScheduleEntry } from '../classes/scheduleApi';
import { Student } from '../students/studentTypes';
import { Package } from '../packages/packageTypes';
import { CalendarEventItem, DayColumnData } from './calendarTypes';
import { generateCalendarEvents, getDateKeyInTz, makeIsoInTz } from '../dashboard/calendarEventGenerator';
import { cleanTime } from '../classes/scheduleApi';
import { formatIsoTo12Hour } from '../../lib/time12Format';
import { toInputDateFormat } from '../../lib/dateFormat';

export function buildDayColumns(params: {
  datedSessions: ClassSession[];
  recurringSchedules: WeeklyScheduleEntry[];
  students: Student[];
  weekDates: string[];
  activeTz: string;
  packages?: Package[];
}): DayColumnData[] {
  const { datedSessions, recurringSchedules, students, weekDates, activeTz, packages } = params;
  const todayKey = toInputDateFormat(new Date(), activeTz);
  const nowMs = Date.now();

  const allEvents = generateCalendarEvents({
    datedSessions,
    recurringSchedules,
    students,
    weekDates,
    activeTz,
    packages,
  });

  return weekDates.map((dayKey) => {
    const [y, m, d] = dayKey.split('-').map(Number);
    const dayDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(dayDate);
    const dayNumber = String(d);
    const isToday = dayKey === todayKey;

    const dayRawEvents = allEvents.filter((c) => {
      const raw = c.start_time || c.scheduled_start;
      if (!raw) return false;
      const parsed = new Date(String(raw).trim().replace(/T\s+(\d:)/, 'T0$1'));
      return getDateKeyInTz(parsed, activeTz) === dayKey;
    });

    const events: CalendarEventItem[] = dayRawEvents.map((c, idx) => {
      let rawStart = c.scheduled_start || c.start_time || '';
      let parsedStart = new Date(String(rawStart).trim().replace(/T\s+(\d:)/, 'T0$1'));
      if (isNaN(parsedStart.getTime())) {
        const sTime = cleanTime(c.schedule_time || c.start_time) || '17:00';
        rawStart = makeIsoInTz(dayKey, sTime, activeTz);
        parsedStart = new Date(rawStart);
      }
      const rawEnd = c.scheduled_end || '';
      const parsedEnd = rawEnd ? new Date(String(rawEnd).trim().replace(/T\s+(\d:)/, 'T0$1')) : null;

      let startHour = 17;
      let startMinute = 0;
      if (!isNaN(parsedStart.getTime())) {
        try {
          const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: activeTz, hour: '2-digit', minute: '2-digit', hour12: false,
          }).formatToParts(parsedStart);
          startHour = parseInt(parts.find((p) => p.type === 'hour')?.value || '17', 10);
          startMinute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
        } catch {
          startHour = parsedStart.getHours();
          startMinute = parsedStart.getMinutes();
        }
      }

      const start12 = formatIsoTo12Hour(rawStart, activeTz);
      const end12 = rawEnd ? formatIsoTo12Hour(rawEnd, activeTz) : '';
      const isRecurring = Boolean((c as unknown as { is_recurring?: boolean }).is_recurring);
      const stu = students.find((s) => s.student_id === c.student_id);
      const sessStatus = (c as unknown as { session_status?: string }).session_status;
      const isCancelled = c.status === 'CANCELLED' || sessStatus === 'CANCELLED';
      const endMs = parsedEnd && !isNaN(parsedEnd.getTime())
        ? parsedEnd.getTime()
        : parsedStart.getTime() + (c.duration_minutes || 60) * 60000;
      const isPast = dayKey < todayKey || (dayKey === todayKey && endMs < nowMs);
      const isCompleted = c.status === 'COMPLETED' || sessStatus === 'COMPLETED' || (c as unknown as { attendance_status?: string }).attendance_status === 'PRESENT';
      const canJoin = isToday && !isCancelled && !isCompleted && Boolean(c.meeting_url);

      return {
        id: c.session_id || `evt_${idx}_${dayKey}`,
        studentId: c.student_id || '',
        studentName: c.student_name || c.student_id || 'Student',
        topic: c.topic || c.class_title || 'Class Session',
        subject: stu?.subject || c.topic || 'General',
        startIso: rawStart,
        endIso: rawEnd,
        startTime12: start12,
        endTime12: end12,
        timeRange12: end12 ? `${start12} – ${end12}` : start12,
        durationMinutes: c.duration_minutes || 60,
        startHour,
        startMinute,
        dateKey: dayKey,
        isRecurring,
        status: sessStatus || c.status || (isRecurring ? 'RECURRING' : 'SCHEDULED'),
        attendanceStatus: (c as unknown as { attendance_status?: string }).attendance_status,
        isPast,
        isCancelled,
        canJoin,
        meetingUrl: c.meeting_url,
      };
    });

    events.sort((a, b) => (a.startHour * 60 + a.startMinute) - (b.startHour * 60 + b.startMinute));

    return { dateKey: dayKey, dayName, dayNumber, isToday, events };
  });
}
