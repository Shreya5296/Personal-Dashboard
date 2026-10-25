import { ClassSession } from './classTypes';
import { Package } from '../packages/packageTypes';

export interface SessionProgress {
  sessionNumber: number;
  totalClasses: number;
  remainingAfterSession: number;
  display: string;
  remainingDisplay: string;
  countsTowardPackage: boolean;
}

export function isSessionDeductible(session: ClassSession): boolean {
  if (session.deduct_class === true || session.deduct_class === ('true' as any) || session.deduct_class === ('TRUE' as any)) {
    return true;
  }
  const sStatus = (session.session_status || session.status || '').toUpperCase();
  const aStatus = (session.attendance_status || '').toUpperCase();
  if (sStatus === 'CANCELLED' || aStatus === 'CANCELLED') {
    return false;
  }
  return true;
}

export function buildSessionProgressMap(
  sessions: ClassSession[],
  packages: Package[]
): Map<string, SessionProgress> {
  const map = new Map<string, SessionProgress>();

  // Group packages by student
  const packagesByStudent = new Map<string, Package[]>();
  for (const pkg of packages) {
    if (!pkg.student_id) continue;
    const list = packagesByStudent.get(pkg.student_id) || [];
    list.push(pkg);
    packagesByStudent.set(pkg.student_id, list);
  }

  // Group sessions by student
  const sessionsByStudent = new Map<string, ClassSession[]>();
  for (const sess of sessions) {
    const sid = sess.student_id || 'UNKNOWN';
    const list = sessionsByStudent.get(sid) || [];
    list.push(sess);
    sessionsByStudent.set(sid, list);
  }

  sessionsByStudent.forEach((studentSessions, sid) => {
    const stuPkgs = packagesByStudent.get(sid) || [];

    // Sort chronologically: date ASC, then time ASC
    const sorted = [...studentSessions].sort((a, b) => {
      const dateA = a.schedule_date || a.class_date || (a.scheduled_start ? a.scheduled_start.slice(0, 10) : '');
      const dateB = b.schedule_date || b.class_date || (b.scheduled_start ? b.scheduled_start.slice(0, 10) : '');
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      const timeA = a.schedule_time || a.start_time || (a.scheduled_start ? a.scheduled_start.slice(11, 16) : '');
      const timeB = b.schedule_time || b.start_time || (b.scheduled_start ? b.scheduled_start.slice(11, 16) : '');
      return timeA.localeCompare(timeB);
    });

    let primaryPkg = stuPkgs[0];
    let totalPurchased = 0;
    for (const p of stuPkgs) {
      const count = Number(p.classes_purchased !== undefined ? p.classes_purchased : p.total_classes) || 0;
      totalPurchased += count;
    }
    const pkgTotal = totalPurchased || (primaryPkg ? Number(primaryPkg.classes_purchased || primaryPkg.total_classes) || 0 : 0);

    let runningPosition = 0;

    for (const s of sorted) {
      const counts = isSessionDeductible(s);
      let sessionNumber = 0;
      let remaining = 0;

      if (counts) {
        runningPosition++;
        sessionNumber = pkgTotal > 0 ? Math.min(runningPosition, pkgTotal) : runningPosition;
        remaining = pkgTotal > 0 ? Math.max(0, pkgTotal - sessionNumber) : 0;
      } else {
        sessionNumber = runningPosition;
        remaining = pkgTotal > 0 ? Math.max(0, pkgTotal - runningPosition) : 0;
      }

      const padNum = String(sessionNumber).padStart(2, '0');
      const display = pkgTotal > 0
        ? (counts ? `${padNum} / ${pkgTotal}` : `— / ${pkgTotal}`)
        : (counts ? `${padNum} / —` : `— / —`);

      const remainingDisplay = pkgTotal > 0
        ? `${remaining} remaining${!counts ? ' (not deducted)' : ''}`
        : 'No package';

      const key = s.session_id || `${s.student_id}__${s.schedule_date}__${s.schedule_time}`;
      map.set(key, {
        sessionNumber,
        totalClasses: pkgTotal,
        remainingAfterSession: remaining,
        display,
        remainingDisplay,
        countsTowardPackage: counts,
      });
    }
  });

  return map;
}
