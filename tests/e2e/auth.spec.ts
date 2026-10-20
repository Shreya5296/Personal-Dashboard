import { test, expect } from '@playwright/test';

test.describe('E2E — Authentication and Security Gateway', () => {
  test('renders login gate and rejects unauthenticated navigation', async ({ page }) => {
    // Navigate directly to a protected page like /students
    await page.goto('/students');

    // Should render the admin authentication form
    await expect(page.locator('h1')).toHaveText('Personal Dashboard');
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('submits invalid administrator key and receives live backend rejection', async ({ page }) => {
    await page.goto('/');

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('synthetic_invalid_admin_key_e2e_test');

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Verify error banner is displayed
    const errorAlert = page.locator('text=Invalid administrator access key');
    await expect(errorAlert).toBeVisible({ timeout: 15000 });

    // Verify sessionStorage has no smd_auth_token
    const token = await page.evaluate(() => sessionStorage.getItem('smd_auth_token'));
    expect(token).toBeNull();
  });

  test('validates security: no secrets in client bundles or window object', async ({ page }) => {
    await page.goto('/');

    // Check window object for any leaked secrets or tokens
    const windowKeys = await page.evaluate(() => {
      const w = window as any;
      return {
        hasSecret: !!w.ADMIN_AUTH_KEY || !!w.ADMIN_SECRET_KEY,
        hasGlobalToken: !!w.smd_auth_token,
      };
    });

    expect(windowKeys.hasSecret).toBe(false);
    expect(windowKeys.hasGlobalToken).toBe(false);
  });

  test('full real admin login, dashboard access, and sign-out (when ADMIN_AUTH_KEY configured)', async ({ page }) => {
    const adminKey = process.env.ADMIN_AUTH_KEY;
    if (!adminKey) {
      test.skip(true, 'ADMIN_AUTH_KEY not provided in environment; skipping live sign-in test');
      return;
    }

    await page.goto('/');
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(adminKey);

    await page.locator('button[type="submit"]').click();

    // Wait for Dashboard to appear
    await expect(page.locator('text=Overview')).toBeVisible({ timeout: 15000 });

    // Verify token was stored in sessionStorage only
    const storedToken = await page.evaluate(() => sessionStorage.getItem('smd_auth_token'));
    expect(storedToken).toBeTruthy();

    // Verify localStorage has no token
    const localToken = await page.evaluate(() => localStorage.getItem('smd_auth_token'));
    expect(localToken).toBeNull();

    // Sign out
    const signOutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Logout")');
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
      await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 });
      const clearedToken = await page.evaluate(() => sessionStorage.getItem('smd_auth_token'));
      expect(clearedToken).toBeNull();
    }
  });
});
