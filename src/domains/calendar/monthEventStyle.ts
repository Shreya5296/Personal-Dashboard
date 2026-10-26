import { ClassSession } from '../classes/classTypes';

export interface MonthSessionStyle {
  bg: string;
  border: string;
  color: string;
  opacity: number;
}

export function getMonthSessionStyle(sess: ClassSession, isPast: boolean): MonthSessionStyle {
  const isCompleted = sess.session_status === 'COMPLETED' || sess.attendance_status === 'PRESENT';
  const isCancelled = sess.session_status === 'CANCELLED' || sess.status === 'CANCELLED';

  if (isCancelled) {
    return { bg: '#f8fafc', border: '1px solid #cbd5e1', color: '#64748b', opacity: 0.8 };
  }
  if (isPast && isCompleted) {
    return { bg: '#f4fdf8', border: '1px solid #bbf7d0', color: '#166534', opacity: 0.82 };
  }
  return { bg: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', opacity: 1 };
}
