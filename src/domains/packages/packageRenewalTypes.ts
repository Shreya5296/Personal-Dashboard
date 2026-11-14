import { Student } from '../students/studentTypes';
import { Package } from './packageTypes';
import { Payment } from '../payments/paymentTypes';
import { WeeklyScheduleEntry } from '../classes/scheduleApi';

export interface RenewalPaymentInput {
  record_payment: boolean;
  amount: number | string;
  currency: string;
  in_inr?: number | string;
  payment_date: string;
  reference_number?: string;
}

export interface RenewalFormData {
  student: Student | null;
  new_classes_purchased: string;
  plan_type: string;
  currency: string;
  per_class: string;
  package_price: string;
  class_duration: string;
  start_date: string;
  end_date: string;
  next_due_date: string;
  schedules: WeeklyScheduleEntry[];
  payment: RenewalPaymentInput;
  confirmed: boolean;
}

export interface RenewalStudentSummary {
  student: Student;
  package: Package | null;
  cumulativePurchased: number;
  cumulativeConsumed: number;
  availableBalance: number;
  payments: Payment[];
  schedules: WeeklyScheduleEntry[];
}

export interface RenewalResult {
  student_id: string;
  student_name: string;
  status: string;
  previous_available_balance: number;
  new_classes_purchased: number;
  new_available_balance: number;
  cumulative_purchased: number;
  cumulative_consumed: number;
  package: Package;
  payment?: Payment | null;
  sessions_created: number;
}

export function isSessionCreditConsumed(session: any): boolean {
  const sStat = String(session.session_status || session.status || '').trim().toUpperCase();
  if (sStat === 'SCHEDULED') return false;
  const raw = session.deduct_class;
  if (raw === true || raw === 1) return true;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const t = raw.trim().toUpperCase();
    if (t === 'TRUE' || t === '1' || t === 'YES') return true;
    if (t === 'FALSE' || t === '0' || t === 'NO') return false;
  }
  if (raw === false || raw === 0) return false;
  if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
    const aStat = String(session.attendance_status || '').trim().toUpperCase();
    if ((sStat === 'COMPLETED' || sStat === 'ATTENDED') && (aStat === 'PRESENT' || aStat === 'ATTENDED' || (!aStat && sStat === 'ATTENDED'))) {
      return true;
    }
  }
  return false;
}
