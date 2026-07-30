import { defineConfig, devices } from '@playwright/test';

// BASE_URL is set via environment variable so you control what gets tested:
//   Local dev:      BASE_URL=http://localhost:5173
//   Vercel preview: BASE_URL=https://morelifeos-git-<branch>-<team>.vercel.app
//   NEVER point this at production (morelifeos.vercel.app) for tests that
//   create/edit/delete data — use a preview deployment + separate test DB/branch.
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,

  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],
});
