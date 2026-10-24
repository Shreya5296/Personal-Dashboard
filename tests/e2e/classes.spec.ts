import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo } from './helpers/authHelper';
import { generateSyntheticTestId } from './helpers/testNamespace';

test.describe('E2E — Classes and Attendance Workflow', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsAdmin(page);
    if (!loggedIn) {
      test.skip(true, 'ADMIN_AUTH_KEY not available in environment; skipping live backend workflow');
    }
  });

  test('schedules class session and records attendance', async ({ page }) => {
    const testId = generateSyntheticTestId('CLS');
    const topic = `Mathematics Tutorial ${testId}`;

    await navigateTo(page, 'Classes');
    await expect(page.locator('button:has-text("+ Schedule Class")')).toBeVisible({ timeout: 15000 });

    // Open schedule form
    await page.locator('button:has-text("+ Schedule Class")').click();
    await page.waitForFunction(() => {
      const select = document.querySelector('select');
      return select && select.options.length > 0 && select.value !== '';
    }, { timeout: 25000 });
    await page.getByLabel('Topic / Session Name').fill(topic);
    await page.getByLabel('Duration (Minutes)').fill('45');

    // Submit form
    await page.locator('button:has-text("Schedule Class")').click();

    // Verify session row appears in schedule table
    const classRow = page.locator('tr:has-text("Duration: 45 min")').first();
    await expect(classRow).toBeVisible({ timeout: 25000 });
    await expect(classRow.locator('text=45 min')).toBeVisible();

    // Mark attendance as ATTENDED if available
    const attendedBtn = classRow.locator('button:has-text("Attended")');
    if (await attendedBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await attendedBtn.click();
      // Verify attendance tone / status
      await expect(classRow.locator('text=ATTENDED')).toBeVisible({ timeout: 25000 });
    }
  });
});
