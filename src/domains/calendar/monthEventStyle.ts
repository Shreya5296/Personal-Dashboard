import { ClassSession } from '../classes/classTypes';
import { classifyCalendarEvent } from './calendarClassification';

export interface MonthSessionStyle {
  bg: string;
  border: string;
  color: string;
  opacity: number;
}

export function getMonthSessionStyle(sess: ClassSession, isPast: boolean): MonthSessionStyle {
  const cat = classifyCalendarEvent({
    status: sess.status,
    sessionStatus: sess.session_status,
    attendanceStatus: (sess as unknown as { attendance_status?: string }).attendance_status,
    isCancelled: sess.session_status === 'CANCELLED' || sess.status === 'CANCELLED',
    isPast,
  });

  if (cat === 'CANCELLED') {
    return { bg: '#fbe7e7', border: '1px solid #eab4b4', color: '#a63f3f', opacity: 0.82 };
  }
  if (cat === 'PAST_COMPLETED') {
    return { bg: '#e5f4ea', border: '1px solid #b7dfc4', color: '#276749', opacity: 0.82 };
  }
  return { bg: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', opacity: 1 };
}
