import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo } from './helpers/authHelper';

test.describe('E2E — Reports, Navigation & Cross-cutting Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsAdmin(page);
    if (!loggedIn) {
      test.skip(true, 'ADMIN_AUTH_KEY not available in environment; skipping live backend workflow');
    }
  });

  test('loads financial reports and verifies summary metrics', async ({ page }) => {
    await navigateTo(page, 'Reports');
    await expect(page.locator('text=Total Invoiced')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=Total Collected')).toBeVisible();
    await expect(page.locator('text=Total Outstanding')).toBeVisible();
    await expect(page.locator('button:has-text("Export Summary CSV")')).toBeVisible();
  });

  test('verifies responsive navigation at mobile viewport', async ({ page }) => {
    // Set viewport to mobile (iPhone 12 / 390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await navigateTo(page, 'Students');

    // Verify page loads without crashing
    await expect(page.locator('button:has-text("+ Add Student")')).toBeVisible({ timeout: 15000 });
  });

  test('verifies responsive navigation at tablet viewport', async ({ page }) => {
    // Set viewport to iPad (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await navigateTo(page, 'Classes');

    await expect(page.locator('button:has-text("+ Schedule Class")')).toBeVisible({ timeout: 15000 });
  });
});
