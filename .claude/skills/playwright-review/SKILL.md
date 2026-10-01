---
name: playwright-review
description: Reviews Playwright test suites (@playwright/test, TypeScript) for quality and flakiness, runs them to validate a change after implementation, and fills gaps with the essential test steps every web project needs. Use this skill whenever the user asks to review, audit, fix, validate or add Playwright / e2e tests, says tests are flaky, or has just implemented a feature, fix or refactor in a web project and needs to confirm it works in the browser, even if Playwright is never named.
metadata:
  title: Playwright Review
  category: testing
  tags: [playwright, e2e, testing, flaky-tests, accessibility, web]
  agents: [claude-code, cursor, codex]
  version: 1.0.0
  status: beta
  language: en
  visibility: public
  updated: 2026-09-25
---

# Playwright Review

Three jobs, in this order: **review** the existing Playwright tests, **validate** them against the change that was just implemented, **fill gaps** with the essential web-project checks. A green run only means something when the tests are trustworthy and actually cover the change, so do not skip the review to get to the run.

## 1. Discover

- Find `playwright.config.*`, the test dir (`tests/`, `e2e/`), and the package manager (lockfile). No Playwright installed: say so, offer `npm init playwright@latest`, and stop until the user agrees.
- Read the config: `baseURL`, `webServer` (does it start the app itself?), projects/browsers, `retries`, `trace`, `fullyParallel`, `forbidOnly`.
- Find what changed: `git diff` / `git status` against the base branch. The change defines what must be covered.

## 2. Review the tests

Read the specs touched by or relevant to the change, then check them against `references/review-checklist.md` (selectors, waits, assertions, isolation, config). Report findings as `file:line - issue → fix`, grouped by file, most severe first (flaky or false-green before style). Do not rewrite passing tests for taste; flag only what makes them unreliable, uninformative or unmaintainable.

## 3. Validate after implementation

1. Map each changed behavior (route, component, form, API call) to an existing test. List behaviors with no test.
2. Run the relevant specs first, then the full suite: `npx playwright test <file>` then `npx playwright test`. Use `--reporter=list` for readable output; add `--trace on` when investigating.
3. On failure, decide before touching anything: **product bug**, **test bug**, or **environment** (server not up, stale data, port). Read the error, trace or screenshot (`npx playwright show-trace`); do not just add a timeout or retry. Fix the cause. If it is a product bug, report it rather than bending the test to pass.
4. When flakiness is suspected, run `npx playwright test --repeat-each=5 <file>`; any failure in 5 runs marks a flaky test.
5. Never mark a test `.skip`/`.fixme` or loosen an assertion to get green without telling the user why.

## 4. Fill gaps: essential web-project coverage

Compare the suite with `references/essential-tests.md` and add only what is missing and relevant to this app (smoke, runtime errors, critical user journey, forms and validation, navigation and 404, auth, accessibility scan, responsive, network states, visual). Prioritize what the current change touches, then the smoke and critical-journey tests. Write new tests to the same checklist you review with.

## Report

End with a short summary:

- Verdict: trustworthy / needs fixes / broken
- Run result: N passed, N failed, N flaky, N skipped (with the command used)
- Coverage of the change: covered behaviors vs gaps
- Tests added or fixed, and anything left for the user to decide

Don't claim success without having run the suite in this session and seen the output.
