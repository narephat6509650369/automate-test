import { expect, Locator, Page, test } from '@playwright/test';
import {
  buttons,
  dropdownOption,
  errorMessages,
  fields,
  otpInputs,
  passwordStep,
  successIndicator,
} from '../config/selectors';
import { UserData } from '../data/testData';

export class RegisterPage {
  readonly f: ReturnType<typeof fields>;
  readonly btn: ReturnType<typeof buttons>;
  readonly otp: Locator;
  readonly pwd: ReturnType<typeof passwordStep>;
  readonly errors: Locator;
  readonly success: Locator;

  constructor(readonly page: Page) {
    this.f = fields(page);
    this.btn = buttons(page);
    this.otp = otpInputs(page);
    this.pwd = passwordStep(page);
    this.errors = errorMessages(page);
    this.success = successIndicator(page);
  }

  async goto() {
    await this.page.goto('/Register/empeo');
    await this.page.waitForLoadState('networkidle');
    await this.page.locator('input').first().waitFor({ state: 'visible', timeout: 30_000 });
    // The Crisp chat bubble floats over the form and swallows clicks (e.g. the terms checkbox).
    await this.page.addStyleTag({ content: '.crisp-client { display: none !important; }' });
  }

  /** Fill every provided key whose input exists on the page. Undefined keys are skipped. */
  async fill(data: Partial<UserData>) {
    if (data.company !== undefined) await this.f.companyOthers.click();
    for (const key of Object.keys(data) as Array<keyof UserData>) {
      const value = data[key];
      if (value === undefined) continue;
      if (key === 'companyType' || key === 'userAmount') {
        // Empty value leaves the required dropdown unselected.
        if (value) await this.select(this.f[key], value);
        continue;
      }
      if (key === 'promo' && value) await this.revealPromo();
      const loc = this.f[key];
      if (await loc.count()) {
        await loc.fill(value);
        await loc.blur();
      }
      // The code is only validated on "ใช้โค้ด"; an un-applied code is silently ignored on submit.
      if (key === 'promo' && value && (await this.btn.applyPromo.isVisible())) await this.btn.applyPromo.click();
    }
    // Tick the terms checkbox when present
    if (await this.f.terms.count()) {
      if (!(await this.f.terms.isChecked().catch(() => true))) {
        await this.f.terms.check();
      }
    }
  }

  async has(key: keyof ReturnType<typeof fields>) {
    if (key === 'promo' && (await this.f.promoToggle.count())) return true;
    return (await this.f[key].count()) > 0;
  }

  async select(dropdown: Locator, label: string) {
    await dropdown.click();
    await dropdownOption(this.page, label).click();
  }

  /** The coupon input is hidden behind the ticket image until clicked. */
  async revealPromo() {
    if (!(await this.f.promo.isVisible())) await this.f.promoToggle.click();
    await expect(this.f.promo).toBeVisible();
  }

  async submit() {
    await this.btn.submit.click();
  }

  async fillAndSubmit(data: Partial<UserData>) {
    await this.fill(data);
    await this.submit();
  }

  /** Enters an OTP into either a single input or one-digit boxes. */
  async enterOtp(code: string) {
    const n = await this.otp.count();
    expect(n, 'OTP input(s) should exist').toBeGreaterThan(0);
    if (n === 1) {
      await this.otp.first().fill(code);
    } else {
      await this.otp.first().click();
      await this.otp.first().pressSequentially(code);
    }
  }

  async submitOtp() {
    // Verify stays disabled until all 6 boxes are filled; clicking it then would hang.
    if (await this.btn.verify.isEnabled().catch(() => false)) await this.btn.verify.click();
  }

  async enterAndSubmitOtp(code: string) {
    await this.enterOtp(code);
    await this.submitOtp();
  }

  /** A correct OTP leads to a "set password" page; the account is ready only after it. */
  async setPassword(password: string) {
    // On UAT a correct OTP's verify-otp call takes ~35 s (wrong ones answer instantly).
    test.info().setTimeout(test.info().timeout + 90_000);
    await expect(this.pwd.password, 'set-password page should follow a correct OTP').toBeVisible({ timeout: 90_000 });
    await this.pwd.password.fill(password);
    await this.pwd.confirm.fill(password);
    await this.pwd.submit.click();
  }

  // ---------- assertions ----------

  /** Registration advanced to the OTP step (also proves the OTP selectors are right). */
  async expectOtpStep() {
    // Not `go5-dialog` itself: the host element has no box, so Playwright reports it hidden.
    await expect(this.otp.first(), 'OTP step should be displayed').toBeVisible({ timeout: 20_000 });
  }

  async expectRegistered() {
    // The URL stays under /Register (…/create-password?token=…), so only the message proves it.
    await expect(this.success.first(), 'registration should complete ("empeo พร้อมใช้งานแล้ว!")').toBeVisible({
      timeout: 20_000,
    });
  }

  /** Form rejected: an error is shown and we never reached OTP / success. */
  async expectRejected() {
    await expect(this.errors.first(), 'a validation/error message should be visible').toBeVisible();
    await expect(this.otp.first()).toBeHidden();
    await expect(this.success).toHaveCount(0);
  }

  /** OTP screen: an error is shown and registration was not completed. */
  async expectOtpRejected() {
    await expect(this.errors.first(), 'an OTP error should be visible').toBeVisible();
    await expect(this.pwd.password).toBeHidden();
    await expect(this.success).toHaveCount(0);
    expect(this.page.url()).toContain('/Register');
  }

  /** Advances through the form to the OTP step with the given user. */
  async reachOtpStep(user: UserData) {
    await this.fillAndSubmit(user);
    await this.expectOtpStep();
  }
}
