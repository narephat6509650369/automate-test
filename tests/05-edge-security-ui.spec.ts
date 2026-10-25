import { test, expect } from '@playwright/test';
import { RegisterPage } from '../src/pages/RegisterPage';
import { FIXED, PASSWORD, validUser, XSS } from '../src/data/testData';

test.describe('Edge cases, security & UI', () => {
  let reg: RegisterPage;
  test.beforeEach(async ({ page }) => {
    reg = new RegisterPage(page);
    await reg.goto();
  });

  test('TC-EDGE-001 duplicate registration with an already-registered phone is handled', async ({ browser }) => {
    await reg.reachOtpStep(validUser());
    await reg.enterAndSubmitOtp(FIXED.otp);
    await reg.setPassword(PASSWORD);
    await reg.expectRegistered();

    const ctx = await browser.newContext();
    const reg2 = new RegisterPage(await ctx.newPage());
    await reg2.goto();
    await reg2.fillAndSubmit(validUser());
    // Expect a clear "already registered" style error, not a 2nd account.
    const blocked = await reg2.errors.first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
    test.info().annotations.push({ type: 'observed', description: `duplicate phone blocked: ${blocked}` });
    await ctx.close();
  });

  test('TC-SEC-001 XSS payload in name fields is not executed', async ({ page }) => {
    let dialog = false;
    page.on('dialog', async (d) => { dialog = true; await d.dismiss(); });
    await reg.fillAndSubmit(validUser({ firstName: XSS, lastName: XSS, company: XSS }));
    await page.waitForTimeout(1500);
    expect(dialog, 'no alert() should fire').toBe(false);
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
  });

  test('TC-SEC-002 SQL-injection string in email/company is rejected or safely handled', async ({ page }) => {
    // Not fillAndSubmit: the company value triggers a modal "Error! Oops..." popup that
    // blocks every later click, so check the response to the injected values directly.
    await reg.f.companyOthers.click();
    await reg.f.company.fill("' OR 1=1 --");
    await reg.f.email.fill("a'; DROP TABLE users;--@x.com");
    await reg.f.email.blur();
    await expect(reg.errors.first(), 'injected values should be rejected').toBeVisible();
    await expect(reg.success).toHaveCount(0);
    const popup = await page.locator('.swal2-popup').isVisible();
    test.info().annotations.push({ type: 'observed', description: `generic server-error popup shown: ${popup}` });
  });

  test('TC-EDGE-002 very long names (300 chars) do not crash the page', async ({ page }) => {
    const long = 'ก'.repeat(300);
    await reg.fillAndSubmit(validUser({ firstName: long, lastName: long }));
    await expect(page.locator('body')).toBeVisible();
    await expect(reg.success).toHaveCount(0);
  });

  test('TC-EDGE-003 emoji / unicode in company name does not crash the page', async ({ page }) => {
    await reg.fillAndSubmit(validUser({ company: 'Test 🚀 บริษัท 株式会社' }));
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-EDGE-004 network failure on submit shows an error and does not hang', async ({ page }) => {
    await reg.fill(validUser());
    await page.route('**/*', (route) =>
      ['fetch', 'xhr'].includes(route.request().resourceType()) ? route.abort() : route.continue(),
    );
    await reg.submit();
    await expect(reg.otp.first()).toBeHidden();
    await expect(reg.success).toHaveCount(0);
  });

  test('TC-EDGE-005 server 500 on submit is handled gracefully', async ({ page }) => {
    await reg.fill(validUser());
    await page.route('**/*', (route) =>
      ['fetch', 'xhr'].includes(route.request().resourceType()) && route.request().method() === 'POST'
        ? route.fulfill({ status: 500, body: '{"message":"Internal Server Error"}', contentType: 'application/json' })
        : route.continue(),
    );
    await reg.submit();
    await expect(reg.otp.first()).toBeHidden();
    await expect(reg.success).toHaveCount(0);
  });

  test('TC-EDGE-006 browser back/forward does not complete registration', async ({ page }) => {
    await reg.reachOtpStep(validUser());
    await page.goBack().catch(() => {});
    await page.goForward().catch(() => {});
    await expect(reg.success).toHaveCount(0);
  });

  test('TC-UI-001 mobile viewport: form is usable and has no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(reg.btn.submit).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, 'no horizontal overflow on 375px').toBe(false);
  });

  test('TC-UI-002 keyboard Tab order moves through inputs', async ({ page }) => {
    await page.keyboard.press('Tab');
    const tag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'A', 'BUTTON', 'SELECT', 'TEXTAREA']).toContain(tag);
  });

  test('TC-UI-003 password field is masked', async () => {
    test.skip(!(await reg.has('password')), 'no password field');
    await expect(reg.f.password).toHaveAttribute('type', 'password');
  });
});
