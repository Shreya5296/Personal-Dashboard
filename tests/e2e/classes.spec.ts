import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/authHelper';
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

    await page.goto('/classes');
    await expect(page.locator('button:has-text("+ Schedule Class")')).toBeVisible({ timeout: 10000 });

    // Open schedule form
    await page.locator('button:has-text("+ Schedule Class")').click();
    await page.getByLabel('Class Topic / Title').fill(topic);
    await page.getByLabel('Duration (Minutes)').fill('45');

    // Submit form
    await page.locator('button:has-text("Confirm Schedule")').click();

    // Verify session row appears in schedule table
    const classRow = page.locator(`tr:has-text("${topic}")`);
    await expect(classRow).toBeVisible({ timeout: 20000 });
    await expect(classRow.locator('text=45 min')).toBeVisible();

    // Mark attendance as ATTENDED
    const attendSelect = classRow.locator('select');
    if (await attendSelect.isVisible()) {
      await attendSelect.selectOption('ATTENDED');
      // Verify attendance tone / status
      await expect(classRow.locator('text=ATTENDED')).toBeVisible({ timeout: 15000 });
    }
  });
});
