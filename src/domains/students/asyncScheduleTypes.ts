import { WeeklyScheduleEntry } from '../classes/scheduleApi';

export interface ScheduleJob {
  studentId: string;
  studentName: string;
  packageId?: string;
  firstClassDate: string;
  schedules: WeeklyScheduleEntry[];
  durationMinutes?: number;
  classesPurchased?: number;
  token?: string | null;
}

export interface ScheduleProgress {
  status: 'idle' | 'running' | 'completed' | 'error';
  studentName: string;
  current: number;
  total: number;
  createdCount: number;
  skippedCount: number;
  message: string;
}
