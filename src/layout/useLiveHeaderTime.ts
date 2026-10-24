import { useState, useEffect } from 'react';
import { getSavedTimezone } from '../lib/userPreferences';

export interface HeaderTimeInfo {
  dateStr: string;
  timeStr: string;
}

export function useLiveHeaderTime(): HeaderTimeInfo {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeZone = getSavedTimezone() || 'Asia/Kolkata';

  let dateStr = '';
  let timeStr = '';

  try {
    dateStr = new Intl.DateTimeFormat('en-IN', {
      timeZone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(now);

    timeStr = new Intl.DateTimeFormat('en-IN', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(now);
  } catch {
    dateStr = now.toLocaleDateString();
    timeStr = now.toLocaleTimeString();
  }

  return { dateStr, timeStr };
}
