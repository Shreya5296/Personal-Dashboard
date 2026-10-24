export interface CalendarEventItem {
  id: string;
  studentId: string;
  studentName: string;
  topic: string;
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
  meetingUrl?: string;
}

export interface DayColumnData {
  dateKey: string;
  dayName: string;
  dayNumber: string;
  isToday: boolean;
  events: CalendarEventItem[];
}
