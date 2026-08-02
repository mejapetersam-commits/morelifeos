import { test, expect } from "@playwright/test";

const ROUTES = [
  "/",
  "/money",
  "/investments",
  "/income",
  "/inbox",
  "/goals",
  "/reviews",
  "/ai",
  "/settings",
];

test("homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/FinanceOS|MoreLifeOS/i);
});

for (const route of ROUTES) {
  test(`route ${route} loads without error`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    const response = await page.goto(route);
    expect(response?.status(), `${route} returned a bad status`).toBeLessThan(400);
    await page.waitForLoadState("networkidle");

    expect(errors, `Console/page errors on ${route}:\n${errors.join("\n")}`).toEqual([]);
  });
}

test("mobile viewport has no horizontal scroll on dashboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalScroll).toBe(false);
});
