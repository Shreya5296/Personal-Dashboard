import { useState, useEffect, useCallback } from 'react';
import { Package } from '../packages/packageTypes';
import { fetchPackages } from '../packages/packageApi';
import { MeetingLink } from '../meeting-links/meetingLinkTypes';
import { fetchMeetingLinks } from '../meeting-links/meetingLinkApi';
import { Payment } from '../payments/paymentTypes';
import { fetchPayments } from '../payments/paymentApi';
import { fetchSchedules, WeeklyScheduleEntry } from '../classes/scheduleApi';

export interface StudentFinancialInfo {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  currency: string;
}

export function useStudentAggregates(studentIds: string[], token?: string | null) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [meetingLinks, setMeetingLinks] = useState<MeetingLink[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schedulesMap, setSchedulesMap] = useState<Record<string, WeeklyScheduleEntry[]>>({});
  const [loading, setLoading] = useState(false);

  const loadAggregates = useCallback(async () => {
    if (!studentIds || studentIds.length === 0) return;
    setLoading(true);
    try {
      const [pkgs, links, pays] = await Promise.all([
        fetchPackages(undefined, token).catch(() => []),
        fetchMeetingLinks(undefined, token).catch(() => []),
        fetchPayments(undefined, undefined, token).catch(() => []),
      ]);

      setPackages(pkgs);
      setMeetingLinks(links);
      setPayments(pays);

      const schedPromises = studentIds.map(async (sid) => {
        const sched = await fetchSchedules(sid, token).catch(() => []);
        return { sid, sched };
      });
      const schedResults = await Promise.all(schedPromises);
      const newMap: Record<string, WeeklyScheduleEntry[]> = {};
      schedResults.forEach(({ sid, sched }) => {
        newMap[sid] = sched;
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

  const getStudentSchedule = (sid: string): WeeklyScheduleEntry[] => {
    return schedulesMap[sid] || [];
  };

  const getStudentMeetingLink = (sid: string): MeetingLink | undefined => {
    return meetingLinks.find((l) => l.student_id === sid);
  };

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
    for (const pay of studentPays) {
      totalPaid += Number(pay.amount || 0);
    }

    const outstanding = Math.max(0, totalInvoiced - totalPaid);
    return { totalInvoiced, totalPaid, outstanding, currency };
  };

  return {
    loading,
    getStudentBalance,
    getStudentSchedule,
    getStudentMeetingLink,
    getStudentFinancials,
    refetchAggregates: loadAggregates,
  };
}
