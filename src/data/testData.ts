/** Fixed data supplied with the assignment (override with env vars if needed). */
export const FIXED = {
  phone: process.env.PHONE ?? '0967690708',
  otp: process.env.OTP ?? '123456',
  promo: process.env.PROMO ?? 'FREE15DAY',
};

export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  companyType: string;
  userAmount: string;
  password: string;
  promo: string;
}

/** Meets the set-password rules: upper + lower case, a digit, 8+ characters. */
export const PASSWORD = process.env.PASSWORD ?? 'Test@12345';

const stamp = () => `${Date.now()}${Math.floor(Math.random() * 100)}`;

/**
 * A fully valid user. Email/company are unique per call to avoid collisions.
 * The email *domain* must be unique too: the form rejects any domain that already
 * has an account ("โดเมนนี้มีบัญชีใช้งานแล้ว"), e.g. example.com.
 */
export function validUser(overrides: Partial<UserData> = {}): UserData {
  const s = stamp();
  return {
    firstName: 'Somchai',
    lastName: 'Tester',
    email: `qa.auto@qa${s}.co.th`,
    phone: FIXED.phone,
    company: `QA Auto ${s}`,
    companyType: 'เทคโนโลยี',
    userAmount: '1-20',
    password: PASSWORD,
    promo: FIXED.promo,
    ...overrides,
  };
}

export const INVALID_PHONES: Array<[string, string]> = [
  ['9 digits (too short)', '096769070'],
  ['11 digits (too long)', '09676907088'],
  ['letters only', 'abcdefghij'],
  ['mixed letters/digits', '09676abc08'],
  ['special characters', '09676907@#'],
  ['does not start with 0', '1967690708'],
  ['all zeros', '0000000000'],
  ['whitespace only', '          '],
];

export const INVALID_EMAILS: Array<[string, string]> = [
  ['no @ sign', 'plainaddress'],
  ['missing domain', 'user@'],
  ['missing local part', '@example.com'],
  ['no TLD', 'user@example'],
  ['contains space', 'us er@example.com'],
  ['double dot in domain', 'user@example..com'],
];

export const INVALID_PROMOS: Array<[string, string]> = [
  ['unknown code', 'NOTAREALCODE99'],
  ['partial code', 'FREE15'],
  ['special characters', '!@#$%^&*()'],
  ['SQL injection string', "' OR '1'='1"],
  ['300-char string', 'A'.repeat(300)],
];

export const XSS = '<script>window.__xss=1</script><img src=x onerror="window.__xss=1">';
