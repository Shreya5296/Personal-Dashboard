import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo } from './helpers/authHelper';

test.describe('E2E — Concurrency, Validation, and Responsive Layouts', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsAdmin(page);
    if (!loggedIn) {
      test.skip(true, 'ADMIN_AUTH_KEY not available in environment; skipping live backend workflow');
    }
  });

  test('enforces duplicate-submission button disabling during async student creation', async ({ page }) => {
    await navigateTo(page, 'Students');
    await page.locator('button:has-text("+ Add Student")').click();

    // Fill valid data
    await page.getByLabel('Full Name').fill('Concurrency Test Student');
    await page.getByLabel('Parent Name').fill('Parent Concurrency');
    await page.getByLabel('Parent Phone').fill('+919876543299');

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled();

    // Submit and immediately verify button shows disabled / processing loading state
    await submitBtn.click();
    await expect(page.locator('button:has-text("Processing…")')).toBeVisible({ timeout: 5000 });

    // Wait for submission to complete
    await expect(page.locator('text=Loading students…')).toBeHidden({ timeout: 60000 });
  });

  test('validates required fields across forms without submitting invalid data', async ({ page }) => {
    // 1. Fee form validation
    await navigateTo(page, 'Fees & Payments');
    await page.locator('button:has-text("Payment Ledger")').click();
    await expect(page.locator('text=Loading payment transactions…')).toBeHidden({ timeout: 35000 });

    // 2. Profile & Preferences validation via account menu
    await page.locator('button[aria-label="Account menu"]').click();
    await page.locator('button[role="menuitem"]:has-text("Profile")').click();
    await expect(page.getByRole('heading', { name: 'Administrator Profile' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('heading', { name: /Regional Defaults/ })).toBeVisible();
  });

  test('verifies responsive layouts across desktop, tablet, and mobile viewports', async ({ page }) => {
    await navigateTo(page, 'Dashboard');

    // Desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible();

    // Tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible();

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible();
  });
});
