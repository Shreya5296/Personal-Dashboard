import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/authHelper';

test.describe('E2E Student Registration & Class Scheduling Live Verification', () => {
  test.setTimeout(240000); // 4 minutes for full live roundtrip of 48 individual Google Apps Script writes

  test('completes full browser registration, async scheduling, Google Sheets persistence, and dashboard sync', async ({ page }) => {
    // 1. Capture network calls to Google Apps Script
    const apiCalls: Array<{ operation: string; status: number; durationMs: number; ok: boolean; url: string; responseSnippet: string }> = [];
    page.on('response', async (res) => {
      if (res.url().includes('script.google')) {
        const status = res.status();
        try {
          const text = await res.text();
          let json: any = null;
          try { json = JSON.parse(text); } catch {}
          apiCalls.push({
            operation: json?.operation || json?.meta?.operation || 'unknown',
            status,
            durationMs: 0,
            ok: json ? (json.ok || json.success) : res.ok(),
            url: res.url().slice(0, 60),
            responseSnippet: text.slice(0, 150),
          });
        } catch {}
      }
    });

    // 2. Login to application
    const loggedIn = await loginAsAdmin(page, '123456');
    expect(loggedIn).toBe(true);

    page.on('console', (msg) => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

    // 3. Navigate to Students Directory
    await page.getByRole('button', { name: 'Students' }).click();
    await expect(page.locator('h1, h2, h3').filter({ hasText: 'Students Directory' })).toBeVisible();

    // 4. Open New Student Registration modal
    const addStudentBtn = page.locator('button:has-text("+ Add Student")');
    await expect(addStudentBtn).toBeVisible();
    await addStudentBtn.click();

    // Verify modal dialog
    await expect(page.locator('#add-student-title')).toHaveText('New Student Registration');

    // 5. Fill Student Details
    // Student Name
    await page.getByLabel('Student Name*').fill('E2E Test Student 20261025');

    // Subjects: English, Math, Geeta
    const subjectTrigger = page.getByRole('combobox').filter({ hasText: /Select subjects…|English/ });
    await subjectTrigger.click();
    await page.getByRole('option', { name: 'English' }).click();
    await page.getByRole('option', { name: 'Math' }).click();
    await page.getByRole('option', { name: 'Geeta' }).click();
    // Click header to close dropdown without closing modal
    await page.locator('#add-student-title').click();

    // Student Phone & Email
    await page.getByLabel('Student Phone').fill('+66 83 167 5035');
    await page.getByLabel('Student Email').fill('e2e-test-20261025@example.com');

    // Parent Details
    await page.getByLabel('Parent Name*').fill('E2E Test Parent');
    await page.getByLabel('Parent Phone*').fill('+91 98765 43210');
    await page.getByLabel('Parent Email').fill('e2e-parent-20261025@example.com');

    // Package Details
    await page.getByLabel('Plan Type').selectOption('Package');
    await page.getByLabel('Class Duration').selectOption('30');
    await page.getByLabel('Package Price').fill('16800');
    await page.getByLabel('Classes Purchased').fill('48');

    // Verify per-class auto-calculation (16800 / 48 = 350)
    const perClassInput = page.getByLabel('Per-Class Rate');
    await expect(perClassInput).toHaveValue('350');

    // Schedule Details
    // First Class Date
    await page.getByLabel('First Class Date').fill('2026-10-26');

    // Add 3 schedule slots
    const addScheduleBtn = page.getByRole('button', { name: '+ Add Schedule' });
    await addScheduleBtn.click();
    await addScheduleBtn.click();
    await addScheduleBtn.click();

    // Slot 1: Monday 18:00
    const daySelects = page.locator('select[aria-label*="day"]');
    const timeInputs = page.locator('input[type="time"]');

    await daySelects.nth(0).selectOption('MONDAY');
    await timeInputs.nth(0).fill('18:00');

    // Slot 2: Wednesday 18:00
    await daySelects.nth(1).selectOption('WEDNESDAY');
    await timeInputs.nth(1).fill('18:00');

    // Slot 3: Saturday 18:00
    await daySelects.nth(2).selectOption('SATURDAY');
    await timeInputs.nth(2).fill('18:00');

    // Check form inputs before submit
    const formValues = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('form input, form select'));
      return inputs.map((i) => ({
        id: i.id,
        val: (i as HTMLInputElement).value,
        ariaLabel: i.getAttribute('aria-label'),
        type: (i as HTMLInputElement).type,
      }));
    });
    console.log('FORM INPUTS BEFORE SUBMIT:', JSON.stringify(formValues, null, 2));

    // 6. Submit the form
    const createBtn = page.getByRole('button', { name: 'Create Student' });
    await createBtn.scrollIntoViewIfNeeded();
    await createBtn.click();

    // 7. Verify modal closes and feedback toast appears
    // Live Google Apps Script student + package + schedule calls take 10-60 seconds total
    await expect(page.locator('#add-student-title')).not.toBeVisible({ timeout: 90000 });
    const feedbackToast = page.locator('div').filter({ hasText: /registered/ }).first();
    await expect(feedbackToast).toBeVisible({ timeout: 25000 });
    const feedbackText = await feedbackToast.innerText();
    console.log('Feedback Toast:', feedbackText);
    expect(feedbackText).toContain('registered');

    // 8. Check whether async progress toast or synchronous fallback was used
    const progressToast = page.locator('div[role="status"]').filter({ hasText: /Scheduling/ });
    const hasProgressToast = await progressToast.isVisible().catch(() => false);
    if (hasProgressToast) {
      console.log('Async Scheduling Progress Toast detected:', await progressToast.innerText());
      await expect(progressToast).toContainText('Scheduling complete', { timeout: 180000 });
      const finalProgressText = await progressToast.innerText();
      console.log('Final Progress text:', finalProgressText);
      expect(finalProgressText).toContain('48 created');
    } else {
      console.log('Scheduling completed synchronously via batchSchedule fallback during registration modal submit!');
    }

    // 9. Inspect created student and session data directly via backend query
    const sessionToken = await page.evaluate(() => sessionStorage.getItem('smd_auth_token'));
    expect(sessionToken).not.toBeNull();

    const liveVerify = await page.evaluate(async (token) => {
      const url = 'https://script.google.com/macros/s/AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w/exec';
      async function req(op: string, payload: any = {}) {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ operation: op, payload, identityToken: token, apiVersion: '1', requestId: 'e2e_' + op }),
        });
        return await r.json();
      }

      const students = await req('students.list');
      const testStudent = (students.data || []).find((s: any) => (s.student_name || '').includes('20261025'));
      if (!testStudent) return { found: false };

      const pkgs = await req('packages.list', { student_id: testStudent.student_id });
      const scheds = await req('schedules.list', { student_id: testStudent.student_id });
      const classes = await req('classes.list', { student_id: testStudent.student_id });
      const tabs = await req('system.inspectTabs');

      return {
        found: true,
        testStudent,
        package: (pkgs.data || [])[0],
        packagesCount: (pkgs.data || []).length,
        schedules: scheds.data || [],
        classesCount: (classes.data || []).length,
        classes: classes.data || [],
        tabs: tabs.data?.tabs,
      };
    }, sessionToken);

    expect(liveVerify.found).toBe(true);
    console.log('Created Student:', liveVerify.testStudent);
    console.log('Created Package:', liveVerify.package);
    console.log('Recurring Schedules Count:', liveVerify.schedules.length);
    console.log('Generated Classes Count:', liveVerify.classesCount);

    // Validate Student Fields
    const s = liveVerify.testStudent;
    expect(s.student_name).toBe('E2E Test Student 20261025');
    expect(s.student_phone).toBe('+66 83 167 5035');
    expect(s.student_email).toBe('e2e-test-20261025@example.com');
    expect(s.parent_name).toBe('E2E Test Parent');
    expect(s.parent_phone).toBe('+91 98765 43210');
    expect(s.parent_email).toBe('e2e-parent-20261025@example.com');
    expect(s.subject).toContain('English');
    expect(s.subject).toContain('Math');
    expect(s.subject).toContain('Geeta');

    // Validate Package Fields
    const p = liveVerify.package;
    expect(p).toBeDefined();
    expect(Number(p.package_price)).toBe(16800);
    expect(Number(p.classes_purchased || p.total_classes)).toBe(48);
    expect(Number(p.class_duration)).toBe(30);

    const toKolkataDate = (val: string) =>
      val ? new Date(val).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '';

    expect(toKolkataDate(p.start_date)).toBe('2026-10-26');
    expect(toKolkataDate(p.end_date)).toBe('2027-02-13');
    expect(toKolkataDate(p.next_due_date)).toBe('2027-02-03');

    // Validate Schedules
    expect(liveVerify.schedules).toHaveLength(3);

    // Validate Sessions
    expect(liveVerify.classesCount).toBe(48);
    const sessions = liveVerify.classes.sort((a: any, b: any) =>
      new Date(a.scheduled_start || a.start_time).getTime() - new Date(b.scheduled_start || b.start_time).getTime()
    );

    // Session 1
    const firstSession = sessions[0];
    expect(firstSession.scheduled_start || firstSession.start_time).toContain('2026-10-26T18:00');
    expect(firstSession.duration_minutes).toBe(30);

    // Session 44
    const session44 = sessions[43];
    expect(session44.scheduled_start || session44.start_time).toContain('2027-02-03T18:00');
    expect(toKolkataDate(p.next_due_date)).toBe((session44.scheduled_start || session44.start_time).slice(0, 10));

    // Session 48
    const session48 = sessions[47];
    expect(session48.scheduled_start || session48.start_time).toContain('2027-02-13T18:00');
    expect(toKolkataDate(p.end_date)).toBe((session48.scheduled_start || session48.start_time).slice(0, 10));

    // 10. Check Dashboard Things That Need Attention for Missing Meeting Link
    await page.locator('nav button, button:has-text("Dashboard")').filter({ hasText: 'Dashboard' }).first().click();
    await expect(page.locator('h3:has-text("Things That Need Attention")')).toBeVisible();
    const attentionItem = page.locator('div:has-text("E2E Test Student 20261025")').filter({ hasText: 'Meeting link not configured' });
    await expect(attentionItem.first()).toBeVisible({ timeout: 10000 });
    console.log('Things That Need Attention item verified for missing meeting link!');

    // 10b. Check Calendar Navigation, 12-hour formatting, and 30-minute duration
    await page.locator('nav button, button:has-text("Calendar")').filter({ hasText: 'Calendar' }).first().click();
    await expect(page.locator('h1, h2, h3').filter({ hasText: 'Weekly Class Calendar' })).toBeVisible();

    const weekRangeEl = page.locator('span').filter({ hasText: /2026-/ }).first();
    let currentWeek = await weekRangeEl.innerText();
    if (!currentWeek.includes('2026-10-26')) {
      await page.locator('button[aria-label="Next week"]').click();
      await page.waitForTimeout(500);
      currentWeek = await weekRangeEl.innerText();
    }
    console.log('Active Calendar Week:', currentWeek);

    const sessionCard = page.locator('[title*="E2E Test Student 20261025"]').first();
    await expect(sessionCard).toBeVisible({ timeout: 10000 });
    const cardTitle = await sessionCard.getAttribute('title');
    console.log('Calendar event card title:', cardTitle);
    expect(cardTitle?.toLowerCase()).toContain('6:00 pm');
    const cardStyle = await sessionCard.getAttribute('style');
    console.log('Calendar event card style:', cardStyle);
    expect(cardStyle).toContain('height: 26px'); // 30min slot height

    // 11. Test Idempotency and Recovery:
    // Repeated scheduling attempt with same student & package does not duplicate sessions
    const idempotencyCheck = await page.evaluate(async (params) => {
      const { token, studentId, packageId, schedules } = params;
      const url = 'https://script.google.com/macros/s/AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w/exec';
      // Attempting to schedule session 1 again
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          operation: 'classes.schedule',
          payload: {
            student_id: studentId,
            package_id: packageId,
            start_time: '2026-10-26T18:00:00.000Z',
            scheduled_start: '2026-10-26T18:00:00.000Z',
            scheduled_end: '2026-10-26T18:30:00.000Z',
            duration_minutes: 30,
          },
          identityToken: token,
          apiVersion: '1',
          requestId: 'e2e_idemp',
        }),
      });
      const data = await r.json();
      return data;
    }, {
      token: sessionToken,
      studentId: s.student_id,
      packageId: p.package_id,
      schedules: liveVerify.schedules,
    });

    console.log('Idempotency call response:', idempotencyCheck);
    // If backend returns conflict or skips, verify total classes in database remains exactly 48
    const finalClassesCheck = await page.evaluate(async (params) => {
      const { token, studentId } = params;
      const url = 'https://script.google.com/macros/s/AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w/exec';
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ operation: 'classes.list', payload: { student_id: studentId }, identityToken: token, apiVersion: '1', requestId: 'check_idemp' }),
      });
      const json = await r.json();
      return (json.data || []).length;
    }, { token: sessionToken, studentId: s.student_id });

    expect(finalClassesCheck).toBe(48);
    console.log('Final verified class count after idempotency test: exactly 48 sessions!');
  });
});
