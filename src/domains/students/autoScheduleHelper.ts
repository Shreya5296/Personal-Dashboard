import { Student } from './studentTypes';
import { WeeklyScheduleEntry } from '../classes/scheduleApi';
import { fetchClasses, scheduleClass } from '../classes/classApi';
import { fetchPackages } from '../packages/packageApi';
import { generateProposedSessions } from '../classes/classGenerator';

export interface AutoScheduleResult {
  createdCount: number;
  skippedCount: number;
  message: string;
}

export async function executeAutoSchedule(params: {
  student: Student;
  packageId?: string;
  schedules: WeeklyScheduleEntry[];
  firstClassDate: string;
  durationMinutes?: number;
  classesPurchased?: number;
  token?: string | null;
}): Promise<AutoScheduleResult> {
  const { student, packageId, schedules, firstClassDate, durationMinutes, classesPurchased, token } = params;

  if (!firstClassDate || schedules.length === 0) {
    return { createdCount: 0, skippedCount: 0, message: 'No schedule or start date provided' };
  }

  // 1. Fetch current packages and sessions
  const [existingSessions, pkgs] = await Promise.all([
    fetchClasses(student.student_id, token).catch(() => []),
    fetchPackages(student.student_id, token).catch(() => []),
  ]);

  // Determine balance
  let balanceCount = classesPurchased || 0;
  let activePkgId = packageId;
  let endDate: string | undefined;

  if (pkgs.length > 0) {
    const pkg = pkgs.find((p) => p.package_id === packageId) || pkgs[0];
    activePkgId = pkg.package_id;
    endDate = pkg.end_date;
    const purchased = Number(pkg.classes_purchased !== undefined ? pkg.classes_purchased : pkg.total_classes) || 0;
    const consumed = Number(pkg.consumed_classes !== undefined ? pkg.consumed_classes : pkg.classes_consumed) || 0;
    balanceCount = Math.max(0, purchased - consumed);
  }

  if (balanceCount <= 0 && classesPurchased) {
    balanceCount = classesPurchased;
  }
  const countToSchedule = Math.max(1, balanceCount || 10);

  // 2. Generate proposed sessions
  const proposed = generateProposedSessions(
    schedules,
    firstClassDate,
    countToSchedule,
    existingSessions,
    student.student_id,
    durationMinutes
  );

  let createdCount = 0;
  let skippedCount = 0;

  for (const s of proposed) {
    // Respect package expiry
    if (endDate && s.dateStr > endDate) {
      skippedCount++;
      continue;
    }

    // Skip duplicates
    if (s.isDuplicate) {
      skippedCount++;
      continue;
    }

    try {
      await scheduleClass({
        student_id: student.student_id,
        student_name: student.student_name,
        package_id: activePkgId,
        class_title: `${student.subject || 'Class'} Session`,
        start_time: s.scheduledStart,
        scheduled_start: s.scheduledStart,
        scheduled_end: s.scheduledEnd,
        duration_minutes: s.durationMinutes,
      }, token);
      createdCount++;
    } catch {
      // Partial failure tracking
      skippedCount++;
    }
  }

  let message = `Scheduled ${createdCount} class session(s).`;
  if (skippedCount > 0) {
    message += ` (${skippedCount} skipped as duplicate or past package expiry)`;
  }

  return { createdCount, skippedCount, message };
}
