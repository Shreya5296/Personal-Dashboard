import { useState, useEffect } from 'react';
import { Student } from '../students/studentTypes';
import { Package } from '../packages/packageTypes';
import { WeeklyScheduleEntry, fetchSchedules, cleanTime } from './scheduleApi';
import { fetchStudents } from '../students/studentApi';
import { fetchPackages } from '../packages/packageApi';
import { calculateEndTime } from './scheduleDurationCalculator';

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export function useClassScheduling(initialStudentId: string | undefined, token: string | null) {
  const [selectedStudentId, setSelectedStudentId] = useState(
    initialStudentId && initialStudentId !== 'stu_general' ? initialStudentId : ''
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<WeeklyScheduleEntry[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [classDate, setClassDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('17:00');
  const [timeSource, setTimeSource] = useState<'recurring' | 'custom'>('custom');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStudents({}, token).then((data) => {
      setStudents(data);
      if (data.length > 0 && !selectedStudentId) setSelectedStudentId(data[0].student_id);
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);
    Promise.all([
      fetchSchedules(selectedStudentId, token).catch(() => []),
      fetchPackages(selectedStudentId, token).catch(() => []),
    ]).then(([schedList, pkgList]) => {
      setSchedules(schedList);
      setPackages(pkgList);
      setLoading(false);
    });
  }, [selectedStudentId, token]);

  const activePkg = packages.find((p) => p.status === 'ACTIVE') || packages[0];
  const durationMinutes = Number(activePkg?.class_duration) || 60;

  // Derive start time whenever classDate or schedules change
  useEffect(() => {
    if (!classDate || !/^\d{4}-\d{2}-\d{2}$/.test(classDate)) return;
    const [y, m, d] = classDate.split('-').map(Number);
    const dayName = DAY_NAMES[new Date(y, m - 1, d).getDay()];
    const matching = schedules.find((s) => s.day_of_week.toUpperCase() === dayName && s.is_active !== false);

    if (matching && matching.start_time) {
      setStartTime(cleanTime(matching.start_time));
      setTimeSource('recurring');
    } else if (schedules.length > 0 && schedules[0].start_time) {
      setStartTime(cleanTime(schedules[0].start_time));
      setTimeSource('recurring');
    } else {
      setTimeSource('custom');
    }
  }, [classDate, schedules]);

  const endTime = calculateEndTime(startTime, durationMinutes);
  const selectedStudent = students.find((s) => s.student_id === selectedStudentId);

  return {
    selectedStudentId,
    setSelectedStudentId,
    students,
    selectedStudent,
    classDate,
    setClassDate,
    startTime,
    setStartTime,
    timeSource,
    durationMinutes,
    hasPackageDuration: Boolean(activePkg?.class_duration),
    endTime,
    loading,
  };
}
