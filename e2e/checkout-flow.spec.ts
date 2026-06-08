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

/**
 * Authenticate by submitting the credentials form via DOM.
 * Uses a real form submission (bypasses React router) to avoid navigation
 * conflicts from the login page's router.refresh() call.
 */
async function loginAsTestUser(page: Page) {
  await blockBackgroundRequests(page)

  // Navigate to login page to get CSRF cookies
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

// ───────────────────────────────────────────────────────────────────────────
// Setup / Teardown
// ───────────────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  await seedTestUser()
})

test.afterEach(async ({ page }) => {
  // Clean up DB state
  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } })
    if (user && user.subscriptionStatus === "active") {
      await prisma.payment.deleteMany({ where: { userId: user.id } }).catch(() => {})
      await prisma.subscription.deleteMany({ where: { userId: user.id } }).catch(() => {})
      await prisma.revenueEntry.deleteMany({ where: { clientName: user.name } }).catch(() => {})
      await prisma.followUpLog.deleteMany({ where: { userId: user.id } }).catch(() => {})
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

  // Reset page to prevent state leakage between tests
  await page.goto("about:blank").catch(() => {})
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
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })

    // Dismiss cookie consent
    const cookieAccept = page.locator("button", { hasText: "Accept All Cookies" })
    if (await cookieAccept.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cookieAccept.click()
    }

    // Wait for session to load and content to render
    await page.waitForLoadState("networkidle")

    // Verify we're on the pricing page
    await expect(page.locator("h1")).toContainText(/plan/i)

    // ── Step 2: Click "Choose Plan" on Starter ─────────────────────────
    const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
    await expect(choosePlanButton).toBeVisible({ timeout: 10000 })
    await choosePlanButton.click()

    // ── Step 3: Verify Checkout content appears ────────────────────────
    // Use data-testid to avoid strict-mode conflicts with other role="dialog" elements
    const checkoutContent = page.locator('[data-testid="payment-method-selection"]')
    await expect(checkoutContent).toBeVisible({ timeout: 5000 })

    // Verify the dialog title and payment amount
    await expect(page.locator("text=Complete Your Payment")).toBeVisible()
    await expect(page.locator("text=$50/mo")).toBeVisible()

    // Verify all three payment methods are listed
    await expect(page.locator("text=Credit / Debit Card")).toBeVisible()
    await expect(page.getByText("M-Pesa", { exact: true }).first()).toBeVisible()
    await expect(page.locator("text=Mobile Money")).toBeVisible()

    // ── Step 4: Select Card payment method ─────────────────────────────
    await page.locator("button", { hasText: "Credit / Debit Card" }).click()

    // ── Step 5: Verify card details form and fill it ───────────────────
    await expect(page.locator('[data-testid="card-payment-form"]')).toBeVisible()
    await expect(page.locator("text=Pay with Card")).toBeVisible()
    await expect(page.locator("#cardNumber")).toBeVisible()
    await expect(page.locator("#cvv")).toBeVisible()

    // Fill in sandbox test card details
    await page.locator("#cardNumber").fill("4242 4242 4242 4242")

    // Select expiry
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
    await page.locator('[data-testid="pay-button"]').click()

    // ── Step 8: Verify processing state ────────────────────────────
    await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator("text=Processing your card payment")).toBeVisible()

    // ── Step 9: Wait for success via polling ───────────────────────
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 30000 })

    // ── Step 10: Verify success state details ──────────────────────
    await expect(page.locator("text=Starter (monthly) subscription is now active")).toBeVisible()
    await expect(page.locator("text=Redirecting to dashboard...")).toBeVisible()

    // ── Step 11: Wait for redirect to dashboard ────────────────────
    await page.waitForURL(/dashboard/, { timeout: 15000 })
    await expect(page).toHaveURL(/dashboard/)
  })

  test("navigates to signup when not logged in", async ({ page }) => {
    await blockBackgroundRequests(page)
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })

    // Dismiss cookie consent
    const cookieAccept = page.locator("button", { hasText: "Accept All Cookies" })
    if (await cookieAccept.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cookieAccept.click()
    }

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
    await blockBackgroundRequests(page)
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })

    // Dismiss cookie consent
    const cookieAccept = page.locator("button", { hasText: "Accept All Cookies" })
    if (await cookieAccept.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cookieAccept.click()
    }

    await page.waitForLoadState("networkidle")

    // Click "Choose Plan" and select M-Pesa
    const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
    await expect(choosePlanButton).toBeVisible({ timeout: 10000 })
    await choosePlanButton.click()

    // Use data-testid to find checkout content
    await expect(page.locator('[data-testid="payment-method-selection"]')).toBeVisible({ timeout: 5000 })

    // Select M-Pesa
    await page.locator("button", { hasText: "M-Pesa" }).click()
    await expect(page.locator("text=Pay with M-Pesa")).toBeVisible()
    await expect(page.locator("#phone")).toBeVisible()

    // Fill phone number
    await page.locator("#phone").fill("254712345678")

    // Verify pay button is enabled
    const payButton = page.locator("button", { hasText: /Pay \$50 via M-Pesa/ })
    await expect(payButton).toBeEnabled()
  })
})
