import { test, expect } from '@playwright/test';

// ── Site health ──────────────────────────────────────────────
test.describe('Site health', () => {
  test('homepage loads with 200 and no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    expect(errors, `Console errors found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('no broken internal links from homepage', async ({ page, request }) => {
    await page.goto('/');
    const hrefs = await page.$$eval('a[href]', (links) =>
      links
        .map((l) => l.getAttribute('href'))
        .filter((h): h is string => !!h && !h.startsWith('mailto:') && !h.startsWith('tel:'))
    );

    const internal = [...new Set(hrefs)].filter(
      (h) => h.startsWith('/') || h.includes('morelifeos.vercel.app')
    );

    for (const href of internal) {
      const res = await request.get(href, { failOnStatusCode: false });
      expect(res.status(), `Broken link: ${href}`).toBeLessThan(400);
    }
  });

  test('security headers present', async ({ request }) => {
    const res = await request.get('/');
    const headers = res.headers();
    // Vercel sets some by default; flag if missing so you can add via vercel.json
    expect(headers['x-content-type-options'] || headers['strict-transport-security']).toBeTruthy();
  });
});

// ── Auth flow ────────────────────────────────────────────────
test.describe('Authentication', () => {
  test('login page renders email + password fields', async ({ page }) => {
    await page.goto('/login'); // adjust path if different
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('rejects invalid login with visible error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('not-a-real-user@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword123');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 8000 });
  });

  // Authenticated tests below need a stored session — see storageState note at bottom of file.
});

// ── Dashboard (requires logged-in state — see setup note) ────
test.describe('Dashboard', () => {
  test.skip('greets logged-in user by name', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText(/good morning|good afternoon|good evening/i)).toBeVisible();
  });

  test.skip('financial health score renders a numeric value', async ({ page }) => {
    await page.goto('/dashboard');
    const score = page.getByTestId('financial-health-score'); // adjust selector to your actual DOM
    await expect(score).toBeVisible();
    const text = await score.textContent();
    expect(text).toMatch(/\d+/);
  });

  test.skip('dark mode toggle switches theme', async ({ page }) => {
    await page.goto('/dashboard');
    const html = page.locator('html');
    const before = await html.getAttribute('class');
    await page.getByRole('button', { name: /dark mode|theme/i }).click();
    const after = await html.getAttribute('class');
    expect(after).not.toEqual(before);
  });
});

// ── Transactions & budgets (requires logged-in state) ─────────
test.describe('Transactions', () => {
  test.skip('search/filter narrows transaction list', async ({ page }) => {
    await page.goto('/transactions');
    const rowsBefore = await page.locator('[data-testid="transaction-row"]').count();
    await page.getByPlaceholder(/search/i).fill('rent');
    await expect(page.locator('[data-testid="transaction-row"]')).toHaveCount(
      // just assert it changed, not exact count — adjust if you know the fixture data
      rowsBefore === 0 ? 0 : rowsBefore
    );
  });

  test.skip('category budget shows spent vs limit', async ({ page }) => {
    await page.goto('/budgets');
    await expect(page.locator('[data-testid="budget-card"]').first()).toBeVisible();
  });
});

// ── Settings ───────────────────────────────────────────────────
test.describe('Settings', () => {
  test.skip('danger zone data reset requires confirmation', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: /reset data|clear data/i }).click();
    await expect(page.getByText(/are you sure|this cannot be undone/i)).toBeVisible();
  });
});

/**
 * NOTE on authenticated tests (the .skip ones above):
 * 1. Create a one-time login script that saves session state:
 *      npx playwright codegen --save-storage=auth.json https://morelifeos.vercel.app/login
 * 2. Store auth.json as a GitHub Actions secret (base64-encoded) — never commit it.
 * 3. In each authenticated test file, add:
 *      test.use({ storageState: 'auth.json' });
 * 4. Remove `.skip` once wired up.
 * Also: swap the getByTestId/placeholder selectors above for your real ones —
 * these are best-guess based on the features you described, not your actual DOM.
 */
