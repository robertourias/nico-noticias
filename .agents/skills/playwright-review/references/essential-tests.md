# Essential tests for web projects

Add what is missing and relevant. Keep each test small, independent and readable. Snippets are TypeScript, `@playwright/test`.

## 1. Smoke: app boots
Home loads, key heading visible, no crash. Fastest signal that a deploy is not broken.
```ts
test('home loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
```

## 2. No console or page errors
Fail on uncaught exceptions and `console.error`; catches broken bundles and failed hydration.
```ts
test('no runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/');
  expect(errors).toEqual([]);
});
```

## 3. Critical user journey
The one to three flows that matter most (sign up, checkout, create-and-publish). Assert the end state, not only that the clicks worked.

## 4. Forms and validation
Happy path, empty required fields, invalid formats, server error, double submit. Assert inline error messages and that the submit button and loading state behave.

## 5. Navigation and routing
Main nav links reach the right pages, deep links work when loaded directly, back/forward keep state, and an unknown route shows a 404 page (not a blank screen).

## 6. Authentication and authorization
Login success and failure, logout, protected routes redirect when signed out, a role cannot open another role's page. Log in once in a setup project and reuse `storageState`.

## 7. Accessibility
Automated scan with `@axe-core/playwright` on key pages, plus keyboard checks: Tab reaches interactive elements, focus is visible, Escape closes dialogs, focus returns to the trigger. Automation finds only part of the issues; say so in the report.
```ts
import AxeBuilder from '@axe-core/playwright';

test('home has no a11y violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

## 8. Responsive
Run key journeys in a mobile project (`devices['Pixel 7']`) and one desktop. Check menu collapse, no horizontal overflow, reachable tap targets.

## 9. Network and API behavior
Loading, empty and error states using `page.route` to mock slow, empty and 500 responses; assert the UI shows a usable message and a retry path.

## 10. Visual regression (optional)
`toHaveScreenshot()` for stable, high-value pages only. Mask dynamic areas, fix the viewport, use the same OS/browser in CI. Update baselines deliberately, never blindly with `--update-snapshots`.

## Suggested config baseline
```ts
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```
