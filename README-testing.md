# Running these tests

## 1. Install
```bash
npm install -D @playwright/test
npx playwright install
```
Copy `playwright.config.ts`, the `tests/` folder, and `.github/workflows/playwright.yml`
into your `morelifeos` repo root.

Add to `package.json`:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

## 2. Create a dedicated TEST account
Never use a real user's credentials or production data. Sign up a throwaway
account (e.g. `qa-test@yourdomain.com`) specifically for these tests — one
whose data you don't mind being created/modified repeatedly.

## 3. Set environment variables
Locally, create `.env.test` (add it to `.gitignore`):
```
BASE_URL=http://localhost:5173
TEST_USER_EMAIL=qa-test@yourdomain.com
TEST_USER_PASSWORD=your-test-password
```
Run with: `BASE_URL=... TEST_USER_EMAIL=... TEST_USER_PASSWORD=... npm run test:e2e`

In GitHub: repo → Settings → Secrets and variables → Actions, add:
- `PREVIEW_BASE_URL` — a Vercel **preview** deployment URL, not the production one
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

## 4. Adjust selectors
The form field labels in `goals.spec.ts` and `figures.spec.ts` (e.g. `/goal name/i`,
`/target|amount/i`) are best guesses based on typical finance-app forms. Run
`npx playwright test --ui` once to see exactly where a selector doesn't match your
real form, then adjust the `getByLabel(...)` calls to your actual field labels.

## 5. Run it
```bash
npm run test:e2e          # headless, all browsers
npm run test:e2e:ui       # interactive UI mode — best for first run/debugging
```

## Why not point this at morelifeos.vercel.app directly?
These tests create, edit, and read real data. Running them against production
risks polluting real financial data or exposing real user data in screenshots/
traces uploaded as CI artifacts. Always run against localhost or a Vercel
preview deployment tied to a separate database/branch.
