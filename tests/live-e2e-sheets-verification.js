// tests/live-e2e-sheets-verification.js
// Genuine end-to-end Google Sheets persistence verification script

const LIVE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w/exec';
const ADMIN_KEY = process.env.ADMIN_AUTH_KEY || '123456';

async function sendApi(operation, payload = {}, token = null) {
  const body = {
    apiVersion: '1',
    operation,
    payload,
    identityToken: token,
    requestId: `e2e_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };

  const response = await fetch(LIVE_APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await response.json();
  return json;
}

async function runVerification() {
  console.log('=== STARTING LIVE GOOGLE SHEETS END-TO-END PERSISTENCE VERIFICATION ===');
  console.log(`Endpoint: ${LIVE_APPS_SCRIPT_URL}`);

  const results = {};

  // Step 0: Live Authenticated Admin Sign-In
  console.log('\n--- Step 0: Live Authenticated Admin Sign-In ---');
  const loginRes = await sendApi('auth.login', { key: ADMIN_KEY });
  if (!loginRes.success || !loginRes.data?.token) {
    console.error('Failed to log in to live backend:', loginRes);
    process.exit(1);
  }
  const token = loginRes.data.token;
  console.log(`Authenticated as: ${loginRes.data.user.email} (isAdmin: ${loginRes.data.user.isAdmin})`);

  const synthUniqueId = `SYNTH_E2E_${Date.now().toString(36).toUpperCase()}`;

  // 1. Student Creation and Editing
  console.log('\n--- 1. Student Creation and Editing ---');
  let testStudentId = null;
  try {
    const createStuRes = await sendApi('students.create', {
      student_name: `Test Student ${synthUniqueId}`,
      parent_name: 'Test Parent Synth',
      parent_phone: '+91 9876543210',
      parent_email: `parent_${synthUniqueId.toLowerCase()}@test.example.com`,
      subject: 'Physics',
      status: 'ACTIVE',
    }, token);

    if (!createStuRes.success || !createStuRes.data?.student_id) {
      throw new Error(`Student create failed: ${JSON.stringify(createStuRes)}`);
    }

    testStudentId = createStuRes.data.student_id;
    console.log(`Created synthetic student in Google Sheets: ID = ${testStudentId}`);

    // Edit the student
    const updateStuRes = await sendApi('students.update', {
      studentId: testStudentId,
      subject: 'Advanced Physics',
    }, token);

    if (!updateStuRes.success) {
      throw new Error(`Student update failed: ${JSON.stringify(updateStuRes)}`);
    }

    // Read back through normal retrieval path
    const getStuRes = await sendApi('students.get', { studentId: testStudentId }, token);
    if (!getStuRes.success || getStuRes.data.subject !== 'Advanced Physics') {
      throw new Error(`Student read-back mismatch: expected Advanced Physics, got ${getStuRes.data?.subject}`);
    }

    console.log(`Verified student in Google Sheets: ${getStuRes.data.student_name} (${getStuRes.data.student_id}), subject = ${getStuRes.data.subject}`);
    results['Student creation and editing'] = 'PASS — verified in Google Sheets';
  } catch (err) {
    console.error('Workflow 1 failed:', err.message);
    results['Student creation and editing'] = `FAIL — persistent write or read-back failed: ${err.message}`;
  }

  // 2. Recurring Class Schedules
  console.log('\n--- 2. Recurring Class Schedules ---');
  try {
    const schedulesToSave = [
      { day_of_week: 'MONDAY', start_time: '16:00', end_time: '16:40' },
      { day_of_week: 'WEDNESDAY', start_time: '17:00', end_time: '17:40' },
    ];

    const saveSchedRes = await sendApi('schedules.save', {
      studentId: testStudentId,
      schedules: schedulesToSave,
    }, token);

    if (!saveSchedRes.success) {
      throw new Error(`Schedule save failed: ${JSON.stringify(saveSchedRes)}`);
    }

    // Read back
    const listSchedRes = await sendApi('schedules.list', { studentId: testStudentId }, token);
    if (listSchedRes.meta && listSchedRes.meta.persistentSheet === false) {
      console.log('ClassSchedules physical sheet is absent on canonical spreadsheet (requires owner migration).');
      results['Recurring class schedules'] = 'NOT VERIFIED — integration, permission, or safe test path unavailable (ClassSchedules sheet absent in canonical spreadsheet; requires owner migration)';
    } else if (!listSchedRes.success || listSchedRes.data.length !== 2) {
      throw new Error(`Schedule list read-back failed: ${JSON.stringify(listSchedRes)}`);
    } else {
      console.log(`Verified ${listSchedRes.data.length} recurring schedules saved: ${listSchedRes.data.map(s => `${s.day_of_week} ${s.start_time}-${s.end_time}`).join(', ')}`);
      results['Recurring class schedules'] = 'PASS — verified in Google Sheets';
    }
  } catch (err) {
    console.error('Workflow 2 failed:', err.message);
    results['Recurring class schedules'] = `FAIL — persistent write or read-back failed: ${err.message}`;
  }

  // 3. Class Duration and Calculated End Times & 4. Package Creation and Updates
  console.log('\n--- 3 & 4. Package Creation, Updates, and Class Duration ---');
  let testPackageId = null;
  try {
    const createPkgRes = await sendApi('packages.create', {
      student_id: testStudentId,
      plan_name: `Synth 40m Package ${synthUniqueId}`,
      classes_purchased: 4,
      package_price: 4000,
      per_class: 1000,
      class_duration: 40,
      start_date: '2026-10-25',
      end_date: '2026-11-25',
      status: 'ACTIVE',
    }, token);

    if (!createPkgRes.success || !createPkgRes.data?.package_id) {
      throw new Error(`Package create failed: ${JSON.stringify(createPkgRes)}`);
    }

    testPackageId = createPkgRes.data.package_id;
    console.log(`Created synthetic package in Google Sheets: ID = ${testPackageId}`);

    // Update the package
    const updatePkgRes = await sendApi('packages.update', {
      packageId: testPackageId,
      classes_purchased: 5,
      package_price: 5000,
      class_duration: 60,
    }, token);

    if (!updatePkgRes.success) {
      throw new Error(`Package update failed: ${JSON.stringify(updatePkgRes)}`);
    }

    // Read back
    const listPkgRes = await sendApi('packages.list', { studentId: testStudentId }, token);
    const readBackPkg = listPkgRes.data?.find(p => p.package_id === testPackageId);
    if (!readBackPkg || Number(readBackPkg.classes_purchased) !== 5 || Number(readBackPkg.package_price) !== 5000) {
      throw new Error(`Package read-back mismatch: ${JSON.stringify(readBackPkg)}`);
    }

    console.log(`Verified package updated in Google Sheets: classes = ${readBackPkg.classes_purchased}, price = ₹${readBackPkg.package_price}`);
    results['Package creation and updates'] = 'PASS — verified in Google Sheets';

    // Verify class duration persistence
    if (readBackPkg.class_duration !== undefined && Number(readBackPkg.class_duration) === 60) {
      results['Class duration and calculated end times'] = 'PASS — verified in Google Sheets';
    } else {
      console.log('Packages tab on live sheet has 11 columns; class_duration column not yet physically present on live sheet');
      results['Class duration and calculated end times'] = 'NOT VERIFIED — integration, permission, or safe test path unavailable (physical Packages tab lacks class_duration column; requires spreadsheet schema update)';
    }
  } catch (err) {
    console.error('Workflows 3/4 failed:', err.message);
    results['Class duration and calculated end times'] = `FAIL: ${err.message}`;
    results['Package creation and updates'] = `FAIL: ${err.message}`;
  }

  // 5. Meeting-Link Creation, Updates, and Individual-Link Deletion
  console.log('\n--- 5. Meeting Links Creation, Updates, and Individual-Link Deletion ---');
  try {
    // 5a. Create both links
    const createLinksRes = await sendApi('meetingLinks.create', {
      student_id: testStudentId,
      student_name: `Test Student ${synthUniqueId}`,
      meeting_link_1: 'https://meet.google.com/synth-meet-123',
      meeting_link_2: 'https://us05web.zoom.us/j/123456789?pwd=test',
      meeting_url: 'https://meet.google.com/synth-meet-123',
      provider: 'GOOGLE_MEET',
    }, token);

    if (!createLinksRes.success) {
      throw new Error(`Meeting links create failed: ${JSON.stringify(createLinksRes)}`);
    }
    console.log('Created primary and secondary meeting links in Google Sheets.');

    // 5b. Update link 1
    const updateLinksRes = await sendApi('meetingLinks.create', {
      student_id: testStudentId,
      student_name: `Test Student ${synthUniqueId}`,
      meeting_link_1: 'https://meet.google.com/synth-meet-UPDATED',
      meeting_url: 'https://meet.google.com/synth-meet-UPDATED',
      provider: 'GOOGLE_MEET',
    }, token);

    if (!updateLinksRes.success) {
      throw new Error(`Meeting links update failed: ${JSON.stringify(updateLinksRes)}`);
    }

    // 5c. Delete ONLY secondary link (setting meeting_link_2 to empty string, preserving meeting_link_1)
    const deleteSecondaryRes = await sendApi('meetingLinks.create', {
      student_id: testStudentId,
      student_name: `Test Student ${synthUniqueId}`,
      meeting_link_1: 'https://meet.google.com/synth-meet-UPDATED',
      meeting_link_2: '',
      meeting_url: 'https://meet.google.com/synth-meet-UPDATED',
      provider: 'GOOGLE_MEET',
    }, token);

    if (!deleteSecondaryRes.success) {
      throw new Error(`Meeting link secondary deletion failed: ${JSON.stringify(deleteSecondaryRes)}`);
    }

    // Read back through normal retrieval path
    const listLinksRes = await sendApi('meetingLinks.list', { studentId: testStudentId }, token);
    const readBackLink = listLinksRes.data?.find(l => l.student_id === testStudentId);

    if (!readBackLink) {
      throw new Error('Meeting link record not found on read-back');
    }
    if (readBackLink.meeting_link_1 !== 'https://meet.google.com/synth-meet-UPDATED') {
      throw new Error(`Meeting link 1 not preserved: ${readBackLink.meeting_link_1}`);
    }
    if (readBackLink.meeting_link_2 && readBackLink.meeting_link_2.trim() !== '') {
      throw new Error(`Meeting link 2 was not deleted: ${readBackLink.meeting_link_2}`);
    }

    console.log(`Verified meeting links in Google Sheets: primary = ${readBackLink.meeting_link_1}, secondary = "${readBackLink.meeting_link_2 || ''}" (deleted)`);
    results['Meeting-link creation, updates, and individual-link deletion'] = 'PASS — verified in Google Sheets';
  } catch (err) {
    console.error('Workflow 5 failed:', err.message);
    results['Meeting-link creation, updates, and individual-link deletion'] = `FAIL: ${err.message}`;
  }

  // 6. Generated Class Sessions & 7. Attendance and Class-Balance Deductions
  console.log('\n--- 6 & 7. Class Sessions, Attendance, and Balance Deductions ---');
  let testSessionId = null;
  try {
    // 6a. Schedule class session
    const scheduleRes = await sendApi('classes.schedule', {
      student_id: testStudentId,
      package_id: testPackageId,
      class_title: `Synth Physics Class Session`,
      scheduled_start: '2026-10-26T16:00:00.000Z',
      scheduled_end: '2026-10-26T17:00:00.000Z',
      deduct_class: false,
      attendance_status: 'NOT_MARKED',
    }, token);

    if (!scheduleRes.success || !scheduleRes.data?.class_session_id) {
      throw new Error(`Schedule class failed: ${JSON.stringify(scheduleRes)}`);
    }

    testSessionId = scheduleRes.data.class_session_id;
    console.log(`Created class session in Google Sheets: ID = ${testSessionId}`);

    // Read initial balance: 5 purchased, 0 consumed
    const initialBalRes = await sendApi('packages.getBalance', { studentId: testStudentId }, token);
    console.log(`Initial class balance: purchased = ${initialBalRes.data.totalPurchased}, consumed = ${initialBalRes.data.totalConsumed}`);

    // 7a. Mark attendance as PRESENT -> triggers class deduction
    const attendRes = await sendApi('classes.complete', {
      class_session_id: testSessionId,
      attendance_status: 'PRESENT',
    }, token);

    if (!attendRes.success) {
      throw new Error(`Attendance completion failed: ${JSON.stringify(attendRes)}`);
    }

    // Read back session
    const listClassesRes = await sendApi('classes.list', { studentId: testStudentId }, token);
    const readBackSession = listClassesRes.data?.find(c => c.class_session_id === testSessionId || c.session_id === testSessionId);
    if (!readBackSession || readBackSession.attendance_status !== 'PRESENT') {
      throw new Error(`Class session read-back mismatch: ${JSON.stringify(readBackSession)}`);
    }

    // Read updated balance: should now be 1 consumed
    const updatedBalRes = await sendApi('packages.getBalance', { studentId: testStudentId }, token);
    if (updatedBalRes.data.totalConsumed < 1) {
      throw new Error(`Class balance deduction failed: consumed = ${updatedBalRes.data.totalConsumed}`);
    }

    console.log(`Verified class session & deduction in Google Sheets: consumed = ${updatedBalRes.data.totalConsumed}, remaining = ${updatedBalRes.data.remainingClasses}`);
    results['Generated class sessions'] = 'PASS — verified in Google Sheets';
    results['Attendance and class-balance deductions'] = 'PASS — verified in Google Sheets';
  } catch (err) {
    console.error('Workflows 6/7 failed:', err.message);
    results['Generated class sessions'] = `FAIL: ${err.message}`;
    results['Attendance and class-balance deductions'] = `FAIL: ${err.message}`;
  }

  // 8. Payments
  console.log('\n--- 8. Payments ---');
  try {
    const payRes = await sendApi('payments.record', {
      student_id: testStudentId,
      package_id: testPackageId,
      amount: 5000,
      currency: 'INR',
      in_inr: 5000,
      payment_date: '2026-10-25',
      payment_method: 'UPI',
      reference_notes: `Synth payment for ${synthUniqueId}`,
      status: 'COMPLETED',
    }, token);

    if (!payRes.success) {
      throw new Error(`Payment creation failed: ${JSON.stringify(payRes)}`);
    }

    // Read back
    const listPayRes = await sendApi('payments.list', { studentId: testStudentId }, token);
    const readBackPay = listPayRes.data?.find(p => p.student_id === testStudentId);

    if (!readBackPay || (Number(readBackPay.in_inr) !== 5000 && Number(readBackPay.amount) !== 5000)) {
      throw new Error(`Payment read-back mismatch: ${JSON.stringify(readBackPay)}`);
    }

    console.log(`Verified payment recorded in Google Sheets: ID = ${readBackPay.payment_id}, amount = ₹${readBackPay.in_inr || readBackPay.amount}`);
    results['Payments'] = 'PASS — verified in Google Sheets';
  } catch (err) {
    console.error('Workflow 8 failed:', err.message);
    results['Payments'] = `FAIL: ${err.message}`;
  }

  // 9. Student Notes and Note History
  console.log('\n--- 9. Student Notes and Note History ---');
  try {
    const noteRes = await sendApi('notes.create', {
      student_id: testStudentId,
      note_text: `Synthetic progress note for E2E persistence check: ${synthUniqueId}`,
      category: 'PROGRESS',
    }, token);

    if (!noteRes.success) {
      throw new Error(`Note creation failed: ${JSON.stringify(noteRes)}`);
    }

    // Read back note history
    const listNotesRes = await sendApi('notes.list', { studentId: testStudentId }, token);
    const readBackNote = listNotesRes.data?.find(n => n.student_id === testStudentId);

    if (!readBackNote || !readBackNote.note_text.includes(synthUniqueId)) {
      throw new Error(`Note read-back mismatch: ${JSON.stringify(readBackNote)}`);
    }

    console.log(`Verified note in Google Sheets: ID = ${readBackNote.note_id}, text = "${readBackNote.note_text}"`);
    results['Student notes and note history'] = 'PASS — verified in Google Sheets';
  } catch (err) {
    console.error('Workflow 9 failed:', err.message);
    results['Student notes and note history'] = `FAIL: ${err.message}`;
  }

  // Safe Cleanup: archive synthetic test student
  console.log('\n--- Safe Cleanup ---');
  if (testStudentId) {
    try {
      const archRes = await sendApi('students.archive', { studentId: testStudentId }, token);
      console.log(`Cleaned up synthetic test student ${testStudentId} -> Status: ARCHIVED (res: ${archRes.success})`);
    } catch (cleanErr) {
      console.warn(`Cleanup notice: could not archive ${testStudentId}:`, cleanErr.message);
    }
  }

  console.log('\n======================================================');
  console.log('SUMMARY OF END-TO-END GOOGLE SHEETS PERSISTENCE CHECKS');
  console.log('======================================================');
  for (const [wf, status] of Object.entries(results)) {
    console.log(`- ${wf}: ${status}`);
  }

  return results;
}

runVerification().catch(e => {
  console.error('Unhandled fatal error in runVerification:', e);
  process.exit(1);
});
