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
test("all unsupported inference flows are disabled and history keeps its scope", async ({
  page,
}) => {
  for (const path of [
    "/predict",
    "/what-if",
    "/speed-monitor",
    "/batch",
    "/explain",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", {
        name: "Severity prediction is unavailable.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /run model|compare scenarios|upload/i }),
    ).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);
  }
  for (const path of ["predict", "predict/batch", "explain/local"]) {
    const r = await page.request.post(`/api/service/${path}`, { data: {} });
    expect(r.status()).toBe(410);
    expect((await r.json()).error.code).toBe("INDIA_MODEL_UNAVAILABLE");
  }
  await page.goto("/model-card");
  await expect(
    page.getByText(/not applicable: no Indian model was trained/),
  ).toBeVisible();
  await page.goto("/history");
  await expect(
    page.getByRole("heading", {
      name: "Historical records, original context.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("No historical records available", { exact: true }),
  ).toBeVisible();
  const history = await page.request.get("/api/service/predictions");
  expect(history.status()).toBe(401);
  const h = await (await page.request.get("/api/service/health")).json();
  expect(h.model_available).toBe(false);
  expect(h.severity_ready).toBe(false);
  expect(h.ready).toBe(true);
  expect(h.model_version).toBeNull();
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
