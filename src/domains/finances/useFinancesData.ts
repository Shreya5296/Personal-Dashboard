import { useState, useEffect, useMemo, useCallback } from 'react';
import { FinancialSummary, FinanceFilter, StudentBalanceRecord } from './financeTypes';
import { Payment } from '../payments/paymentTypes';
import { Package } from '../packages/packageTypes';
import { fetchFinancialSummary } from '../reports/reportApi';
import { fetchPayments, voidPayment } from '../payments/paymentApi';
import { fetchPackages } from '../packages/packageApi';
import { sortPaymentsByDateAscending } from './financeSorting';

export function useFinancesData(token?: string | null) {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FinanceFilter>({});
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, payList, pkgList] = await Promise.all([
        fetchFinancialSummary(token, { startDate: filter.startDate, endDate: filter.endDate }),
        fetchPayments(undefined, undefined, token).catch(() => []),
        fetchPackages(undefined, token).catch(() => []),
      ]);
      setSummary(sum);
      setPayments(payList);
      setPackages(pkgList);
    } finally {
      setLoading(false);
    }
  }, [token, filter.startDate, filter.endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredPayments = useMemo(() => {
    const q = (filter.search || '').trim().toLowerCase();
    const start = filter.startDate;
    const end = filter.endDate;

    const filtered = payments.filter((p) => {
      const pDate = p.payment_date ? String(p.payment_date).slice(0, 10) : '';
      if (start && pDate && pDate < start) return false;
      if (end && pDate && pDate > end) return false;
      if (q) {
        const name = (p.student_name || '').toLowerCase();
        const ref = (p.reference_number || p.payment_id || '').toLowerCase();
        const method = (p.payment_method || '').toLowerCase();
        return name.includes(q) || ref.includes(q) || method.includes(q);
      }
      return true;
    });

    return sortPaymentsByDateAscending(filtered);
  }, [payments, filter]);

  const studentBalances = useMemo<StudentBalanceRecord[]>(() => {
    const map = new Map<string, StudentBalanceRecord>();

    for (const pkg of packages) {
      const sid = pkg.student_id || '_unknown_';
      const name = pkg.student_name || sid;
      const price = Number(pkg.package_price || pkg.price || 0);
      const existing = map.get(sid) || {
        student_id: sid,
        student_name: name,
        totalInvoiced: 0,
        totalPaid: 0,
        outstandingBalance: 0,
        paymentCount: 0,
      };
      existing.totalInvoiced += price;
      map.set(sid, existing);
    }

    for (const p of payments) {
      if (p.status === 'VOID') continue;
      const sid = p.student_id || '_unknown_';
      const name = p.student_name || sid;
      const amt = Number(p.amount || 0);
      const existing = map.get(sid) || {
        student_id: sid,
        student_name: name,
        totalInvoiced: 0,
        totalPaid: 0,
        outstandingBalance: 0,
        paymentCount: 0,
      };
      existing.totalPaid += amt;
      existing.paymentCount += 1;
      if (!existing.lastPaymentDate || p.payment_date > existing.lastPaymentDate) {
        existing.lastPaymentDate = p.payment_date;
      }
      map.set(sid, existing);
    }

    const q = (filter.search || '').trim().toLowerCase();
    return Array.from(map.values())
      .map((r) => ({
        ...r,
        outstandingBalance: Math.max(0, r.totalInvoiced - r.totalPaid),
      }))
      .filter((r) => !q || r.student_name.toLowerCase().includes(q) || r.student_id.toLowerCase().includes(q));
  }, [packages, payments, filter.search]);

  const handleConfirmVoid = async () => {
    if (!voidingId) return;
    setIsVoiding(true);
    try {
      await voidPayment(voidingId, token);
      setVoidingId(null);
      await loadData();
    } finally {
      setIsVoiding(false);
    }
  };

  return {
    summary,
    packages,
    filteredPayments,
    studentBalances,
    loading,
    filter,
    setFilter,
    voidingId,
    setVoidingId,
    isVoiding,
    handleConfirmVoid,
    refresh: loadData,
  };
}
