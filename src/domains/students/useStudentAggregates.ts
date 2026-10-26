import { useState, useEffect, useCallback } from 'react';
import { Package } from '../packages/packageTypes';
import { fetchPackages } from '../packages/packageApi';
import { MeetingLink } from '../meeting-links/meetingLinkTypes';
import { fetchMeetingLinks } from '../meeting-links/meetingLinkApi';
import { Payment } from '../payments/paymentTypes';
import { fetchPayments } from '../payments/paymentApi';
import { fetchClasses } from '../classes/classApi';
import { ClassSession } from '../classes/classTypes';
import { fetchSchedules, WeeklyScheduleEntry } from '../classes/scheduleApi';
import { parseCanonicalScheduleString } from './scheduleFormatter';
import { getLatestCompletedClassDate } from './studentStatusClassifier';

export interface StudentFinancialInfo {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  currency: string;
  inInr?: number;
}

export function useStudentAggregates(studentIds: string[], token?: string | null) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [meetingLinks, setMeetingLinks] = useState<MeetingLink[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [schedulesMap, setSchedulesMap] = useState<Record<string, WeeklyScheduleEntry[]>>({});
  const [loading, setLoading] = useState(false);

  const loadAggregates = useCallback(async () => {
    if (!studentIds || studentIds.length === 0) return;
    setLoading(true);
    try {
      const [pkgs, links, pays, cls] = await Promise.all([
        fetchPackages(undefined, token).catch(() => []),
        fetchMeetingLinks(undefined, token).catch(() => []),
        fetchPayments(undefined, undefined, token).catch(() => []),
        fetchClasses(undefined, token).catch(() => []),
      ]);

      setPackages(pkgs);
      setMeetingLinks(links);
      setPayments(pays);
      setClasses(cls);

      const schedPromises = studentIds.map(async (sid) => {
        const sched = await fetchSchedules(sid, token).catch(() => []);
        return { sid, sched };
      });
      const schedResults = await Promise.all(schedPromises);
      const newMap: Record<string, WeeklyScheduleEntry[]> = {};
      schedResults.forEach(({ sid, sched }) => {
        if (sched.length > 0) {
          newMap[sid] = sched;
        } else {
          const pkg = pkgs.find((p) => p.student_id === sid);
          if (pkg && pkg.class_schedule) {
            newMap[sid] = parseCanonicalScheduleString(pkg.class_schedule, Number(pkg.class_duration) || 60);
          } else {
            newMap[sid] = [];
          }
        }
      });
      setSchedulesMap(newMap);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(studentIds), token]);

  useEffect(() => {
    loadAggregates();
  }, [loadAggregates]);

  const getStudentBalance = (sid: string) => {
    const studentPkgs = packages.filter((p) => p.student_id === sid);
    let totalPurchased = 0;
    let totalConsumed = 0;
    for (const p of studentPkgs) {
      const purchased = Number(p.classes_purchased !== undefined ? p.classes_purchased : p.total_classes) || 0;
      const consumed = Number(p.consumed_classes !== undefined ? p.consumed_classes : p.classes_consumed) || 0;
      totalPurchased += purchased;
      totalConsumed += consumed;
    }
    return { totalPurchased, totalConsumed, packages: studentPkgs };
  };

  const getStudentLastCompletedDate = (sid: string): string | null => {
    return getLatestCompletedClassDate(classes, sid);
  };

  const getStudentSchedule = (sid: string): WeeklyScheduleEntry[] => schedulesMap[sid] || [];
  const getStudentMeetingLink = (sid: string): MeetingLink | undefined => meetingLinks.find((l) => l.student_id === sid);

  const getStudentFinancials = (sid: string): StudentFinancialInfo => {
    const studentPkgs = packages.filter((p) => p.student_id === sid && p.status !== 'CANCELLED' && p.status !== 'VOID');
    const studentPays = payments.filter((p) => p.student_id === sid && p.status !== 'VOIDED' && p.payment_status !== 'VOIDED');

    let totalInvoiced = 0;
    let currency = 'INR';
    for (const pkg of studentPkgs) {
      totalInvoiced += Number(pkg.package_price || pkg.price || 0);
      if (pkg.currency) currency = pkg.currency;
    }

    let totalPaid = 0;
    let inInr = 0;
    for (const pay of studentPays) {
      totalPaid += Number(pay.amount || 0);
      if (pay.in_inr !== undefined && pay.in_inr !== null) {
        inInr += Number(pay.in_inr || 0);
      }
    }

    const outstanding = Math.max(0, totalInvoiced - totalPaid);
    return { totalInvoiced, totalPaid, outstanding, currency, inInr };
  };

  return {
    loading,
    getStudentBalance,
    getStudentLastCompletedDate,
    getStudentSchedule,
    getStudentMeetingLink,
    getStudentFinancials,
    refetchAggregates: loadAggregates,
  };
}
