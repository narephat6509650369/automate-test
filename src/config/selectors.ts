import { Locator, Page } from '@playwright/test';

/**
 * >>> SINGLE PLACE TO TUNE LOCATORS <<<
 * Uses the app's data-testid attributes (go5 components on /Register/empeo).
 * If one doesn't match your DOM, run `npm run codegen` and edit only this file.
 */
export function fields(page: Page) {
  return {
    // "อื่นๆ" swaps the tax-id lookup (only matches real registered companies)
    // for a free-text company name field.
    companyOthers: page.getByTestId('input_radio_registration_company_others'),
    company: page.getByTestId('input_textfield_input_register_company_name'),
    companyType: page.getByTestId('dropdown_selection_registration_company_type'),
    userAmount: page.getByTestId('dropdown_selection_registration_user_amount'),
    email: page.getByTestId('input_textfield_input_registration_email'),
    firstName: page.getByTestId('input_textfield_input_register_first_name'),
    lastName: page.getByTestId('input_textfield_input_register_last_name'),
    phone: page.locator('ngx-intl-tel-input input#phone'),
    password: page.locator('input[type="password"]').first(),
    // The coupon input only renders after clicking the ticket image.
    promoToggle: page.getByTestId('input_button_registration_register_ticket_got_coupon'),
    promo: page.getByTestId('input_text_registration_coupon_code'),
    terms: page.getByTestId('input_checkbox_registration_checkbox'),
  };
}

/** An option inside an open go5 dropdown, matched by its exact label. */
export const dropdownOption = (page: Page, label: string): Locator =>
  page.locator('.go5-dropdown-item').filter({ hasText: new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) });

export function otpInputs(page: Page): Locator {
  return page.locator(
    'go5-dialog [data-testid="input_text_registration_otp_Config"] .ng-otp-input-wrapper .otp-input',
  );
}

export const buttons = (page: Page) => ({
  // Main submit / continue button on the form
  submit: page.getByTestId('button_submit_registration_try_for_free'),
  verify: page
    .locator('go5-dialog')
    .getByTestId('button_button_registration_verify'),
  resend: page
    .locator('go5-dialog')
    .getByTestId('button_button_registration_otp_resend')
    .or(
      page
        .locator('go5-dialog')
        .getByRole('button', { name: /resend|ส่งอีกครั้ง|ส่งรหัสใหม่|ขอรหัสใหม่/i }),
    )
    .first(),
  // "ใช้โค้ด" is a <p>, not a <button>
  applyPromo: page.locator('p.btn-apply'),
});

/**
 * Any visible validation / error message. Matched by markup, not wording: static page
 * copy such as "ไม่จำเป็นต้องใช้บัตรเครดิต" or the OTP title "กรุณาตรวจสอบข้อความ"
 * would otherwise count as errors.
 */
export const errorMessages = (page: Page): Locator =>
  page
    .locator(
      [
        'p.e-error', // tax id / email / phone / promo / terms
        '[data-testid="error_message_text"]', // go5 textfields & dropdowns
        '.go5-toast-description', // API errors, e.g. "OTP ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง"
        '.swal2-popup', // generic server-error popup ("Error! Oops...")
      ].join(', '),
    )
    .filter({ visible: true });

/** The "set password" page shown after a correct OTP. */
export const passwordStep = (page: Page) => ({
  password: page.getByRole('textbox', { name: 'รหัสผ่าน', exact: true }),
  confirm: page.getByRole('textbox', { name: 'ยืนยันรหัสผ่าน', exact: true }),
  submit: page.getByRole('button', { name: 'ตั้งรหัสผ่าน' }),
});

/** Anything that signals a completed registration ("empeo พร้อมใช้งานแล้ว!"). */
export const successIndicator = (page: Page): Locator =>
  page
    .getByTestId('button_text_create_password_btn_lets_get_started')
    .or(page.getByText(/พร้อมใช้งานแล้ว|ยินดีด้วย|success|congratulat/i))
    .filter({ visible: true });

export const promoFeedback = (page: Page) => ({
  ok: page.getByText(/applied|valid|15 ?days?|ใช้โค้ดสำเร็จ|ถูกต้อง|15 วัน/i).filter({ visible: true }),
});
