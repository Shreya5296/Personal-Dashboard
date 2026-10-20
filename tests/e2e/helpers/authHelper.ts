import { Page, expect } from '@playwright/test';

export function getAdminKey(): string | undefined {
  return process.env.ADMIN_AUTH_KEY;
}

export async function loginAsAdmin(page: Page, key?: string): Promise<boolean> {
  const adminKey = key || getAdminKey();
  if (!adminKey) {
    return false;
  }

  await page.goto('/');

  // If already authenticated (session persisted in browser context), return true
  const overviewVisible = await page.locator('text=Overview').isVisible();
  if (overviewVisible) {
    return true;
  }

  const passwordInput = page.locator('input[type="password"]');
  await expect(passwordInput).toBeVisible({ timeout: 10000 });
  await passwordInput.fill(adminKey);

  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();

  // Wait for Dashboard Overview or navigation menu to appear
  await expect(page.locator('text=Overview, text=Students, text=Dashboard')).toBeVisible({ timeout: 20000 });

  // Verify token in sessionStorage
  const token = await page.evaluate(() => sessionStorage.getItem('smd_auth_token'));
  expect(token).toBeTruthy();

  return true;
}
