import { Page, expect } from "@playwright/test";

// Pull test-account credentials from env vars / GitHub Actions secrets —
// never commit real credentials into the repo.
export const TEST_EMAIL = process.env.TEST_USER_EMAIL || "";
export const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "";

export async function login(page: Page) {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(
      "TEST_USER_EMAIL / TEST_USER_PASSWORD are not set. Create a dedicated test account " +
        "(not a real user) and set these as env vars or GitHub Actions secrets.",
    );
  }
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /log ?in|sign ?in/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|overview|$)/i, { timeout: 10_000 });
}

// Reads a dashboard figure by its visible label (e.g. "Monthly Income")
// and returns the numeric value shown next to it, or null if it can't find one.
export async function readFigure(page: Page, label: string | RegExp): Promise<number | null> {
  const card = page.getByText(label).locator("..");
  const text = await card.innerText();
  const match = text.match(/[\d,]+(\.\d+)?/);
  if (!match) return null;
  return parseFloat(match[0].replace(/,/g, ""));
}
