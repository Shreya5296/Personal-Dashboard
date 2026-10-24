import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo } from './helpers/authHelper';
import { generateSyntheticTestId, generateSyntheticStudent } from './helpers/testNamespace';

test.describe('E2E — Students Domain Workflow', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsAdmin(page);
    if (!loggedIn) {
      test.skip(true, 'ADMIN_AUTH_KEY not available in environment; skipping live backend workflow');
    }
  });

  test('validates student registration form before submission', async ({ page }) => {
    await navigateTo(page, 'Students');
    await expect(page.locator('button:has-text("+ Add Student")')).toBeVisible({ timeout: 15000 });

    // Open creation form
    await page.locator('button:has-text("+ Add Student")').click();
    await expect(page.locator('text=New Student Registration')).toBeVisible();

    // Click Save without filling required fields
    await page.locator('button:has-text("Create Student")').click();

    // Validation error should appear
    await expect(page.locator('text=Student name is required')).toBeVisible();
  });

  test('creates synthetic student, searches directory, views profile, and edits details', async ({ page }) => {
    const testId = generateSyntheticTestId('STU');
    const student = generateSyntheticStudent(testId);

    await navigateTo(page, 'Students');
    await expect(page.locator('button:has-text("+ Add Student")')).toBeVisible({ timeout: 15000 });

    // 1. Create Student
    await page.locator('button:has-text("+ Add Student")').click();
    await page.getByLabel(/Student Name|Full Name/i).fill(student.full_name);
    await page.getByLabel('Student Email').fill(student.email);
    await page.getByLabel('Student Phone').fill(student.phone);
    await page.getByLabel('Parent Name').fill(student.parent_name);
    await page.getByLabel('Parent Phone').fill(student.parent_phone);

    await page.locator('button:has-text("Create Student")').click();
    await expect(page.locator('text=Loading students…')).toBeHidden({ timeout: 45000 });
    const studentRow = page.locator(`text=${student.full_name}`);
    await expect(studentRow).toBeVisible({ timeout: 35000 });

    // 3. Search filter
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testId);
    await expect(page.locator(`text=${student.full_name}`)).toBeVisible();

    // 4. Expand row and open profile to verify tabs
    await page.locator(`text=${student.full_name}`).first().click();
    await page.locator('button:has-text("View Full Profile")').click();
    await expect(page.locator('main button:has-text("Packages & Balances")')).toBeVisible();
    await expect(page.locator('main button:has-text("Fee Obligations")')).toBeVisible();
    await expect(page.locator('main button:has-text("Classes & Attendance")')).toBeVisible();
    await expect(page.locator('main button:has-text("Meeting Links")')).toBeVisible();
    await expect(page.locator('main button:has-text("Student Notes")')).toBeVisible();

    // 5. Edit profile
    await page.locator('button:has-text("Edit Profile")').click();
    const parentNameInput = page.getByLabel('Parent Name');
    await parentNameInput.fill(`${student.parent_name} Updated`);
    await page.locator('button:has-text("Save Changes")').click();

    // Wait for update
    await expect(page.locator('button:has-text("Processing…")')).toBeHidden({ timeout: 45000 });
    await expect(page.locator(`text=${student.parent_name} Updated`)).toBeVisible({ timeout: 45000 });

    // 6. Archive student via UI
    await page.locator('button:has-text("Archive Student")').click();
    const archiveConfirmBtn = page.locator('div[role="dialog"] button:has-text("Archive")');
    if (await archiveConfirmBtn.isVisible()) {
      await archiveConfirmBtn.click();
    }
    await expect(page.locator('button:has-text("Reactivate Student")')).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('INACTIVE', { exact: true })).toBeVisible({ timeout: 15000 });

    // 7. Reactivate student via UI
    await page.locator('button:has-text("Reactivate Student")').click();
    const reactivateConfirmBtn = page.locator('div[role="dialog"] button:has-text("Reactivate")');
    if (await reactivateConfirmBtn.isVisible()) {
      await reactivateConfirmBtn.click();
    }
    await expect(page.locator('button:has-text("Archive Student")')).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('ACTIVE', { exact: true })).toBeVisible({ timeout: 15000 });

    // 8. Refresh persistence
    await page.reload();
    await navigateTo(page, 'Students');
    await expect(page.locator(`text=${student.full_name}`)).toBeVisible({ timeout: 45000 });
    await page.locator(`text=${student.full_name}`).first().click();
    await page.locator('button:has-text("View Full Profile")').click();
    await expect(page.getByText('ACTIVE', { exact: true })).toBeVisible();
  });
});
