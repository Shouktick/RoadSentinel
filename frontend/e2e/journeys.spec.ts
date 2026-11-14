import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("roadsentinel-onboarded", "true"),
  );
});
test("real Indian aggregates, filters, CSV export and regional geometry", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/analytics");
  await expect(
    page.getByRole("heading", { name: "Understand the reported counts." }),
  ).toBeVisible();
  await expect(
    page.getByText("4,80,583", { exact: true }).first(),
  ).toBeVisible();
  const overview = await page.request.get("/api/service/insights/overview");
  expect(overview.ok()).toBe(true);
  const data = await overview.json();
  expect(data.country).toBe("India");
  expect(data.dataset_version).toBe("india-morth-2023-v1");
  expect(data.records).toHaveLength(108);
  await page.getByLabel("State or union territory").selectOption("Tamil Nadu");
  await page.getByLabel("Calendar year").selectOption("2022");
  await expect(page.getByText("64,105", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Measure", { exact: true }).selectOption("fatalities");
  await expect(page.getByText("17,884", { exact: true }).first()).toBeVisible();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export selected CSV" }).click();
  const file = await downloading;
  const csv = await readFile((await file.path())!, "utf8");
  expect(csv).toContain(
    '"India","india-morth-2023-v1","Tamil Nadu","2022","64105","17884","67703"',
  );
  expect(csv).toContain("persons_killed_count");
  expect(csv).not.toContain("mph");
  expect(csv.split(/\r?\n/)).toHaveLength(2);
  await page.getByLabel("State or union territory").selectOption("Lakshadweep");
  await page.getByLabel("Calendar year").selectOption("2023");
  await expect(
    page.getByText("Not reported (source dash)", { exact: true }).first(),
  ).toBeVisible();
  await page.goto("/map");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.locator(".leaflet-interactive")).toHaveCount(36);
  const geo = await (await page.request.get("/api/service/hotspots")).json();
  expect(geo.country).toBe("India");
  expect(geo.kind).toBe("state_ut_boundaries");
  expect(geo.geojson.features).toHaveLength(36);
  await page.getByLabel("Calendar year").selectOption("2021");
  await page.getByLabel("Measure", { exact: true }).selectOption("injuries");
  await page.getByLabel("State or union territory").selectOption("Kerala");
  await expect(page.getByText("36,775", { exact: true }).first()).toBeVisible();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: `../docs/screenshots/india-map-${testInfo.project.name}.png`,
    fullPage: testInfo.project.name === "desktop",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("Karnataka prediction, exact explanation, saved history and comparison", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/predict");
  await expect(
    page.getByRole("button", { name: "Run prediction", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Save this result to history").check();
  await page
    .getByRole("button", { name: "Run prediction", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Model outcome:/ }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(4);
  await page.locator("#baseline-weather").selectOption("Heavy Rain");
  await expect(
    page.getByRole("heading", { name: /Model outcome:/ }),
  ).toHaveCount(0);
  await page.getByLabel("Save this result to history").uncheck();
  await page
    .getByRole("button", { name: "Run prediction", exact: true })
    .click();
  await expect(page.getByRole("progressbar")).toHaveCount(4);
  await expect(
    page.getByText(/not calibrated personal probabilities/),
  ).toBeVisible();
  await page.screenshot({
    path: `../docs/screenshots/karnataka-prediction-${testInfo.project.name}.png`,
    fullPage: false,
  });
  const token = await page.evaluate(() =>
    localStorage.getItem("roadsentinel-session"),
  );
  const history = await page.request.get("/api/service/predictions", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const saved = (await history.json()).items[0];
  expect(saved.source_country).toBe("India");
  expect(saved.region).toBe("Karnataka");
  expect(saved.historical_only).toBe(false);
  const e = saved.explanation;
  expect(
    e.base_value +
      e.contributions.reduce(
        (a: number, c: { contribution: number }) => a + c.contribution,
        0,
      ),
  ).toBeCloseTo(e.output_logit, 10);
  await page.goto("/history");
  await page.getByRole("button", { name: "Open record" }).click();
  await expect(
    page.getByRole("heading", { name: /Model outcome:/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Run these inputs again" }).click();
  await expect(
    page.getByRole("button", { name: "Run these inputs again" }),
  ).toBeEnabled();
  await page.goto("/what-if");
  await page.locator("#alternative-road_type").selectOption("Village Road");
  await page
    .getByRole("button", { name: "Compare scenarios", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Score changes", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Model outcome:/ }),
  ).toHaveCount(2);
  await page.goto("/explain");
  await page.getByRole("button", { name: "Explain scenario" }).click();
  await expect(
    page.getByRole("heading", { name: "Why this outcome?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Global feature contributions" }),
  ).toBeVisible();
  await page.request.delete(`/api/service/predictions/${saved.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(errors).toEqual([]);
});

test("CSV validation, batch prediction and exports", async ({ page }) => {
  await page.goto("/batch");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV template" }).click();
  const file = await downloading;
  const template = await readFile((await file.path())!, "utf8");
  expect(template).toContain('"district"');
  expect(template).not.toContain("speed_limit");
  await page.getByLabel(/Scenario file/).setInputFiles({
    name: "invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("speed_limit\n30"),
  });
  await page.getByRole("button", { name: "Validate CSV" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "CSV headers" }),
  ).toBeVisible();
  await page.getByLabel(/Scenario file/).setInputFiles({
    name: "scenarios.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(template),
  });
  await page.getByRole("button", { name: "Validate CSV" }).click();
  await expect(
    page.getByText("1 valid scenarios. Ready to run."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Run batch", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "1 results", exact: true }),
  ).toBeVisible();
  const exporting = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export results CSV" }).click();
  const output = await exporting;
  const csv = await readFile((await output.path())!, "utf8");
  expect(csv).toContain('"India","Karnataka","india-karnataka-2016-2023-v1"');
  expect(csv).toContain("Fatal_model_score");
});

test("speed physics, observed crash grid and genuine evaluation", async ({
  page,
}) => {
  await page.goto("/speed-monitor");
  await page.getByLabel("Speed (km/h)", { exact: true }).fill("36");
  await page.getByLabel("Assumed reaction time (seconds)").fill("2");
  await page.getByRole("button", { name: "Calculate speed effects" }).click();
  await expect(page.getByText("30.0 m", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/separate from the severity model/),
  ).toBeVisible();
  await page.goto("/crash-patterns");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  expect(await page.locator(".leaflet-interactive").count()).toBeGreaterThan(
    10,
  );
  await page.goto("/model-card");
  await expect(
    page.getByRole("heading", { name: "Held-out 2023 results" }),
  ).toBeVisible();
  await expect(page.getByText("0.326", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Confusion matrix" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  const h = await (await page.request.get("/api/service/health")).json();
  expect(h.model_available).toBe(true);
  expect(h.model_version).toBe("india-karnataka-2016-2023-v1");
});

test("aggregate outage is visible and retry restores real data", async ({
  page,
}) => {
  await page.route("**/api/service/insights/overview", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "BACKEND_UNAVAILABLE",
          message: "The free service may be waking up. Please retry.",
        },
      }),
    }),
  );
  await page.goto("/analytics");
  await expect(
    page.getByRole("alert").filter({ hasText: "Service unavailable" }),
  ).toBeVisible();
  await page.unroute("**/api/service/insights/overview");
  await page.getByRole("button", { name: "Retry connection" }).click();
  await expect(
    page.getByText("4,80,583", { exact: true }).first(),
  ).toBeVisible();
});
