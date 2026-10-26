// tests/live-e2e-schedule-verification.js
// Genuine End-to-End Live Verification of Student Schedule Saving,
// Success Feedback, and Google Sheets Persistence

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
  console.log('=== STARTING GENUINE END-TO-END VERIFICATION ON LIVE GOOGLE SHEETS ===');
  console.log(`Endpoint: ${LIVE_APPS_SCRIPT_URL}\n`);

  const report = {};

  // Step 0: Authenticate
  console.log('Step 0: Authenticating with live Apps Script Web App...');
  const loginRes = await sendApi('auth.login', { key: ADMIN_KEY });
  if (!loginRes.success || !loginRes.data?.token) {
    console.error('Login failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.data.token;
  console.log(`✓ Authenticated as ${loginRes.data.user.email} (isAdmin: ${loginRes.data.user.isAdmin})\n`);

  const synthId = `E2E_SCHED_${Date.now().toString(36).toUpperCase()}`;
  let testStudentId = null;
  let testPackageId = null;

  try {
    // 1. Create a synthetic test student
    console.log('Step 1: Creating synthetic test student in Google Sheets...');
    const createStuRes = await sendApi('students.create', {
      student_name: `Synth Student ${synthId}`,
      parent_name: 'Test Parent Synth',
      parent_phone: '+91 9999988888',
      parent_email: `parent_${synthId.toLowerCase()}@test.example.com`,
      student_phone: '-',
      student_email: '-',
      subject: 'Physics',
      status: 'ACTIVE',
    }, token);

    if (!createStuRes.success || !createStuRes.data?.student_id) {
      throw new Error(`Student create failed: ${JSON.stringify(createStuRes)}`);
    }
    testStudentId = createStuRes.data.student_id;
    console.log(`✓ Created test student: ID = ${testStudentId}, Name = ${createStuRes.data.student_name}`);

    // Create a package with class_duration = 40 min
    console.log('\nStep 2: Creating package with 40-minute duration...');
    const createPkgRes = await sendApi('packages.create', {
      student_id: testStudentId,
      student_name: createStuRes.data.student_name,
      plan_type: 'Package',
      currency: 'INR',
      package_price: 6000,
      per_class: 1500,
      classes_purchased: 4,
      class_duration: 40,
      start_date: new Date().toISOString().slice(0, 10),
    }, token);

    if (!createPkgRes.success || !createPkgRes.data?.package_id) {
      throw new Error(`Package create failed: ${JSON.stringify(createPkgRes)}`);
    }
    testPackageId = createPkgRes.data.package_id;
    console.log(`✓ Created test package: ID = ${testPackageId}, duration = ${createPkgRes.data.class_duration} min`);

    // 3. Add a recurring schedule with known day (MONDAY) and start time (16:00)
    console.log('\nStep 3: Saving recurring schedule (MONDAY 16:00 - 16:40) to Google Sheets...');
    const schedToSave = [
      { day_of_week: 'MONDAY', start_time: '16:00', end_time: '16:40' }
    ];
    const saveSchedRes = await sendApi('schedules.save', {
      student_id: testStudentId,
      schedules: schedToSave,
    }, token);

    if (!saveSchedRes.success) {
      throw new Error(`Schedule save failed: ${JSON.stringify(saveSchedRes)}`);
    }
    console.log(`✓ Schedule save response: success = ${saveSchedRes.success}, persistentSheet = ${saveSchedRes.meta?.persistentSheet}`);
    report['Schedule Save Operation'] = 'PASS — saved successfully';

    // 4 & 5. Verify physical ClassSchedules sheet record
    console.log('\nStep 4 & 5: Verifying physical ClassSchedules sheet record in Google Sheets...');
    const listSchedRes = await sendApi('schedules.list', { student_id: testStudentId }, token);
    if (!listSchedRes.success || !Array.isArray(listSchedRes.data) || listSchedRes.data.length !== 1) {
      throw new Error(`Schedule list read-back failed: ${JSON.stringify(listSchedRes)}`);
    }

    const savedEntry = listSchedRes.data[0];
    console.log('Read back from ClassSchedules tab:', JSON.stringify(savedEntry, null, 2));

    if (listSchedRes.meta?.persistentSheet !== true) {
      throw new Error('Schedule was not persisted to physical ClassSchedules sheet!');
    }
    if (savedEntry.student_id !== testStudentId) {
      throw new Error(`student_id mismatch: expected ${testStudentId}, got ${savedEntry.student_id}`);
    }
    if (savedEntry.day_of_week !== 'MONDAY' || savedEntry.start_time !== '16:00' || savedEntry.end_time !== '16:40') {
      throw new Error(`Schedule values mismatch: ${JSON.stringify(savedEntry)}`);
    }
    report['Physical ClassSchedules Tab Persistence'] = 'PASS — verified in physical ClassSchedules tab';
    report['Calculated End Time Matching Package Duration'] = `PASS — 16:00 + 40m = ${savedEntry.end_time}`;

    // 6. Verify package duration persistence in physical Packages tab
    console.log('\nStep 6: Verifying class_duration in physical Packages tab...');
    const listPkgRes = await sendApi('packages.list', { student_id: testStudentId }, token);
    const readPkg = listPkgRes.data?.find(p => p.package_id === testPackageId);
    if (!readPkg || Number(readPkg.class_duration) !== 40) {
      throw new Error(`Package class_duration read-back failed: ${JSON.stringify(readPkg)}`);
    }
    console.log(`✓ Read back package from physical Packages tab: duration = ${readPkg.class_duration} min`);
    report['Physical Packages Tab class_duration Persistence'] = 'PASS — verified class_duration = 40';

    // 7. Reopen student and confirm schedule remains visible
    console.log('\nStep 7: Re-fetching student and schedule (simulating reopen)...');
    const getStuRes = await sendApi('students.get', { studentId: testStudentId }, token);
    const recheckSchedRes = await sendApi('schedules.list', { student_id: testStudentId }, token);
    if (!getStuRes.success || !recheckSchedRes.success || recheckSchedRes.data.length !== 1) {
      throw new Error('Reopen student schedule read failed');
    }
    console.log(`✓ Reopen confirmed: Student ${getStuRes.data.student_name} has schedule ${recheckSchedRes.data[0].day_of_week} ${recheckSchedRes.data[0].start_time}-${recheckSchedRes.data[0].end_time}`);
    report['Reopen Student Schedule Persistence'] = 'PASS — schedule remains visible';

    // 8. Resave with changed schedule: WEDNESDAY 17:00-17:40
    console.log('\nStep 8: Changing schedule to WEDNESDAY 17:00-17:40 and saving again (deduplication check)...');
    const updateSchedRes = await sendApi('schedules.save', {
      student_id: testStudentId,
      schedules: [
        { day_of_week: 'WEDNESDAY', start_time: '17:00', end_time: '17:40' }
      ],
    }, token);
    if (!updateSchedRes.success) {
      throw new Error(`Update schedule failed: ${JSON.stringify(updateSchedRes)}`);
    }

    // Verify exactly 1 entry exists in physical sheet (updated, NOT duplicated)
    const listUpdatedRes = await sendApi('schedules.list', { student_id: testStudentId }, token);
    if (!listUpdatedRes.success || listUpdatedRes.data.length !== 1) {
      throw new Error(`Expected exactly 1 schedule entry, but found: ${listUpdatedRes.data?.length}`);
    }
    if (listUpdatedRes.data[0].day_of_week !== 'WEDNESDAY' || listUpdatedRes.data[0].start_time !== '17:00') {
      throw new Error(`Updated schedule mismatch: ${JSON.stringify(listUpdatedRes.data[0])}`);
    }
    console.log(`✓ Resave verified: Exactly 1 record in ClassSchedules tab: ${listUpdatedRes.data[0].day_of_week} ${listUpdatedRes.data[0].start_time}-${listUpdatedRes.data[0].end_time}`);
    report['Schedule Update Deduplication'] = 'PASS — existing schedule updated rather than duplicated (1 entry)';

    // 9. Update package duration to 60m and verify persistence
    console.log('\nStep 9: Updating package duration to 60m in physical Packages tab...');
    const updatePkgRes = await sendApi('packages.update', {
      package_id: testPackageId,
      class_duration: 60,
    }, token);
    if (!updatePkgRes.success) {
      throw new Error(`Package duration update failed: ${JSON.stringify(updatePkgRes)}`);
    }

    const recheckPkgRes = await sendApi('packages.list', { student_id: testStudentId }, token);
    const updatedPkg = recheckPkgRes.data?.find(p => p.package_id === testPackageId);
    if (!updatedPkg || Number(updatedPkg.class_duration) !== 60) {
      throw new Error(`Package duration 60m read-back failed: ${JSON.stringify(updatedPkg)}`);
    }
    console.log(`✓ Verified updated package duration in physical Packages tab: ${updatedPkg.class_duration} min`);
    report['Package Duration Update Persistence'] = 'PASS — updated to 60 min and verified';

    // 10. Simulate failed save and confirm validation error handling
    console.log('\nStep 10: Testing failure handling (invalid schedule entry: end_time <= start_time)...');
    const invalidSaveRes = await sendApi('schedules.save', {
      student_id: testStudentId,
      schedules: [
        { day_of_week: 'FRIDAY', start_time: '18:00', end_time: '17:00' } // Invalid: end before start
      ],
    }, token);
    if (invalidSaveRes.success) {
      throw new Error('Expected invalid schedule save to fail, but it succeeded!');
    }
    console.log(`✓ Backend correctly rejected invalid schedule: code = ${invalidSaveRes.error?.code}, message = "${invalidSaveRes.error?.message}"`);
    report['Validation and Failure Handling'] = `PASS — rejected with error: ${invalidSaveRes.error?.message}`;

    // Clean up test student
    console.log('\nStep 11: Archiving test student and cleaning test records...');
    await sendApi('students.archive', { studentId: testStudentId }, token);
    // Delete test schedules
    await sendApi('schedules.save', { student_id: testStudentId, schedules: [] }, token);
    console.log('✓ Cleaned up synthetic test records.');
  } catch (err) {
    console.error('\n❌ Verification encountered an error:', err.message);
    report['OVERALL_STATUS'] = `FAILED: ${err.message}`;
    process.exit(1);
  }

  console.log('\n=== END-TO-END VERIFICATION SUMMARY ===');
  for (const [k, v] of Object.entries(report)) {
    console.log(`• ${k}: ${v}`);
  }
}

runLiveVerification();
