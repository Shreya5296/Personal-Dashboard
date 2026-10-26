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
    return { bg: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', opacity: 0.82 };
  }
  if (cat === 'PAST_COMPLETED') {
    return { bg: '#f4fdf8', border: '1px solid #bbf7d0', color: '#166534', opacity: 0.7 };
  }
  return { bg: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', opacity: 1 };
}
