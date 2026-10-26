import { MOCK_CLASSES, MOCK_PACKAGES, MOCK_LINKS } from './mockDataInitial';

export function upsertMockMeetingLink(payload: Record<string, unknown>) {
  const sid = String(payload.student_id || '');
  let ex = MOCK_LINKS.find((l) => l.student_id === sid);
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
      is_preferred: true,
    };
    MOCK_LINKS.push(ex);
  }
  return ex;
}

export function handleMockClassRecordAttendance(payload: Record<string, unknown>) {
  const sid = String(payload.session_id || payload.class_session_id || '');
  const classesList = MOCK_CLASSES as unknown as Record<string, unknown>[];
  const session = classesList.find((c) => c.session_id === sid || c.class_session_id === sid);
  if (session) {
    session.attendance_status = 'PRESENT';
    session.session_status = 'COMPLETED';
    session.status = 'COMPLETED';
    session.deduct_class = true;
    session.class_credit_effect = 'CONSUME';
    return session;
  }
  return { session_id: sid, attendance_status: 'PRESENT', session_status: 'COMPLETED', deduct_class: true };
}

export function handleMockClassCancel(payload: Record<string, unknown>) {
  const sid = String(payload.session_id || payload.class_session_id || '');
  const classesList = MOCK_CLASSES as unknown as Record<string, unknown>[];
  const session = classesList.find((c) => c.session_id === sid || c.class_session_id === sid);
  const deduct = Boolean(payload.deduct_class);
  const reason = String(payload.cancellation_reason || 'Cancelled');
  let replacement = null;

  if (session) {
    session.attendance_status = 'CANCELLED';
    session.session_status = 'CANCELLED';
    session.status = 'CANCELLED';
    session.deduct_class = deduct;
    session.cancellation_reason = reason;
    session.class_credit_effect = deduct ? 'CONSUME' : 'NO_CONSUME';

    if (!deduct && session.student_id) {
      const pkg = MOCK_PACKAGES.find((p) => p.student_id === session.student_id);
      const purchased = Number(pkg?.classes_purchased || pkg?.total_classes || 0);
      const activeSessions = classesList.filter((c) => c.student_id === session.student_id && c.session_status !== 'CANCELLED');
      if (purchased > 0 && activeSessions.length < purchased) {
        const nextId = `cls_${Date.now()}_rep`;
        const lastDate = activeSessions.reduce((max, c) => (typeof c.schedule_date === 'string' && c.schedule_date > max ? c.schedule_date : max), '2026-11-20');
        const nextD = new Date(new Date(lastDate).getTime() + 7 * 86400000).toISOString().slice(0, 10);
        replacement = {
          session_id: nextId,
          class_session_id: nextId,
          student_id: session.student_id,
          student_name: session.student_name,
          schedule_date: nextD,
          schedule_time: '10:00',
          class_date: nextD,
          start_time: '10:00',
          scheduled_start: `${nextD}T10:00:00.000Z`,
          scheduled_end: `${nextD}T10:30:00.000Z`,
          duration_minutes: Number(session.duration_minutes) || 30,
          status: 'SCHEDULED',
          session_status: 'SCHEDULED',
          attendance_status: 'NOT_MARKED',
          deduct_class: false,
          cancellation_reason: '',
          class_credit_effect: 'PENDING',
        };
        classesList.push(replacement);
        if (pkg) pkg.end_date = nextD;
      }
    }
    return { ...session, replacement_session: replacement };
  }
  return { session_id: sid, session_status: 'CANCELLED', deduct_class: deduct };
}

export function handleMockClassRestoreCredit(payload: Record<string, unknown>) {
  const sid = String(payload.session_id || payload.class_session_id || '');
  const classesList = MOCK_CLASSES as unknown as Record<string, unknown>[];
  const session = classesList.find((c) => c.session_id === sid || c.class_session_id === sid);
  if (session) {
    session.deduct_class = false;
    session.class_credit_effect = 'CREDIT_BACK';
    return session;
  }
  return { session_id: sid, deduct_class: false };
}
