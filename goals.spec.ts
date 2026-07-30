import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Goal creation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('creating a goal saves it and it appears in the list', async ({ page }) => {
    const goalName = `Test Goal ${Date.now()}`; // unique name so the test is repeatable

    await page.goto('/goals');

    // Capture console/network errors during the create action specifically —
    // this is the moment your reported bug happens.
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('response', (res) => {
      if (res.status() >= 400) errors.push(`${res.status()} on ${res.url()}`);
    });

    await page.getByRole('button', { name: /create.*goal|new goal|add goal/i }).click();

    // Adjust these field labels to match your actual form once you confirm them
    await page.getByLabel(/goal name|name/i).fill(goalName);
    await page.getByLabel(/target|amount/i).fill('50000');

    await page.getByRole('button', { name: /save|create|submit/i }).click();

    // Give any async insert + refetch time to complete
    await page.waitForTimeout(1500);

    expect(errors, `Errors during goal creation:\n${errors.join('\n')}`).toEqual([]);

    // The actual bug check: does the goal show up after creating it?
    await expect(page.getByText(goalName)).toBeVisible({ timeout: 5000 });

    // Reload and confirm it persisted (rules out "shows optimistically, never actually saved")
    await page.reload();
    await expect(page.getByText(goalName)).toBeVisible({ timeout: 5000 });
  });
});
