import { ApiResponse } from './apiResponse';
import { MOCK_STUDENTS, MOCK_PACKAGES, MOCK_CLASSES, MOCK_PAYMENTS, MOCK_SCHEDULES } from './mockDataInitial';
import { calculateEndTime } from '../domains/classes/scheduleDurationCalculator';
import { isSessionCreditConsumed } from '../domains/packages/packageRenewalTypes';

const DAY_MAP: Record<string, number> = { SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6 };

function createMockRenewalSessions(sid: string, sName: string, subj: string, scheds: Array<{ day_of_week: string; start_time: string; end_time?: string }>, sDate: string, eDate: string, count: number, dur: number): number {
  const classesList = MOCK_CLASSES as unknown as Record<string, unknown>[];
  const [y, m, d] = (sDate || new Date().toISOString().slice(0, 10)).split('-').map(Number);
  const curr = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  let created = 0;
  let safety = 0;
  while (created < count && safety < 730) {
    const dow = curr.getUTCDay();
    const dStr = `${curr.getUTCFullYear()}-${String(curr.getUTCMonth() + 1).padStart(2, '0')}-${String(curr.getUTCDate()).padStart(2, '0')}`;
    if (eDate && dStr > eDate) break;
    for (const ent of scheds) {
      if (created >= count) break;
      if (DAY_MAP[ent.day_of_week.toUpperCase()] === dow) {
        const compEnd = ent.end_time || calculateEndTime(ent.start_time, dur) || '18:00';
        const sessId = `cls_${Date.now()}_${created}`;
        classesList.push({
          session_id: sessId, class_session_id: sessId, student_id: sid, student_name: sName,
          topic: `${subj || 'Class'} Session`, start_time: `${dStr}T${ent.start_time}:00.000Z`,
          scheduled_start: `${dStr}T${ent.start_time}:00.000Z`, scheduled_end: `${dStr}T${compEnd}:00.000Z`,
          duration_minutes: dur, status: 'SCHEDULED', session_status: 'SCHEDULED',
          attendance_status: 'NOT_MARKED', deduct_class: false, class_credit_effect: 'PENDING',
        });
        created++;
      }
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
    safety++;
  }
  return created;
}

export function handleMockRenewal<T>(payload: Record<string, unknown>, reqId: string): ApiResponse<T> {
  const meta = { requestId: reqId, timestamp: new Date().toISOString() };
  const sid = String(payload.student_id || payload.studentId || '');
  const stu = MOCK_STUDENTS.find((s) => s.student_id === sid);
  if (!stu) return { ok: false, error: { code: 'RECORD_NOT_FOUND', message: `Student not found: ${sid}` }, meta };
  stu.status = 'ACTIVE';

  const classesList = MOCK_CLASSES as unknown as Record<string, unknown>[];
  let consumed = 0;
  for (const c of classesList) {
    if (c.student_id === sid && isSessionCreditConsumed(c)) {
      consumed++;
    }
  }

  const exPkg = MOCK_PACKAGES.find((p) => p.student_id === sid);
  const prevPurchased = exPkg ? Number(exPkg.classes_purchased !== undefined ? exPkg.classes_purchased : exPkg.total_classes) || 0 : 0;
  const newPurchased = Number(payload.new_classes_purchased !== undefined ? payload.new_classes_purchased : payload.classes_purchased) || 0;
  const cumulativePurchased = prevPurchased + newPurchased;
  const prevAvailable = Math.max(0, prevPurchased - consumed);
  const newAvailable = Math.max(0, cumulativePurchased - consumed);

  const cur = String(payload.currency || exPkg?.currency || 'INR').toUpperCase();
  const price = payload.package_price !== undefined ? Number(payload.package_price) : (exPkg ? Number(exPkg.package_price || exPkg.price || 0) : 0);
  const perClass = payload.per_class !== undefined ? Number(payload.per_class) : (exPkg ? Number(exPkg.per_class || 0) : 0);
  const dur = payload.class_duration !== undefined ? Number(payload.class_duration) : (exPkg ? Number(exPkg.class_duration || 60) : 60);
  const sDate = String(payload.start_date || exPkg?.start_date || '');
  const eDate = String(payload.end_date || exPkg?.end_date || '');

  const pkgData: Record<string, unknown> = {
    package_id: exPkg ? exPkg.package_id : `pkg_${Date.now()}`, student_id: sid, student_name: stu.student_name,
    plan_type: String(payload.plan_type || exPkg?.plan_type || 'Per Class'), currency: cur,
    package_price: price, price, per_class: perClass, classes_purchased: cumulativePurchased,
    total_classes: cumulativePurchased, consumed_classes: consumed, remaining_classes: newAvailable,
    class_duration: dur, start_date: sDate, end_date: eDate, status: 'ACTIVE',
  };
  if (exPkg) Object.assign(exPkg, pkgData); else MOCK_PACKAGES.unshift(pkgData);

  let recordedPayment: Record<string, unknown> | null = null;
  const pay = payload.payment as Record<string, unknown> | undefined;
  if (pay && Number(pay.amount) > 0) {
    const payCur = String(pay.currency || cur).toUpperCase();
    const payAmt = Number(pay.amount);
    const inInr = pay.in_inr !== undefined && pay.in_inr !== null ? Number(pay.in_inr) : (payCur === 'INR' ? payAmt : 0);
    recordedPayment = {
      payment_id: `pay_${Date.now()}`, student_id: sid, student_name: stu.student_name, amount: payAmt,
      currency: payCur, in_inr: inInr, payment_date: String(pay.payment_date || sDate || new Date().toISOString().slice(0, 10)),
      status: 'RECORDED', payment_status: 'RECORDED', reference_number: String(pay.reference_number || ''),
    };
    MOCK_PAYMENTS.push(recordedPayment);
  }

  let sessionsCreated = 0;
  const scheds = (payload.schedules || []) as Array<{ day_of_week: string; start_time: string; end_time?: string }>;
  if (Array.isArray(scheds) && scheds.length > 0) {
    MOCK_SCHEDULES[sid] = scheds;
    for (const c of classesList) {
      if (c.student_id === sid && (c.session_status === 'SCHEDULED' || c.status === 'SCHEDULED')) {
        const cDate = String(c.start_time || '').slice(0, 10);
        if (!sDate || cDate >= sDate) {
          c.session_status = 'CANCELLED'; c.status = 'CANCELLED'; c.deduct_class = false;
          c.cancellation_reason = 'Superceded by renewal schedule';
        }
      }
    }
    sessionsCreated = createMockRenewalSessions(sid, stu.student_name, stu.subject, scheds, sDate, eDate, newPurchased, dur);
  }

  return {
    ok: true,
    data: {
      student_id: sid, student_name: stu.student_name, status: 'ACTIVE',
      previous_available_balance: prevAvailable, new_classes_purchased: newPurchased,
      new_available_balance: newAvailable, cumulative_purchased: cumulativePurchased,
      cumulative_consumed: consumed, package: exPkg || pkgData, payment: recordedPayment,
      sessions_created: sessionsCreated,
    } as T,
    meta,
  };
}
