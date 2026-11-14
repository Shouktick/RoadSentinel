import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  expect: { timeout: 15000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : [
        {
          command:
            process.platform === "win32"
              ? "..\\.venv\\Scripts\\python.exe -m uvicorn main:app --app-dir ../backend --host 127.0.0.1 --port 8000"
              : "../.venv/bin/python -m uvicorn main:app --app-dir ../backend --host 127.0.0.1 --port 8000",
          url: "http://127.0.0.1:8000/health",
          timeout: 120000,
          reuseExistingServer: !process.env.CI,
        },
        {
          command: "npm run start -- --hostname 127.0.0.1",
          url: "http://127.0.0.1:3000",
          timeout: 120000,
          reuseExistingServer: !process.env.CI,
          env: { NEXT_PUBLIC_API_URL: "http://127.0.0.1:8000" },
        },
      ],
});
