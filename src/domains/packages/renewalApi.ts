import { sendApiRequest } from '../../api/apiClient';
import { RenewalFormData, RenewalResult } from './packageRenewalTypes';

export async function renewStudentPackage(
  data: RenewalFormData,
  token?: string | null,
  idempotencyKey?: string
): Promise<RenewalResult> {
  if (!data.student) throw new Error('Student is required for renewal');

  const payload: Record<string, unknown> = {
    student_id: data.student.student_id,
    new_classes_purchased: Number(data.new_classes_purchased) || 0,
    plan_type: data.plan_type || 'Per Class',
    currency: data.currency || 'INR',
    per_class: data.per_class ? Number(data.per_class) : undefined,
    package_price: data.package_price ? Number(data.package_price) : undefined,
    class_duration: data.class_duration ? Number(data.class_duration) : 60,
    start_date: data.start_date || undefined,
    end_date: data.end_date || undefined,
    next_due_date: data.next_due_date || undefined,
    schedules: data.schedules.map((s) => ({
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
    })),
    idempotency_key: idempotencyKey,
  };

  if (data.payment && data.payment.record_payment && Number(data.payment.amount) > 0) {
    payload.payment = {
      record_payment: true,
      amount: Number(data.payment.amount),
      currency: data.payment.currency || data.currency || 'INR',
      in_inr: data.payment.in_inr ? Number(data.payment.in_inr) : undefined,
      payment_date: data.payment.payment_date || data.start_date || new Date().toISOString().slice(0, 10),
      reference_number: data.payment.reference_number || undefined,
    };
  }

  const res = await sendApiRequest<RenewalResult>('packages.renew', payload, {
    token,
    idempotencyKey,
  });

  if (!res.ok || !res.data) {
    throw new Error(res.error?.message || 'Package renewal failed');
  }

  return res.data;
}
