import { test, expect } from '@playwright/test';
import { login, readFigure } from './helpers';

test.describe('Dashboard figures update after adding data', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('adding income updates Monthly Income and Savings Rate', async ({ page }) => {
    await page.goto('/income');

    await page.getByRole('button', { name: /add income|new income|log income/i }).click();
    await page.getByLabel(/amount/i).fill('10000');
    await page.getByLabel(/source|description/i).fill('Playwright test income');
    await page.getByRole('button', { name: /save|add|submit/i }).click();
    await page.waitForTimeout(1500);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const monthlyIncome = await readFigure(page, /monthly income/i);
    const savingsRate = await readFigure(page, /savings rate/i);

    // These are the exact two figures flagged as "some populating, some not" —
    // this test tells you which one is actually broken.
    expect(monthlyIncome, 'Monthly Income did not update after adding income').not.toBeNull();
    expect(monthlyIncome).toBeGreaterThan(0);

    expect(savingsRate, 'Savings Rate did not populate').not.toBeNull();
  });

  test('adding a budget/expense updates Monthly Spending', async ({ page }) => {
    await page.goto('/money');

    await page.getByRole('button', { name: /add transaction|new transaction/i }).click();
    await page.getByLabel(/amount/i).fill('2500');
    await page.getByLabel(/description|note/i).fill('Playwright test expense');
    await page.getByRole('button', { name: /save|add|submit/i }).click();
    await page.waitForTimeout(1500);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const monthlySpending = await readFigure(page, /monthly spending/i);
    expect(monthlySpending, 'Monthly Spending did not update').not.toBeNull();
    expect(monthlySpending).toBeGreaterThan(0);
  });
});
