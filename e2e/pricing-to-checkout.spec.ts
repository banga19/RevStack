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

/**
 * Block service worker and SSE notification stream to prevent them
 * from interfering with E2E tests (SW causes registration errors,
 * SSE keeps networkidle from ever settling).
 */
async function blockBackgroundRequests(page: Page) {
  // Block service worker (causes registration errors in headless Chrome)
  await page.route('**/sw.js', route => route.abort())
  // Fulfill SSE stream with a close immediately to prevent client crash
  await page.route('**/api/notifications/stream', route => {
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"type":"connected"}\n\ndata: {"type":"close"}\n\n',
    })
  })
}

async function dismissCookieConsent(page: Page) {
  const acceptButton = page.locator("button", { hasText: "Accept All Cookies" })
  if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptButton.click()
    await page.waitForTimeout(300)
  }
}

/**
 * Authenticate by submitting the credentials form via DOM.
 * Uses a real form submission (bypasses React router) to avoid navigation
 * conflicts from the login page's router.refresh() call.
 */
async function loginAsTestUser(page: Page) {
  await blockBackgroundRequests(page)

  await page.goto(`${BASE_URL}/login`, { waitUntil: "load" })

  // Dismiss cookie consent if present
  const cookieConsent = page.locator("button", { hasText: "Accept All Cookies" })
  if (await cookieConsent.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cookieConsent.click()
    await page.waitForTimeout(500)
  }

  // Get CSRF token
  const { csrfToken } = await page.evaluate(() =>
    fetch('/api/auth/csrf').then(r => r.json())
  )

  // Submit credentials via DOM form submission (bypasses React router)
  await page.evaluate(async ({ email, password, csrfToken }: { email: string; password: string; csrfToken: string }) => {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/api/auth/callback/credentials'

    const addField = (name: string, value: string) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = value
      form.appendChild(input)
    }

    addField('csrfToken', csrfToken)
    addField('email', email)
    addField('password', password)
    addField('callbackUrl', '/dashboard')

    document.body.appendChild(form)
    form.submit()
  }, { email: TEST_EMAIL, password: TEST_PASSWORD, csrfToken })

  // Wait for redirect to dashboard (from the form submission)
  // Note: Next.js 16 dev mode compilation can take 30-60s on first load
  await page.waitForURL(/dashboard/, { timeout: 90000 })
  await page.waitForLoadState("networkidle").catch(() => {})
  await page.waitForTimeout(500)
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

test.afterEach(async ({ page }) => {
  // Reset page to prevent state leakage between tests
  await page.goto("about:blank").catch(() => {})
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
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
    await dismissCookieConsent(page)

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

    // Verify Checkout content opens
    await expect(page.locator('[data-testid="payment-method-selection"]')).toBeVisible({ timeout: 5000 })

    // Dialog shows the correct plan info
    await expect(page.locator("text=Complete Your Payment")).toBeVisible()
    await expect(page.getByText('$50/mo', { exact: true }).first()).toBeVisible()

    // Verify all three payment methods are listed
    await expect(page.locator("text=Credit / Debit Card")).toBeVisible()
    await expect(page.getByText("M-Pesa", { exact: true }).first()).toBeVisible()
    await expect(page.locator("text=Mobile Money")).toBeVisible()

    // Select card payment method
    await page.locator("button", { hasText: "Credit / Debit Card" }).click()

    // Card payment form should appear
    await expect(page.locator('[data-testid="card-payment-form"]')).toBeVisible()
    await expect(page.locator("text=Pay with Card")).toBeVisible()
    await expect(page.locator("text=$50 — Starter (monthly)")).toBeVisible()

    // Form fields should be present
    await expect(page.locator("#cardNumber")).toBeVisible()
    await expect(page.locator("#cvv")).toBeVisible()

    // Fill in sandbox test card details
    await page.locator("#cardNumber").fill("4242 4242 4242 4242")

    const yearOptions = getYearOptions()

    await page.locator("label", { hasText: "Expiry" })
      .locator("..")
      .locator("select")
      .first()
      .selectOption("12")

    await page.locator("label", { hasText: "Expiry" })
      .locator("..")
      .locator("select")
      .nth(1)
      .selectOption(yearOptions[3])

    await page.locator("#cvv").fill("123")

    // Pay button should be enabled now
    const payButton = page.locator('[data-testid="pay-button"]')
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
    await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator("text=Processing Payment")).toBeVisible()
    await expect(page.locator("text=Processing your card payment")).toBeVisible()

    // Wait for success state via polling simulation
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 30000 })

    await expect(page.locator("text=Payment Successful! 🎉")).toBeVisible()
    await expect(page.locator("text=Starter (monthly) subscription is now active")).toBeVisible()
    await expect(page.locator("text=Redirecting to dashboard...")).toBeVisible()

    // Wait for redirect to dashboard
    await page.waitForURL(/dashboard/, { timeout: 15000 })
    await expect(page).toHaveURL(/dashboard/)
  })

  test("navigates from pricing to signup when not authenticated", async ({ page }) => {
    await blockBackgroundRequests(page)
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
    await dismissCookieConsent(page)

    const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
    await expect(choosePlanButton).toBeVisible({ timeout: 10000 })
    await choosePlanButton.click()

    await page.waitForURL(/signup/, { timeout: 10000 })
    await expect(page).toHaveURL(/signup/)
  })

  test("toggles between monthly and yearly billing on pricing page", async ({ page }) => {
    await blockBackgroundRequests(page)
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
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
    await dismissCookieConsent(page)

    // Wait for Choose Plan to be visible (session loaded)
    const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
    await expect(choosePlanButton).toBeVisible({ timeout: 15000 })
    await choosePlanButton.click()

    await expect(page.locator('[data-testid="payment-method-selection"]')).toBeVisible({ timeout: 5000 })

    await page.locator("button", { hasText: "M-Pesa" }).click()

    await expect(page.locator("text=Pay with M-Pesa")).toBeVisible()
    await expect(page.locator("#phone")).toBeVisible()

    await page.locator("#phone").fill("254712345678")

    const payButton = page.locator("button", { hasText: /Pay \$50 via M-Pesa/ })
    await expect(payButton).toBeEnabled()
  })

  test("shows error state when initiate payment fails", async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
    await dismissCookieConsent(page)

    const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
    await expect(choosePlanButton).toBeVisible({ timeout: 15000 })
    await choosePlanButton.click()

    await expect(page.locator('[data-testid="payment-method-selection"]')).toBeVisible({ timeout: 5000 })

    await page.locator("button", { hasText: "Credit / Debit Card" }).click()

    await page.locator("#cardNumber").fill("4242 4242 4242 4242")
    const yearOptions = getYearOptions()
    await page.locator("label", { hasText: "Expiry" })
      .locator("..")
      .locator("select")
      .first()
      .selectOption("12")
    await page.locator("label", { hasText: "Expiry" })
      .locator("..")
      .locator("select")
      .nth(1)
      .selectOption(yearOptions[3])
    await page.locator("#cvv").fill("123")

    await page.route("**/api/payments/initiate", async (route: Route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Card declined. Please try a different card." }),
      })
    })

    const payButton = page.locator('[data-testid="pay-button"]')
    await payButton.click()

    const errorState = page.locator('[data-testid="payment-error"]')
    await expect(errorState).toBeVisible({ timeout: 10000 })
    await expect(errorState.locator("text=Payment Failed")).toBeVisible()
    await expect(errorState.locator("text=Card declined. Please try a different card.")).toBeVisible()

    const tryAgainButton = errorState.locator('[data-testid="back-button"]')
    await expect(tryAgainButton).toBeVisible()
  })
})
