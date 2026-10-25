import { defineConfig, devices } from '@playwright/test';

const headed = !!process.env.HEADED;

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // One worker: every test uses the same fixed phone number, so parallel
  // runs would trip OTP rate limits / duplicate-phone checks.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://portal.uat.gofive.co.th',
    headless: !headed,
    video: 'on',            // a recording of every test (deliverable: video)
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'th-TH',
    launchOptions: { slowMo: Number(process.env.SLOWMO ?? 0) },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
