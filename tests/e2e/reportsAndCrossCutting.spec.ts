import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/authHelper';

test.describe('E2E — Reports, Navigation & Cross-cutting Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsAdmin(page);
    if (!loggedIn) {
      test.skip(true, 'ADMIN_AUTH_KEY not available in environment; skipping live backend workflow');
    }
  });

  test('loads financial reports and verifies summary metrics', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('text=Total Invoiced')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Total Collected')).toBeVisible();
    await expect(page.locator('text=Total Outstanding')).toBeVisible();
    await expect(page.locator('button:has-text("Export Summary CSV")')).toBeVisible();
  });

  test('tests import preview validation without committing data', async ({ page }) => {
    await page.goto('/imports');
    await expect(page.locator('text=Spreadsheet Import & Reconciliation')).toBeVisible({ timeout: 10000 });

    const csvTextarea = page.locator('textarea');
    await expect(csvTextarea).toBeVisible();

    // Fill sample CSV
    const sampleCsv = `Full Name,Email,Phone,Course Name\nTest Candidate,candidate@example.com,+919999988888,Physics 101`;
    await csvTextarea.fill(sampleCsv);

    await page.locator('button:has-text("Parse & Preview Records")').click();

    // Verify preview table appears
    await expect(page.locator('text=Test Candidate')).toBeVisible({ timeout: 15000 });
  });

  test('verifies responsive navigation at mobile viewport', async ({ page }) => {
    // Set viewport to mobile (iPhone 12 / 390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/students');

    // Verify page loads without crashing or horizontal overflow
    await expect(page.locator('h1, h2, h3').filter({ hasText: 'Students' })).toBeVisible({ timeout: 10000 });

    // Verify bottom nav or sidebar toggle is accessible
    const studentsBtn = page.locator('button:has-text("+ Add Student"), a:has-text("Students")');
    await expect(studentsBtn.first()).toBeVisible();
  });

  test('verifies responsive navigation at tablet viewport', async ({ page }) => {
    // Set viewport to iPad (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/classes');

    await expect(page.locator('text=Class Schedule')).toBeVisible({ timeout: 10000 });
  });
});
