import { ClassSession } from '../classes/classTypes';
import { WeeklyScheduleEntry } from '../classes/scheduleApi';
import { Student } from '../students/studentTypes';
import { Package } from '../packages/packageTypes';
import { CalendarEventItem, DayColumnData } from './calendarTypes';
import { generateCalendarEvents, getDateKeyInTz, makeIsoInTz } from '../dashboard/calendarEventGenerator';
import { cleanTime } from '../classes/scheduleApi';
import { formatIsoTo12Hour } from '../../lib/time12Format';
import { toInputDateFormat } from '../../lib/dateFormat';
import { classifyCalendarEvent, isEventPast } from './calendarClassification';

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
      const dDate = c.schedule_date || c.class_date;
      if (dDate && dDate === dayKey) return true;
      const raw = c.scheduled_start || c.start_time;
      if (!raw) return false;
      const parsed = new Date(String(raw).trim().replace(/T\s+(\d:)/, 'T0$1'));
      return !isNaN(parsed.getTime()) && getDateKeyInTz(parsed, activeTz) === dayKey;
    });

    const events: CalendarEventItem[] = dayRawEvents.map((c, idx) => {
      const sTime = cleanTime(c.schedule_time || c.start_time);
      let rawStart = c.scheduled_start || '';
      if (sTime) {
        rawStart = makeIsoInTz(dayKey, sTime, activeTz);
      } else if (!rawStart) {
        rawStart = makeIsoInTz(dayKey, '17:00', activeTz);
      }
      const parsedStart = new Date(String(rawStart).trim().replace(/T\s+(\d:)/, 'T0$1'));

      const dur = c.duration_minutes || 60;
      let rawEnd = c.scheduled_end || '';
      if (sTime) {
        const [sh, sm] = sTime.split(':').map(Number);
        const endMins = (sh || 0) * 60 + (sm || 0) + dur;
        const eHH = String(Math.floor(endMins / 60)).padStart(2, '0');
        const eMM = String(endMins % 60).padStart(2, '0');
        rawEnd = makeIsoInTz(dayKey, `${eHH}:${eMM}`, activeTz);
      }

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
      const isPast = isEventPast(dayKey, rawEnd || rawStart, activeTz);
      const isCompleted = c.status === 'COMPLETED' || sessStatus === 'COMPLETED' || (c as unknown as { attendance_status?: string }).attendance_status === 'PRESENT';
      const canJoin = isToday && !isCancelled && !isCompleted && Boolean(c.meeting_url);
      const category = classifyCalendarEvent({
        status: c.status,
        sessionStatus: sessStatus,
        attendanceStatus: (c as unknown as { attendance_status?: string }).attendance_status,
        isCancelled,
        isPast,
      });

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
        durationMinutes: dur,
        startHour,
        startMinute,
        dateKey: dayKey,
        isRecurring,
        status: sessStatus || c.status || (isRecurring ? 'RECURRING' : 'SCHEDULED'),
        attendanceStatus: (c as unknown as { attendance_status?: string }).attendance_status,
        category,
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
