import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/authHelper';
import { generateSyntheticTestId, generateSyntheticStudent } from './helpers/testNamespace';

test.describe('E2E — Enrollments & Packages Workflow', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsAdmin(page);
    if (!loggedIn) {
      test.skip(true, 'ADMIN_AUTH_KEY not available in environment; skipping live backend workflow');
    }
  });

  test('creates package for student and validates class balance', async ({ page }) => {
    const testId = generateSyntheticTestId('PKG');
    const student = generateSyntheticStudent(testId);

    // 1. Create Student
    await page.goto('/students');
    await page.locator('button:has-text("+ Add Student")').click();
    await page.getByLabel('Full Name').fill(student.full_name);
    await page.getByLabel('Student Email').fill(student.email);
    await page.getByLabel('Parent / Guardian Name').fill(student.parent_name);
    await page.getByLabel('Parent Phone').fill(student.parent_phone);
    await page.locator('button:has-text("Save Student")').click();
    await expect(page.locator(`text=${student.full_name}`)).toBeVisible({ timeout: 20000 });

    // 2. Open Profile -> Packages & Balances tab
    await page.locator(`text=${student.full_name}`).click();
    await page.locator('button:has-text("Packages & Balances")').click();
    await expect(page.locator('button:has-text("Add Package")')).toBeVisible();

    // 3. Create Package
    await page.locator('button:has-text("Add Package")').click();
    const pkgName = `10-Class Math Package ${testId}`;
    await page.getByLabel('Package Name').fill(pkgName);
    await page.getByLabel('Total Classes').fill('10');
    await page.getByLabel('Price (₹ INR)').fill('10000');
    await page.locator('button:has-text("Create Package")').click();

    // 4. Verify package row in table
    const pkgRow = page.locator(`tr:has-text("${pkgName}")`);
    await expect(pkgRow).toBeVisible({ timeout: 20000 });
    await expect(pkgRow.locator('text=10')).toBeVisible();
    await expect(pkgRow.locator('text=ACTIVE')).toBeVisible();
  });
});
