export const MOCK_STUDENTS = [
  { student_id: 'STU_001', student_name: 'Aarav Sharma', parent_name: 'Priya Sharma', parent_phone: '+91 98765 43210', student_phone: '+91 98765 43211', parent_email: 'priya@example.com', student_email: 'aarav@example.com', subject: 'AP Calculus BC', status: 'ACTIVE', created_at: '2026-01-15T09:00:00Z' },
  { student_id: 'STU_002', student_name: 'Diya Patel', parent_name: 'Rajesh Patel', parent_phone: '+91 98234 56789', student_phone: '+91 98234 56780', parent_email: 'rajesh@example.com', student_email: 'diya@example.com', subject: 'IB Physics HL', status: 'ACTIVE', created_at: '2026-02-01T10:30:00Z' },
  { student_id: 'STU_003', student_name: 'Rohan Verma', parent_name: 'Sunita Verma', parent_phone: '+91 97123 45678', student_phone: '', parent_email: 'sunita@example.com', student_email: 'rohan@example.com', subject: 'Grade 10 Mathematics', status: 'ACTIVE', created_at: '2026-02-20T14:00:00Z' },
  { student_id: 'STU_004', student_name: 'Ananya Roy', parent_name: 'Debashis Roy', parent_phone: '+91 99012 34567', student_phone: '+91 99012 34568', parent_email: 'debashis@example.com', student_email: 'ananya@example.com', subject: 'SAT Math Preparation', status: 'INACTIVE', created_at: '2025-11-10T11:00:00Z' }
];

export const MOCK_FEES = [
  { fee_id: 'fee_201', fee_obligation_id: 'fee_201', student_id: 'STU_001', description: 'March 2026 Tuition (AP Calculus)', amount_due: 6000, outstanding_balance: 0, status: 'PAID', due_date: '2026-03-05', currency: 'INR' },
  { fee_id: 'fee_202', fee_obligation_id: 'fee_202', student_id: 'STU_002', description: 'March 2026 Tuition (IB Physics)', amount_due: 5500, outstanding_balance: 5500, status: 'PENDING', due_date: '2026-03-25', currency: 'INR' },
  { fee_id: 'fee_203', fee_obligation_id: 'fee_203', student_id: 'STU_003', description: 'February 2026 Tuition (Grade 10 Math)', amount_due: 4500, outstanding_balance: 3000, status: 'OVERDUE', due_date: '2026-02-15', currency: 'INR' }
];

export const MOCK_PAYMENTS: Array<Record<string, unknown>> = [
  { payment_id: 'pay_301', student_id: 'STU_001', fee_obligation_id: 'fee_201', amount: 6000, payment_date: '2026-03-04', payment_method: 'UPI', reference_number: 'UPI/260304/9912', status: 'PAID', currency: 'INR' },
  { payment_id: 'pay_302', student_id: 'STU_003', fee_obligation_id: 'fee_203', amount: 1500, payment_date: '2026-02-28', payment_method: 'BANK_TRANSFER', reference_number: 'NEFT-88123', status: 'PAID', currency: 'INR' }
];

export const MOCK_CLASSES = [
  { session_id: 'cls_401', student_id: 'STU_001', topic: 'AP Calculus: Multivariable Integration', start_time: new Date(Date.now() + 86400000).toISOString(), duration_minutes: 60, status: 'SCHEDULED', meeting_url: 'https://meet.google.com/abc-xyz-pqr', class_credit_effect: 'NONE' },
  { session_id: 'cls_402', student_id: 'STU_002', topic: 'IB Physics: Electromagnetic Induction', start_time: new Date(Date.now() + 172800000).toISOString(), duration_minutes: 90, status: 'SCHEDULED', meeting_url: 'https://zoom.us/j/987654321', class_credit_effect: 'NONE' },
  { session_id: 'cls_403', student_id: 'STU_001', topic: 'AP Calculus: Differential Equations Review', start_time: new Date(Date.now() - 172800000).toISOString(), duration_minutes: 60, status: 'ATTENDED', meeting_url: 'https://meet.google.com/abc-xyz-pqr', class_credit_effect: 'CONSUME' }
];

export const MOCK_LINKS = [
  { meeting_link_id: 'ml_501', student_id: 'STU_001', student_name: 'Aarav Sharma', provider: 'GOOGLE_MEET', link_label: 'Calculus Live Room', meeting_url: 'https://meet.google.com/abc-xyz-pqr', meeting_link_1: 'https://meet.google.com/abc-xyz-pqr', meeting_link_2: 'https://zoom.us/j/101202303', is_preferred: true },
  { meeting_link_id: 'ml_502', student_id: 'STU_002', student_name: 'Diya Patel', provider: 'ZOOM', link_label: 'Physics Discussion Link', meeting_url: 'https://zoom.us/j/987654321', meeting_link_1: 'https://zoom.us/j/987654321', meeting_link_2: '', is_preferred: true },
  { meeting_link_id: 'ml_503', student_id: 'STU_003', student_name: 'Rohan Verma', provider: 'GOOGLE_MEET', link_label: 'Secondary Room', meeting_url: 'https://meet.google.com/def-uvw-rst', meeting_link_1: 'https://meet.google.com/def-uvw-rst', meeting_link_2: 'https://meet.google.com/rohan-backup', is_preferred: false }
];

export const MOCK_PACKAGES: Array<Record<string, unknown>> = [
  { package_id: 'pkg_601', student_id: 'STU_001', package_name: '12-Session Calculus Pack', total_classes: 12, price: 18000, start_date: '2026-01-15', status: 'ACTIVE' }
];

export const MOCK_NOTES = [
  { note_id: 'note_701', student_id: 'STU_001', note_type: 'ACADEMIC', content: 'Completed practice exam with 94% accuracy. Ready for series & sequences.', created_at: '2026-03-01T15:00:00Z' }
];

export const MOCK_SCHEDULES: Record<string, unknown[]> = {};

export function createMockStudent(payload: Record<string, unknown>) {
  let max = 0;
  const idSet = new Set(MOCK_STUDENTS.map(s => s.student_id.toUpperCase()));
  for (const s of MOCK_STUDENTS) {
    const m = s.student_id.match(/^STU_(\d+)$/i);
    if (m) { const n = parseInt(m[1], 10); if (n > max) max = n; }
  }
  let n = max + 1;
  let cand = `STU_${n < 10 ? '00' + n : (n < 100 ? '0' + n : n)}`;
  while (idSet.has(cand.toUpperCase())) { n++; cand = `STU_${n < 10 ? '00' + n : (n < 100 ? '0' + n : n)}`; }
  const newStu = {
    student_id: cand,
    student_name: String(payload.student_name || payload.full_name || 'New Student'),
    parent_name: String(payload.parent_name || ''),
    parent_phone: String(payload.parent_phone || payload.phone || ''),
    student_phone: String(payload.student_phone || ''),
    parent_email: String(payload.parent_email || ''),
    student_email: String(payload.student_email || ''),
    subject: String(payload.subject || ''),
    status: String(payload.status || 'ACTIVE'),
    created_at: new Date().toISOString()
  };
  MOCK_STUDENTS.unshift(newStu);
  return newStu;
}

export function updateMockPackage(payload: Record<string, unknown>) {
  const pkgId = String(payload.package_id || payload.packageId || '');
  const sid = String(payload.student_id || '');
  let ex = MOCK_PACKAGES.find(p => p.package_id === pkgId);
  if (!ex && sid) ex = MOCK_PACKAGES.find(p => p.student_id === sid);
  if (ex) {
    if (payload.plan_type !== undefined) ex.plan_type = String(payload.plan_type);
    if (payload.currency !== undefined) ex.currency = String(payload.currency).toUpperCase();
    if (payload.package_price !== undefined) ex.package_price = Number(payload.package_price);
    if (payload.price !== undefined) ex.price = Number(payload.price);
    if (payload.per_class !== undefined) ex.per_class = Number(payload.per_class);
    const rawQty = payload.classes_purchased !== undefined ? payload.classes_purchased : payload.total_classes;
    if (rawQty !== undefined) {
      ex.classes_purchased = Number(rawQty);
      ex.total_classes = Number(rawQty);
    }
    const rawDur = payload.class_duration !== undefined ? payload.class_duration : payload.duration_minutes;
    if (rawDur !== undefined) {
      ex.class_duration = Number(rawDur);
      ex.duration_minutes = Number(rawDur);
    }
    if (payload.start_date !== undefined) ex.start_date = String(payload.start_date);
    if (payload.end_date !== undefined) ex.end_date = String(payload.end_date);
    if (payload.expiry_date !== undefined) ex.expiry_date = String(payload.expiry_date);
    return ex;
  }
  return { ...payload, package_id: pkgId || `pkg_${Date.now()}` };
}

export function scheduleMockClass(payload: Record<string, unknown>) {
  const sid = String(payload.student_id || '');
  const start = String(payload.scheduled_start || payload.start_time || new Date().toISOString());
  const dur = Number(payload.duration_minutes || 60);
  let end = String(payload.scheduled_end || '');
  if (!end && start) {
    try { end = new Date(new Date(start).getTime() + dur * 60000).toISOString(); } catch (_) {}
  }
  const id = `cls_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const item = {
    session_id: id,
    class_session_id: id,
    student_id: sid,
    student_name: String(payload.student_name || ''),
    package_id: String(payload.package_id || ''),
    class_title: String(payload.class_title || payload.topic || 'Class session'),
    topic: String(payload.class_title || payload.topic || 'Class session'),
    start_time: start,
    scheduled_start: start,
    scheduled_end: end,
    duration_minutes: dur,
    status: 'SCHEDULED',
    session_status: 'SCHEDULED',
    attendance_status: 'NOT_MARKED',
    meeting_url: String(payload.meeting_url || ''),
    class_credit_effect: 'PENDING',
    deduct_class: false,
  };
  MOCK_CLASSES.push(item);
  return item;
}
