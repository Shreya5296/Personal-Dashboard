import { useState, useEffect, useCallback } from 'react';
import { fetchDashboardOverview } from './dashboardApi';
import { fetchClasses } from '../classes/classApi';
import { fetchSchedules, WeeklyScheduleEntry } from '../classes/scheduleApi';
import { parseCanonicalScheduleString } from '../students/scheduleFormatter';
import { fetchStudents } from '../students/studentApi';
import { fetchFeeObligations } from '../fees/feeApi';
import { fetchPackages } from '../packages/packageApi';
import { fetchMeetingLinks } from '../meeting-links/meetingLinkApi';
import { ClassSession } from '../classes/classTypes';
import { Student } from '../students/studentTypes';
import { FeeObligation } from '../fees/feeTypes';
import { Package } from '../packages/packageTypes';
import { MeetingLink } from '../meeting-links/meetingLinkTypes';
import { DashboardOverviewData } from './dashboardTypes';

export function useDashboardData(token?: string | null) {
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [schedules, setSchedules] = useState<WeeklyScheduleEntry[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<FeeObligation[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [meetingLinks, setMeetingLinks] = useState<MeetingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, cls, schedList, stuList, feeList, pkgList, linkList] = await Promise.all([
        fetchDashboardOverview(token),
        fetchClasses(undefined, token).catch(() => []),
        fetchSchedules(undefined, token).catch(() => []),
        fetchStudents({}, token).catch(() => []),
        fetchFeeObligations(undefined, token).catch(() => []),
        fetchPackages(undefined, token).catch(() => []),
        fetchMeetingLinks(undefined, token).catch(() => []),
      ]);
      let finalScheds = schedList;
      if (finalScheds.length === 0 && pkgList.length > 0) {
        const extracted: WeeklyScheduleEntry[] = [];
        for (const p of pkgList) {
          if (p.class_schedule) {
            const parsed = parseCanonicalScheduleString(p.class_schedule, Number(p.class_duration) || 60);
            for (const entry of parsed) {
              entry.student_id = p.student_id;
              entry.student_name = p.student_name;
              extracted.push(entry);
            }
          }
        }
        if (extracted.length > 0) finalScheds = extracted;
      }
      setOverview(ov);
      setClasses(cls);
      setSchedules(finalScheds);
      setStudents(stuList);
      setFees(feeList);
      setPackages(pkgList);
      setMeetingLinks(linkList);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    overview,
    classes,
    schedules,
    students,
    fees,
    packages,
    meetingLinks,
    loading,
    error,
    refreshData: loadData,
  };
}
