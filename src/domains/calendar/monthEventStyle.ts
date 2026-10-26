import { ClassSession } from '../classes/classTypes';

export interface MonthSessionStyle {
  bg: string;
  border: string;
  color: string;
  opacity: number;
}

export function getMonthSessionStyle(sess: ClassSession, isPast: boolean): MonthSessionStyle {
  const isCompleted = sess.session_status === 'COMPLETED' || sess.attendance_status === 'PRESENT' || sess.status === 'COMPLETED';
  const isCancelled = sess.session_status === 'CANCELLED' || sess.status === 'CANCELLED';
  const isAbsent = sess.attendance_status === 'ABSENT' || sess.attendance_status === 'NO_SHOW';

  if (isCancelled || isAbsent) {
    return { bg: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', opacity: 0.82 };
  }
  if ((isPast && isCompleted) || isCompleted) {
    return { bg: '#f4fdf8', border: '1px solid #bbf7d0', color: '#166534', opacity: 0.74 };
  }
  return { bg: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', opacity: 1 };
}
