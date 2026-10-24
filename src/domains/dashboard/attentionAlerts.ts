import { Student } from '../students/studentTypes';
import { Package } from '../packages/packageTypes';
import { MeetingLink } from '../meeting-links/meetingLinkTypes';
import { WeeklyScheduleEntry } from '../classes/scheduleApi';
import { NavSection } from '../../layout/Sidebar';

export interface AttentionAlert {
  id: string;
  studentId: string;
  studentName: string;
  reason: string;
  severity: 'warning' | 'danger' | 'info';
  actionLabel: string;
  targetSection: NavSection;
  student: Student;
}

export function generateAttentionAlerts(params: {
  students: Student[];
  schedules: WeeklyScheduleEntry[];
  meetingLinks: MeetingLink[];
  packages: Package[];
}): AttentionAlert[] {
  const { students = [], schedules = [], meetingLinks = [], packages = [] } = params;

  // Filter only strictly ACTIVE students
  const activeStudents = students.filter((s) => {
    const st = (s.status || '').trim().toUpperCase();
    return st === 'ACTIVE' || (!st && (s as unknown as { is_active?: boolean }).is_active !== false);
  });

  const alerts: AttentionAlert[] = [];

  for (const stu of activeStudents) {
    const sid = stu.student_id;
    const sName = stu.student_name || stu.full_name || sid;

    // 1. Missing Meeting Link
    const link = meetingLinks.find((l) => l.student_id === sid);
    const hasValidLink = Boolean(
      (link?.meeting_link_1 && link.meeting_link_1.trim()) ||
      (link?.meeting_link_2 && link.meeting_link_2.trim()) ||
      (link?.meeting_url && link.meeting_url.trim())
    );

    if (!hasValidLink) {
      alerts.push({
        id: `alert_link_${sid}`,
        studentId: sid,
        studentName: sName,
        reason: 'No meeting link configured',
        severity: 'warning',
        actionLabel: 'Add Meeting Link',
        targetSection: 'meeting-links',
        student: stu,
      });
    }

    // 2. Missing Class Schedule
    const studentSchedules = schedules.filter((sch) => sch.student_id === sid && sch.is_active !== false);
    if (studentSchedules.length === 0) {
      alerts.push({
        id: `alert_sched_${sid}`,
        studentId: sid,
        studentName: sName,
        reason: 'No class schedule configured',
        severity: 'warning',
        actionLabel: 'Set Schedule',
        targetSection: 'students',
        student: stu,
      });
    }

    // 3. Four or fewer classes remaining
    const stuPkgs = packages.filter((p) => p.student_id === sid && p.status !== 'VOID' && p.status !== 'CANCELLED');
    if (stuPkgs.length > 0) {
      let totalPurchased = 0;
      let totalConsumed = 0;
      for (const p of stuPkgs) {
        totalPurchased += Number(p.classes_purchased !== undefined ? p.classes_purchased : p.total_classes) || 0;
        totalConsumed += Number(p.consumed_classes !== undefined ? p.consumed_classes : p.classes_consumed) || 0;
      }
      const remaining = Math.max(0, totalPurchased - totalConsumed);
      if (remaining <= 4) {
        alerts.push({
          id: `alert_balance_${sid}`,
          studentId: sid,
          studentName: sName,
          reason: remaining === 0 ? 'No classes remaining (balance exhausted)' : `${remaining} ${remaining === 1 ? 'class' : 'classes'} remaining`,
          severity: remaining === 0 ? 'danger' : 'warning',
          actionLabel: 'Renew Package',
          targetSection: 'finances',
          student: stu,
        });
      }
    }
  }

  return alerts;
}
