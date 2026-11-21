import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("roadsentinel-onboarded", "true"),
  );
});

test("speed controls, moving needle and editable distance comparison", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/speed-monitor");
  const manual = page.getByLabel("Speed (km/h)", { exact: true });
  const slider = page.getByRole("slider");
  const needle = page.locator(".speed-pointer");
  const initial = await needle.evaluate((el) => getComputedStyle(el).transform);
  await manual.fill("100");
  await expect(slider).toHaveValue("100");
  await expect(
    page.getByRole("img", { name: "Speedometer at 100 km/h" }),
  ).toBeVisible();
  await expect
    .poll(() => needle.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(initial);
  await slider.focus();
  await slider.press("ArrowLeft");
  await expect(manual).toHaveValue("99");
  const bounds = (await slider.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width * 0.65,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.25,
    bounds.y + bounds.height / 2,
    { steps: 10 },
  );
  await page.mouse.up();
  expect(Number(await manual.inputValue())).toBeLessThan(60);
  await page.getByRole("button", { name: "Reset speed" }).click();
  await expect(manual).toHaveValue("50");
  await page.getByLabel("Increase speed by 1 km/h").click();
  await expect(manual).toHaveValue("51");
  await page.getByLabel("Decrease speed by 1 km/h").click();
  await expect(manual).toHaveValue("50");
  await page.getByLabel("Comparison speed 1 (km/h)").fill("36");
  await expect(page.locator(".speed-chart-row").first()).toContainText(
    "15.0 m reaction + 10.0 m braking",
  );
  await expect(page.locator(".speed-chart-row").first()).toContainText(
    "25.0 m",
  );
  await manual.fill("-1");
  await expect(manual).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("stopping")).toContainText("—");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("live physics matches the exported calculation and rejects zero deceleration", async ({
  page,
}) => {
  await page.goto("/speed-monitor");
  await page.getByLabel("Speed (km/h)", { exact: true }).fill("36");
  await page.getByLabel("Reaction time (s)").fill("2");
  await page.getByLabel("Constant deceleration (m/s²)").fill("4");
  await page.getByLabel("Vehicle mass (kg)").fill("1000");
  await expect(page.getByTestId("stopping")).toHaveText("32.5 m");
  for (const [label, value] of [
    ["Reaction distance", "20.0 m"],
    ["Braking distance", "12.5 m"],
    ["Kinetic energy", "50.0 kJ"],
  ]) {
    await expect(
      page
        .locator(".speed-metrics div")
        .filter({ hasText: label })
        .locator("dd"),
    ).toHaveText(value);
  }
  await page.getByRole("button", { name: "Calculate speed effects" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export calculation" }).click();
  const payload = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(payload.selected).toEqual({
    speed_kmh: 36,
    reaction_distance_m: 20,
    braking_distance_m: 12.5,
    stopping_distance_m: 32.5,
    kinetic_energy_kj: 50,
  });
  expect(payload.curve).toHaveLength(15);
  await page.getByLabel("Constant deceleration (m/s²)").fill("0");
  await expect(
    page.getByRole("button", { name: "Calculate speed effects" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Export calculation" }),
  ).toHaveCount(0);
  await expect(page.getByTestId("stopping")).toContainText("—");
});
