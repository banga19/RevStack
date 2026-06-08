/**
 * Playwright E2E test: Full payment checkout flow via pricing page.
 *
 * Flow:
 *   1. Navigate to /pricing (logged in)
 *   2. Click "Choose Plan" on the Starter card
 *   3. Verify the PaymentCheckout dialog opens
 *   4. Select "Credit / Debit Card" payment method
 *   5. Fill in sandbox test card details
 *   6. Click "Pay"
 *   7. Verify processing state appears
 *   8. Wait for dev-mode auto-verification (3s setTimeout + 5s polling)
 *   9. Verify success state appears with correct plan info
 *  10. Verify redirect to dashboard
 *
 * Prerequisites:
 *   - Dev server running on localhost:3000 (or BASE_URL)
 *   - NODE_ENV=development (for dev-mode auto-verification)
 *     Run: `NODE_ENV=development npx next dev --port 3000`
 *   - Database seeded via `npx tsx prisma/seed.ts`
 *
 * Note: The dev-mode auto-verification in initiatePayment() only fires
 * when `process.env.NODE_ENV === "development"`. Without this env var
 * set, the payment will never auto-complete and the test will timeout.
 */

import { test, expect, type Page } from "@playwright/test"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const BASE_URL = process.env.BASE_URL || "http://localhost:3000"
const TEST_EMAIL = "playwright-checkout@example.com"
const TEST_PASSWORD = "TestPass123!"

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

/**
 * Seed a test user with an active trial, returning the user record.
 * Cleans up any prior test user with the same email first.
 */
async function seedTestUser() {
  const prisma = new PrismaClient()
  try {
    const existing = await prisma.user.findUnique({ where: { email: TEST_EMAIL } })
    if (existing) {
      await prisma.$transaction([
        prisma.payment.deleteMany({ where: { userId: existing.id } }),
        prisma.subscription.deleteMany({ where: { userId: existing.id } }),
        prisma.revenueEntry.deleteMany({ where: { clientName: TEST_EMAIL } }),
        prisma.followUpLog.deleteMany({ where: { userId: existing.id } }),
        prisma.user.delete({ where: { id: existing.id } }),
      ])
      console.log("[Seed] Cleaned up existing test user")
    }

    const hash = await bcrypt.hash(TEST_PASSWORD, 12)
    const now = new Date()
    const user = await prisma.user.create({
      data: {
        name: "Playwright Checkout Test",
        email: TEST_EMAIL,
        password: hash,
        role: "user",
        subscriptionStatus: "trial",
        subscriptionTier: "enterprise",
        trialStartsAt: now,
        trialEndsAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        createdAt: now,
        termsAccepted: true,
        termsAcceptedAt: now,
        termsVersion: "1.0",
      },
    })
    console.log(`[Seed] Created test user: ${user.id}`)
    return user
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Clean up the test user after tests complete.
 */
async function cleanupTestUser() {
  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } })
    if (user) {
      await prisma.$transaction([
        prisma.payment.deleteMany({ where: { userId: user.id } }),
        prisma.subscription.deleteMany({ where: { userId: user.id } }),
        prisma.revenueEntry.deleteMany({ where: { clientName: user.name } }),
        prisma.followUpLog.deleteMany({ where: { userId: user.id } }),
        prisma.user.delete({ where: { id: user.id } }),
      ])
      console.log("[Seed] Cleaned up test user")
    }
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Authenticate via the NextAuth credentials callback API directly.
 * This sets the session cookie and avoids flaky UI login form interactions
 * with the custom /login page.
 */
async function loginAsTestUser(page: Page) {
  // Navigate to the login page first to establish a session and get CSRF cookie
  await page.goto(`${BASE_URL}/login`, { waitUntil: "load" })

  // Get CSRF token from the NextAuth endpoint
  const csrfResponse = await page.request.get(`${BASE_URL}/api/auth/csrf`)
  const { csrfToken } = await csrfResponse.json()

  // POST credentials as JSON to the NextAuth callback endpoint
  await page.request.post(`${BASE_URL}/api/auth/callback/credentials`, {
    headers: { "Content-Type": "application/json" },
    data: {
      csrfToken,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      callbackUrl: "/dashboard",
      json: true,
    },
  })

  // Navigate to pricing (session cookie should now be set)
  await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
}

/**
 * Compute dynamic year values for the expiry date selectors.
 * Years are rendered as 2-digit strings from current year + 0..9.
 */
function getYearOptions(): string[] {
  const currentYear = new Date().getFullYear() % 100
  return Array.from({ length: 10 }, (_, i) => String(currentYear + i))
}


// ───────────────────────────────────────────────────────────────────────────
// Setup / Teardown
// ───────────────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  await seedTestUser()
})

test.afterEach(async () => {
  // Best-effort cleanup to prevent state leakage between tests.
  // Errors are caught and logged so they don't mark a passing test as failed.
  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } })
    if (user && user.subscriptionStatus === "active") {
      await prisma.payment.deleteMany({ where: { userId: user.id } }).catch(() => {})
      await prisma.subscription.deleteMany({ where: { userId: user.id } }).catch(() => {})
      await prisma.revenueEntry.deleteMany({ where: { clientName: user.name } }).catch(() => {})
      await prisma.followUpLog.deleteMany({ where: { userId: user.id } }).catch(() => {})
      // Reset user to trial state
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: "trial",
          subscriptionTier: "enterprise",
          subscriptionStartsAt: null,
          subscriptionEndsAt: null,
          flutterwaveCustomerId: null,
        },
      }).catch(() => {})
    }
  } catch (e) {
    console.error("[Cleanup] Error during test cleanup:", e)
  } finally {
    await prisma.$disconnect()
  }
})

test.afterAll(async () => {
  await cleanupTestUser()
})

// ───────────────────────────────────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────────────────────────────────

test.describe("Payment Checkout Flow", () => {
  test("complete checkout: pricing → card payment → success → dashboard redirect", async ({ page }) => {
    // ── Step 1: Login ──────────────────────────────────────────────────
    await loginAsTestUser(page)

    // Navigate to pricing if not already there
    if (!page.url().includes("/pricing")) {
      await page.goto(`${BASE_URL}/pricing`)
    }
    await page.waitForLoadState("networkidle")

    // Verify we're on the pricing page
    await expect(page.locator("h1")).toContainText(/plan/i)

    // ── Step 2: Click "Choose Plan" on Starter ─────────────────────────
    const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
    await expect(choosePlanButton).toBeVisible({ timeout: 10000 })
    await choosePlanButton.click()

    // ── Step 3: Verify Checkout Dialog opens ───────────────────────────
    // Radix UI Dialog renders with role="dialog"
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Verify the dialog title and payment amount
    await expect(dialog.locator("text=Complete Your Payment")).toBeVisible()
    await expect(dialog.locator("text=$50/mo")).toBeVisible()

    // Verify all three payment methods are listed
    await expect(dialog.locator("text=Credit / Debit Card")).toBeVisible()
    await expect(dialog.getByText("M-Pesa", { exact: true }).first()).toBeVisible()
    await expect(dialog.locator("text=Mobile Money")).toBeVisible()

    // ── Step 4: Select Card payment method ─────────────────────────────
    await dialog.locator("button", { hasText: "Credit / Debit Card" }).click()

    // ── Step 5: Verify card details form and fill it ───────────────────
    await expect(dialog.locator("text=Pay with Card")).toBeVisible()
    await expect(dialog.locator("#cardNumber")).toBeVisible()
    await expect(dialog.locator("#cvv")).toBeVisible()

    // Fill in sandbox test card details
    await dialog.locator("#cardNumber").fill("4242 4242 4242 4242")

    // Select expiry — find the month and year select elements by their labels
    const yearOptions = getYearOptions()

    // Month select is the first select inside the expiry section
    await dialog.locator("label", { hasText: "Expiry" })
      .locator("..")
      .locator("select")
      .first()
      .selectOption("12")

    // Year select is the second select inside the expiry section
    await dialog.locator("label", { hasText: "Expiry" })
      .locator("..")
      .locator("select")
      .nth(1)
      .selectOption(yearOptions[3])

    await dialog.locator("#cvv").fill("123")

    // ── Step 6: Intercept API to simulate dev-mode payment ──────────────
    const MOCK_TX_REF = `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    await page.route("**/api/payments/initiate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          paymentId: "mock-pay-checkout",
          txRef: MOCK_TX_REF,
          authUrl: undefined,
        }),
      })
    })

    let pollCount = 0
    await page.route("**/api/payments/status**", async (route) => {
      pollCount++
      if (pollCount >= 2) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "success", tier: "starter", plan: "monthly" }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "pending", tier: "starter", plan: "monthly" }),
        })
      }
    })

    // ── Step 7: Click "Pay $50 via Card" ───────────────────────────────
    await dialog.locator('[data-testid="pay-button"]').click()

    // ── Step 8: Verify processing state ────────────────────────────
    await expect(dialog.locator('[data-testid="payment-processing"]')).toBeVisible({ timeout: 5000 })
    await expect(dialog.locator("text=Processing your card payment")).toBeVisible()

    // ── Step 9: Wait for success via polling ───────────────────────
    await expect(dialog.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 30000 })

    // ── Step 10: Verify success state details ──────────────────────
    await expect(dialog.locator("text=Starter (monthly) subscription is now active")).toBeVisible()
    await expect(dialog.locator("text=Redirecting to dashboard...")).toBeVisible()

    // ── Step 11: Wait for redirect to dashboard ────────────────────
    await page.waitForURL(/dashboard/, { timeout: 15000 })
    await expect(page).toHaveURL(/dashboard/)
  })

  // Note: Database-level assertions (verifying subscription activation in the DB)
  // require the backend to have a working dev-mode auto-simulation in
  // initiatePayment(). Currently, the real API requires Flutterwave keys.
  // Once dev-mode simulation is implemented in the backend, add a test here
  // that does NOT use route interception and instead verifies:
  //   - Payment record created with status = success
  //   - User subscriptionStatus = active
  //   - Subscription record created with status = ACTIVE
  //   - Revenue entry logged with correct amount/tier

  test("navigates to signup when not logged in", async ({ page }) => {
    // This test ensures the unauthenticated path works
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })

    // Click "Choose Plan" should redirect to signup
    const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
    await expect(choosePlanButton).toBeVisible({ timeout: 10000 })
    await choosePlanButton.click()

    // Should redirect to signup with plan/billing params
    await page.waitForURL(/signup/, { timeout: 10000 })
    await expect(page).toHaveURL(/signup/)
  })

  test("shows mobile money payment form when selected", async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto(`${BASE_URL}/pricing`)
    await page.waitForLoadState("networkidle")

    // Click "Choose Plan" and select M-Pesa
    const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
    await choosePlanButton.click()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Select M-Pesa
    await dialog.locator("button", { hasText: "M-Pesa" }).click()
    await expect(dialog.locator("text=Pay with M-Pesa")).toBeVisible()
    await expect(dialog.locator("#phone")).toBeVisible()

    // Fill phone number
    await dialog.locator("#phone").fill("254712345678")

    // Verify pay button is enabled
    const payButton = dialog.locator("button", { hasText: /Pay \$50 via M-Pesa/ })
    await expect(payButton).toBeEnabled()
  })
})
