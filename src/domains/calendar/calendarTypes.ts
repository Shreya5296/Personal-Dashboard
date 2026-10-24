export interface CalendarEventItem {
  id: string;
  studentId: string;
  studentName: string;
  topic: string;
  subject: string;
  startIso: string;
  endIso: string;
  startTime12: string;
  endTime12: string;
  timeRange12: string;
  durationMinutes: number;
  startHour: number;
  startMinute: number;
  dateKey: string;
  isRecurring: boolean;
  status: string;
  attendanceStatus?: string;
  isPast?: boolean;
  isCancelled?: boolean;
  canJoin?: boolean;
  meetingUrl?: string;
}

export interface DayColumnData {
  dateKey: string;
  dayName: string;
  dayNumber: string;
  isToday: boolean;
  events: CalendarEventItem[];
}
