import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo } from './helpers/authHelper';
import { generateSyntheticTestId } from './helpers/testNamespace';

test.describe('E2E — Spreadsheet Import and Reconciliation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsAdmin(page);
    if (!loggedIn) {
      test.skip(true, 'ADMIN_AUTH_KEY not available in environment; skipping live backend workflow');
    }
  });

  test('previews CSV import with valid and invalid rows, then safely executes batch', async ({ page }) => {
    const testId = generateSyntheticTestId('IMP');

    await navigateTo(page, 'Import & Reconcile');
    await expect(page.locator('text=Paste CSV or Spreadsheet Data')).toBeVisible({ timeout: 15000 });

    // 1. Prepare isolated synthetic CSV data
    const csvContent = [
      'Full Name, Email, Phone, Course Name',
      `Import Student ${testId}, import.${testId.toLowerCase()}@example.com, +919876543210, Advanced Algebra`,
      ', missingname@example.com, +919876543211, Physics 101', // Invalid row (missing name)
    ].join('\n');

    await page.locator('textarea').fill(csvContent);
    await page.locator('button:has-text("Preview & Validate Import")').click();

    // 2. Verify Preview Screen
    await expect(page.locator('text=Total:')).toBeVisible({ timeout: 35000 });
    await expect(page.locator('text=Valid:')).toBeVisible();
    await expect(page.locator('text=Errors:')).toBeVisible();

    // Verify row status flags
    await expect(page.locator(`text=Import Student ${testId}`)).toBeVisible();
    await expect(page.locator('text=Missing required full name')).toBeVisible();

    // 3. Confirm and Execute Import Batch
    await page.locator('button:has-text("Confirm & Import")').click();

    // 4. Verify Import Results
    await expect(page.locator('text=Import Completed Successfully')).toBeVisible({ timeout: 45000 });
    await expect(page.locator('text=Batch ID:')).toBeVisible();
    await expect(page.locator('text=Imported')).toBeVisible();

    // Click Reset to clear import form
    await page.locator('button:has-text("Import Another File")').click();
    await expect(page.locator('text=Paste CSV or Spreadsheet Data')).toBeVisible();
  });
});
