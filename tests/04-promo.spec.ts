import { test, expect } from '@playwright/test';
import { RegisterPage } from '../src/pages/RegisterPage';
import { markKnownDefect } from '../src/data/knownDefects';
import { FIXED, PASSWORD, INVALID_PROMOS, validUser } from '../src/data/testData';
import { promoFeedback } from '../src/config/selectors';

test.describe('Promo code', () => {
  let reg: RegisterPage;
  test.beforeEach(async ({ page }, testInfo) => {
    markKnownDefect(testInfo);
    reg = new RegisterPage(page);
    await reg.goto();
    test.skip(!(await reg.has('promo')), 'No promo field on this form');
  });

  /** Some UIs validate on "Apply"/blur, others only on submit – cover both. */
  async function applyPromo(code: string) {
    await reg.revealPromo();
    await reg.f.promo.fill(code);
    if (await reg.btn.applyPromo.isVisible().catch(() => false)) await reg.btn.applyPromo.click();
    else await reg.f.promo.blur();
  }

  test('TC-PRM-001 valid code FREE15DAY is accepted @smoke', async ({ page }) => {
    await applyPromo(FIXED.promo);
    await expect(reg.errors.first()).toBeHidden();
    // Positive feedback is optional in the UI; record it when present.
    const ok = await promoFeedback(page).ok.first().isVisible().catch(() => false);
    test.info().annotations.push({ type: 'observed', description: `positive promo feedback shown: ${ok}` });
  });

  test('TC-PRM-002 valid promo flows through registration end-to-end', async () => {
    await reg.reachOtpStep(validUser({ promo: FIXED.promo }));
    await reg.enterAndSubmitOtp(FIXED.otp);
    await reg.setPassword(PASSWORD);
    await reg.expectRegistered();
  });

  INVALID_PROMOS.forEach(([label, code], i) => {
    test(`TC-PRM-${String(i + 3).padStart(3, '0')} invalid promo – ${label}`, async () => {
      await reg.fillAndSubmit(validUser({ promo: code }));
      await reg.expectRejected();
    });
  });

  test('TC-PRM-010 lower-case code (case sensitivity)', async () => {
    await reg.fillAndSubmit(validUser({ promo: FIXED.promo.toLowerCase() }));
    const accepted = await reg.otp.first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    test.info().annotations.push({ type: 'observed', description: `lower-case promo -> ${accepted ? 'accepted (case-insensitive)' : 'rejected (case-sensitive)'}` });
    if (!accepted) await reg.expectRejected();
  });

  test('TC-PRM-011 code surrounded by spaces is trimmed or rejected cleanly', async () => {
    await reg.fillAndSubmit(validUser({ promo: `  ${FIXED.promo}  ` }));
    const accepted = await reg.otp.first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    if (!accepted) await reg.expectRejected();
  });

  test('TC-PRM-012 error clears when an invalid code is replaced by a valid one', async () => {
    await reg.fillAndSubmit(validUser({ promo: 'WRONGCODE' }));
    await reg.expectRejected();
    await reg.f.promo.fill(FIXED.promo);
    await reg.submit();
    await reg.expectOtpStep();
  });

  test('TC-PRM-013 reused promo code is rejected for a second account', async ({ browser }) => {
    const secondPhone = process.env.SECOND_PHONE;
    test.skip(!secondPhone, 'Set SECOND_PHONE (a different unregistered number) to run this scenario');
    // First registration consumes the code…
    await reg.reachOtpStep(validUser());
    await reg.enterAndSubmitOtp(FIXED.otp);
    await reg.setPassword(PASSWORD);
    await reg.expectRegistered();
    // …second registration (fresh context) tries to reuse it.
    const ctx = await browser.newContext();
    const reg2 = new RegisterPage(await ctx.newPage());
    await reg2.goto();
    await reg2.fillAndSubmit(validUser({ phone: secondPhone! }));
    await reg2.expectRejected();
    await ctx.close();
  });
});
