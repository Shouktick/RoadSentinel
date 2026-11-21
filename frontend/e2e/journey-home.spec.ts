import { test, expect } from "@playwright/test";
test("journey shortcuts and interactive departure checklist", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("roadsentinel-onboarded", "true"),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "A clearer view. A more informed journey.",
    }),
  ).toBeVisible();
  await page.getByLabel("Check tyres, lights and mirrors").check();
  await expect(page.getByText("1 / 4 checked", { exact: true })).toBeVisible();
  await page.getByLabel("Check tyres, lights and mirrors").uncheck();
  await expect(page.getByText("0 / 4 checked", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Understand stopping distance" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Physics-Based Speed & Stopping Distance Explorer",
    }),
  ).toBeVisible();
});
