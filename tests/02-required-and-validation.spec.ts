import { test, expect } from '@playwright/test';
import { RegisterPage } from '../src/pages/RegisterPage';
import { markKnownDefect } from '../src/data/knownDefects';
import { INVALID_EMAILS, INVALID_PHONES, validUser, UserData } from '../src/data/testData';

test.describe('Required fields & field validation', () => {
  let reg: RegisterPage;
  test.beforeEach(async ({ page }, testInfo) => {
    markKnownDefect(testInfo);
    reg = new RegisterPage(page);
    await reg.goto();
  });

  test('TC-VAL-001 submitting an empty form shows errors and does not proceed @smoke', async () => {
    await reg.submit();
    await reg.expectRejected();
  });

  // Each mandatory field, left blank on its own, must block registration.
  const required: Array<keyof UserData> = ['firstName', 'lastName', 'email', 'phone', 'company', 'password'];
  required.forEach((key, i) => {
    test(`TC-VAL-${String(i + 2).padStart(3, '0')} blank "${key}" blocks registration`, async () => {
      test.skip(!(await reg.has(key)), `"${key}" is not on this form`);
      await reg.fillAndSubmit(validUser({ [key]: '' }));
      await reg.expectRejected();
    });
  });

  test('TC-VAL-010 whitespace-only first name is rejected', async () => {
    test.skip(!(await reg.has('firstName')), 'no firstName field');
    await reg.fillAndSubmit(validUser({ firstName: '     ' }));
    await reg.expectRejected();
  });

  test('TC-VAL-011 unchecked terms checkbox blocks registration', async () => {
    test.skip(!(await reg.has('terms')), 'no terms checkbox');
    await reg.fill(validUser());
    await reg.f.terms.uncheck();
    await reg.submit();
    // The app blocks silently (faded submit button, no message), so assert on "no progress".
    const reachedOtp = await reg.otp.first().waitFor({ timeout: 8_000 }).then(() => true, () => false);
    expect(reachedOtp, 'OTP step must not appear').toBe(false);
    await expect(reg.success).toHaveCount(0);
    const message = await reg.errors.first().isVisible();
    test.info().annotations.push({ type: 'observed', description: `error message shown: ${message}` });
  });

  test('TC-VAL-012 error message disappears once the field is corrected', async () => {
    await reg.submit();
    await expect(reg.errors.first()).toBeVisible();
    await reg.fillAndSubmit(validUser());
    await reg.expectOtpStep();
  });

  // ---- invalid phones ----
  INVALID_PHONES.forEach(([label, phone], i) => {
    test(`TC-PHN-${String(i + 1).padStart(3, '0')} invalid phone – ${label}`, async () => {
      await reg.fillAndSubmit(validUser({ phone }));
      await reg.expectRejected();
    });
  });

  test('TC-PHN-009 phone input does not accept more than 10 digits', async () => {
    await reg.f.phone.fill('096769070812345');
    const v = (await reg.f.phone.inputValue()).replace(/\D/g, '');
    // Either the field caps the length, or submit is rejected.
    if (v.length > 10) {
      await reg.fillAndSubmit(validUser({ phone: v }));
      await reg.expectRejected();
    }
  });

  // ---- invalid emails ----
  INVALID_EMAILS.forEach(([label, email], i) => {
    test(`TC-EML-${String(i + 1).padStart(3, '0')} invalid email – ${label}`, async () => {
      await reg.fillAndSubmit(validUser({ email }));
      await reg.expectRejected();
    });
  });

  // ---- password rules (only when a password field exists) ----
  [
    ['too short', 'Ab1!'],
    ['no digit', 'Abcdefgh!'],
    ['no uppercase', 'abcdefg1!'],
  ].forEach(([label, password], i) => {
    test(`TC-PWD-${String(i + 1).padStart(3, '0')} weak password – ${label}`, async () => {
      test.skip(!(await reg.has('password')), 'no password field');
      await reg.fillAndSubmit(validUser({ password }));
      // Password policy is not documented; record the observed behaviour instead of guessing.
      const rejected = await reg.errors.first().isVisible().catch(() => false);
      test.info().annotations.push({ type: 'observed', description: `"${password}" -> ${rejected ? 'rejected' : 'accepted'}` });
    });
  });
});
