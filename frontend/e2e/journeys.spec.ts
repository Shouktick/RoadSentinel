import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("roadsentinel-onboarded", "true"),
  );
});

test("prediction, real SHAP, comparison, CSV and saved history", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your road intelligence, in focus." }),
  ).toBeVisible();
  await page.goto("/predict");
  await page.getByLabel(/Save to history/).check();
  await page.getByRole("button", { name: "Run model prediction" }).click();
  await expect(page.getByText("ACTUAL INFERENCE")).toBeVisible({
    timeout: 60000,
  });
  await expect(
    page.getByRole("heading", { name: "Top SHAP contributors" }),
  ).toBeVisible();
  await expect(page.getByText("PREDICTED NUMERIC CLASS")).toBeVisible();
  await page.getByRole("link", { name: "Open saved record" }).click();
  await expect(
    page.getByRole("heading", { name: "Saved input scenario" }),
  ).toBeVisible();
  await page.goto("/what-if");
  await page
    .getByRole("button", { name: "Compare actual model responses" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Comparison results" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Run sweep" }).click();
  await expect(
    page.getByRole("img", { name: /Model class probability by native/ }),
  ).toBeVisible();
  await page.goto("/batch");
  const csv =
    "Age_of_Driver,Speed_limit,Weather_Conditions,Road_Surface_Conditions,Light_Conditions,Vehicle_Type,Number_of_Vehicles\n35,30,1,1,1,1,1\n-1,30,1,1,1,1,1\n";
  await page.getByLabel("Choose CSV file").setInputFiles({
    name: "scenarios.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Run 2 scenarios" }).click();
  await expect(
    page.getByRole("heading", { name: "03 / Processing results" }),
  ).toBeVisible();
  await expect(page.getByText("invalid", { exact: true })).toBeVisible();
  await page.goto("/explain");
  await page.getByRole("button", { name: "Compute local Tree SHAP" }).click();
  await expect(page.getByText("EXPLAINED MODEL OUTPUT")).toBeVisible({
    timeout: 60000,
  });
  await page.goto("/map");
  await expect(
    page.getByText("Observed locations are unavailable"),
  ).toBeVisible();
  await page.goto("/analytics");
  await expect(
    page.getByRole("heading", { name: "Dataset analytics unavailable" }),
  ).toBeVisible();
  await page.goto("/model-card");
  await expect(
    page.getByRole("heading", { name: "Feature contract" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
});

test("API outage is visible and navigation remains available", async ({
  page,
}) => {
  await page.route("**/api/service/**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "OFFLINE",
          message: "Backend unavailable during this test.",
        },
      }),
    }),
  );
  await page.goto("/");
  await expect(
    page.getByText("Backend unavailable during this test.").first(),
  ).toBeVisible();
  await page.goto("/about");
  await expect(
    page.getByRole("heading", { name: "Engineering you can inspect." }),
  ).toBeVisible();
});
