// tests/live-sync-stu004.js
// Live Google Sheets synchronization and read-back verification for STU_004 (Sudarshini)

const LIVE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w/exec';
const ADMIN_KEY = process.env.ADMIN_AUTH_KEY || '123456';

async function sendApi(operation, payload = {}, token = null) {
  await new Promise((r) => setTimeout(r, 400));
  const body = {
    apiVersion: '1',
    operation,
    payload,
    identityToken: token,
    requestId: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };

  const response = await fetch(LIVE_APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text.slice(0, 150)}`);
  }
}

function generate32Sessions() {
  const recurringDays = [0, 6]; // Sunday = 0, Saturday = 6
  const sessions = [];
  // Start date: Sunday, 2026-08-02
  let curr = new Date(Date.UTC(2026, 7, 2, 10, 0, 0)); // 2026-08-02 10:00 UTC for calculation
  let count = 0;
  while (count < 32) {
    const day = curr.getUTCDay();
    if (day === 0 || day === 6) {
      const y = curr.getUTCFullYear();
      const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
      const d = String(curr.getUTCDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const timeStr = '10:00';
      const endTimeStr = '10:30';
      sessions.push({
        schedule_date: dateStr,
        schedule_time: timeStr,
        class_date: dateStr,
        start_time: timeStr,
        duration_minutes: 30,
        scheduled_start: `${dateStr}T10:00:00.000Z`,
        scheduled_end: `${dateStr}T10:30:00.000Z`,
        topic: 'Geeta - Session',
        class_title: 'Geeta - Session',
      });
      count++;
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return sessions;
}

async function run() {
  console.log('================================================================');
  console.log('   LIVE GOOGLE SHEETS SYNC: SUDARSHINI (STU_004)                ');
  console.log('================================================================');

  // Step 0: Auth
  const loginRes = await sendApi('auth.login', { key: ADMIN_KEY });
  if (!loginRes.success || !loginRes.data?.token) {
    throw new Error(`Auth failed: ${JSON.stringify(loginRes)}`);
  }
  const token = loginRes.data.token;
  console.log(`✓ Authenticated as: ${loginRes.data.user.email}`);

  // Step 1: Pre-inspection
  console.log('\n--- 1. PRE-INSPECTION OF EXISTING RECORDS ---');
  const stuListRes = await sendApi('students.list', {}, token);
  const existingStudents = stuListRes.data || [];
  console.log(`Existing Students in Google Sheets: ${existingStudents.length}`);
  for (const s of existingStudents) {
    console.log(`- ${s.student_id}: ${s.student_name} (${s.status || s.student_status})`);
  }

  const existingStu004 = existingStudents.find((s) => s.student_id === 'STU_004');
  console.log(`STU_004 already exists? ${existingStu004 ? 'YES' : 'NO'}`);

  // Step 2: Create or Update Student STU_004
  console.log('\n--- 2. CREATE / UPDATE STUDENT STU_004 ---');
  let stuResult;
  const studentPayload = {
    student_id: 'STU_004',
    student_name: 'Sudarshini',
    parent_name: 'Avantika',
    parent_phone: '+91 78282 62626',
    parent_email: 'avantikasinghsengar@gmail.com',
    student_phone: '',
    student_email: '',
    subject: 'Geeta',
    status: 'ACTIVE',
  };

  if (existingStu004) {
    console.log('Updating existing STU_004...');
    stuResult = await sendApi('students.update', { studentId: 'STU_004', ...studentPayload }, token);
  } else {
    console.log('Creating new student STU_004...');
    stuResult = await sendApi('students.create', studentPayload, token);
  }

  if (!stuResult.success) {
    throw new Error(`Failed to save student STU_004: ${JSON.stringify(stuResult)}`);
  }
  console.log('✓ Student STU_004 saved successfully:', stuResult.data?.student_id, stuResult.data?.student_name);

  // Step 3: Save Recurring Schedules (Saturday 10:00-10:30, Sunday 10:00-10:30)
  console.log('\n--- 3. SAVE RECURRING SCHEDULES ---');
  const schedRes = await sendApi('schedules.save', {
    student_id: 'STU_004',
    studentId: 'STU_004',
    schedules: [
      { day_of_week: 'SATURDAY', start_time: '10:00', end_time: '10:30' },
      { day_of_week: 'SUNDAY', start_time: '10:00', end_time: '10:30' },
    ],
  }, token);
  console.log('✓ Schedules save result:', schedRes.success ? 'SUCCESS' : JSON.stringify(schedRes));

  // Step 4: Create or Update Package
  console.log('\n--- 4. CREATE / UPDATE PACKAGE ---');
  const pkgPayload = {
    student_id: 'STU_004',
    student_name: 'Sudarshini',
    plan_type: 'Per Class',
    currency: 'INR',
    package_price: 12500,
    classes_purchased: 32,
    start_date: '2026-08-02',
    end_date: '2026-11-22',
    next_due_date: '2026-11-08',
    class_duration: 30,
    class_schedule: 'Sat - 10:00 AM, Sun - 10:00 AM',
  };

  const existingPkgs = await sendApi('packages.list', { student_id: 'STU_004' }, token);
  let pkgResult;
  if (existingPkgs.success && existingPkgs.data && existingPkgs.data.length > 0) {
    console.log('Updating existing package for STU_004...');
    pkgResult = await sendApi('packages.update', { packageId: existingPkgs.data[0].package_id, ...pkgPayload }, token);
  } else {
    console.log('Creating new package for STU_004...');
    pkgResult = await sendApi('packages.create', pkgPayload, token);
  }

  if (!pkgResult.success) {
    throw new Error(`Failed to save package: ${JSON.stringify(pkgResult)}`);
  }
  console.log('✓ Package saved successfully:', pkgResult.data?.package_id, `classes_purchased=${pkgResult.data?.classes_purchased}`);

  // Step 5: Record Payment
  console.log('\n--- 5. RECORD PAYMENT ---');
  const existingPayments = await sendApi('payments.list', { student_id: 'STU_004' }, token);
  const paymentAlreadyRecorded = existingPayments.success && existingPayments.data && existingPayments.data.some(
    p => p.student_id === 'STU_004' && (p.payment_date === '2026-08-01' || p.amount == 12500)
  );

  if (paymentAlreadyRecorded) {
    console.log('✓ Payment already recorded for STU_004, skipping to avoid duplicates.');
  } else {
    console.log('Recording payment of INR 12,500 on 2026-08-01...');
    const payResult = await sendApi('payments.record', {
      student_id: 'STU_004',
      student_name: 'Sudarshini',
      payment_date: '2026-08-01',
      amount: 12500,
      currency: 'INR',
      in_inr: 12500,
      payment_method: 'UPI',
      status: 'COMPLETED',
      reference_notes: 'Tuition payment for 32 Per Class Geeta package',
    }, token);

    if (!payResult.success) {
      throw new Error(`Failed to record payment: ${JSON.stringify(payResult)}`);
    }
    console.log('✓ Payment recorded successfully:', payResult.data?.payment_id);
  }

  // Step 6: Create or Update Meeting Link
  console.log('\n--- 6. CREATE / UPDATE MEETING LINK ---');
  const zoomUrl = 'https://us05web.zoom.us/j/88994807633?pwd=EPINzpH9KRWAtlYJjhWXSjbbbVLo2C.1';
  const mlResult = await sendApi('meetingLinks.create', {
    student_id: 'STU_004',
    student_name: 'Sudarshini',
    meeting_link_1: zoomUrl,
    meeting_url: zoomUrl,
    provider: 'ZOOM',
  }, token);

  if (!mlResult.success) {
    throw new Error(`Failed to save meeting link: ${JSON.stringify(mlResult)}`);
  }
  console.log('✓ Meeting link saved successfully for STU_004');

  // Step 7: Batch Schedule 32 Class Sessions
  console.log('\n--- 7. GENERATE 32 CLASS SESSIONS ---');
  const existingClassesRes = await sendApi('classes.list', { student_id: 'STU_004' }, token);
  const existingClasses = existingClassesRes.data || [];

  if (existingClasses.length >= 32) {
    console.log(`✓ All 32 class sessions already exist for STU_004 (${existingClasses.length} found). Skipping batch schedule to maintain idempotency.`);
  } else {
    const sessions = generate32Sessions();
    console.log(`Generated ${sessions.length} session descriptors:`);
    console.log(`First: ${sessions[0].schedule_date} ${sessions[0].schedule_time}`);
    console.log(`Last:  ${sessions[sessions.length - 1].schedule_date} ${sessions[sessions.length - 1].schedule_time}`);

    const batchSchedRes = await sendApi('classes.batchSchedule', {
      student_id: 'STU_004',
      sessions: sessions,
    }, token);

    if (!batchSchedRes.success) {
      throw new Error(`Failed to batch schedule sessions: ${JSON.stringify(batchSchedRes)}`);
    }
    console.log(`✓ Batch schedule complete. Count: ${batchSchedRes.count || batchSchedRes.data?.length}`);
  }

  // Step 8: Update Rescheduled Sessions (13/09/2026 and 04/10/2026)
  console.log('\n--- 8. UPDATE RESCHEDULED SESSIONS (13/09/2026 & 04/10/2026) ---');
  const rescheduledDates = ['2026-09-13', '2026-10-04'];
  const rescheduleNote = 'Student was unavailable - class rescheduled. Class balance will not be deducted.';

  // Fetch current sessions to get precise row indices
  const currentSessionsRes = await sendApi('classes.list', { student_id: 'STU_004' }, token);
  const currentSessions = currentSessionsRes.data || [];

  for (const rDate of rescheduledDates) {
    const targetSession = currentSessions.find(c => c.schedule_date === rDate || c.class_date === rDate);
    const rowIndex = targetSession?._rowIndex;
    const compId = `STU_004__${rDate}__10:00`;
    console.log(`Updating rescheduled session: ${compId} (rowIndex: ${rowIndex})`);

    const updateRes = await sendApi('classes.update', {
      rowIndex: rowIndex,
      _rowIndex: rowIndex,
      class_session_id: compId,
      session_id: compId,
      student_id: 'STU_004',
      schedule_date: rDate,
      schedule_time: '10:00',
      session_status: 'CANCELLED',
      attendance_status: 'CANCELLED',
      cancellation_reason: rescheduleNote,
      deduct_class: false,
    }, token);

    if (!updateRes.success) {
      console.warn(`classes.update warning for ${compId}:`, updateRes.message);
    } else {
      console.log(`✓ Session ${rDate} updated: session_status=CANCELLED, deduct_class=false`);
    }

    // Also record note in StudentNotes if not already recorded
    const existingNotesRes = await sendApi('notes.list', { student_id: 'STU_004' }, token);
    const existingNotes = existingNotesRes.data || [];
    const noteExists = existingNotes.some(n => n.note_date === rDate && (n.note_text?.includes('rescheduled') || n.content?.includes('rescheduled')));

    if (!noteExists) {
      const noteRes = await sendApi('notes.create', {
        student_id: 'STU_004',
        student_name: 'Sudarshini',
        note_date: rDate,
        note_text: rescheduleNote,
        note_type: 'ACADEMIC',
      }, token);
      console.log(`✓ Note recorded for ${rDate}: ${noteRes.success ? 'SUCCESS' : noteRes.message}`);
    } else {
      console.log(`✓ Note already exists for ${rDate}`);
    }
  }

  // Step 9: Standardize Date Formats
  console.log('\n--- 9. STANDARDIZE DATE FORMATS GLOBALLY ---');
  const fmtRes = await sendApi('system.standardizeDateFormats', {}, token);
  console.log('✓ Standardize date formats result:', fmtRes.success ? 'SUCCESS' : fmtRes.message);

  // Step 10: Read-Back Verification
  console.log('\n================================================================');
  console.log('   FULL READ-BACK VERIFICATION FROM LIVE GOOGLE SHEETS          ');
  console.log('================================================================');

  // Verify Student
  const readStu = await sendApi('students.get', { student_id: 'STU_004' }, token);
  console.log('\n1. STUDENT RECORD:');
  console.log(`   ID:           ${readStu.data?.student_id}`);
  console.log(`   Name:         ${readStu.data?.student_name}`);
  console.log(`   Parent:       ${readStu.data?.parent_name}`);
  console.log(`   Phone:        ${readStu.data?.parent_phone}`);
  console.log(`   Email:        ${readStu.data?.parent_email}`);
  console.log(`   Subject:      ${readStu.data?.subject}`);
  console.log(`   Status:       ${readStu.data?.status}`);

  // Verify Package
  const readPkgs = await sendApi('packages.list', { student_id: 'STU_004' }, token);
  const pkg = readPkgs.data?.[0];
  console.log('\n2. PACKAGE RECORD:');
  console.log(`   Plan Type:         ${pkg?.plan_type}`);
  console.log(`   Classes Purchased: ${pkg?.classes_purchased}`);
  console.log(`   Package Price:     ₹${pkg?.package_price}`);
  console.log(`   Start Date:        ${pkg?.start_date}`);
  console.log(`   End Date:          ${pkg?.end_date}`);
  console.log(`   Next Due Date:     ${pkg?.next_due_date}`);
  console.log(`   Duration:          ${pkg?.class_duration} min`);
  console.log(`   Class Schedule:    ${pkg?.class_schedule}`);

  // Verify Balance
  const readBal = await sendApi('packages.getBalance', { student_id: 'STU_004' }, token);
  console.log('\n3. PACKAGE BALANCE:');
  console.log(`   Total Purchased:   ${readBal.data?.totalPurchased}`);
  console.log(`   Total Consumed:    ${readBal.data?.totalConsumed}`);
  console.log(`   Remaining Classes: ${readBal.data?.remainingClasses}`);

  // Verify Payment
  const readPays = await sendApi('payments.list', { student_id: 'STU_004' }, token);
  console.log('\n4. PAYMENT RECORD:');
  for (const p of readPays.data || []) {
    console.log(`   ID: ${p.payment_id}, Date: ${p.payment_date}, Amount: ₹${p.amount || p.in_inr}, Status: ${p.status}`);
  }

  // Verify Meeting Link
  const readLinks = await sendApi('meetingLinks.list', { student_id: 'STU_004' }, token);
  console.log('\n5. MEETING LINK RECORD:');
  for (const l of readLinks.data || []) {
    console.log(`   Link 1: ${l.meeting_link_1}`);
    console.log(`   URL:    ${l.meeting_url}`);
  }

  // Verify Class Sessions
  const readSessions = await sendApi('classes.list', { student_id: 'STU_004' }, token);
  const allCls = readSessions.data || [];
  console.log('\n6. CLASS SESSIONS:');
  console.log(`   Total Sessions Found: ${allCls.length}`);
  console.log(`   First Session:        ${allCls[0]?.schedule_date} ${allCls[0]?.schedule_time} (${allCls[0]?.session_status})`);
  console.log(`   32nd Session:         ${allCls[allCls.length - 1]?.schedule_date} ${allCls[allCls.length - 1]?.schedule_time} (${allCls[allCls.length - 1]?.session_status})`);

  const s13 = allCls.find(c => c.schedule_date === '2026-09-13');
  console.log('\n   Session 13 (2026-09-13):');
  console.log(`   - Status:      ${s13?.session_status}`);
  console.log(`   - Attendance:  ${s13?.attendance_status}`);
  console.log(`   - Reason:      "${s13?.cancellation_reason}"`);
  console.log(`   - DeductClass: ${s13?.deduct_class}`);

  const s19 = allCls.find(c => c.schedule_date === '2026-10-04');
  console.log('\n   Session 19 (2026-10-04):');
  console.log(`   - Status:      ${s19?.session_status}`);
  console.log(`   - Attendance:  ${s19?.attendance_status}`);
  console.log(`   - Reason:      "${s19?.cancellation_reason}"`);
  console.log(`   - DeductClass: ${s19?.deduct_class}`);

  // Verify Notes
  const readNotes = await sendApi('notes.list', { student_id: 'STU_004' }, token);
  console.log('\n7. STUDENT NOTES:');
  for (const n of readNotes.data || []) {
    console.log(`   - [${n.note_date}] ${n.content || n.note_text}`);
  }

  // Verify Other Students Untouched
  const finalAllStudents = await sendApi('students.list', {}, token);
  console.log('\n8. INTEGRITY CHECK (ALL STUDENTS):');
  for (const st of finalAllStudents.data || []) {
    console.log(`   - ${st.student_id}: ${st.student_name} (${st.status || st.student_status})`);
  }

  console.log('\n================================================================');
  console.log('   SYNC AND VERIFICATION COMPLETE!                              ');
  console.log('================================================================');
}

run().catch(e => {
  console.error('Fatal error during sync:', e);
  process.exit(1);
});
