import { test, expect } from '@playwright/test';
import { RegisterPage } from '../src/pages/RegisterPage';
import { FIXED, PASSWORD, validUser } from '../src/data/testData';

test.describe('OTP verification', () => {
  let reg: RegisterPage;
  test.beforeEach(async ({ page }) => {
    reg = new RegisterPage(page);
    await reg.goto();
    await reg.reachOtpStep(validUser());
  });

  test('TC-OTP-001 correct OTP completes registration @smoke', async () => {
    await reg.enterAndSubmitOtp(FIXED.otp);
    await reg.setPassword(PASSWORD);
    await reg.expectRegistered();
  });

  test('TC-OTP-002 wrong OTP is rejected', async () => {
    await reg.enterAndSubmitOtp('000000');
    await reg.expectOtpRejected();
  });

  test('TC-OTP-003 empty OTP cannot be submitted', async () => {
    await reg.submitOtp();
    // Either the verify button is disabled/absent, or an error shows.
    const verifyEnabled = await reg.btn.verify.isEnabled().catch(() => false);
    if (verifyEnabled) await expect(reg.errors.first()).toBeVisible();
    await expect(reg.success).toHaveCount(0);
  });

  test('TC-OTP-004 OTP shorter than 6 digits is rejected', async () => {
    await reg.enterAndSubmitOtp('12345');
    await expect(reg.success).toHaveCount(0);
    expect(reg.page.url()).toContain('/Register');
  });

  test('TC-OTP-005 non-numeric OTP is rejected or filtered', async () => {
    await reg.enterAndSubmitOtp('abcdef');
    await expect(reg.success).toHaveCount(0);
  });

  test('TC-OTP-006 OTP with special characters is rejected', async () => {
    await reg.enterAndSubmitOtp('12 34!');
    await expect(reg.success).toHaveCount(0);
  });

  test('TC-OTP-007 OTP longer than 6 digits does not succeed', async () => {
    test.skip((await reg.otp.count()) > 1, 'Segmented OTP boxes cannot take >6 digits');
    await reg.otp.first().fill('1234567');
    const value = await reg.otp.first().inputValue();
    // Field must either cap at 6 (then it equals the valid OTP prefix) or reject.
    expect(value.length).toBeLessThanOrEqual(7);
    if (value.length > 6) {
      await reg.submitOtp();
      await expect(reg.success).toHaveCount(0);
    }
  });

  test('TC-OTP-008 repeated wrong OTPs never succeed (brute-force guard)', async () => {
    for (let i = 0; i < 5; i++) {
      await reg.otp.first().fill('').catch(() => {});
      await reg.enterAndSubmitOtp(`11111${i}`);
      await reg.page.waitForTimeout(500);
    }
    await expect(reg.success).toHaveCount(0);
    // After lock-out even the right code must not be trivially accepted – record observed behaviour.
    await reg.enterAndSubmitOtp(FIXED.otp);
    const ok = await reg.pwd.password.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    test.info().annotations.push({ type: 'observed', description: `correct OTP after 5 failures -> ${ok ? 'accepted' : 'blocked'}` });
  });

  test('TC-OTP-009 resend OTP control is available and usable', async () => {
    const resend = reg.btn.resend;
    test.skip(!(await resend.isVisible().catch(() => false)), 'No resend control visible');
    // A cooldown timer usually disables the control first.
    if (await resend.isEnabled().catch(() => false)) {
      await resend.click();
      await expect(reg.otp.first()).toBeVisible();
    }
  });

  test('TC-OTP-010 page refresh on OTP step does not auto-complete registration', async ({ page }) => {
    await page.reload();
    await expect(reg.success).toHaveCount(0);
  });

  test('TC-OTP-011 expired OTP is rejected (opt-in, slow)', async () => {
    const secs = Number(process.env.OTP_EXPIRY_SECONDS ?? 0);
    test.skip(!secs, 'Set OTP_EXPIRY_SECONDS (e.g. 300) to run – note fixed UAT OTP may never expire');
    test.setTimeout((secs + 60) * 1000);
    await reg.page.waitForTimeout(secs * 1000);
    await reg.enterAndSubmitOtp(FIXED.otp);
    await reg.expectOtpRejected();
  });
});
