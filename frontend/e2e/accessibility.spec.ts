import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

test("responsive HUD, keyboard navigation, themes and accessibility", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem("roadsentinel-onboarded", "true"),
  );
  await page.goto("/");
  await expect(page.getByText("Data online", { exact: true })).toBeVisible();
  await mkdir("../docs/screenshots", { recursive: true });
  await page.screenshot({
    path: `../docs/screenshots/india-overview-${testInfo.project.name}.png`,
    fullPage: testInfo.project.name === "desktop",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  let accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page
    .getByRole("button", { name: "Toggle light or dark theme" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Search pages").fill("Documentation");
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Documentation" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Explore the data responsibly." }),
  ).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("complementary", { name: "Main navigation" })
      .getByRole("navigation")
      .getByRole("link", { name: "Data & model status", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Evidence before predictions.",
      }),
    ).toBeVisible();
  }
  await page.goto("/predict");
  accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
