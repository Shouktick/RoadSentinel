import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("roadsentinel-onboarded", "true"),
  );
});
test("real prediction, explanations, stale results, comparison, batch export and history isolation", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/predict");
  await expect(page.getByLabel("Posted speed limit (mph)")).toBeVisible();
  await page.getByLabel(/Save to history/).check();
  const responsePromise = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/service/predict") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Run model prediction" }).click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  const result = await response.json();
  expect(result.model_version).toBe("stats19-gb-2022-v1");
  expect(result.artifact_sha256).toBe(
    "e49395dcc9860c39980391616afb78b41fbf0dc8d14c69654484f2437cd71687",
  );
  expect(
    result.probabilities.reduce(
      (s: number, p: { probability: number }) => s + p.probability,
      0,
    ),
  ).toBeCloseTo(1, 10);
  expect(
    result.explanation.base_value +
      result.explanation.contributions.reduce(
        (s: number, c: { contribution: number }) => s + c.contribution,
        0,
      ),
  ).toBeCloseTo(result.confidence, 9);
  await expect(
    page.getByRole("heading", { name: "Most likely injury severity" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What influenced this estimate?" }),
  ).toBeVisible();
  await expect(
    page.getByText("Slight injury", { exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: `../docs/screenshots/prediction-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Open saved record" }).click();
  await expect(
    page.getByRole("heading", { name: "Saved input scenario" }),
  ).toBeVisible();
  await expect(page.getByText("30 mph", { exact: true }).first()).toBeVisible();
  const isolated = await page.request.get(
    `/api/service/predictions/${result.id}`,
    { headers: { Authorization: `Bearer ${"b".repeat(64)}` } },
  );
  expect(isolated.status()).toBe(404);
  await page.goto("/predict");
  await page.getByRole("button", { name: "Run model prediction" }).click();
  await expect(
    page.getByRole("heading", { name: "Most likely injury severity" }),
  ).toBeVisible();
  await page.getByLabel("Weather", { exact: true }).selectOption("2");
  await expect(
    page.getByRole("heading", { name: "Most likely injury severity" }),
  ).toHaveCount(0);
  await page.goto("/what-if");
  await page
    .getByRole("button", { name: "Compare scenarios", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Comparison results" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore speed limits" }).click();
  await expect(
    page.getByRole("img", {
      name: /Estimated injury severity probability by posted/,
    }),
  ).toBeVisible();
  await page.locator("#scenario-a-speed_limit").selectOption("40");
  await expect(
    page.getByRole("heading", { name: "Comparison results" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("img", {
      name: /Estimated injury severity probability by posted/,
    }),
  ).toHaveCount(0);
  await page.goto("/batch");
  const templateDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download template" }).click();
  const template = await templateDownload;
  const csv = await readFile((await template.path())!, "utf8");
  expect(csv).toContain("30 mph");
  const invalid = "999,1,1,1,6,1,12,2";
  await page.getByLabel("Choose CSV file").setInputFiles({
    name: "cases.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv + invalid + "\n"),
  });
  await page.getByRole("button", { name: "Run 2 scenarios" }).click();
  await expect(
    page.getByRole("heading", { name: "03 / Processing results" }),
  ).toBeVisible();
  await expect(page.getByText("invalid", { exact: true })).toBeVisible();
  const exportPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all rows" }).click();
  const exported = await exportPromise;
  const exportedCsv = await readFile((await exported.path())!, "utf8");
  expect(exportedCsv).toContain("stats19-gb-2022-v1");
  expect(exportedCsv).toContain("result:probability_fatal");
  expect(exportedCsv).toContain("Slight injury");
  expect(exportedCsv).toContain("invalid");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.goto("/explain");
  await page.getByRole("button", { name: "Explain this estimate" }).click();
  await expect(
    page.getByRole("heading", { name: "What influenced this estimate?" }),
  ).toBeVisible();
  await page.goto("/map");
  await expect(
    page.getByRole("heading", { name: "Great Britain observations" }),
  ).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.goto("/analytics");
  await expect(
    page.getByRole("heading", { name: "Recorded injury severity" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Road type", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Single carriageway", exact: true }).first(),
  ).toBeVisible();
  await page.goto("/model-card");
  await expect(
    page.getByRole("heading", { name: "Confusion matrix" }),
  ).toBeVisible();
  await expect(page.getByText("0.2880", { exact: true }).first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.goto(`/history?id=${result.id}`);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: `Delete prediction ${result.id.slice(0, 8)}` })
    .click();
  await expect(
    page.getByRole("button", {
      name: `Delete prediction ${result.id.slice(0, 8)}`,
    }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("explicit backend outage and retry", async ({ page }) => {
  await page.route("**/api/service/**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "BACKEND_UNAVAILABLE",
          message:
            "The free service may need about a minute to wake up. Please retry.",
        },
      }),
    }),
  );
  await page.goto("/predict");
  await page.getByRole("button", { name: "Run model prediction" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Service unavailable" }),
  ).toContainText("about a minute");
  await expect(
    page.getByRole("button", { name: "Retry connection" }),
  ).toBeVisible();
  await expect(page.getByText("ACTUAL INFERENCE")).toHaveCount(0);
  await page.unroute("**/api/service/**");
  await page.getByRole("button", { name: "Retry connection" }).click();
  await expect(
    page.getByRole("heading", { name: "Most likely injury severity" }),
  ).toBeVisible();
});
