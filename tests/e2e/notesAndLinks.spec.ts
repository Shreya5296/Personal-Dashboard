import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo } from './helpers/authHelper';
import { generateSyntheticTestId, generateSyntheticStudent } from './helpers/testNamespace';

test.describe('E2E — Meeting Links and Student Notes Workflow', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsAdmin(page);
    if (!loggedIn) {
      test.skip(true, 'ADMIN_AUTH_KEY not available in environment; skipping live backend workflow');
    }
  });

  test('creates meeting link and student note, verifying persistence across refresh', async ({ page }) => {
    const testId = generateSyntheticTestId('NL');
    const student = generateSyntheticStudent(testId);

    // 1. Create a student for this workflow
    await navigateTo(page, 'Students');
    await page.locator('button:has-text("+ Add Student")').click();
    await page.getByLabel('Full Name').fill(student.full_name);
    await page.getByLabel('Student Email').fill(student.email);
    await page.getByLabel('Parent Name').fill(student.parent_name);
    await page.getByLabel('Parent Phone').fill(student.parent_phone);
    await page.locator('button:has-text("Create Student")').click();
    await expect(page.locator('text=Loading students…')).toBeHidden({ timeout: 60000 });
    await expect(page.locator(`text=${student.full_name}`)).toBeVisible({ timeout: 45000 });

    // 2. Open Student Profile -> Meeting Links tab
    await page.locator(`text=${student.full_name}`).click();
    await page.locator('main button:has-text("Meeting Links")').click();
    await expect(page.locator('button:has-text("+ Add Meeting Link")')).toBeVisible({ timeout: 15000 });

    // 3. Create Meeting Link
    await page.locator('button:has-text("+ Add Meeting Link")').click();
    await page.locator('input[placeholder*="Physics"]').fill(`Tutoring Call ${testId}`);
    await page.locator('input[placeholder*="meet.google.com"]').fill('https://meet.google.com/test-room-123');
    await page.locator('button:has-text("Save Link")').click();
    await expect(page.locator('button:has-text("Save Link")')).toBeHidden({ timeout: 35000 });

    // Verify Meeting Link in list
    await expect(page.locator(`text=Tutoring Call ${testId}`)).toBeVisible({ timeout: 35000 });
    await expect(page.locator('a:has-text("Open Link")')).toBeVisible();

    // 4. Switch to Student Notes tab
    await page.locator('main button:has-text("Student Notes")').click();
    await expect(page.locator('button:has-text("+ Add Note")')).toBeVisible({ timeout: 15000 });

    // 5. Create Student Note
    await page.locator('button:has-text("+ Add Note")').click();
    const noteText = `Progress log entry for ${testId}: Mastered quadratic equations today.`;
    await page.locator('textarea').fill(noteText);
    await page.locator('button:has-text("Save Note")').click();
    await expect(page.locator('button:has-text("Save Note")')).toBeHidden({ timeout: 35000 });

    // Verify note is displayed
    await expect(page.locator(`p:has-text("${noteText}")`)).toBeVisible({ timeout: 35000 });

    // 6. Refresh persistence check
    await page.reload();
    await navigateTo(page, 'Students');
    await page.locator(`text=${student.full_name}`).click();

    await page.locator('main button:has-text("Student Notes")').click();
    await expect(page.locator(`p:has-text("${noteText}")`)).toBeVisible({ timeout: 35000 });

    await page.locator('main button:has-text("Meeting Links")').click();
    await expect(page.locator(`text=Tutoring Call ${testId}`)).toBeVisible({ timeout: 35000 });
  });
});
