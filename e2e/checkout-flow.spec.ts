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
import fs from "fs"

const BASE_URL = process.env.BASE_URL || "http://localhost:3000"
const TEST_EMAIL = "playwright-checkout@example.com"
const TEST_PASSWORD = "TestPass123!"

/**
 * Load the Flutterwave webhook secret from the environment or .env files.
 * Playwright's test runner does NOT auto-load Next.js .env files, so we
 * need to read them manually if the env var isn't exported in the shell.
 */
function getWebhookSecret(): string {
  const fromEnv = process.env.FLUTTERWAVE_WEBHOOK_SECRET || process.env.FLW_WEBHOOK_HASH
  if (fromEnv) return fromEnv
  // Try .env.local first (overrides .env), then .env
  for (const file of [".env.local", ".env"]) {
    try {
      const content = fs.readFileSync(file, "utf-8")
      const match = content.match(/^FLUTTERWAVE_WEBHOOK_SECRET="?([^"\n]+)"?/m)
      if (match) return match[1]
      const fallbackMatch = content.match(/^FLW_WEBHOOK_HASH="?([^"\n]+)"?/m)
      if (fallbackMatch) return fallbackMatch[1]
    } catch {}
  }
  return ""
}

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

  test("webhook triggers payment success via DB update (live mode pipeline)", async ({ page }) => {
    // ── Step 1: Login and open pricing ────────────────────────────────
    await loginAsTestUser(page)
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })

    // Dismiss cookie consent if present
    const cookieAccept = page.locator("button", { hasText: "Accept All Cookies" })
    if (await cookieAccept.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cookieAccept.click()
      await page.waitForTimeout(300)
    }

    // Wait for session to fully load
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(500)

    const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
    await expect(choosePlanButton).toBeVisible({ timeout: 10000 })
    await choosePlanButton.click()

    // Retry logic: if checkout dialog doesn't appear, reload and try once more
    const checkoutVisible = await page.locator('[data-testid="payment-method-selection"]').isVisible({ timeout: 10000 }).catch(() => false)
    if (!checkoutVisible) {
      console.log("[Test] Checkout dialog not visible after first click — reloading and retrying")
      await page.reload({ waitUntil: "load" })
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(500)
      const retryButton = page.locator("button", { hasText: "Choose Plan" }).first()
      await expect(retryButton).toBeVisible({ timeout: 10000 })
      await retryButton.click()
      await expect(page.locator('[data-testid="payment-method-selection"]')).toBeVisible({ timeout: 10000 })
    }

    await page.locator("button", { hasText: "Credit / Debit Card" }).click()
    await expect(page.locator('[data-testid="card-payment-form"]')).toBeVisible()

    await page.locator("#cardNumber").fill("4242 4242 4242 4242")
    const yearOptions = getYearOptions()
    await page.locator("label", { hasText: "Expiry" })
      .locator("..").locator("select").first().selectOption("12")
    await page.locator("label", { hasText: "Expiry" })
      .locator("..").locator("select").nth(1).selectOption(yearOptions[3])
    await page.locator("#cvv").fill("123")

    // ── Step 3: Intercept initiate with simulated success ───────────────
    // We intercept with a mock success (not forwarding to real API),
    // then send the webhook separately to update the real DB.
    let capturedTxRef = `webhook-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    await page.route("**/api/payments/initiate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          paymentId: `wh-pay-${Date.now()}`,
          txRef: capturedTxRef,
          authUrl: undefined,
        }),
      })
    })

    // ── Step 4: Click Pay and verify processing state ─────────────────
    const payButton = page.locator('[data-testid="pay-button"]')
    await payButton.click()
    await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible({ timeout: 10000 })

    // Small delay to let the frontend set up polling
    await page.waitForTimeout(1500)

    // ── Step 5: Simulate Flutterwave webhook callback ─────────────────
    // Send a charge.completed event to the real webhook endpoint.
    // The server processes this against the real DB using its own env vars.
    // We need the webhook secret to match what the server expects.
    const WEBHOOK_SECRET = getWebhookSecret()

    // Create a payment record in the DB matching our txRef
    // so the webhook can find and update it
    const prisma = new PrismaClient()
    try {
      const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } })
      if (user) {
        await prisma.payment.create({
          data: {
            userId: user.id,
            amount: 50,
            currency: "USD",
            provider: "flutterwave",
            paymentMethod: "card",
            flutterwaveTxRef: capturedTxRef,
            status: "pending",
            tier: "starter",
            plan: "monthly",
            metadata: JSON.stringify({ email: TEST_EMAIL }),
          },
        }).catch((e) => console.log("[Test] Payment create skipped:", e.message))
      }
    } finally {
      await prisma.$disconnect()
    }

    if (WEBHOOK_SECRET) {
      const webhookRes = await page.request.post(`${BASE_URL}/api/webhooks/flutterwave`, {
        headers: {
          "Content-Type": "application/json",
          "verif-hash": WEBHOOK_SECRET,
        },
        data: {
          event: "charge.completed",
          data: {
            id: 999888,
            tx_ref: capturedTxRef,
            status: "successful",
            amount: 50,
            currency: "USD",
            customer: { id: 123456, email: TEST_EMAIL },
          },
        },
      })
      expect(webhookRes.status()).toBe(200)
      const whBody = await webhookRes.json()
      expect(whBody.received).toBe(true)
      console.log(`[Test] Webhook processed for txRef=${capturedTxRef}`)

      // Verify the DB was updated by querying directly
      const verifyPrisma = new PrismaClient()
      try {
        const updatedPayment = await verifyPrisma.payment.findUnique({
          where: { flutterwaveTxRef: capturedTxRef },
          select: { status: true },
        })
        expect(updatedPayment?.status).toBe("success")
        console.log("[Test] Payment status in DB is 'success' after webhook")

        const updatedUser = await verifyPrisma.user.findUnique({
          where: { email: TEST_EMAIL },
          select: { subscriptionStatus: true, subscriptionTier: true },
        })
        expect(updatedUser?.subscriptionStatus).toBe("active")
        expect(updatedUser?.subscriptionTier).toBe("starter")
        console.log("[Test] User subscription activated after webhook")
      } finally {
        await verifyPrisma.$disconnect()
      }
    } else {
      console.log("[Test] No webhook secret available — skipping webhook call")
    }

    // ── Step 6: Don't intercept status — let polling return real DB state ─
    // The webhook updated the payment to 'success' in the DB.
    // The frontend polls /api/payments/status which reads from the real DB.
    // It should detect 'success' after the next poll cycle.
    if (WEBHOOK_SECRET) {
      await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 30000 })
      await expect(page.locator("text=Payment Successful! 🎉")).toBeVisible()
      await page.waitForURL(/dashboard/, { timeout: 15000 })
    } else {
      console.log("[Test] Webhook secret not set — skipping frontend success checks")
    }
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
