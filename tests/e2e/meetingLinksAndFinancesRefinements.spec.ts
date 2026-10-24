import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo } from './helpers/authHelper';

test.describe('E2E — Finances Refinements & Meeting Links Management', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsAdmin(page);
    if (!loggedIn) {
      test.skip(true, 'ADMIN_AUTH_KEY not available in environment; skipping live backend workflow');
    }
  });

  test('Finances: verifies Student Balances default tab, Add Payment modal, and 4-column history', async ({ page }) => {
    await navigateTo(page, 'Finances');
    await expect(page.locator('h1:has-text("Finances")')).toBeVisible({ timeout: 15000 });

    // 1. Verify exact Card Labels and Descriptions
    await expect(page.locator('text=Total Invoice')).toBeVisible();
    await expect(page.locator('text=Total agreed package value')).toBeVisible();
    await expect(page.locator('text=Collected Earnings')).toBeVisible();
    await expect(page.locator('text=Received Payments')).toBeVisible();
    await expect(page.locator('text=Total Outstanding')).toBeVisible();
    await expect(page.locator('text=Uncollected Balance')).toBeVisible();

    // 2. Verify Student Balances is the first tab and selected by default
    const balancesTab = page.locator('#tab-balances');
    const historyTab = page.locator('#tab-history');
    await expect(balancesTab).toBeVisible();
    await expect(historyTab).toBeVisible();
    await expect(balancesTab).toHaveAttribute('aria-selected', 'true');
    await expect(historyTab).toHaveAttribute('aria-selected', 'false');

    // 3. Verify Add Payment button opens popup form and cancels cleanly
    const addPaymentBtn = page.locator('button:has-text("Add Payment")');
    await expect(addPaymentBtn).toBeVisible();
    await addPaymentBtn.click();
    await expect(page.locator('h3:has-text("Record Student Payment")')).toBeVisible();
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('h3:has-text("Record Student Payment")')).not.toBeVisible();

    // 4. Switch to Payment History tab and verify 4-column headers
    await historyTab.click();
    await expect(historyTab).toHaveAttribute('aria-selected', 'true');
    await expect(balancesTab).toHaveAttribute('aria-selected', 'false');

    const headers = page.locator('table thead th');
    await expect(headers).toHaveCount(4);
    await expect(headers.nth(0)).toHaveText('Student ID');
    await expect(headers.nth(1)).toHaveText('Student Name');
    await expect(headers.nth(2)).toHaveText('Date');
    await expect(headers.nth(3)).toHaveText('Amount');

    // Method, Reference, and Actions must be absent
    await expect(page.locator('table thead th:has-text("Method")')).toHaveCount(0);
    await expect(page.locator('table thead th:has-text("Reference")')).toHaveCount(0);
    await expect(page.locator('table thead th:has-text("Actions")')).toHaveCount(0);
  });

  test('Meeting Links: verifies compact table, platform badges, distinct columns, and modal behavior', async ({ page }) => {
    await navigateTo(page, 'Meeting Links');
    await expect(page.locator('h1:has-text("Meeting Links Directory")')).toBeVisible({ timeout: 15000 });

    // 1. Primary and Secondary links are clearly separated and labeled
    await expect(page.locator('text=Primary Meeting Link').first()).toBeVisible();
    await expect(page.locator('text=Secondary Meeting Link').first()).toBeVisible();

    // 2. Platform badges are identified (Google Meet and Zoom)
    await expect(page.locator('text=Google Meet').first()).toBeVisible();
    await expect(page.locator('text=Zoom').first()).toBeVisible();

    // 3. For existing links, Copy and Open controls exist
    await expect(page.locator('button:has-text("Copy")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Open ↗")').first()).toBeVisible();

    // 4. Missing link behavior: "Add Meeting Link" button is shown for empty slot
    const addSlotBtn = page.locator('button:has-text("Add Meeting Link")').first();
    await expect(addSlotBtn).toBeVisible();

    // Click "Add Meeting Link" and verify modal popup is shown
    await addSlotBtn.click();
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    await expect(page.locator('button:has-text("Save Meeting Link")')).toBeVisible();

    // Cancel form
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
  });
});
