import { ApiResponse } from './apiResponse';

const MOCK_STUDENTS = [
  { student_id: 'stu_101', student_name: 'Aarav Sharma', parent_name: 'Priya Sharma', parent_phone: '+91 98765 43210', student_phone: '+91 98765 43211', parent_email: 'priya@example.com', student_email: 'aarav@example.com', subject: 'AP Calculus BC', status: 'ACTIVE', created_at: '2026-01-15T09:00:00Z' },
  { student_id: 'stu_102', student_name: 'Diya Patel', parent_name: 'Rajesh Patel', parent_phone: '+91 98234 56789', student_phone: '+91 98234 56780', parent_email: 'rajesh@example.com', student_email: 'diya@example.com', subject: 'IB Physics HL', status: 'ACTIVE', created_at: '2026-02-01T10:30:00Z' },
  { student_id: 'stu_103', student_name: 'Rohan Verma', parent_name: 'Sunita Verma', parent_phone: '+91 97123 45678', student_phone: '', parent_email: 'sunita@example.com', student_email: 'rohan@example.com', subject: 'Grade 10 Mathematics', status: 'ACTIVE', created_at: '2026-02-20T14:00:00Z' },
  { student_id: 'stu_104', student_name: 'Ananya Roy', parent_name: 'Debashis Roy', parent_phone: '+91 99012 34567', student_phone: '+91 99012 34568', parent_email: 'debashis@example.com', student_email: 'ananya@example.com', subject: 'SAT Math Preparation', status: 'INACTIVE', created_at: '2025-11-10T11:00:00Z' }
];

const MOCK_FEES = [
  { fee_id: 'fee_201', fee_obligation_id: 'fee_201', student_id: 'stu_101', description: 'March 2026 Tuition (AP Calculus)', amount_due: 6000, outstanding_balance: 0, status: 'PAID', due_date: '2026-03-05', currency: 'INR' },
  { fee_id: 'fee_202', fee_obligation_id: 'fee_202', student_id: 'stu_102', description: 'March 2026 Tuition (IB Physics)', amount_due: 5500, outstanding_balance: 5500, status: 'PENDING', due_date: '2026-03-25', currency: 'INR' },
  { fee_id: 'fee_203', fee_obligation_id: 'fee_203', student_id: 'stu_103', description: 'February 2026 Tuition (Grade 10 Math)', amount_due: 4500, outstanding_balance: 3000, status: 'OVERDUE', due_date: '2026-02-15', currency: 'INR' }
];

const MOCK_PAYMENTS = [
  { payment_id: 'pay_301', student_id: 'stu_101', fee_obligation_id: 'fee_201', amount: 6000, payment_date: '2026-03-04', payment_method: 'UPI', reference_number: 'UPI/260304/9912', status: 'PAID', currency: 'INR' },
  { payment_id: 'pay_302', student_id: 'stu_103', fee_obligation_id: 'fee_203', amount: 1500, payment_date: '2026-02-28', payment_method: 'BANK_TRANSFER', reference_number: 'NEFT-88123', status: 'PAID', currency: 'INR' }
];

const MOCK_CLASSES = [
  { session_id: 'cls_401', student_id: 'stu_101', topic: 'AP Calculus: Multivariable Integration', start_time: new Date(Date.now() + 86400000).toISOString(), duration_minutes: 60, status: 'SCHEDULED', meeting_url: 'https://meet.google.com/abc-xyz-pqr', class_credit_effect: 'NONE' },
  { session_id: 'cls_402', student_id: 'stu_102', topic: 'IB Physics: Electromagnetic Induction', start_time: new Date(Date.now() + 172800000).toISOString(), duration_minutes: 90, status: 'SCHEDULED', meeting_url: 'https://zoom.us/j/987654321', class_credit_effect: 'NONE' },
  { session_id: 'cls_403', student_id: 'stu_101', topic: 'AP Calculus: Differential Equations Review', start_time: new Date(Date.now() - 172800000).toISOString(), duration_minutes: 60, status: 'ATTENDED', meeting_url: 'https://meet.google.com/abc-xyz-pqr', class_credit_effect: 'CONSUME' }
];

const MOCK_LINKS = [
  { meeting_link_id: 'ml_501', student_id: 'stu_101', student_name: 'Aarav Sharma', provider: 'GOOGLE_MEET', link_label: 'Calculus Live Room', meeting_url: 'https://meet.google.com/abc-xyz-pqr', meeting_link_1: 'https://meet.google.com/abc-xyz-pqr', meeting_link_2: 'https://zoom.us/j/101202303', is_preferred: true },
  { meeting_link_id: 'ml_502', student_id: 'stu_102', student_name: 'Diya Patel', provider: 'ZOOM', link_label: 'Physics Discussion Link', meeting_url: 'https://zoom.us/j/987654321', meeting_link_1: 'https://zoom.us/j/987654321', meeting_link_2: '', is_preferred: true },
  { meeting_link_id: 'ml_503', student_id: 'stu_103', student_name: 'Rohan Verma', provider: 'GOOGLE_MEET', link_label: 'Secondary Room', meeting_url: 'https://meet.google.com/def-uvw-rst', meeting_link_1: 'https://meet.google.com/def-uvw-rst', meeting_link_2: 'https://meet.google.com/rohan-backup', is_preferred: false }
];

const MOCK_PACKAGES = [
  { package_id: 'pkg_601', student_id: 'stu_101', package_name: '12-Session Calculus Pack', total_classes: 12, price: 18000, start_date: '2026-01-15', status: 'ACTIVE' }
];

const MOCK_NOTES = [
  { note_id: 'note_701', student_id: 'stu_101', note_type: 'ACADEMIC', content: 'Completed practice exam with 94% accuracy. Ready for series & sequences.', created_at: '2026-03-01T15:00:00Z' }
];

export function handleMockApiRequest<T>(operation: string, payload: Record<string, unknown>, reqId: string): ApiResponse<T> {
  const meta = { requestId: reqId, timestamp: new Date().toISOString() };
  if (operation === 'dashboard.overview') {
    return { ok: true, data: { activeStudentsCount: 3, classesUpcoming7Days: 2, outstandingFeesTotal: 8500, currency: 'INR' } as T, meta };
  }
  if (operation === 'students.list') {
    const q = String(payload.query || '').toLowerCase();
    const st = String(payload.status || '');
    let res = [...MOCK_STUDENTS];
    if (st) res = res.filter(s => s.status === st);
    if (q) res = res.filter(s => s.student_name.toLowerCase().includes(q) || s.student_email.toLowerCase().includes(q));
    return { ok: true, data: res as T, meta };
  }
  if (operation === 'students.create' || operation === 'students.update') {
    return { ok: true, data: { ...MOCK_STUDENTS[0], ...(payload as Record<string, unknown>) } as T, meta };
  }
  if (operation === 'fees.list') {
    const sid = payload.student_id as string | undefined;
    const res = sid ? MOCK_FEES.filter(f => f.student_id === sid) : MOCK_FEES;
    return { ok: true, data: res as T, meta };
  }
  if (operation === 'payments.list') {
    const sid = payload.student_id as string | undefined;
    const res = sid ? MOCK_PAYMENTS.filter(p => p.student_id === sid) : MOCK_PAYMENTS;
    return { ok: true, data: res as T, meta };
  }
  if (operation === 'classes.list') {
    const sid = payload.student_id as string | undefined;
    const res = sid ? MOCK_CLASSES.filter(c => c.student_id === sid) : MOCK_CLASSES;
    return { ok: true, data: res as T, meta };
  }
  if (operation === 'meetingLinks.list') {
    const sid = payload.student_id as string | undefined;
    const res = sid ? MOCK_LINKS.filter(l => l.student_id === sid) : MOCK_LINKS;
    return { ok: true, data: res as T, meta };
  }
  if (operation === 'packages.list') return { ok: true, data: MOCK_PACKAGES as T, meta };
  if (operation === 'packages.getBalance') return { ok: true, data: { totalPurchased: 12, totalConsumed: 4, remainingBalance: 8 } as T, meta };
  if (operation === 'notes.list') return { ok: true, data: MOCK_NOTES as T, meta };
  if (operation === 'reports.financialSummary') {
    return { ok: true, data: { totalInvoiced: 45000, totalCollected: 36500, totalOutstanding: 8500, currency: 'INR' } as T, meta };
  }
  if (operation === 'system.health') {
    return { ok: true, data: { appsScriptConnected: true, schemaVersion: 1, appEnv: 'mock', activeSpreadsheetTabs: 6 } as T, meta };
  }
  return { ok: true, data: { success: true } as T, meta };
}
