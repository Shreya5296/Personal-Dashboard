import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchClasses } from '../classes/classApi';
import { fetchSchedules, WeeklyScheduleEntry } from '../classes/scheduleApi';
import { fetchStudents } from '../students/studentApi';
import { ClassSession } from '../classes/classTypes';
import { Student } from '../students/studentTypes';
import { getSavedTimezone } from '../../lib/userPreferences';
import { toInputDateFormat } from '../../lib/dateFormat';
import { getMondayForDateStr, shiftMondayStr, getWeekDates } from '../dashboard/calendarEventGenerator';
import { buildDayColumns } from './calendarGridBuilder';
import { WeeklyTimeGrid } from './WeeklyTimeGrid';
import { PageHeader } from '../../layout/PageHeader';
import { Button } from '../../components/buttons/Button';
import { LoadingState } from '../../components/feedback/LoadingState';
import { ErrorState } from '../../components/feedback/ErrorState';

export const CalendarPage: React.FC = () => {
  usePageTitle('Weekly Class Calendar');
  const { token } = useAuth();
  const activeTz = getSavedTimezone() || 'Asia/Kolkata';

  const [mondayStr, setMondayStr] = useState<string>(() =>
    getMondayForDateStr(toInputDateFormat(new Date(), activeTz))
  );

  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [schedules, setSchedules] = useState<WeeklyScheduleEntry[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCalendarData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cls, scheds, stuList] = await Promise.all([
        fetchClasses(undefined, token).catch(() => []),
        fetchSchedules(undefined, token).catch(() => []),
        fetchStudents({}, token).catch(() => []),
      ]);
      setClasses(cls);
      setSchedules(scheds);
      setStudents(stuList);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, [token]);

  const weekDates = getWeekDates(mondayStr);
  const sundayStr = weekDates[6];

  const dayColumns = buildDayColumns({
    datedSessions: classes,
    recurringSchedules: schedules,
    students,
    weekDates,
    activeTz,
  });

  const totalEvents = dayColumns.reduce((acc, col) => acc + col.events.length, 0);

  const handlePrev = () => setMondayStr((prev) => shiftMondayStr(prev, -7));
  const handleNext = () => setMondayStr((prev) => shiftMondayStr(prev, 7));
  const handleToday = () => setMondayStr(getMondayForDateStr(toInputDateFormat(new Date(), activeTz)));

  return (
    <div>
      <PageHeader
        title="Weekly Class Calendar"
        subtitle={`Time-grid view of all scheduled classes and recurring slots in ${activeTz}.`}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Button variant="secondary" size="sm" onClick={loadCalendarData} aria-label="Refresh calendar">
              ↻ Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={handlePrev} aria-label="Previous week">
              ‹ Prev Week
            </Button>
            <Button variant="secondary" size="sm" onClick={handleToday}>
              This Week
            </Button>
            <Button variant="secondary" size="sm" onClick={handleNext} aria-label="Next week">
              Next Week ›
            </Button>
          </div>
        }
      />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-3)',
        flexWrap: 'wrap',
        gap: 'var(--space-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}>
            {mondayStr} – {sundayStr}
          </span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            ({totalEvents} {totalEvents === 1 ? 'class slot' : 'class slots'})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#ecfdf5', border: '1px solid #059669', borderRadius: '2px' }} />
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Dated Session</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#f0fdf4', border: '1px dashed #10b981', borderRadius: '2px' }} />
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Recurring Slot</span>
          </div>
        </div>
      </div>

      {loading && <LoadingState message="Loading weekly calendar…" />}
      {error && !loading && <ErrorState message={error} onRetry={loadCalendarData} />}
      {!loading && !error && <WeeklyTimeGrid dayColumns={dayColumns} />}
    </div>
  );
};
