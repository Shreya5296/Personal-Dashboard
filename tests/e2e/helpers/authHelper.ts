import { Page, expect } from '@playwright/test';

export function getAdminKey(): string | undefined {
  return process.env.ADMIN_AUTH_KEY;
}

let cachedSessionToken: string | null = null;
let cachedSessionUser: string | null = null;

export async function loginAsAdmin(page: Page, key?: string): Promise<boolean> {
  const adminKey = key || getAdminKey();
  if (!adminKey) {
    return false;
  }

  // 1. If we already have a cached token from a previous test in this run, inject it into sessionStorage
  if (cachedSessionToken && cachedSessionUser) {
    await page.goto('/');
    await page.evaluate(({ token, user }) => {
      sessionStorage.setItem('smd_auth_token', token);
      sessionStorage.setItem('smd_auth_user', user);
    }, { token: cachedSessionToken, user: cachedSessionUser });
    await page.goto('/');

    const isReady = await page.locator('button[aria-label="Account menu"], button:has-text("Sign Out")').isVisible({ timeout: 5000 }).catch(() => false);
    if (isReady) return true;
  }

  await page.goto('/');

  const isAlreadyLoggedIn = await page.locator('button[aria-label="Account menu"], button:has-text("Sign Out")').isVisible().catch(() => false);
  if (isAlreadyLoggedIn) {
    return true;
  }

  const passwordInput = page.locator('input[type="password"]');
  await expect(passwordInput).toBeVisible({ timeout: 10000 });
  await passwordInput.fill(adminKey);

  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();

  await expect(page.locator('button[aria-label="Account menu"], button:has-text("Sign Out")')).toBeVisible({ timeout: 35000 });

  // Cache token in memory for all subsequent tests
  const session = await page.evaluate(() => ({
    token: sessionStorage.getItem('smd_auth_token'),
    user: sessionStorage.getItem('smd_auth_user'),
  }));

  if (session.token && session.user) {
    cachedSessionToken = session.token;
    cachedSessionUser = session.user;
  }

  return true;
}

export async function navigateTo(page: Page, sectionLabel: string): Promise<void> {
  const menuToggle = page.locator('button[aria-label="Toggle navigation menu"]');
  if (await menuToggle.isVisible()) {
    await menuToggle.click();
    await page.waitForTimeout(200);
  }
  let target = sectionLabel;
  if (target === 'Fees & Payments' || target === 'Earnings') {
    target = 'Finances';
  }
  const navBtn = page.locator(`aside button:has-text("${target}")`);
  await expect(navBtn).toBeVisible({ timeout: 15000 });
  await navBtn.click();
}
