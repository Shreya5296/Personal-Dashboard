import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/authHelper';
import { generateSyntheticTestId, generateSyntheticStudent } from './helpers/testNamespace';

test.describe('E2E — Students Domain Workflow', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsAdmin(page);
    if (!loggedIn) {
      test.skip(true, 'ADMIN_AUTH_KEY not available in environment; skipping live backend workflow');
    }
  });

  test('validates student registration form before submission', async ({ page }) => {
    await page.goto('/students');
    await expect(page.locator('h1, h2, h3').filter({ hasText: 'Students' })).toBeVisible({ timeout: 10000 });

    // Open creation form
    await page.locator('button:has-text("+ Add Student")').click();
    await expect(page.locator('text=New Student Registration')).toBeVisible();

    // Click Save without filling required fields
    await page.locator('button:has-text("Save Student")').click();

    // Validation error should appear
    await expect(page.locator('text=Full name is required')).toBeVisible();
  });

  test('creates synthetic student, searches directory, views profile, and edits details', async ({ page }) => {
    const testId = generateSyntheticTestId('STU');
    const student = generateSyntheticStudent(testId);

    await page.goto('/students');
    await expect(page.locator('button:has-text("+ Add Student")')).toBeVisible({ timeout: 10000 });

    // 1. Create Student
    await page.locator('button:has-text("+ Add Student")').click();
    await page.locator('input[placeholder*="Full name"], input[value=""]').first().fill(student.full_name);

    // Fill inputs
    const inputs = page.locator('form input');
    await page.locator('input').filter({ hasText: '' }).nth(0); // wait
    await page.getByLabel('Full Name').fill(student.full_name);
    await page.getByLabel('Student Email').fill(student.email);
    await page.getByLabel('Student Phone').fill(student.phone);
    await page.getByLabel('Parent / Guardian Name').fill(student.parent_name);
    await page.getByLabel('Parent Phone').fill(student.parent_phone);
    await page.getByLabel('Notes').fill(student.notes);

    await page.locator('button:has-text("Save Student")').click();

    // 2. Verify student appears in list
    const studentRow = page.locator(`text=${student.full_name}`);
    await expect(studentRow).toBeVisible({ timeout: 20000 });

    // 3. Search filter
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testId);
    await expect(page.locator(`text=${student.full_name}`)).toBeVisible();

    // 4. Open profile and verify tabs
    await page.locator(`text=${student.full_name}`).click();
    await expect(page.locator('text=Enrollments')).toBeVisible();
    await expect(page.locator('text=Packages & Balances')).toBeVisible();
    await expect(page.locator('text=Fee Obligations')).toBeVisible();
    await expect(page.locator('text=Classes & Attendance')).toBeVisible();
    await expect(page.locator('text=Meeting Links')).toBeVisible();
    await expect(page.locator('text=Student Notes')).toBeVisible();

    // 5. Edit profile
    await page.locator('button:has-text("Edit Profile")').click();
    const notesInput = page.getByLabel('Notes');
    await notesInput.fill(`${student.notes} — VERIFIED_UPDATED`);
    await page.locator('button:has-text("Update Student")').click();

    // Wait for update
    await expect(page.locator('text=VERIFIED_UPDATED')).toBeVisible({ timeout: 15000 });
  });
});
