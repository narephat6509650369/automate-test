# Gofive / Empeo Registration – Playwright E2E

Automated tests for `https://portal.uat.gofive.co.th/Register/empeo`.
Test design: [`docs/TEST_CASES.md`](docs/TEST_CASES.md).

## Run locally

```bash
npm install
npx playwright install chromium
npm test                 # headless, all tests
npm run test:demo        # headed + slow motion – ideal for a screen recording
npm run test:smoke       # @smoke subset
npm run report           # open HTML report
```

Videos of every test are saved to `test-results/**/video.webm` (`video: 'on'`);
traces and screenshots are kept on failure.

## Configuration (env vars)

| Var | Default | Purpose |
|---|---|---|
| `BASE_URL` | `https://portal.uat.gofive.co.th` | Target environment |
| `PHONE` / `OTP` / `PROMO` | `0967690708` / `123456` / `FREE15DAY` | Fixed test data |
| `SECOND_PHONE` | – | Enables TC-PRM-013 (reused promo) |
| `OTP_EXPIRY_SECONDS` | – | Enables TC-OTP-011 (expired OTP) – waits that long |
| `HEADED`, `SLOWMO` | – | Visible browser / slow motion (ms) |

## Layout

```
src/config/selectors.ts   ← ALL locators live here (edit this if the DOM differs)
src/pages/RegisterPage.ts ← page object: fill / submit / OTP / assertions
src/data/testData.ts      ← fixed + generated data, invalid-value tables
tests/01…05-*.spec.ts     ← happy path, validation, OTP, promo, edge/security/UI
.github/workflows/        ← CI (GitHub Actions)
```

## Important notes

* **Locators are heuristic.** The page is a client-rendered SPA, so selectors use
  Thai/English labels, placeholders and attribute fallbacks. On the first run, if
  TC-REG-001/002 fail on a locator, run `npm run codegen`, then adjust only
  `src/config/selectors.ts`. Nothing else needs to change.
* **Shared state.** All tests use the same phone number, so they run serially
  (`workers: 1`). If UAT blocks re-registering `0967690708`, reset the account
  between runs or provide a fresh number via `PHONE`.
* Tests marked "observed" record undocumented behaviour (password policy,
  promo case-sensitivity, duplicate phone) as annotations in the report rather
  than asserting a guess.
"# automate-test" 
