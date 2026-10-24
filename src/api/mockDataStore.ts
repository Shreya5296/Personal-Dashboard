import { ApiResponse } from './apiResponse';
import {
  MOCK_STUDENTS,
  MOCK_FEES,
  MOCK_PAYMENTS,
  MOCK_CLASSES,
  MOCK_LINKS,
  MOCK_PACKAGES,
  MOCK_NOTES,
  MOCK_SCHEDULES,
  createMockStudent,
} from './mockDataInitial';

export function handleMockApiRequest<T>(operation: string, payload: Record<string, unknown>, reqId: string): ApiResponse<T> {
  const meta = { requestId: reqId, timestamp: new Date().toISOString() };
  if (operation === 'dashboard.overview') {
    return { ok: true, data: { activeStudentsCount: 3, classesUpcoming7Days: 2, outstandingFeesTotal: 50000, currency: 'INR' } as T, meta };
  }
  if (operation === 'students.list') {
    const q = String(payload.query || '').toLowerCase();
    const st = String(payload.status || '');
    let res = [...MOCK_STUDENTS];
    if (st) res = res.filter(s => s.status === st);
    if (q) res = res.filter(s => s.student_name.toLowerCase().includes(q) || s.student_email.toLowerCase().includes(q));
    return { ok: true, data: res as T, meta };
  }
  if (operation === 'students.create') {
    return { ok: true, data: createMockStudent(payload) as T, meta };
  }
  if (operation === 'students.update') {
    const sid = String(payload.student_id || payload.studentId || '');
    const ex = MOCK_STUDENTS.find(s => s.student_id === sid);
    if (ex) Object.assign(ex, payload);
    return { ok: true, data: (ex || { ...MOCK_STUDENTS[0], ...payload }) as T, meta };
  }
  if (operation === 'fees.list') {
    const sid = payload.student_id as string | undefined;
    return { ok: true, data: (sid ? MOCK_FEES.filter(f => f.student_id === sid) : MOCK_FEES) as T, meta };
  }
  if (operation === 'payments.list') {
    const sid = payload.student_id as string | undefined;
    return { ok: true, data: (sid ? MOCK_PAYMENTS.filter(p => p.student_id === sid) : MOCK_PAYMENTS) as T, meta };
  }
  if (operation === 'classes.list') {
    const sid = payload.student_id as string | undefined;
    return { ok: true, data: (sid ? MOCK_CLASSES.filter(c => c.student_id === sid) : MOCK_CLASSES) as T, meta };
  }
  if (operation === 'meetingLinks.list') {
    const sid = payload.student_id as string | undefined;
    return { ok: true, data: (sid ? MOCK_LINKS.filter(l => l.student_id === sid) : MOCK_LINKS) as T, meta };
  }
  if (operation === 'meetingLinks.create') {
    const sid = String(payload.student_id || '');
    let ex = MOCK_LINKS.find(l => l.student_id === sid);
    const l1 = payload.meeting_link_1 !== undefined ? String(payload.meeting_link_1).trim() : (payload.meeting_url !== undefined ? String(payload.meeting_url).trim() : undefined);
    const l2 = payload.meeting_link_2 !== undefined ? String(payload.meeting_link_2).trim() : undefined;
    if (ex) {
      if (l1 !== undefined) { ex.meeting_link_1 = l1; ex.meeting_url = l1; }
      if (l2 !== undefined) { ex.meeting_link_2 = l2; }
    } else {
      ex = {
        meeting_link_id: `ml_${Date.now()}`,
        student_id: sid,
        student_name: String(payload.student_name || ''),
        provider: 'GOOGLE_MEET',
        link_label: 'Class Meeting Link',
        meeting_url: l1 || '',
        meeting_link_1: l1 || '',
        meeting_link_2: l2 || '',
        is_preferred: true
      };
      MOCK_LINKS.push(ex);
    }
    return { ok: true, data: ex as T, meta };
  }
  if (operation === 'packages.list') return { ok: true, data: MOCK_PACKAGES as T, meta };
  if (operation === 'packages.create') {
    const newPkg = {
      package_id: `pkg_${Date.now()}`,
      student_id: String(payload.student_id || ''),
      student_name: String(payload.student_name || ''),
      plan_type: String(payload.plan_type || 'PACKAGE'),
      currency: String(payload.currency || 'INR').toUpperCase(),
      package_price: Number(payload.package_price || payload.price || 0),
      per_class: Number(payload.per_class || 0),
      classes_purchased: Number(payload.classes_purchased || payload.total_classes || 0),
      total_classes: Number(payload.classes_purchased || payload.total_classes || 0),
      status: 'ACTIVE'
    };
    MOCK_PACKAGES.unshift(newPkg);
    return { ok: true, data: newPkg as T, meta };
  }
  if (operation === 'packages.getBalance') return { ok: true, data: { totalPurchased: 12, totalConsumed: 4, remainingBalance: 8 } as T, meta };
  if (operation === 'schedules.list') {
    const sid = String(payload.student_id || payload.studentId || '');
    return { ok: true, data: (MOCK_SCHEDULES[sid] || []) as T, meta };
  }
  if (operation === 'schedules.save') {
    const sid = String(payload.student_id || payload.studentId || '');
    const list = (payload.schedules || payload.entries || []) as unknown[];
    MOCK_SCHEDULES[sid] = list;
    return { ok: true, data: list as T, meta };
  }
  if (operation === 'notes.list') return { ok: true, data: MOCK_NOTES as T, meta };
  if (operation === 'reports.financialSummary') {
    return {
      ok: true,
      data: { totalInvoiced: 216800, totalBilled: 216800, totalCollected: 166800, totalReceived: 166800, totalOutstanding: 50000, currency: 'INR' } as T,
      meta
    };
  }
  if (operation === 'payments.record') {
    const sid = String(payload.student_id || '');
    const stu = MOCK_STUDENTS.find((s) => s.student_id === sid);
    const sname = stu ? stu.student_name : String(payload.student_name || sid);
    const cur = String(payload.currency || 'INR').toUpperCase();
    const amt = Number(payload.amount) || 0;
    const inInr = payload.in_inr !== undefined && payload.in_inr !== null ? Number(payload.in_inr) : (cur === 'INR' ? amt : 0);
    const newPay = {
      payment_id: `pay_${Date.now()}`,
      student_id: sid,
      student_name: sname,
      amount: amt,
      currency: cur,
      in_inr: inInr,
      payment_date: String(payload.payment_date || new Date().toISOString().slice(0, 10)),
      status: 'RECORDED',
      payment_status: 'RECORDED'
    };
    MOCK_PAYMENTS.push(newPay);
    return { ok: true, data: newPay as T, meta };
  }
  if (operation === 'system.health') {
    return { ok: true, data: { appsScriptConnected: true, schemaVersion: 2, appEnv: 'mock', activeSpreadsheetTabs: 7 } as T, meta };
  }
  return { ok: true, data: { success: true } as T, meta };
}
