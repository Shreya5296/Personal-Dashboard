import { test, expect } from '@playwright/test';

const MOCK_JWT = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ email: 'ashreya0502@gmail.com', name: 'Authorized Administrator' }))}.mocksig`;

test.describe('E2E — Account Dropdown, Branding, Preferences & Calendar', () => {
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

  test('verifies single product title Student Manager and no dev/mock badge in top bar', async ({ page }) => {
    // Brand title is Student Manager
    await expect(page.locator('aside span:has-text("Student Manager")')).toBeVisible();
    await expect(page.locator('text=Tutor Administration')).toHaveCount(0);

    // Development / Mock badge is completely absent from top bar
    await expect(page.locator('header').locator('text="Development / Mock"')).toHaveCount(0);
    await expect(page.locator('header').locator('text="Demo / Mock Data"')).toHaveCount(0);
  });

  test('verifies Settings is absent from the sidebar and Finances replaces Fees and Earnings', async ({ page }) => {
    const sidebar = page.locator('aside');
    await expect(sidebar.locator('button:has-text("Dashboard")')).toBeVisible();
    await expect(sidebar.locator('button:has-text("Students")')).toBeVisible();
    await expect(sidebar.locator('button:has-text("Class Schedule")')).toBeVisible();
    await expect(sidebar.locator('button:has-text("Finances")')).toBeVisible();
    await expect(sidebar.locator('button:has-text("Meeting Links")')).toBeVisible();

    // Verify Settings, Fees & Payments, and Earnings are completely absent from sidebar
    await expect(sidebar.locator('button:has-text("Settings")')).toHaveCount(0);
    await expect(sidebar.locator('button:has-text("Fees & Payments")')).toHaveCount(0);
    await expect(sidebar.locator('button:has-text("Earnings")')).toHaveCount(0);
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

  test('navigates to Profile, persists display name, timezone, and currency preferences', async ({ page }) => {
    const trigger = page.locator('button[aria-label="Account menu"]');
    await trigger.click();
    await page.locator('button[role="menuitem"]:has-text("Profile")').click();

    // Verify Profile page elements
    await expect(page.locator('h1:has-text("Profile & Preferences")')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Administrator Profile' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Regional Defaults & Preferences' })).toBeVisible();

    // Email is read-only
    await expect(page.locator('text=Account Email (Read-only)')).toBeVisible();
    await expect(page.locator('strong:has-text("ashreya0502@gmail.com")')).toBeVisible();

    // Edit display name
    const nameInput = page.locator('#displayNameInput');
    await nameInput.fill('Ashreya Persisted Admin');
    await page.locator('button:has-text("Save Display Name")').click();
    await expect(page.locator('text=Display name saved successfully.')).toBeVisible();

    // Edit timezone and currency dropdowns
    const tzSelect = page.locator('#timezoneSelect');
    await expect(tzSelect).toHaveValue('Asia/Kolkata');
    await tzSelect.selectOption('America/New_York');

    const currSelect = page.locator('#currencySelect');
    await expect(currSelect).toHaveValue('INR');
    await currSelect.selectOption('USD');

    await page.locator('button:has-text("Save Regional Preferences")').click();
    await expect(page.locator('text=Timezone and currency preferences saved successfully.')).toBeVisible();

    // Reload page and verify persistence across reload
    await page.reload();
    await expect(page.locator('button[aria-label="Account menu"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button[aria-label="Account menu"]').locator('text=Ashreya Persisted Admin')).toBeVisible();

    // Navigate back to profile and verify dropdowns retained their values
    await page.locator('button[aria-label="Account menu"]').click();
    await page.locator('button[role="menuitem"]:has-text("Profile")').click();
    await expect(page.locator('#timezoneSelect')).toHaveValue('America/New_York');
    await expect(page.locator('#currencySelect')).toHaveValue('USD');
  });

  test('displays meeting links with primary and secondary links cleanly labeled', async ({ page }) => {
    await page.locator('aside button:has-text("Meeting Links")').click();
    await expect(page.locator('h1:has-text("Meeting Links Directory")')).toBeVisible();

    // Primary meeting link column is present
    await expect(page.locator('th:has-text("Primary Meeting Link")').first()).toBeVisible();

    // Secondary meeting link is displayed
    await expect(page.locator('th:has-text("Secondary Meeting Link")').first()).toBeVisible();

    // Copy action available, Open ↗ removed per requirement 3.2
    await expect(page.locator('button:has-text("Copy")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Open ↗")')).toHaveCount(0);
  });

  test('displays weekly class schedule calendar on Dashboard starting on Monday', async ({ page }) => {
    await page.locator('aside button:has-text("Dashboard")').click();
    await expect(page.locator('h1:has-text("Administrative Dashboard")')).toBeVisible();

    // Calendar view header
    await expect(page.locator('h3:has-text("Weekly Class Schedule")')).toBeVisible();
    await expect(page.locator('button:has-text("This Week")')).toBeVisible();

    // Calendar week starts on Monday
    const firstColDay = page.locator('div[class*="dayCol"]').first();
    await expect(firstColDay.locator('text=Mon')).toBeVisible();
  });

  test('navigates to Finances page and displays summary cards and unified records', async ({ page }) => {
    await page.locator('aside button:has-text("Finances")').click();
    await expect(page.locator('h1:has-text("Finances")')).toBeVisible();
    await expect(page.locator('text=Collected Earnings')).toBeVisible();
    await expect(page.locator('text=Total Invoice')).toBeVisible();
    await expect(page.locator('text=Total Outstanding')).toBeVisible();
    await expect(page.locator('button:has-text("Export Finances CSV")')).toBeVisible();
  });
});
