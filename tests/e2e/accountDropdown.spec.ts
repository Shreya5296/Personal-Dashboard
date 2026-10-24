import { test, expect } from '@playwright/test';

const MOCK_JWT = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ email: 'ashreya0502@gmail.com', name: 'Authorized Administrator' }))}.mocksig`;

test.describe('E2E — Account Dropdown and Profile & Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(({ token }) => {
      sessionStorage.setItem('smd_use_mock_data', 'true');
      sessionStorage.setItem('smd_auth_token', token);
      sessionStorage.setItem('smd_auth_user', JSON.stringify({
        email: 'ashreya0502@gmail.com',
        name: 'Authorized Administrator',
        isAdmin: true,
      }));
    }, { token: MOCK_JWT });
    await page.goto('/');
    await expect(page.locator('button[aria-label="Account menu"]')).toBeVisible({ timeout: 10000 });
  });

  test('verifies Settings is absent from the sidebar while other items remain intact', async ({ page }) => {
    const sidebar = page.locator('aside');
    await expect(sidebar.locator('button:has-text("Dashboard")')).toBeVisible();
    await expect(sidebar.locator('button:has-text("Students")')).toBeVisible();
    await expect(sidebar.locator('button:has-text("Fees & Payments")')).toBeVisible();
    await expect(sidebar.locator('button:has-text("Classes")')).toBeVisible();
    await expect(sidebar.locator('button:has-text("Meeting Links")')).toBeVisible();
    await expect(sidebar.locator('button:has-text("Reports")')).toBeVisible();

    // Verify Settings is completely absent from the sidebar
    await expect(sidebar.locator('button:has-text("Settings")')).toHaveCount(0);
  });

  test('verifies account dropdown trigger displays primary name, secondary email, and exactly two options', async ({ page }) => {
    const trigger = page.locator('button[aria-label="Account menu"]');
    await expect(trigger).toBeVisible();

    // Contains email as secondary text
    await expect(trigger.locator('text=ashreya0502@gmail.com')).toBeVisible();

    // Open dropdown
    await trigger.click();
    const menu = page.locator('[role="menu"][aria-label="Account options"]');
    await expect(menu).toBeVisible();

    // Exactly two options: Profile and Logout
    const menuItems = menu.locator('[role="menuitem"]');
    await expect(menuItems).toHaveCount(2);
    await expect(menuItems.nth(0)).toHaveText(/Profile/);
    await expect(menuItems.nth(1)).toHaveText(/Logout/);
  });

  test('supports keyboard navigation and Escape dismissal', async ({ page }) => {
    const trigger = page.locator('button[aria-label="Account menu"]');
    await trigger.focus();
    await page.keyboard.press('Enter');

    const profileItem = page.locator('button[role="menuitem"]:has-text("Profile")');
    const logoutItem = page.locator('button[role="menuitem"]:has-text("Logout")');

    await expect(profileItem).toBeFocused();

    // Press ArrowDown to focus Logout
    await page.keyboard.press('ArrowDown');
    await expect(logoutItem).toBeFocused();

    // Press ArrowUp to focus Profile
    await page.keyboard.press('ArrowUp');
    await expect(profileItem).toBeFocused();

    // Press Escape to dismiss menu and return focus to trigger
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="menu"]')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('navigates to Profile, edits display name, and persists across reload', async ({ page }) => {
    const trigger = page.locator('button[aria-label="Account menu"]');
    await trigger.click();
    await page.locator('button[role="menuitem"]:has-text("Profile")').click();

    // Verify Profile page elements
    await expect(page.locator('h1:has-text("Profile & Preferences")')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Administrator Profile' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Regional Defaults' })).toBeVisible();

    // Email is read-only
    await expect(page.locator('text=Account Email (Read-only)')).toBeVisible();
    await expect(page.locator('strong:has-text("ashreya0502@gmail.com")')).toBeVisible();

    // Diagnostics are absent
    await expect(page.locator('text=Backend & Spreadsheet Service')).toHaveCount(0);
    await expect(page.locator('text=Active Data Architecture')).toHaveCount(0);

    // Edit display name
    const nameInput = page.locator('#displayNameInput');
    await nameInput.fill('Ashreya Persisted Admin');

    const saveBtn = page.locator('button:has-text("Save Display Name")');
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Success notice
    await expect(page.locator('text=Display name saved successfully.')).toBeVisible();

    // Header / trigger updates immediately
    await expect(trigger.locator('text=Ashreya Persisted Admin')).toBeVisible();

    // Reload page and verify persistence across reload
    await page.reload();
    await expect(page.locator('button[aria-label="Account menu"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button[aria-label="Account menu"]').locator('text=Ashreya Persisted Admin')).toBeVisible();
  });

  test('logs out securely and enforces subsequent access protection', async ({ page }) => {
    const trigger = page.locator('button[aria-label="Account menu"]');
    await trigger.click();
    await page.locator('button[role="menuitem"]:has-text("Logout")').click();

    // Verify redirected to login screen
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 });

    // Verify session storage is cleared
    const token = await page.evaluate(() => sessionStorage.getItem('smd_auth_token'));
    expect(token).toBeNull();

    // Attempt direct navigation while unauthenticated
    await page.goto('/students');
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('aside')).toHaveCount(0);
  });

  test('remains usable and responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const trigger = page.locator('button[aria-label="Account menu"]');
    await expect(trigger).toBeVisible();

    await trigger.click();
    const menu = page.locator('[role="menu"][aria-label="Account options"]');
    await expect(menu).toBeVisible();

    const profileItem = menu.locator('button[role="menuitem"]:has-text("Profile")');
    await expect(profileItem).toBeVisible();
    await profileItem.click();

    await expect(page.locator('h1:has-text("Profile & Preferences")')).toBeVisible();
  });
});
