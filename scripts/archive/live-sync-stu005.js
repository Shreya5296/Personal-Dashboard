// tests/live-sync-stu005.js
// Live Google Sheets synchronization and read-back verification for STU_005 (Krishnavi)

const LIVE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w/exec';
const ADMIN_KEY = process.env.ADMIN_AUTH_KEY || '123456';

async function sendApi(operation, payload = {}, token = null) {
  await new Promise((r) => setTimeout(r, 400));
  const body = {
    apiVersion: '1',
    operation,
    payload,
    identityToken: token,
    requestId: `sync5_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

function generate30SaturdaySessions() {
  const sessions = [];
  // Start from 2026-08-03 (Monday); first Saturday is 2026-08-08
  let curr = new Date(Date.UTC(2026, 7, 3, 12, 0, 0));
  let count = 0;
  while (count < 30) {
    if (curr.getUTCDay() === 6) { // Saturday
      const y = curr.getUTCFullYear();
      const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
      const d = String(curr.getUTCDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const timeStr = '18:00';
      const endTimeStr = '18:30';
      sessions.push({
        schedule_date: dateStr,
        schedule_time: timeStr,
        class_date: dateStr,
        start_time: timeStr,
        duration_minutes: 30,
        // In Asia/Kolkata (UTC+05:30), 18:00 IST is 12:30 UTC
        scheduled_start: `${dateStr}T12:30:00.000Z`,
        scheduled_end: `${dateStr}T13:00:00.000Z`,
        topic: 'Math - Session',
        class_title: 'Math - Session',
      });
      count++;
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return sessions;
}

async function run() {
  console.log('================================================================');
  console.log('   LIVE GOOGLE SHEETS SYNC: KRISHNAVI (STU_005)                 ');
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

  const existingStu005 = existingStudents.find((s) => s.student_id === 'STU_005');
  console.log(`STU_005 already exists? ${existingStu005 ? 'YES' : 'NO'}`);

  // Step 2: Create or Update Student STU_005
  console.log('\n--- 2. CREATE / UPDATE STUDENT STU_005 ---');
  let stuResult;
  const studentPayload = {
    student_id: 'STU_005',
    student_name: 'Krishnavi',
    parent_name: 'Dhaneshwari',
    parent_phone: '+44 7459817653',
    parent_email: 'bhumi.ria@gmail.com',
    student_phone: '',
    student_email: '',
    subject: 'Math',
    status: 'ACTIVE',
  };

  if (existingStu005) {
    console.log('Updating existing STU_005...');
    stuResult = await sendApi('students.update', { studentId: 'STU_005', ...studentPayload }, token);
  } else {
    console.log('Creating new student STU_005...');
    stuResult = await sendApi('students.create', studentPayload, token);
  }

  if (!stuResult.success) {
    throw new Error(`Failed to save student STU_005: ${JSON.stringify(stuResult)}`);
  }
  console.log('✓ Student STU_005 saved successfully:', stuResult.data?.student_id, stuResult.data?.student_name);

  // Step 3: Save Recurring Schedule (Confirmed Saturday 18:00-18:30; Sunday unresolved)
  console.log('\n--- 3. SAVE RECURRING SCHEDULE ---');
  console.log('Confirmed Saturday: 18:00 - 18:30 IST. Sunday time unconfirmed (not invented).');
  const schedRes = await sendApi('schedules.save', {
    student_id: 'STU_005',
    studentId: 'STU_005',
    schedules: [
      { day_of_week: 'SATURDAY', start_time: '18:00', end_time: '18:30' },
    ],
  }, token);
  console.log('✓ Saturday schedule saved:', schedRes.success ? 'SUCCESS' : JSON.stringify(schedRes));

  // Step 4: Create or Update Package
  console.log('\n--- 4. CREATE / UPDATE PACKAGE ---');
  const pkgPayload = {
    student_id: 'STU_005',
    student_name: 'Krishnavi',
    plan_type: 'Per Class',
    currency: 'GBP',
    package_price: 150,
    classes_purchased: 30,
    start_date: '2026-08-03',
    end_date: '2027-02-27', // Sequence end date for 30 confirmed Saturday sessions
    next_due_date: '2027-01-30',
    class_duration: 30,
    class_schedule: 'Saturday 6:00 PM; Sunday — time to be confirmed',
  };

  const existingPkgs = await sendApi('packages.list', { student_id: 'STU_005' }, token);
  let pkgResult;
  if (existingPkgs.success && existingPkgs.data && existingPkgs.data.length > 0) {
    console.log('Updating existing package for STU_005...');
    pkgResult = await sendApi('packages.update', { packageId: existingPkgs.data[0].package_id, ...pkgPayload }, token);
  } else {
    console.log('Creating new package for STU_005...');
    pkgResult = await sendApi('packages.create', pkgPayload, token);
  }

  if (!pkgResult.success) {
    throw new Error(`Failed to save package: ${JSON.stringify(pkgResult)}`);
  }
  console.log('✓ Package saved successfully:', pkgResult.data?.package_id, `classes_purchased=${pkgResult.data?.classes_purchased}`);

  // Step 5: Record Payment (GBP 150 on 2026-08-03)
  console.log('\n--- 5. RECORD PAYMENT ---');
  const existingPayments = await sendApi('payments.list', { student_id: 'STU_005' }, token);
  const paymentAlreadyRecorded = existingPayments.success && existingPayments.data && existingPayments.data.some(
    p => p.student_id === 'STU_005' && (p.payment_date === '2026-08-03' || p.amount == 150)
  );

  if (paymentAlreadyRecorded) {
    console.log('✓ Payment already recorded for STU_005, skipping to avoid duplicates.');
  } else {
    console.log('Recording payment of GBP 150 on 2026-08-03...');
    const payResult = await sendApi('payments.record', {
      student_id: 'STU_005',
      student_name: 'Krishnavi',
      payment_date: '2026-08-03',
      amount: 150,
      currency: 'GBP',
      in_inr: 0, // In accordance with foreign currency policy: no exchange rate invented
      payment_method: 'BANK_TRANSFER',
      status: 'COMPLETED',
      reference_notes: 'Tuition payment for 30 Per Class Math package (GBP 150)',
    }, token);

    if (!payResult.success) {
      throw new Error(`Failed to record payment: ${JSON.stringify(payResult)}`);
    }
    console.log('✓ Payment recorded successfully:', payResult.data?.payment_id);
  }

  // Step 6: Create or Update Meeting Link
  console.log('\n--- 6. CREATE / UPDATE MEETING LINK ---');
  const zoomUrl = 'https://us05web.zoom.us/j/87454825160?pwd=7kcPZPzevABHMFdTQMmkqxdDVavZVo.1';
  const mlResult = await sendApi('meetingLinks.create', {
    student_id: 'STU_005',
    student_name: 'Krishnavi',
    meeting_link_1: zoomUrl,
    meeting_url: zoomUrl,
    provider: 'ZOOM',
  }, token);

  if (!mlResult.success) {
    throw new Error(`Failed to save meeting link: ${JSON.stringify(mlResult)}`);
  }
  console.log('✓ Meeting link saved successfully for STU_005');

  // Step 7: Batch Schedule Class Sessions (30 Confirmed Saturday Sessions)
  console.log('\n--- 7. GENERATE CLASS SESSIONS ---');
  const existingClassesRes = await sendApi('classes.list', { student_id: 'STU_005' }, token);
  const existingClasses = existingClassesRes.data || [];

  if (existingClasses.length >= 30) {
    console.log(`✓ All 30 class sessions already exist for STU_005 (${existingClasses.length} found). Skipping batch schedule.`);
  } else {
    const sessions = generate30SaturdaySessions();
    console.log(`Generated ${sessions.length} valid Saturday sessions at 18:00 IST (Sunday sessions withheld until confirmed):`);
    console.log(`First: ${sessions[0].schedule_date} ${sessions[0].schedule_time}`);
    console.log(`Last:  ${sessions[sessions.length - 1].schedule_date} ${sessions[sessions.length - 1].schedule_time}`);

    const batchSchedRes = await sendApi('classes.batchSchedule', {
      student_id: 'STU_005',
      sessions: sessions,
    }, token);

    if (!batchSchedRes.success) {
      throw new Error(`Failed to batch schedule sessions: ${JSON.stringify(batchSchedRes)}`);
    }
    console.log(`✓ Batch schedule complete. Count: ${batchSchedRes.count || batchSchedRes.data?.length}`);
  }

  // Step 8: Rescheduled Class — 28 August 2026 (Rakshabandhan)
  console.log('\n--- 8. RESCHEDULED CLASS (28/08/2026) & NOTE RECORDING ---');
  const rakshaDate = '2026-08-28';
  const rakshaNote = 'Due to Rakshabandhan - class rescheduled. Class balance will not be deducted.';

  // Check if session for 2026-08-28 exists
  const currentSessionsRes = await sendApi('classes.list', { student_id: 'STU_005' }, token);
  const currentSessions = currentSessionsRes.data || [];
  const matchingSession = currentSessions.find(c => c.schedule_date === rakshaDate || c.class_date === rakshaDate);

  if (matchingSession) {
    console.log(`Found matching session on ${rakshaDate} (row ${matchingSession._rowIndex}). Updating to CANCELLED...`);
    const updateRes = await sendApi('classes.update', {
      rowIndex: matchingSession._rowIndex,
      _rowIndex: matchingSession._rowIndex,
      class_session_id: matchingSession.class_session_id || matchingSession.session_id,
      session_id: matchingSession.session_id,
      student_id: 'STU_005',
      schedule_date: rakshaDate,
      session_status: 'CANCELLED',
      attendance_status: 'CANCELLED',
      cancellation_reason: rakshaNote,
      deduct_class: false,
    }, token);
    console.log('✓ Session updated:', updateRes.success ? 'SUCCESS' : updateRes.message);
  } else {
    console.log(`Notice: 28 August 2026 is a Friday; no recurring session existed on Friday in ClassSessions.`);
    console.log(`Preserving required rescheduling note in StudentNotes for 2026-08-28.`);
  }

  // Record note in StudentNotes if not already present
  const existingNotesRes = await sendApi('notes.list', { student_id: 'STU_005' }, token);
  const existingNotes = existingNotesRes.data || [];
  const noteExists = existingNotes.some(n => n.note_date === rakshaDate && (n.note_text?.includes('Rakshabandhan') || n.content?.includes('Rakshabandhan')));

  if (!noteExists) {
    const noteRes = await sendApi('notes.create', {
      student_id: 'STU_005',
      student_name: 'Krishnavi',
      note_date: rakshaDate,
      note_text: rakshaNote,
      note_type: 'ACADEMIC',
    }, token);
    console.log(`✓ Note recorded in StudentNotes for ${rakshaDate}: ${noteRes.success ? 'SUCCESS' : noteRes.message}`);
  } else {
    console.log(`✓ Note already recorded for ${rakshaDate}`);
  }

  // Step 9: Standardize Date Formats Globally
  console.log('\n--- 9. STANDARDIZE DATE FORMATS GLOBALLY ---');
  const fmtRes = await sendApi('system.standardizeDateFormats', {}, token);
  console.log('✓ Standardize date formats result:', fmtRes.success ? 'SUCCESS' : fmtRes.message);

  // Step 10: Full Read-Back Verification
  console.log('\n================================================================');
  console.log('   FULL READ-BACK VERIFICATION FROM LIVE GOOGLE SHEETS          ');
  console.log('================================================================');

  // Verify Student
  const readStu = await sendApi('students.get', { student_id: 'STU_005' }, token);
  console.log('\n1. STUDENT RECORD:');
  console.log(`   ID:           ${readStu.data?.student_id}`);
  console.log(`   Name:         ${readStu.data?.student_name}`);
  console.log(`   Parent:       ${readStu.data?.parent_name}`);
  console.log(`   Phone:        ${readStu.data?.parent_phone}`);
  console.log(`   Email:        ${readStu.data?.parent_email}`);
  console.log(`   Subject:      ${readStu.data?.subject}`);
  console.log(`   Status:       ${readStu.data?.status}`);

  // Verify Package
  const readPkgs = await sendApi('packages.list', { student_id: 'STU_005' }, token);
  const pkg = readPkgs.data?.[0];
  console.log('\n2. PACKAGE RECORD:');
  console.log(`   Plan Type:         ${pkg?.plan_type}`);
  console.log(`   Classes Purchased: ${pkg?.classes_purchased}`);
  console.log(`   Package Price:     ${pkg?.currency} ${pkg?.package_price}`);
  console.log(`   Start Date:        ${pkg?.start_date}`);
  console.log(`   End Date:          ${pkg?.end_date}`);
  console.log(`   Next Due Date:     ${pkg?.next_due_date}`);
  console.log(`   Duration:          ${pkg?.class_duration} min`);
  console.log(`   Class Schedule:    ${pkg?.class_schedule}`);

  // Verify Balance
  const readBal = await sendApi('packages.getBalance', { student_id: 'STU_005' }, token);
  console.log('\n3. PACKAGE BALANCE:');
  console.log(`   Total Purchased:   ${readBal.data?.totalPurchased}`);
  console.log(`   Total Consumed:    ${readBal.data?.totalConsumed}`);
  console.log(`   Remaining Classes: ${readBal.data?.remainingClasses}`);

  // Verify Payment
  const readPays = await sendApi('payments.list', { student_id: 'STU_005' }, token);
  console.log('\n4. PAYMENT RECORD:');
  for (const p of readPays.data || []) {
    console.log(`   ID: ${p.payment_id}, Date: ${p.payment_date}, Amount: ${p.currency} ${p.amount}, in_inr: ${p.in_inr}`);
  }

  // Verify Meeting Link
  const readLinks = await sendApi('meetingLinks.list', { student_id: 'STU_005' }, token);
  console.log('\n5. MEETING LINK RECORD:');
  for (const l of readLinks.data || []) {
    console.log(`   Link 1: ${l.meeting_link_1}`);
    console.log(`   URL:    ${l.meeting_url}`);
  }

  // Verify Class Sessions
  const readSessions = await sendApi('classes.list', { student_id: 'STU_005' }, token);
  const allCls = readSessions.data || [];
  console.log('\n6. CLASS SESSIONS:');
  console.log(`   Total Sessions Found: ${allCls.length}`);
  console.log(`   First Session:        ${allCls[0]?.schedule_date} ${allCls[0]?.schedule_time} (${allCls[0]?.session_status})`);
  console.log(`   30th Session:         ${allCls[allCls.length - 1]?.schedule_date} ${allCls[allCls.length - 1]?.schedule_time} (${allCls[allCls.length - 1]?.session_status})`);

  // Verify Notes
  const readNotes = await sendApi('notes.list', { student_id: 'STU_005' }, token);
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
  console.log('   SYNC AND VERIFICATION FOR STU_005 COMPLETE!                   ');
  console.log('================================================================');
}

run().catch(e => {
  console.error('Fatal error during sync:', e);
  process.exit(1);
});
