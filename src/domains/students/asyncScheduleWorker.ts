/**
 * Asynchronous, resumable background scheduler for dated class sessions.
 */
import { scheduleClass, fetchClasses } from '../classes/classApi';
import { generateProposedSessions } from '../classes/classGenerator';
import { ScheduleJob, ScheduleProgress } from './asyncScheduleTypes';

type ProgressListener = (progress: ScheduleProgress) => void;
const listeners = new Set<ProgressListener>();

let currentProgress: ScheduleProgress = {
  status: 'idle', studentName: '', current: 0, total: 0,
  createdCount: 0, skippedCount: 0, message: '',
};

export function subscribeScheduleProgress(listener: ProgressListener): () => void {
  listeners.add(listener);
  listener(currentProgress);
  return () => { listeners.delete(listener); };
}

function notify(progress: ScheduleProgress) {
  currentProgress = progress;
  listeners.forEach((l) => l(progress));
}

const STORAGE_KEY = 'ongoing_schedule_job_v1';

export async function startAsyncScheduling(job: ScheduleJob): Promise<void> {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(job)); } catch {}

  notify({
    status: 'running',
    studentName: job.studentName,
    current: 0,
    total: job.classesPurchased || 10,
    createdCount: 0,
    skippedCount: 0,
    message: 'Class schedule saved. Scheduling classes now…',
  });

  setTimeout(() => {
    runSchedulingJob(job).catch((err) => {
      notify({
        status: 'error',
        studentName: job.studentName,
        current: 0, total: 0, createdCount: 0, skippedCount: 0,
        message: `Scheduling error: ${(err as Error).message}`,
      });
    });
  }, 100);
}

export async function runSchedulingJob(job: ScheduleJob): Promise<void> {
  const existing = await fetchClasses(job.studentId, job.token).catch(() => []);
  const count = Math.max(1, job.classesPurchased || 10);
  const proposed = generateProposedSessions(
    job.schedules, job.firstClassDate, count, existing, job.studentId, job.durationMinutes
  );

  let created = 0;
  let skipped = 0;
  const total = proposed.length;

  for (let i = 0; i < proposed.length; i++) {
    const s = proposed[i];
    if (s.isDuplicate || s.hasConflict) {
      skipped++;
    } else {
      try {
        await scheduleClass({
          student_id: job.studentId,
          student_name: job.studentName,
          package_id: job.packageId,
          class_title: 'Class Session',
          start_time: s.scheduledStart,
          scheduled_start: s.scheduledStart,
          scheduled_end: s.scheduledEnd,
          duration_minutes: s.durationMinutes,
        }, job.token);
        created++;
      } catch {
        skipped++;
      }
    }

    notify({
      status: 'running',
      studentName: job.studentName,
      current: i + 1,
      total,
      createdCount: created,
      skippedCount: skipped,
      message: `Scheduling classes now… (${i + 1} of ${total})`,
    });
  }

  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}

  let finalMsg = `Scheduling complete: ${created} created`;
  if (skipped > 0) finalMsg += `, ${skipped} skipped (duplicates/conflicts)`;

  notify({
    status: 'completed',
    studentName: job.studentName,
    current: total,
    total,
    createdCount: created,
    skippedCount: skipped,
    message: finalMsg,
  });

  setTimeout(() => {
    if (currentProgress.status === 'completed') {
      notify({ status: 'idle', studentName: '', current: 0, total: 0, createdCount: 0, skippedCount: 0, message: '' });
    }
  }, 8000);
}
