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

  test('Meeting Links: verifies styled link buttons, missing link state, and unselected student in modal', async ({ page }) => {
    await navigateTo(page, 'Meeting Links');
    await expect(page.locator('h1:has-text("Meeting Links Directory")')).toBeVisible({ timeout: 15000 });

    // 1. Primary and Secondary link columns are present
    await expect(page.locator('text=Primary Meeting Link').first()).toBeVisible();
    await expect(page.locator('text=Secondary Meeting Link').first()).toBeVisible();

    // 2. Missing link behavior: "No link configured" is displayed without adjacent Add button
    await expect(page.locator('text=No link configured').first()).toBeVisible();
    await expect(page.locator('table button:has-text("Add Meeting Link")')).toHaveCount(0);

    // 3. Page-level "+ Add Meeting Link" button opens modal without auto-selecting student
    const addBtn = page.locator('button:has-text("+ Add Meeting Link")');
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    // 4. Verify neutral "Select student" placeholder and required validation
    const select = page.locator('select');
    await expect(select).toHaveValue('');
    await expect(select.locator('option').first()).toHaveText('Select student');

    // Click submit without selecting student
    await page.locator('button:has-text("Save Meeting Link")').click();
    await expect(page.locator('text=Please select a student.')).toBeVisible();

    // Cancel form
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
  });
});
