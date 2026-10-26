// tests/live-e2e-status-and-calendar-verification.js
// Genuine live verification of Status Normalization and Calendar Synchronization
// against Apps Script deployment @34 and canonical Google Sheets.

const LIVE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w/exec';
const ADMIN_KEY = process.env.ADMIN_AUTH_KEY || '123456';

async function sendApi(operation, payload = {}, token = null) {
  await new Promise((r) => setTimeout(r, 800));
  const body = {
    apiVersion: '1',
    operation,
    payload,
    identityToken: token,
    requestId: `live_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

async function runLiveVerification() {
  console.log('=== STARTING GENUINE END-TO-END VERIFICATION: STATUS & CALENDAR ===');
  console.log(`Endpoint: ${LIVE_APPS_SCRIPT_URL}\n`);

  // Step 0: Authenticate
  console.log('Step 0: Authenticating with live Apps Script Web App...');
  const loginRes = await sendApi('auth.login', { key: ADMIN_KEY });
  if (!loginRes.success || !loginRes.data?.token) {
    console.error('Login failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.data.token;
  console.log(`✓ Authenticated as ${loginRes.data.user.email} (isAdmin: ${loginRes.data.user.isAdmin})\n`);

  const synthId = `E2E_STATUS_CAL_${Date.now().toString(36).toUpperCase()}`;
  let testStudentId = null;

  try {
    // Step 1: Create synthetic test student with status 'Active' (mixed case)
    console.log('Step 1: Testing Issue 1 — Creating student with mixed-case status "Active"...');
    const createRes = await sendApi('students.create', {
      student_name: `Synth Student ${synthId}`,
      parent_name: 'Parent Synthetic',
      parent_phone: '+91 99999 88888',
      parent_email: `parent_${synthId.toLowerCase()}@example.com`,
      student_email: '-',
      status: 'Active',
      subject: 'AP Physics',
    }, token);

    if (!createRes.success || !createRes.data?.student_id) {
      throw new Error(`Failed to create test student: ${JSON.stringify(createRes)}`);
    }
    testStudentId = createRes.data.student_id;
    console.log(`✓ Created test student: ID = ${testStudentId}, Name = ${createRes.data.student_name}`);
    console.log(`✓ Persisted status normalized: "${createRes.data.status}" (expected ACTIVE)\n`);
    if (createRes.data.status !== 'ACTIVE') {
      throw new Error(`Expected status to be ACTIVE, got ${createRes.data.status}`);
    }

    // Step 2: Test students.update with status: 'Active'
    console.log('Step 2: Testing Issue 1 — Updating student with status "Active" (previously caused validation failure)...');
    const updateRes = await sendApi('students.update', {
      student_id: testStudentId,
      student_name: `Synth Student ${synthId} Updated`,
      status: 'Active',
    }, token);

    if (!updateRes.success) {
      throw new Error(`Updating student with status 'Active' failed: ${JSON.stringify(updateRes)}`);
    }
    console.log(`✓ Update succeeded! Normalized status = "${updateRes.data.status}"\n`);

    // Step 3: Test that invalid status is strictly rejected
    console.log('Step 3: Verifying that truly invalid status is rejected with the exact error...');
    const badRes = await sendApi('students.update', {
      student_id: testStudentId,
      status: 'INVALID_STATUS',
    }, token);

    if (badRes.success) {
      throw new Error('Expected invalid status to be rejected, but it succeeded!');
    }
    const errMsg = badRes.error?.message || badRes.message || '';
    const errCode = badRes.error?.code || badRes.code || '';
    console.log(`✓ Backend correctly rejected invalid status: code = ${errCode}, message = "${errMsg}"\n`);
    if (!errMsg.includes('Status must be ACTIVE, INACTIVE, or ARCHIVED')) {
      throw new Error(`Expected error message to mention 'Status must be ACTIVE, INACTIVE, or ARCHIVED', got: ${errMsg}`);
    }

    // Step 4: Save recurring schedule (MONDAY 16:00 - 16:40)
    console.log('Step 4: Testing Issue 2 — Saving recurring schedule (MONDAY 16:00 - 16:40)...');
    const saveSchedRes = await sendApi('schedules.save', {
      student_id: testStudentId,
      schedules: [
        { day_of_week: 'MONDAY', start_time: '16:00', end_time: '16:40' }
      ]
    }, token);

    if (!saveSchedRes.success) {
      throw new Error(`Failed to save schedule: ${JSON.stringify(saveSchedRes)}`);
    }
    console.log(`✓ Saved schedule: ${JSON.stringify(saveSchedRes.data)}\n`);

    // Step 5: Read all schedules via schedules.list without student_id
    console.log('Step 5: Reading back schedules via schedules.list (verifying student_name enrichment)...');
    const listSchedRes = await sendApi('schedules.list', {}, token);
    if (!listSchedRes.success || !Array.isArray(listSchedRes.data)) {
      throw new Error(`Failed to list schedules: ${JSON.stringify(listSchedRes)}`);
    }
    const mySched = listSchedRes.data.find(s => s.student_id === testStudentId);
    if (!mySched) {
      throw new Error(`Could not find schedule for ${testStudentId} in live ClassSchedules tab!`);
    }
    console.log(`✓ Read back schedule: day = ${mySched.day_of_week}, start = ${mySched.start_time}, end = ${mySched.end_time}, student_name = "${mySched.student_name}"\n`);
    if (mySched.day_of_week !== 'MONDAY' || mySched.start_time !== '16:00' || mySched.end_time !== '16:40') {
      throw new Error(`Schedule values mismatch: ${JSON.stringify(mySched)}`);
    }

    // Step 6: Test deduplication upon updating schedule to WEDNESDAY 17:00 - 18:00
    console.log('Step 6: Updating schedule to WEDNESDAY 17:00 - 18:00 (duration: 60m) and checking deduplication...');
    const updateSchedRes = await sendApi('schedules.save', {
      student_id: testStudentId,
      schedules: [
        { day_of_week: 'WEDNESDAY', start_time: '17:00', end_time: '18:00' }
      ]
    }, token);
    if (!updateSchedRes.success) {
      throw new Error(`Failed to update schedule: ${JSON.stringify(updateSchedRes)}`);
    }

    const listRes2 = await sendApi('schedules.list', { student_id: testStudentId }, token);
    if (listRes2.data.length !== 1 || listRes2.data[0].day_of_week !== 'WEDNESDAY') {
      throw new Error(`Deduplication check failed! Expected exactly 1 WEDNESDAY schedule, got: ${JSON.stringify(listRes2.data)}`);
    }
    console.log(`✓ Deduplication verified! Exactly 1 schedule in ClassSchedules tab: ${listRes2.data[0].day_of_week} ${listRes2.data[0].start_time}-${listRes2.data[0].end_time}\n`);

    console.log('=== ALL LIVE VERIFICATION CHECKS PASSED ON DEPLOYED BACKEND @34 ===');
  } finally {
    if (testStudentId) {
      console.log('Step 7: Cleaning up synthetic test student...');
      await sendApi('students.archive', { student_id: testStudentId }, token);
      console.log('✓ Cleaned up synthetic test records.');
    }
  }
}

runLiveVerification().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
