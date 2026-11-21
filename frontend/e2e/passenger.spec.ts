import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("roadsentinel-onboarded", "true"),
  );
});

test("passenger GPS permission, speed changes, location context and stop", async ({
  page,
  context,
}) => {
  const cdp = await context.newCDPSession(page);
  await context.grantPermissions(["geolocation"]);
  await cdp.send("Emulation.setGeolocationOverride", {
    latitude: 12.97,
    longitude: 77.59,
    accuracy: 6,
    speed: 10,
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/speed-monitor");
  await expect(
    page.getByRole("img", { name: "Speed unavailable" }),
  ).toBeVisible();
  await expect(page.getByText("Vehicle mass", { exact: false })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Start monitoring", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Speedometer at 36 km/h" }),
  ).toBeVisible();
  await expect(page.getByText("±6 m", { exact: true })).toBeVisible();
  await cdp.send("Emulation.setGeolocationOverride", {
    latitude: 12.971,
    longitude: 77.59,
    accuracy: 5,
    speed: 20,
  });
  await expect(
    page.getByRole("img", { name: "Speedometer at 72 km/h" }),
  ).toBeVisible();
  await expect(page.getByText("Speed limit data unavailable")).toBeVisible();
  await page.getByText("Area & weather", { exact: true }).click();
  await expect(page.getByText(/Approximate area: Karnataka/)).toBeVisible();
  await page.route("**/api/ride-weather?*", (route) =>
    route.fulfill({ status: 503, body: "{}" }),
  );
  await page.getByRole("button", { name: "Load area weather" }).click();
  await expect(page.getByText(/Area forecast unavailable/)).toBeVisible();
  await cdp.send("Emulation.setGeolocationOverride", {
    latitude: 12.971,
    longitude: 77.59,
    accuracy: 150,
    speed: 20,
  });
  await expect(
    page.getByRole("img", { name: "Speed unavailable" }),
  ).toBeVisible();
  await expect(page.getByText(/Weak location signal/)).toBeVisible();
  await page.getByRole("button", { name: "Stop monitoring" }).click();
  await expect(
    page.getByText(/Last known GPS location:/).first(),
  ).toBeVisible();
  await cdp.send("Emulation.setGeolocationOverride", {
    latitude: 12.98,
    longitude: 77.6,
    accuracy: 6,
    speed: 5,
  });
  await expect(
    page.getByRole("img", { name: "Speed unavailable" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("reports, permission denial and passenger-controlled emergency actions", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: {
        watchPosition: (_: unknown, fail: (e: { code: number }) => void) => {
          setTimeout(() => fail({ code: 1 }), 0);
          return 1;
        },
        clearWatch: () => {},
      },
    });
    Object.defineProperty(navigator, "share", {
      value: async (data: { text: string }) =>
        sessionStorage.setItem("test-share", data.text),
    });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (s: string) => sessionStorage.setItem("test-copy", s),
      },
    });
  });
  await page.goto("/speed-monitor");
  await page
    .getByRole("button", { name: "Start monitoring", exact: true })
    .click();
  await expect(page.getByText(/Allow location in your browser/)).toBeVisible();
  for (const name of ["Wet", "Poor visibility", "Pothole"])
    await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: "Save road report" }).click();
  await expect(
    page.getByText(/You reported: Wet, Poor visibility, Pothole/),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText(/You reported: Wet, Poor visibility, Pothole/),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Call 112" })).toHaveAttribute(
    "href",
    "tel:112",
  );
  await page.getByLabel("Landmark or address").fill("Near the bus stop");
  await page.getByRole("button", { name: "Copy location" }).click();
  await page.getByRole("button", { name: "Share location" }).click();
  expect(
    await page.evaluate(() => [
      sessionStorage.getItem("test-copy"),
      sessionStorage.getItem("test-share"),
    ]),
  ).toEqual(Array(2).fill("Passenger-entered location: Near the bus stop"));
  await page.getByText("Trusted emergency contact", { exact: true }).click();
  await page.getByLabel("Phone number").fill("+91 1234567890");
  await page.getByRole("button", { name: "Save trusted contact" }).click();
  await expect(
    page.getByRole("link", { name: "Call trusted contact" }),
  ).toHaveAttribute("href", "tel:+911234567890");
});

test("missing speed, stale updates, timeout and page lifecycle", async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: {
        watchPosition: (ok: PositionCallback, fail: PositionErrorCallback) => {
          const send = (speed: number | null) =>
            ok({
              coords: { latitude: 12.97, longitude: 77.59, accuracy: 6, speed },
              timestamp: Date.now(),
            } as GeolocationPosition);
          setTimeout(() => send(null), 20);
          window.addEventListener("test-speed", () => send(10), { once: true });
          window.addEventListener(
            "test-timeout",
            () => fail({ code: 3 } as GeolocationPositionError),
            { once: true },
          );
          return 19;
        },
        clearWatch: (id: number) => {
          sessionStorage.setItem("watch-cleared", String(id));
        },
      },
    });
  });
  await page.goto("/speed-monitor");
  await page
    .getByRole("button", { name: "Start monitoring", exact: true })
    .click();
  await expect(
    page.getByText("Waiting for enough movement to estimate speed."),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Speed unavailable" }),
  ).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("test-speed")));
  await expect(
    page.getByRole("img", { name: "Speedometer at 36 km/h" }),
  ).toBeVisible();
  await page.clock.fastForward(17000);
  await expect(page.getByText(/Reading expired/)).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Speed unavailable" }),
  ).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("test-timeout")));
  await expect(page.getByText(/GPS timed out/)).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect(
    page.getByRole("button", { name: "Start monitoring", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("watch-cleared")),
  ).toBe("19");
});
