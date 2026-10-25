import { test, TestInfo } from '@playwright/test';

/**
 * App defects found by this suite on UAT, keyed by test-case id.
 * Listed tests run as `test.fail()`: they stay green while the bug exists and turn red
 * ("expected to fail, but passed") once it is fixed – then delete the entry.
 */
export const KNOWN_DEFECTS: Record<string, string> = {
  'TC-REG-006': 'email is not trimmed – leading/trailing spaces give "กรุณาใส่อีเมลที่ถูกต้อง"',
  'TC-VAL-010': 'whitespace-only first name is accepted and reaches the OTP step',
  'TC-PHN-004': 'phone with letters (09676abc08) is accepted and an OTP is sent',
  'TC-EML-006': 'email with a double dot in the domain (user@example..com) is accepted',
  'TC-PRM-005': 'promo "!@#$%^&*()" – "ใช้โค้ด" does nothing, no error, registration continues',
};

/** Call from `beforeEach`: marks the current test as an expected failure if it is a known defect. */
export function markKnownDefect(testInfo: TestInfo) {
  const id = testInfo.title.match(/^TC-[A-Z]+-\d+/)?.[0];
  const defect = id ? KNOWN_DEFECTS[id] : undefined;
  test.fail(!!defect, `Known defect: ${defect}`);
}
