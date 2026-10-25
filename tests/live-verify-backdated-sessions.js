// tests/live-verify-backdated-sessions.js
// Verification of Backdated Schedule (19 January 2026) for STU_001 on Live Google Sheets Backend

const LIVE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w/exec';
const ADMIN_KEY = process.env.ADMIN_AUTH_KEY || '123456';

function toTime12(time24) {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function calculateEndTime(startTime, durationMinutes) {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + durationMinutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

async function sendApi(operation, payload = {}, token = null) {
  await new Promise((r) => setTimeout(r, 400));
  const body = {
    apiVersion: '1',
    operation,
    payload,
    identityToken: token,
    requestId: `verify_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

async function run() {
  console.log('================================================================');
  console.log('   LIVE VERIFICATION: BACKDATED 48 SESSIONS (19 JAN 2026)       ');
  console.log('================================================================');
  console.log(`Endpoint: ${LIVE_APPS_SCRIPT_URL}`);

  // Step 0: Auth
  const loginRes = await sendApi('auth.login', { key: ADMIN_KEY });
  if (!loginRes.success || !loginRes.data?.token) {
    throw new Error(`Auth failed: ${JSON.stringify(loginRes)}`);
  }
  const token = loginRes.data.token;
  console.log(`✓ Authenticated as: ${loginRes.data.user.email}`);

  // Step 1: Student Verification
  console.log('\n--- 1. STUDENT VERIFICATION ---');
  const stuRes = await sendApi('students.get', { student_id: 'STU_001' }, token);
  if (!stuRes.success || !stuRes.data) throw new Error('Failed to retrieve student STU_001');
  const student = stuRes.data;
  console.log(`Student ID:      ${student.student_id}`);
  console.log(`Student Name:    ${student.student_name}`);
  console.log(`Parent Name:     ${student.parent_name}`);
  console.log(`Parent Phone:    ${student.parent_phone}`);
  console.log(`Status:          ${student.status}`);
  if (student.status !== 'ACTIVE' && student.status !== 'INACTIVE') throw new Error(`Expected student status ACTIVE or INACTIVE, got: ${student.status}`);
  console.log('✓ Student record verified');

  // Step 2: Package Verification
  console.log('\n--- 2. PACKAGE VERIFICATION ---');
  const pkgRes = await sendApi('packages.list', { student_id: 'STU_001' }, token);
  if (!pkgRes.success || !pkgRes.data?.length) throw new Error('Failed to retrieve package for STU_001');
  const pkg = pkgRes.data[0];
  console.log(`Plan Type:         ${pkg.plan_type}`);
  console.log(`Classes Purchased: ${pkg.classes_purchased}`);
  console.log(`Class Duration:    ${pkg.class_duration} minutes`);
  console.log(`Start Date:        ${pkg.start_date}`);
  console.log(`End Date:          ${pkg.end_date}`);
  console.log(`Next Due Date:     ${pkg.next_due_date}`);
  console.log(`Class Schedule:    ${pkg.class_schedule}`);
  console.log(`Parsed Schedules:  ${JSON.stringify(pkg.schedules)}`);

  if (Number(pkg.classes_purchased) !== 48) throw new Error(`Expected 48 classes purchased, got: ${pkg.classes_purchased}`);
  if (Number(pkg.class_duration) !== 30) throw new Error(`Expected duration 30, got: ${pkg.class_duration}`);
  if (pkg.start_date !== '2026-01-19') throw new Error(`Expected start_date 2026-01-19, got: ${pkg.start_date}`);
  if (pkg.end_date !== '2026-05-09') throw new Error(`Expected end_date 2026-05-09, got: ${pkg.end_date}`);
  if (pkg.next_due_date !== '2026-04-29') throw new Error(`Expected next_due_date 2026-04-29, got: ${pkg.next_due_date}`);
  console.log('✓ Package dates, duration, and class schedule verified 100%');

  // Step 3: Class Sessions Verification
  console.log('\n--- 3. CLASS SESSIONS (48 SESSIONS) VERIFICATION ---');
  const clsRes = await sendApi('classes.list', { student_id: 'STU_001' }, token);
  if (!clsRes.success || !clsRes.data) throw new Error('Failed to retrieve classes');
  const sessions = clsRes.data;
  console.log(`Total Sessions Returned: ${sessions.length}`);
  if (sessions.length !== 48) throw new Error(`Expected exactly 48 sessions, got: ${sessions.length}`);

  // Milestone 1: Session 1
  const s1 = sessions[0];
  const s1End = calculateEndTime(s1.schedule_time, s1.duration_minutes);
  const s1Display = `${toTime12(s1.schedule_time)} – ${toTime12(s1End)}`;
  console.log(`\nSession 1:`);
  console.log(`  Date:     ${s1.schedule_date} (Monday)`);
  console.log(`  Time:     ${s1.schedule_time} -> ${s1Display}`);
  console.log(`  Duration: ${s1.duration_minutes} mins`);
  console.log(`  Status:   ${s1.session_status} | Att: ${s1.attendance_status} | Deduct: ${s1.deduct_class}`);
  if (s1.schedule_date !== '2026-01-19' || s1.schedule_time !== '18:00') {
    throw new Error(`Session 1 mismatch: expected 2026-01-19 18:00, got ${s1.schedule_date} ${s1.schedule_time}`);
  }

  // Milestone 2: Session 44
  const s44 = sessions[43];
  const s44End = calculateEndTime(s44.schedule_time, s44.duration_minutes);
  const s44Display = `${toTime12(s44.schedule_time)} – ${toTime12(s44End)}`;
  console.log(`\nSession 44 (Payment Due Milestone):`);
  console.log(`  Date:     ${s44.schedule_date} (Wednesday)`);
  console.log(`  Time:     ${s44.schedule_time} -> ${s44Display}`);
  console.log(`  Duration: ${s44.duration_minutes} mins`);
  console.log(`  Status:   ${s44.session_status} | Att: ${s44.attendance_status} | Deduct: ${s44.deduct_class}`);
  if (s44.schedule_date !== '2026-04-29' || s44.schedule_time !== '18:00') {
    throw new Error(`Session 44 mismatch: expected 2026-04-29 18:00, got ${s44.schedule_date} ${s44.schedule_time}`);
  }

  // Milestone 3: Session 48
  const s48 = sessions[47];
  const s48End = calculateEndTime(s48.schedule_time, s48.duration_minutes);
  const s48Display = `${toTime12(s48.schedule_time)} – ${toTime12(s48End)}`;
  console.log(`\nSession 48 (Final Session):`);
  console.log(`  Date:     ${s48.schedule_date} (Saturday)`);
  console.log(`  Time:     ${s48.schedule_time} -> ${s48Display}`);
  console.log(`  Duration: ${s48.duration_minutes} mins`);
  console.log(`  Status:   ${s48.session_status} | Att: ${s48.attendance_status} | Deduct: ${s48.deduct_class}`);
  if (s48.schedule_date !== '2026-05-09' || s48.schedule_time !== '10:00') {
    throw new Error(`Session 48 mismatch: expected 2026-05-09 10:00, got ${s48.schedule_date} ${s48.schedule_time}`);
  }

  // Verify all 48 sessions
  const expectedDays = { 1: '18:00', 3: '18:00', 6: '10:00' };
  for (let i = 0; i < 48; i++) {
    const s = sessions[i];
    const parts = s.schedule_date.split('-').map(Number);
    const dObj = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
    const day = dObj.getUTCDay();

    if (!expectedDays[day]) {
      throw new Error(`Session ${i + 1} (${s.schedule_date}) is on unexpected day of week: ${day}`);
    }
    if (s.schedule_time !== expectedDays[day]) {
      throw new Error(`Session ${i + 1} (${s.schedule_date}) expected time ${expectedDays[day]}, got ${s.schedule_time}`);
    }
    if (s.duration_minutes !== 30) {
      throw new Error(`Session ${i + 1} duration expected 30, got ${s.duration_minutes}`);
    }
    if (s.attendance_status !== 'PRESENT') {
      throw new Error(`Session ${i + 1} attendance_status expected PRESENT, got ${s.attendance_status}`);
    }
    if (s.session_status !== 'COMPLETED') {
      throw new Error(`Session ${i + 1} session_status expected COMPLETED, got ${s.session_status}`);
    }
    if (s.deduct_class !== true) {
      throw new Error(`Session ${i + 1} deduct_class expected true, got ${s.deduct_class}`);
    }
  }

  console.log('\n✓ All 48 sessions strictly conform to:');
  console.log('  - Weekly cadence: Mon 18:00, Wed 18:00, Sat 10:00');
  console.log('  - 30-minute duration');
  console.log('  - 100% preservation of attendance (PRESENT), status (COMPLETED), and deduction (true)');
  console.log('\n================================================================');
  console.log('   ALL VERIFICATION CHECKS PASSED SUCCESSFULLY                  ');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
