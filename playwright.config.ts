import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid DB conflicts from seeding
  reporter: "list",
  timeout: 120000,

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    launchOptions: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      // When PLAYWRIGHT_CHROME_BIN is set, use that custom Chrome path.
      // Otherwise, let Playwright auto-discover Chromium.
      ...(process.env.PLAYWRIGHT_CHROME_BIN
        ? { executablePath: process.env.PLAYWRIGHT_CHROME_BIN }
        : {}),
    }
  },

  // ── Optional: auto-start the dev server ──────────────────────────────
  // Run: `NODE_ENV=development npx next dev --port 3000`
  //
  // Note: NODE_ENV=development is REQUIRED for dev-mode auto-verification.
  // Without it, initiatePayment() won't fire the 3s setTimeout, and the
  // payment will never auto-complete, causing the checkout test to timeout.
  // webServer: {
  //   command: "NODE_ENV=development npx next dev --port 3000",
  //   url: "http://localhost:3000",
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
