export const ALLOWED_CLASS_DURATIONS = [30, 40, 60] as const;
export type AllowedClassDuration = (typeof ALLOWED_CLASS_DURATIONS)[number];

export interface EndTimeCalculation {
  endTime: string;
  crossesMidnight: boolean;
  isValid: boolean;
  error?: string;
}

export function isValidClassDuration(duration: unknown): duration is AllowedClassDuration {
  return typeof duration === 'number' && ALLOWED_CLASS_DURATIONS.includes(duration as AllowedClassDuration);
}

export function calculateScheduleEndTime(startTime: string, durationMinutes: number): EndTimeCalculation {
  if (!startTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    return { endTime: '', crossesMidnight: false, isValid: false, error: 'Valid start time required (HH:MM)' };
  }
  if (!isValidClassDuration(durationMinutes)) {
    return { endTime: '', crossesMidnight: false, isValid: false, error: 'Valid class duration (30, 40, or 60 mins) required' };
  }

  const [h, m] = startTime.split(':').map((n) => parseInt(n, 10));
  const totalMin = h * 60 + m + durationMinutes;

  if (totalMin >= 24 * 60) {
    return { endTime: '', crossesMidnight: true, isValid: false, error: 'Schedule crosses midnight. Choose an earlier start time.' };
  }

  const endH = Math.floor(totalMin / 60);
  const endM = totalMin % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return { endTime: `${pad(endH)}:${pad(endM)}`, crossesMidnight: false, isValid: true };
}

export function calculateEndTime(startTime: string, durationMinutes: number): string | null {
  const res = calculateScheduleEndTime(startTime, durationMinutes);
  return res.isValid ? res.endTime : null;
}

export function formatDurationLabel(duration?: number | null): string {
  if (!duration || !isValidClassDuration(duration)) {
    return 'Not configured';
  }
  return `${duration} minutes`;
}
