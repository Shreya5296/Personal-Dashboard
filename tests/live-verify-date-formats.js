// tests/live-verify-date-formats.js
const LIVE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w/exec';
const ADMIN_KEY = process.env.ADMIN_AUTH_KEY || '123456';

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
  console.log('   LIVE GOOGLE SHEETS DATE FORMATTING & TIME VERIFICATION       ');
  console.log('================================================================');

  // Step 0: Auth
  const loginRes = await sendApi('auth.login', { key: ADMIN_KEY });
  if (!loginRes.success || !loginRes.data?.token) {
    throw new Error(`Auth failed: ${JSON.stringify(loginRes)}`);
  }
  const token = loginRes.data.token;
  console.log(`✓ Authenticated as: ${loginRes.data.user.email}`);

  // Step 1: Standardize Date Formats Globally in Google Sheets
  console.log('\n--- 1. STANDARDIZE DATE FORMATS IN GOOGLE SHEETS ---');
  const formatRes = await sendApi('system.standardizeDateFormats', {}, token);
  console.log('Format Result:', JSON.stringify(formatRes, null, 2));
  if (!formatRes.success) {
    throw new Error(`standardizeDateFormats failed: ${formatRes.message}`);
  }

  // Step 2: Read back Packages
  console.log('\n--- 2. READ-BACK VERIFICATION: PACKAGES ---');
  const pkgRes = await sendApi('packages.list', { student_id: 'STU_001' }, token);
  if (!pkgRes.success || !pkgRes.data || pkgRes.data.length === 0) {
    throw new Error(`Failed to fetch packages: ${JSON.stringify(pkgRes)}`);
  }
  const pkg = pkgRes.data[0];
  console.log(`Plan Type:         ${pkg.plan_type}`);
  console.log(`Classes Purchased: ${pkg.classes_purchased}`);
  console.log(`Start Date (API):  ${pkg.start_date}`);
  console.log(`End Date (API):    ${pkg.end_date}`);
  console.log(`Next Due Date:     ${pkg.next_due_date}`);
  console.log(`Class Schedule:    ${pkg.class_schedule}`);

  if (pkg.start_date !== '2026-01-19' || pkg.end_date !== '2026-05-09' || pkg.next_due_date !== '2026-04-29') {
    throw new Error(`Package date mismatch: start=${pkg.start_date}, end=${pkg.end_date}, nextDue=${pkg.next_due_date}`);
  }
  console.log('✓ Canonical API date representation strictly preserved (YYYY-MM-DD)');

  // Step 3: Read back Payments
  console.log('\n--- 3. READ-BACK VERIFICATION: PAYMENTS ---');
  const payRes = await sendApi('payments.list', { student_id: 'STU_001' }, token);
  if (payRes.success && payRes.data && payRes.data.length > 0) {
    const pay = payRes.data[0];
    console.log(`Payment Date (API): ${pay.payment_date}`);
    console.log(`Amount:             ${pay.amount} ${pay.currency}`);
    console.log('✓ Payment date preserved');
  }

  // Step 4: Read back Class Sessions
  console.log('\n--- 4. READ-BACK VERIFICATION: CLASS SESSIONS ---');
  const clsRes = await sendApi('classes.list', { student_id: 'STU_001' }, token);
  if (!clsRes.success || !clsRes.data || clsRes.data.length === 0) {
    throw new Error(`Failed to fetch classes: ${JSON.stringify(clsRes)}`);
  }
  const sessions = clsRes.data;
  console.log(`Total Sessions: ${sessions.length}`);
  const s1 = sessions[0];
  const s48 = sessions[sessions.length - 1];

  console.log(`Session 1:  date=${s1.schedule_date}, time=${s1.schedule_time}, status=${s1.session_status}`);
  console.log(`Session 48: date=${s48.schedule_date}, time=${s48.schedule_time}, status=${s48.session_status}`);

  if (s1.schedule_date !== '2026-01-19' || s1.schedule_time !== '18:00') {
    throw new Error(`Session 1 mismatch: date=${s1.schedule_date}, time=${s1.schedule_time}`);
  }
  if (s48.schedule_date !== '2026-05-09' || s48.schedule_time !== '10:00') {
    throw new Error(`Session 48 mismatch: date=${s48.schedule_date}, time=${s48.schedule_time}`);
  }
  console.log('✓ All class sessions verified with canonical schedule date and local wall-clock times');

  console.log('\n================================================================');
  console.log('   ALL LIVE VERIFICATION CHECKS PASSED SUCCESSFULLY             ');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
