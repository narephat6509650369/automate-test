# Test Case Design – Empeo Registration (UAT)

URL: `https://portal.uat.gofive.co.th/Register/empeo`
Fixed data: Phone `0967690708` · OTP `123456` · Promo `FREE15DAY`
IDs map 1:1 to the automated test titles in `tests/`.

## Gherkin – core scenarios

```gherkin
Feature: Empeo registration

  Background:
    Given I open the registration page

  @smoke
  Scenario: Successful registration with valid data, promo and OTP
    When I fill all fields with valid data and promo "FREE15DAY"
    And I submit the form
    Then the OTP step is displayed
    When I enter OTP "123456"
    Then registration completes

  Scenario Outline: Invalid phone number is rejected
    When I fill the form with phone "<phone>"
    And I submit the form
    Then a validation error is shown and the OTP step is not displayed
    Examples:
      | phone         |
      | 096769070     |
      | 09676907088   |
      | abcdefghij    |
      | 1967690708    |
      | 0000000000    |

  Scenario Outline: Wrong or malformed OTP is rejected
    Given I reached the OTP step
    When I enter OTP "<otp>"
    Then an error is shown and registration is not completed
    Examples:
      | otp     |
      | 000000  |
      | 12345   |
      | abcdef  |

  Scenario: Invalid promo code
    When I fill the form with promo "NOTAREALCODE99"
    And I submit the form
    Then a promo error is shown and the OTP step is not displayed

  Scenario: Promo code already used
    Given "FREE15DAY" was consumed by an earlier registration
    When a second user registers with "FREE15DAY"
    Then the code is rejected
```

## Table of test cases

| ID | Area | Scenario | Expected |
|---|---|---|---|
| TC-REG-001 | Happy | Page loads with form | Form, phone, email, submit visible |
| TC-REG-002 | Happy | Valid data + promo + OTP | Registration completes |
| TC-REG-003 | Happy | Valid data, no promo | Reaches OTP step (promo optional) |
| TC-REG-004 | Happy | Press Enter to submit | OTP step shown |
| TC-REG-005 | Happy | Double-click submit | Single clean transition to OTP |
| TC-REG-006 | Happy | Leading/trailing spaces | Accepted (trimmed) |
| TC-REG-007 | Happy | Thai characters in names | Accepted |
| TC-VAL-001 | Required | Empty form submit | Errors, no progress |
| TC-VAL-002…007 | Required | Each of first/last name, email, phone, company, password blank | Error, no progress (skipped if field absent) |
| TC-VAL-010 | Required | Whitespace-only first name | Rejected |
| TC-VAL-011 | Required | Terms unchecked | Rejected |
| TC-VAL-012 | Required | Fix errors then resubmit | Error clears, proceeds |
| TC-PHN-001…008 | Phone | Short, long, letters, mixed, special, wrong prefix, zeros, blanks | Rejected |
| TC-PHN-009 | Phone | >10 digits typed | Field caps or submit rejected |
| TC-EML-001…006 | Email | No @, no domain, no local, no TLD, space, `..` | Rejected |
| TC-PWD-001…003 | Password | Short / no digit / no uppercase | Behaviour recorded (policy undocumented) |
| TC-OTP-001 | OTP | Correct OTP | Registration completes |
| TC-OTP-002 | OTP | Wrong OTP `000000` | Error |
| TC-OTP-003 | OTP | Empty OTP | Blocked / error |
| TC-OTP-004 | OTP | 5 digits | Not accepted |
| TC-OTP-005 | OTP | Letters | Not accepted |
| TC-OTP-006 | OTP | Special chars | Not accepted |
| TC-OTP-007 | OTP | 7 digits | Capped or rejected |
| TC-OTP-008 | OTP | 5 wrong attempts | Never succeeds; post-lockout behaviour recorded |
| TC-OTP-009 | OTP | Resend OTP | Control works / cooldown |
| TC-OTP-010 | OTP | Refresh on OTP step | Not auto-completed |
| TC-OTP-011 | OTP | **Expired** OTP (opt-in `OTP_EXPIRY_SECONDS`) | Error |
| TC-PRM-001 | Promo | `FREE15DAY` accepted | No error |
| TC-PRM-002 | Promo | Valid promo end-to-end | Registered |
| TC-PRM-003…007 | Promo | Unknown, partial, special chars, SQLi, 300 chars | Rejected |
| TC-PRM-010 | Promo | Lower-case code | Case behaviour recorded |
| TC-PRM-011 | Promo | Code padded with spaces | Trimmed or cleanly rejected |
| TC-PRM-012 | Promo | Replace invalid with valid | Error clears, proceeds |
| TC-PRM-013 | Promo | **Reused** code, second account (opt-in `SECOND_PHONE`) | Rejected |
| TC-EDGE-001 | Edge | Duplicate registration, same phone | Handled; behaviour recorded |
| TC-EDGE-002 | Edge | 300-char names | No crash, no success |
| TC-EDGE-003 | Edge | Emoji / CJK in company | No crash |
| TC-EDGE-004 | Edge | Network failure on submit | Error, no hang |
| TC-EDGE-005 | Edge | Server 500 on submit | Handled gracefully |
| TC-EDGE-006 | Edge | Back/forward on OTP | No auto-complete |
| TC-SEC-001 | Security | XSS in text fields | No script executes |
| TC-SEC-002 | Security | SQL injection strings | Not accepted |
| TC-UI-001 | UI | 375px mobile viewport | Usable, no horizontal scroll |
| TC-UI-002 | UI | Keyboard Tab | Focus moves to interactive element |
| TC-UI-003 | UI | Password masked | `type="password"` |
