/**
 * Playwright E2E test: Pricing page → PaymentCheckout → success state.
 *
 * Simulates the full browser-level checkout flow. Authenticates via the
 * NextAuth credentials callback API directly (bypassing the UI login form
 * for reliability), then navigates to /pricing and verifies the checkout
 * dialog with dev-mode simulated payment flow.
 *
 * Prerequisites:
 *   - Dev server running on localhost:3000 (NODE_ENV=development)
 *   - Run: `NODE_ENV=development npx next dev --port 3000`
 *   - Database should have been migrated (npx prisma migrate dev)
 *
 * Run: npx playwright test e2e/pricing-to-checkout.spec.ts
 */

import { test, expect, type Page, type Route } from "@playwright/test"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const BASE_URL = process.env.BASE_URL || "http://localhost:3000"
const TEST_EMAIL = "playwright-pricing-flow@example.com"
const TEST_PASSWORD = "TestPass123!"

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

async function seedTestUser() {
  const prisma = new PrismaClient()
  try {
    const existing = await prisma.user.findUnique({ where: { email: TEST_EMAIL } })
    if (existing) {
      await prisma.$transaction([
        prisma.payment.deleteMany({ where: { userId: existing.id } }),
        prisma.subscription.deleteMany({ where: { userId: existing.id } }),
        prisma.revenueEntry.deleteMany({ where: { clientName: existing.name } }),
        prisma.followUpLog.deleteMany({ where: { userId: existing.id } }),
        prisma.user.delete({ where: { id: existing.id } }),
      ])
    }

    const hash = await bcrypt.hash(TEST_PASSWORD, 12)
    const now = new Date()
    const user = await prisma.user.create({
      data: {
        name: "Playwright Pricing Flow Test",
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
      console.log("[Cleanup] Removed test user")
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function dismissCookieConsent(page: Page) {
  const acceptButton = page.locator("button", { hasText: "Accept All Cookies" })
  if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptButton.click()
    await page.waitForTimeout(300)
  }
}

/**
 * Authenticate by POSTing credentials to NextAuth's callback endpoint.
 * This sets the session cookie and avoids flaky UI login form interactions.
 */
async function loginAsTestUser(page: Page) {
  // Navigate to the login page first to establish a session and get CSRF cookie
  await page.goto(`${BASE_URL}/login`, { waitUntil: "load" })
  await dismissCookieConsent(page)

  // Get CSRF token from the NextAuth endpoint
  const csrfResponse = await page.request.get(`${BASE_URL}/api/auth/csrf`)
  const { csrfToken } = await csrfResponse.json()

  // POST credentials as JSON to the NextAuth callback endpoint.
  // Using JSON content-type with { json: true } tells NextAuth to return
  // a JSON response instead of redirecting, matching what signIn() does
  // internally with redirect: false.
  const signInResponse = await page.request.post(`${BASE_URL}/api/auth/callback/credentials`, {
    headers: { "Content-Type": "application/json" },
    data: {
      csrfToken,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      callbackUrl: "/dashboard",
      json: true,
    },
  })

  const responseText = await signInResponse.text()
  console.log(`[Login] Status: ${signInResponse.status()}, Body: ${responseText.slice(0, 200)}`)

  // Navigate to pricing (session cookie should now be set)
  await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
  await dismissCookieConsent(page)
}

function getYearOptions(): string[] {
  const currentYear = new Date().getFullYear() % 100
  return Array.from({ length: 10 }, (_, i) => String(currentYear + i))
}

// ═══════════════════════════════════════════════════════════════════════════
// Setup / Teardown
// ═══════════════════════════════════════════════════════════════════════════

test.beforeAll(async () => {
  await seedTestUser()
})

test.afterAll(async () => {
  await cleanupTestUser()
})

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Pricing → PaymentCheckout → Success", () => {
  test("opens pricing page, clicks a plan, completes checkout via simulated payment", async ({ page }) => {
    await loginAsTestUser(page)

    // Wait for the page to be fully rendered and session to load.
    // The pricing page uses useSession() which loads asynchronously.
    const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
    await expect(choosePlanButton).toBeVisible({ timeout: 15000 })

    // Verify billing toggle
    const monthlyToggle = page.locator("button", { hasText: "Monthly" })
    const yearlyToggle = page.locator("button", { hasText: "Yearly" })
    await expect(monthlyToggle).toBeVisible()
    await expect(yearlyToggle).toBeVisible()

    // All three plan cards should be visible
    await expect(page.getByText("Starter", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Growth", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Enterprise", { exact: true }).first()).toBeVisible()

    // Pricing amounts displayed
    await expect(page.getByText("$50", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("$200", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("$500", { exact: true }).first()).toBeVisible()

    // Click "Choose Plan" on Starter
    await choosePlanButton.click()

    // Verify Checkout Dialog opens
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Dialog shows the correct plan info
    await expect(dialog.locator("text=Complete Your Payment")).toBeVisible()
    await expect(dialog.locator("text=$50/mo")).toBeVisible()

    // Verify all three payment methods are listed
    const methodSelection = dialog.locator('[data-testid="payment-method-selection"]')
    await expect(methodSelection).toBeVisible()
    await expect(dialog.locator("text=Credit / Debit Card")).toBeVisible()
    await expect(dialog.getByText("M-Pesa", { exact: true }).first()).toBeVisible()
    await expect(dialog.locator("text=Mobile Money")).toBeVisible()

    // Select card payment method
    await dialog.locator("button", { hasText: "Credit / Debit Card" }).click()

    // Card payment form should appear
    const cardForm = dialog.locator('[data-testid="card-payment-form"]')
    await expect(cardForm).toBeVisible()
    await expect(cardForm.locator("text=Pay with Card")).toBeVisible()
    await expect(cardForm.locator("text=$50 — Starter (monthly)")).toBeVisible()

    // Form fields should be present
    await expect(dialog.locator("#cardNumber")).toBeVisible()
    await expect(dialog.locator("#cvv")).toBeVisible()

    // Fill in sandbox test card details
    await dialog.locator("#cardNumber").fill("4242 4242 4242 4242")

    const yearOptions = getYearOptions()

    await dialog.locator("label", { hasText: "Expiry" })
      .locator("..")
      .locator("select")
      .first()
      .selectOption("12")

    await dialog.locator("label", { hasText: "Expiry" })
      .locator("..")
      .locator("select")
      .nth(1)
      .selectOption(yearOptions[3])

    await dialog.locator("#cvv").fill("123")

    // Pay button should be enabled now
    const payButton = dialog.locator('[data-testid="pay-button"]')
    await expect(payButton).toBeEnabled()
    await expect(payButton).toContainText("Pay $50 via Card")

    // Intercept network requests to simulate payment
    const MOCK_TX_REF = `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    await page.route("**/api/payments/initiate", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          paymentId: "mock-pay-1",
          txRef: MOCK_TX_REF,
          authUrl: undefined,
        }),
      })
    })

    let pollCount = 0

    await page.route("**/api/payments/status**", async (route: Route) => {
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

    // Click Pay button
    await payButton.click()

    // Verify processing state
    const processingState = dialog.locator('[data-testid="payment-processing"]')
    await expect(processingState).toBeVisible({ timeout: 5000 })
    await expect(processingState.locator("text=Processing Payment")).toBeVisible()
    await expect(processingState.locator("text=Processing your card payment")).toBeVisible()

    // Wait for success state via polling simulation
    const successState = dialog.locator('[data-testid="payment-success"]')
    await expect(successState).toBeVisible({ timeout: 30000 })

    await expect(successState.locator("text=Payment Successful! 🎉")).toBeVisible()
    await expect(
      successState.locator("text=Starter (monthly) subscription is now active")
    ).toBeVisible()
    await expect(successState.locator("text=Redirecting to dashboard...")).toBeVisible()

    // Wait for redirect to dashboard
    await page.waitForURL(/dashboard/, { timeout: 15000 })
    await expect(page).toHaveURL(/dashboard/)
  })

  test("navigates from pricing to signup when not authenticated", async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
    await dismissCookieConsent(page)

    const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
    await expect(choosePlanButton).toBeVisible({ timeout: 10000 })
    await choosePlanButton.click()

    await page.waitForURL(/signup/, { timeout: 10000 })
    await expect(page).toHaveURL(/signup/)
  })

  test("toggles between monthly and yearly billing on pricing page", async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
    await dismissCookieConsent(page)

    const yearlyToggle = page.locator("button", { hasText: "Yearly" })
    await yearlyToggle.click()

    await expect(page.getByText("$500", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("$2000", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("$5000", { exact: true }).first()).toBeVisible()

    const monthlyToggle = page.locator("button", { hasText: "Monthly" })
    await monthlyToggle.click()

    await expect(page.getByText("$50", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("$200", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("$500", { exact: true }).first()).toBeVisible()
  })

  test("selects M-Pesa payment method and fills phone number", async ({ page }) => {
    await loginAsTestUser(page)

    // Wait for Choose Plan to be visible (session loaded)
    const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
    await expect(choosePlanButton).toBeVisible({ timeout: 15000 })
    await choosePlanButton.click()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    await dialog.locator("button", { hasText: "M-Pesa" }).click()

    await expect(dialog.locator("text=Pay with M-Pesa")).toBeVisible()
    await expect(dialog.locator("#phone")).toBeVisible()

    await dialog.locator("#phone").fill("254712345678")

    const payButton = dialog.locator("button", { hasText: /Pay \$50 via M-Pesa/ })
    await expect(payButton).toBeEnabled()
  })

  test("shows error state when initiate payment fails", async ({ page }) => {
    await loginAsTestUser(page)

    const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
    await expect(choosePlanButton).toBeVisible({ timeout: 15000 })
    await choosePlanButton.click()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    await dialog.locator("button", { hasText: "Credit / Debit Card" }).click()

    await dialog.locator("#cardNumber").fill("4242 4242 4242 4242")
    const yearOptions = getYearOptions()
    await dialog.locator("label", { hasText: "Expiry" })
      .locator("..")
      .locator("select")
      .first()
      .selectOption("12")
    await dialog.locator("label", { hasText: "Expiry" })
      .locator("..")
      .locator("select")
      .nth(1)
      .selectOption(yearOptions[3])
    await dialog.locator("#cvv").fill("123")

    await page.route("**/api/payments/initiate", async (route: Route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Card declined. Please try a different card." }),
      })
    })

    const payButton = dialog.locator('[data-testid="pay-button"]')
    await payButton.click()

    const errorState = dialog.locator('[data-testid="payment-error"]')
    await expect(errorState).toBeVisible({ timeout: 10000 })
    await expect(errorState.locator("text=Payment Failed")).toBeVisible()
    await expect(errorState.locator("text=Card declined. Please try a different card.")).toBeVisible()

    const tryAgainButton = errorState.locator('[data-testid="back-button"]')
    await expect(tryAgainButton).toBeVisible()
  })
})
