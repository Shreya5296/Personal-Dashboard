import { useState, useEffect, useCallback } from 'react';
import { ClassSession } from './classTypes';
import { fetchClasses } from './classApi';
import { fetchSchedules, WeeklyScheduleEntry } from './scheduleApi';
import { fetchPackages } from '../packages/packageApi';
import { fetchMeetingLinks } from '../meeting-links/meetingLinkApi';
import { fetchStudents } from '../students/studentApi';
import { Student } from '../students/studentTypes';
import { Package } from '../packages/packageTypes';
import { MeetingLink } from '../meeting-links/meetingLinkTypes';

export function useClassScheduleData(studentId?: string, token?: string | null) {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [schedules, setSchedules] = useState<WeeklyScheduleEntry[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [meetingLinks, setMeetingLinks] = useState<MeetingLink[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cls, scheds, pkgs, links, stuList] = await Promise.all([
        fetchClasses(studentId, token).catch(() => []),
        fetchSchedules(undefined, token).catch(() => []),
        fetchPackages(undefined, token).catch(() => []),
        fetchMeetingLinks(undefined, token).catch(() => []),
        fetchStudents({}, token).catch(() => []),
      ]);
      setSessions(cls);
      setSchedules(scheds);
      setPackages(pkgs);
      setMeetingLinks(links);
      setStudents(stuList);
    } finally {
      setLoading(false);
    }
  }, [studentId, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStudentConsumedClasses = (sid: string): { consumed: number; purchased: number } => {
    const stuPkgs = packages.filter((p) => p.student_id === sid);
    let purchased = 0;
    let consumed = 0;
    for (const p of stuPkgs) {
      purchased += Number(p.classes_purchased !== undefined ? p.classes_purchased : p.total_classes) || 0;
      consumed += Number(p.consumed_classes !== undefined ? p.consumed_classes : p.classes_consumed) || 0;
    }
    return { consumed, purchased };
  };

  const getStudentSchedule = (sid: string): WeeklyScheduleEntry[] => {
    return schedules.filter((s) => s.student_id === sid && s.is_active !== false);
  };

  const getStudentMeetingLink = (sid: string): MeetingLink | undefined => {
    return meetingLinks.find((l) => l.student_id === sid);
  };

  return {
    sessions,
    packages,
    students,
    loading,
    refetch: loadData,
    getStudentConsumedClasses,
    getStudentSchedule,
    getStudentMeetingLink,
  };
}
