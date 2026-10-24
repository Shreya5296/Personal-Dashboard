import { useState, useEffect } from 'react';
import { Student } from './studentTypes';
import { Package } from '../packages/packageTypes';
import { PackageFormData } from './EditStudentPackageSection';
import { ScheduleItem } from './registrationTypes';
import { fetchMeetingLinks } from '../meeting-links/meetingLinkApi';
import { fetchPackages } from '../packages/packageApi';
import { fetchSchedules } from '../classes/scheduleApi';

export function useEditStudentInitialData(student: Student, token?: string | null) {
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [meetingLinks, setMeetingLinks] = useState({ link1: '', link2: '' });
  const [existingPkg, setExistingPkg] = useState<Package | null>(null);
  const [packageData, setPackageData] = useState<PackageFormData>({
    mode: 'EDIT_EXISTING',
    plan_type: 'Package',
    currency: 'INR',
    package_price: '',
    per_class: '',
    classes_purchased: '',
    class_duration: '',
    end_date: '',
  });
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetchMeetingLinks(student.student_id, token).catch(() => []),
      fetchPackages(student.student_id, token).catch(() => []),
      fetchSchedules(student.student_id, token).catch(() => []),
    ]).then(([links, pkgs, scheds]) => {
      if (!isMounted) return;
      const ml = links.find((l) => l.student_id === student.student_id);
      if (ml) setMeetingLinks({ link1: ml.meeting_link_1 || ml.meeting_url || '', link2: ml.meeting_link_2 || '' });
      if (pkgs.length > 0) {
        const p = pkgs[0];
        setExistingPkg(p);
        const dur = p.class_duration || p.duration_minutes;
        setPackageData({
          mode: 'EDIT_EXISTING',
          package_id: p.package_id,
          plan_type: p.plan_type || 'Package',
          currency: p.currency || 'INR',
          package_price: p.package_price !== undefined ? String(p.package_price) : (p.price !== undefined ? String(p.price) : ''),
          per_class: p.per_class !== undefined ? String(p.per_class) : '',
          classes_purchased: p.classes_purchased !== undefined ? String(p.classes_purchased) : (p.total_classes !== undefined ? String(p.total_classes) : ''),
          class_duration: dur ? String(dur) : '',
          end_date: p.end_date || p.expiry_date || '',
        });
      }
      setSchedules(scheds.map((s, idx) => ({
        id: s.schedule_id || String(idx),
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
      })));
      setLoadingInitial(false);
    });
    return () => { isMounted = false; };
  }, [student.student_id, token]);

  return {
    loadingInitial,
    meetingLinks,
    setMeetingLinks,
    existingPkg,
    packageData,
    setPackageData,
    schedules,
    setSchedules,
  };
}
