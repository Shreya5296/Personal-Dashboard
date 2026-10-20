import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo } from './helpers/authHelper';
import { generateSyntheticTestId, generateSyntheticStudent } from './helpers/testNamespace';

test.describe('E2E — Fees and Payments Workflow', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsAdmin(page);
    if (!loggedIn) {
      test.skip(true, 'ADMIN_AUTH_KEY not available in environment; skipping live backend workflow');
    }
  });

  test('creates ₹5,000 fee obligation, validates constraints, and records ₹1,000 payment', async ({ page }) => {
    const testId = generateSyntheticTestId('FEE');
    const student = generateSyntheticStudent(testId);

    // 1. First ensure student exists
    await navigateTo(page, 'Students');
    await page.locator('button:has-text("+ Add Student")').click();
    await page.getByLabel('Full Name').fill(student.full_name);
    await page.getByLabel('Student Email').fill(student.email);
    await page.getByLabel('Parent Name').fill(student.parent_name);
    await page.getByLabel('Parent Phone').fill(student.parent_phone);
    await page.locator('button:has-text("Create Student")').click();
    await expect(page.locator('text=Loading students…')).toBeHidden({ timeout: 60000 });
    await expect(page.locator(`text=${student.full_name}`)).toBeVisible({ timeout: 45000 });

    // 2. Open Student Profile -> Fee Obligations tab
    await page.locator(`text=${student.full_name}`).click();
    await page.locator('button:has-text("Fee Obligations")').click();
    await expect(page.locator('button:has-text("New Fee Obligation")')).toBeVisible({ timeout: 15000 });

    // 3. Test Form Validation (empty submission)
    await page.locator('button:has-text("New Fee Obligation")').click();
    const descInput = page.getByLabel('Fee Description');
    const amountInput = page.getByLabel('Amount Due (₹ INR)');
    await descInput.fill('');
    await amountInput.fill('0');
    await page.locator('button:has-text("Create Fee Obligation")').click();
    await expect(page.locator('text=Fee description is required')).toBeVisible();

    // 4. Create Fee Obligation for exactly ₹5,000
    const feeDesc = `Term 1 Tuition ${testId}`;
    await descInput.fill(feeDesc);
    await amountInput.fill('5000');
    await page.locator('button:has-text("Create Fee Obligation")').click();

    // Verify success banner and table row
    await expect(page.locator('text=Fee obligation of ₹5,000 created successfully')).toBeVisible({ timeout: 35000 });
    const feeRow = page.locator(`tr:has-text("${feeDesc}")`);
    await expect(feeRow).toBeVisible();
    await expect(feeRow.locator('text=₹5,000').first()).toBeVisible();
    await expect(feeRow.locator('text=/OPEN|PENDING/')).toBeVisible();

    // 5. Record a synthetic partial payment of ₹1,000
    await feeRow.locator('button:has-text("Pay")').click();
    await expect(page.locator('text=/Record Payment for/')).toBeVisible();

    const paymentAmountInput = page.getByLabel('Amount Paid (₹ INR)');
    await paymentAmountInput.fill('1000');
    await page.locator('button:has-text("Record Payment")').click();

    // Verify payment success banner
    await expect(page.locator('text=Payment of ₹1,000 recorded successfully')).toBeVisible({ timeout: 35000 });

    // 6. Verify ledger balances: Paid = ₹1,000, Outstanding = ₹4,000, Status = PARTIALLY PAID
    const updatedFeeRow = page.locator(`tr:has-text("${feeDesc}")`);
    await expect(updatedFeeRow.locator('text=₹1,000')).toBeVisible();
    await expect(updatedFeeRow.locator('text=₹4,000')).toBeVisible();
    await expect(updatedFeeRow.locator('text=/PARTIALLY/')).toBeVisible();
  });
});
