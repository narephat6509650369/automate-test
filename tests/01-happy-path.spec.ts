import { test, expect } from '@playwright/test';
import { RegisterPage } from '../src/pages/RegisterPage';
import { markKnownDefect } from '../src/data/knownDefects';
import { FIXED, PASSWORD, validUser } from '../src/data/testData';

test.describe('Registration – happy path', () => {
  let reg: RegisterPage;
  test.beforeEach(async ({ page }, testInfo) => {
    markKnownDefect(testInfo);
    reg = new RegisterPage(page);
    await reg.goto();
  });

  test('TC-REG-001 page loads with the registration form @smoke', async () => {
    await expect(reg.btn.submit).toBeVisible();
    await expect(reg.f.phone).toBeVisible();
    await expect(reg.f.email).toBeVisible();
  });

  test('TC-REG-002 register with valid data + promo + OTP succeeds @smoke', async () => {
    await reg.reachOtpStep(validUser());
    await reg.enterAndSubmitOtp(FIXED.otp);
    await reg.setPassword(PASSWORD);
    await reg.expectRegistered();
  });

  test('TC-REG-003 register with valid data and NO promo code (optional field) reaches OTP', async () => {
    test.skip(!(await reg.has('promo')), 'No promo field on form');
    await reg.reachOtpStep(validUser({ promo: '' }));
  });

  test('TC-REG-004 Enter key submits the form', async ({ page }) => {
    await reg.fill(validUser());
    await page.keyboard.press('Enter');
    await reg.expectOtpStep();
  });

  test('TC-REG-005 double-click on submit does not break the flow', async () => {
    await reg.fill(validUser());
    await reg.btn.submit.dblclick();
    await reg.expectOtpStep();
  });

  test('TC-REG-006 values with leading/trailing spaces are accepted (trimmed)', async () => {
    const u = validUser();
    await reg.reachOtpStep({ ...u, firstName: `  ${u.firstName}  `, email: `  ${u.email}  ` });
  });

  test('TC-REG-007 Thai characters in name fields are accepted', async () => {
    await reg.reachOtpStep(validUser({ firstName: 'สมชาย', lastName: 'ทดสอบ' }));
  });
});
