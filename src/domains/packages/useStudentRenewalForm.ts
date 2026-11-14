import { useState, useEffect } from 'react';
import { Student } from '../students/studentTypes';
import { RenewalFormData, RenewalStudentSummary, isSessionCreditConsumed } from './packageRenewalTypes';
import { fetchPackages } from './packageApi';
import { fetchClasses } from '../classes/classApi';
import { fetchPayments } from '../payments/paymentApi';
import { fetchSchedules } from '../classes/scheduleApi';

export function useStudentRenewalForm(initialStudent: Student | null | undefined, token?: string | null) {
  const [student, setStudent] = useState<Student | null>(initialStudent || null);
  const [step, setStep] = useState<number>(initialStudent ? 2 : 1);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summary, setSummary] = useState<RenewalStudentSummary | null>(null);

  const [formData, setFormData] = useState<RenewalFormData>({
    student: initialStudent || null,
    new_classes_purchased: '12',
    plan_type: 'Per Class',
    currency: 'INR',
    per_class: '',
    package_price: '',
    class_duration: '60',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    next_due_date: '',
    schedules: [],
    payment: {
      record_payment: true,
      amount: '',
      currency: 'INR',
      in_inr: '',
      payment_date: new Date().toISOString().slice(0, 10),
    },
    confirmed: false,
  });

  useEffect(() => {
    if (!student) return;
    let active = true;
    setLoadingSummary(true);
    Promise.all([
      fetchPackages(student.student_id, token).catch(() => []),
      fetchClasses(student.student_id, token).catch(() => []),
      fetchPayments(student.student_id, undefined, token).catch(() => []),
      fetchSchedules(student.student_id, token).catch(() => []),
    ]).then(([pkgs, cls, pays, scheds]) => {
      if (!active) return;
      const exPkg = pkgs.length > 0 ? pkgs[0] : null;
      let consumed = 0;
      for (const c of cls) {
        if (c.student_id === student.student_id && isSessionCreditConsumed(c)) {
          consumed++;
        }
      }
      const purchased = Number(exPkg ? (exPkg.classes_purchased || exPkg.total_classes || 0) : 0);
      const cur = exPkg?.currency || 'INR';
      const dur = String(exPkg?.class_duration || '60');
      const rate = exPkg?.per_class ? String(exPkg.per_class) : '';

      setSummary({
        student, package: exPkg, cumulativePurchased: purchased,
        cumulativeConsumed: consumed, availableBalance: Math.max(0, purchased - consumed),
        payments: pays, schedules: scheds,
      });

      setFormData((prev) => ({
        ...prev, student, currency: cur, class_duration: dur, per_class: rate,
        plan_type: exPkg?.plan_type || prev.plan_type, schedules: scheds.length > 0 ? scheds : prev.schedules,
        payment: { ...prev.payment, currency: cur },
      }));
      setLoadingSummary(false);
    });
    return () => { active = false; };
  }, [student?.student_id, token]);

  const selectStudent = (s: Student) => {
    setStudent(s);
    setFormData((prev) => ({ ...prev, student: s }));
    setStep(2);
  };

  return {
    student, selectStudent, step, setStep, loadingSummary,
    summary, formData, setFormData,
  };
}
