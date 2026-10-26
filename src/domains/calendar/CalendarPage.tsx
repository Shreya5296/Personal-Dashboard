import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchClasses } from '../classes/classApi';
import { fetchSchedules, WeeklyScheduleEntry } from '../classes/scheduleApi';
import { fetchStudents } from '../students/studentApi';
import { fetchPackages } from '../packages/packageApi';
import { ClassSession } from '../classes/classTypes';
import { Student } from '../students/studentTypes';
import { Package } from '../packages/packageTypes';
import { getSavedTimezone } from '../../lib/userPreferences';
import { toInputDateFormat } from '../../lib/dateFormat';
import { getMondayForDateStr, shiftMondayStr, getWeekDates } from '../dashboard/calendarEventGenerator';
import { CalendarViewMode } from './calendarTypes';
import { shiftDateStr, shiftMonthStr, formatMonthTitle, formatDayTitle, formatWeekRangeTitle } from './calendarDateUtils';
import { buildDayColumns } from './calendarGridBuilder';
import { WeeklyTimeGrid } from './WeeklyTimeGrid';
import { DayCalendarView } from './DayCalendarView';
import { MonthCalendarView } from './MonthCalendarView';
import { CalendarControlsBar } from './CalendarControlsBar';
import { PageHeader } from '../../layout/PageHeader';
import { LoadingState } from '../../components/feedback/LoadingState';
import { ErrorState } from '../../components/feedback/ErrorState';

export const CalendarPage: React.FC = () => {
  usePageTitle('Class Calendar');
  const { token } = useAuth();
  const activeTz = getSavedTimezone() || 'Asia/Kolkata';

  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [mondayStr, setMondayStr] = useState<string>(() =>
    getMondayForDateStr(toInputDateFormat(new Date(), activeTz))
  );
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() =>
    toInputDateFormat(new Date(), activeTz)
  );
  const [yearMonthStr, setYearMonthStr] = useState<string>(() =>
    toInputDateFormat(new Date(), activeTz).slice(0, 7)
  );

  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [schedules, setSchedules] = useState<WeeklyScheduleEntry[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCalendarData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cls, scheds, stuList, pkgs] = await Promise.all([
        fetchClasses(undefined, token).catch(() => []),
        fetchSchedules(undefined, token).catch(() => []),
        fetchStudents({}, token).catch(() => []),
        fetchPackages(undefined, token).catch(() => []),
      ]);
      setClasses(cls);
      setSchedules(scheds);
      setStudents(stuList);
      setPackages(pkgs);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCalendarData(); }, [token]);

  const weekDates = getWeekDates(mondayStr);
  const sundayStr = weekDates[6];
  const dayColumns = buildDayColumns({
    datedSessions: classes, recurringSchedules: schedules, students, weekDates, activeTz, packages,
  });
  const totalWeekEvents = dayColumns.reduce((acc, col) => acc + col.events.length, 0);

  const dayCol = viewMode === 'day' ? buildDayColumns({
    datedSessions: classes, recurringSchedules: schedules, students, weekDates: [selectedDateStr], activeTz, packages,
  })[0] : null;
  const dayEvents = dayCol ? dayCol.events : [];
  const isDayToday = selectedDateStr === toInputDateFormat(new Date(), activeTz);

  const handlePrev = () => {
    if (viewMode === 'day') setSelectedDateStr((d) => shiftDateStr(d, -1));
    else if (viewMode === 'week') setMondayStr((m) => shiftMondayStr(m, -7));
    else setYearMonthStr((ym) => shiftMonthStr(ym, -1));
  };
  const handleNext = () => {
    if (viewMode === 'day') setSelectedDateStr((d) => shiftDateStr(d, 1));
    else if (viewMode === 'week') setMondayStr((m) => shiftMondayStr(m, 7));
    else setYearMonthStr((ym) => shiftMonthStr(ym, 1));
  };
  const handleToday = () => {
    const today = toInputDateFormat(new Date(), activeTz);
    setSelectedDateStr(today);
    setMondayStr(getMondayForDateStr(today));
    setYearMonthStr(today.slice(0, 7));
  };

  let titleText = formatWeekRangeTitle(mondayStr, sundayStr);
  let countLabel: string | undefined = `${totalWeekEvents} ${totalWeekEvents === 1 ? 'class slot' : 'class slots'}`;
  if (viewMode === 'day') {
    titleText = formatDayTitle(selectedDateStr, activeTz);
    countLabel = undefined;
  } else if (viewMode === 'month') {
    titleText = formatMonthTitle(yearMonthStr);
    countLabel = undefined;
  }

  return (
    <div>
      <PageHeader title="Class Calendar" />
      <CalendarControlsBar
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        titleText={titleText}
        countLabel={countLabel}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onRefresh={loadCalendarData}
      />
      {loading && <LoadingState message="Loading calendar…" />}
      {error && !loading && <ErrorState message={error} onRetry={loadCalendarData} />}
      {!loading && !error && viewMode === 'day' && (
        <DayCalendarView selectedDateStr={selectedDateStr} events={dayEvents} isToday={isDayToday} />
      )}
      {!loading && !error && viewMode === 'week' && <WeeklyTimeGrid dayColumns={dayColumns} />}
      {!loading && !error && viewMode === 'month' && (
        <MonthCalendarView
          yearMonthStr={yearMonthStr}
          sessions={classes}
          students={students}
          activeTz={activeTz}
          onSelectDate={(d) => {
            setSelectedDateStr(d);
            setViewMode('day');
          }}
        />
      )}
    </div>
  );
};
