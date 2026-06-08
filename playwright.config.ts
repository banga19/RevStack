import { defineConfig, devices } from "@playwright/test"

// Path to manually-downloaded Chrome for Testing binary.
// Necessary because Playwright doesn't support Ubuntu 26.04 natively yet.
const CHROME_BIN = process.env.PLAYWRIGHT_CHROME_BIN || "/tmp/chrome-linux64/chrome-linux64/chrome"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid DB conflicts from seeding
  reporter: "list",
  timeout: 60000,

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: CHROME_BIN,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      env: {
        ...process.env,
        LD_LIBRARY_PATH: `/tmp/chrome-linux64/chrome-linux64:${process.env.LD_LIBRARY_PATH || ""}`,
      },
    },
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
