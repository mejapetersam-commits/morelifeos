import { test, expect } from "@playwright/test";

const ROUTES = [
  "/",
  "/plan",
  "/money",
  "/growth",
  "/intelligence",
  "/login",
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

test("consistency challenge opens its setup dialog", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /explore challenge/i }).click();
  await expect(page.getByRole("dialog")).toContainText("Your Consistency Challenge");
  await expect(page.getByRole("dialog").getByRole("link", { name: /view plan/i })).toBeVisible();
});

test("dashboard detail panels open and close", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /my day details/i }).click();
  await expect(page.getByRole("dialog")).toContainText("Your day, at a glance");
  await page.getByRole("button", { name: /got it/i }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

for (const width of [390, 375]) {
  test(`mobile viewport ${width}px has no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);
  });
}

test("Plan allows tasks and challenge settings to be edited", async ({ page }) => {
  await page.goto("/plan");
  await page.getByPlaceholder("Add a task…").fill("Read for 30 minutes");
  await page.getByPlaceholder("Add a task…").press("Enter");
  await expect(page.getByDisplayValue("Read for 30 minutes")).toBeVisible();
  await page.getByLabel("Duration in days").fill("45");
  await expect(page.getByLabel("Duration in days")).toHaveValue("45");
});

test("Growth allows a goal to be created and edited", async ({ page }) => {
  await page.goto("/growth");
  await page.getByPlaceholder("Add goals…").fill("Build a new skill");
  await page.getByRole("button", { name: "Add to Goals" }).click();
  await expect(page.getByDisplayValue("Build a new skill")).toBeVisible();
  await page.getByLabel("Details for Build a new skill").fill("Complete a structured course");
  await expect(page.getByLabel("Details for Build a new skill")).toHaveValue("Complete a structured course");
});

test("Intelligence provider can be selected", async ({ page }) => {
  await page.goto("/intelligence");
  await page.getByLabel("Preferred AI provider").selectOption("google");
  await expect(page.getByText("GEMINI_API_KEY")).toBeVisible();
});
