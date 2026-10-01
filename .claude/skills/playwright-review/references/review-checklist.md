# Review checklist

Each item: what to flag, why it matters, the fix.

## Selectors
- CSS/XPath tied to layout or classes (`.btn-primary > div:nth-child(2)`) breaks on refactors. Prefer `getByRole` (with `name`), `getByLabel`, `getByText`, `getByPlaceholder`; `getByTestId` only when no accessible handle exists. Role locators double as an accessibility check.
- `locator.first()` / `.nth()` hiding ambiguity → make the locator specific or use `filter({ hasText })`.

## Waiting
- `page.waitForTimeout(...)` is the top cause of flakiness and slow suites → remove; rely on auto-waiting and web-first assertions.
- `waitForLoadState('networkidle')` as a crutch → wait for the specific element or response (`expect(locator)...`, `page.waitForResponse`).
- Manual `isVisible()` / `textContent()` followed by `expect(bool)` → use `await expect(locator).toBeVisible()` / `toHaveText()`, which retry.

## Assertions
- Test with no `expect`, or only "page loaded" → asserts nothing; assert the user-visible outcome (text, URL via `toHaveURL`, state, API result).
- Missing `await` on `expect` or Playwright calls (floating promise) → false green. Enable `@typescript-eslint/no-floating-promises`.
- Over-broad assertions (`toBeTruthy` on a locator) → use the specific matcher.
- Snapshot/visual assertions without masking dynamic content (dates, ids, animations).

## Isolation and data
- Tests depending on order or on state left by another test → each test sets up its own state (fixtures, `beforeEach`, API seeding) and cleans up.
- Shared mutable accounts/data across parallel workers → per-test or per-worker data.
- Logging in through the UI in every test → log in once, reuse `storageState` (setup project).
- Real third-party calls (payments, email) → mock with `page.route` or use test mode.

## Structure
- Long tests mixing many journeys → one behavior per test, with a title stating the expected outcome.
- Duplicated flows → page objects or fixtures (keep them thin; no assertions hidden in helpers unless named `expect...`).
- Hardcoded URLs/credentials/secrets → `baseURL`, env vars, never committed secrets.
- Committed `test.only`, unexplained `test.skip` / `test.fixme` → remove, or document with a reason and ticket.

## Config
- `retries` masking flakiness locally (retries in CI are fine; report flaky results, do not hide them).
- No `trace: 'on-first-retry'` (or `retain-on-failure`) → failures are undebuggable.
- `forbidOnly: !!process.env.CI` missing.
- `webServer` missing → tests assume a manually started app; add `command`, `url`, `reuseExistingServer: !process.env.CI`.
- Only one browser project when the product supports several; no mobile viewport project.
