/**
 * Playwright E2E test: Dev-mode simulated checkout flow.
 *
 * Opens the pricing page as an authenticated user, clicks "Choose Plan",
 * goes through the PaymentCheckout dialog (selects card, fills sandbox
 * details), simulates a successful payment via route interception,
 * and verifies the success state + dashboard redirect.
 *
 * Route interception stands in for the dev-mode auto-simulation that
 * would happen when Flutterwave keys are absent — it creates a payment
 * record, returns a txRef, and the polling endpoint reports "success"
 * after a brief delay.
 *
 * Prerequisites:
 *   - Dev server running on localhost:3000 (NODE_ENV=development)
 *   - Run: `NODE_ENV=development npx next dev --port 3000`
 *   - Database migrated (npx prisma db push)
 *
 * Run: npx playwright test e2e/dev-mode-checkout.spec.ts
 */

import { test, expect, type Page, type Route } from "@playwright/test"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const BASE_URL = process.env.BASE_URL || "http://localhost:3000"
const TEST_EMAIL = "devmode-checkout-test@example.com"
const TEST_PASSWORD = "DevModePass456!"

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
        name: "DevMode Checkout Test",
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

async function authenticateViaApi(page: Page) {
  // Navigate to login to establish a session and get CSRF cookie
  await page.goto(`${BASE_URL}/login`, { waitUntil: "load" })
  await dismissCookieConsent(page)

  // Get CSRF token
  const csrfResponse = await page.request.get(`${BASE_URL}/api/auth/csrf`)
  const { csrfToken } = await csrfResponse.json()

  // POST credentials to NextAuth callback
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

  // Navigate to pricing page (session cookie is now set)
  await page.goto(`${BASE_URL}/pricing`, { waitUntil: "load" })
  await dismissCookieConsent(page)
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

test.describe("Dev-mode simulated checkout flow", () => {
  test("opens pricing → selects card → simulates payment → sees success → redirects to dashboard", async ({ page }) => {
    // ── Step 1: Authenticate and load pricing page ────────────────────
    await authenticateViaApi(page)

    // Wait for session to load and "Choose Plan" to appear
    const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
    await expect(choosePlanButton).toBeVisible({ timeout: 15000 })

    // ── Step 2: Verify pricing page shows plan cards ──────────────────
    await expect(page.getByText("Starter", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Growth", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Enterprise", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("$50", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("$200", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("$500", { exact: true }).first()).toBeVisible()

    // ── Step 3: Click "Choose Plan" on Starter ───────────────────────
    await choosePlanButton.click()

    // ── Step 4: Verify the PaymentCheckout dialog opens ──────────────
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Dialog header shows plan info
    await expect(dialog.locator("text=Complete Your Payment")).toBeVisible()
    await expect(dialog.locator("text=$50/mo")).toBeVisible()

    // ── Step 5: Verify all three payment methods are listed ──────────
    const methodSelection = dialog.locator('[data-testid="payment-method-selection"]')
    await expect(methodSelection).toBeVisible()
    await expect(dialog.locator("text=Credit / Debit Card")).toBeVisible()
    await expect(dialog.getByText("M-Pesa", { exact: true }).first()).toBeVisible()
    await expect(dialog.locator("text=Mobile Money")).toBeVisible()

    // ── Step 6: Select card payment method ───────────────────────────
    await dialog.locator("button", { hasText: "Credit / Debit Card" }).click()

    // ── Step 7: Verify card payment form appears ─────────────────────
    const cardForm = dialog.locator('[data-testid="card-payment-form"]')
    await expect(cardForm).toBeVisible()
    await expect(cardForm.locator("text=Pay with Card")).toBeVisible()
    await expect(cardForm.locator("text=$50 — Starter (monthly)")).toBeVisible()
    await expect(dialog.locator("#cardNumber")).toBeVisible()
    await expect(dialog.locator("#cvv")).toBeVisible()

    // ── Step 8: Fill in sandbox test card details ────────────────────
    await dialog.locator("#cardNumber").fill("4242 4242 4242 4242")
    await dialog.locator("#cvv").fill("123")

    // Select expiry
    await dialog.locator("label", { hasText: "Expiry" })
      .locator("..")
      .locator("select")
      .first()
      .selectOption("12")

    const currentYear = new Date().getFullYear() % 100
    const yearOptions = Array.from({ length: 10 }, (_, i) => String(currentYear + i))
    await dialog.locator("label", { hasText: "Expiry" })
      .locator("..")
      .locator("select")
      .nth(1)
      .selectOption(yearOptions[3])

    // Verify Pay button is enabled
    const payButton = dialog.locator('[data-testid="pay-button"]')
    await expect(payButton).toBeEnabled()
    await expect(payButton).toContainText("Pay $50 via Card")

    // ── Step 9: Simulate dev-mode payment via route interception ─────
    // In dev mode (no Flutterwave keys), the backend would auto-simulate
    // by creating a payment record and returning success. We intercept
    // the API calls to simulate this behavior.

    const MOCK_TX_REF = `devmode-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    // Intercept the initiate endpoint to return a simulated success
    await page.route("**/api/payments/initiate", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          paymentId: `devmode-pay-${Date.now()}`,
          txRef: MOCK_TX_REF,
          authUrl: undefined, // No 3DS redirect in dev mode
        }),
      })
    })

    // Intercept the status polling endpoint: return "pending" once,
    // then "success" on subsequent calls (simulating the 3-second delay)
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

    // ── Step 10: Click Pay button to trigger the payment ─────────────
    await payButton.click()

    // ── Step 11: Verify processing state appears ─────────────────────
    const processingState = dialog.locator('[data-testid="payment-processing"]')
    await expect(processingState).toBeVisible({ timeout: 5000 })
    await expect(processingState.locator("text=Processing Payment")).toBeVisible()
    await expect(processingState.locator("text=Processing your card payment")).toBeVisible()

    // ── Step 12: Verify success state after polling resolves ─────────
    const successState = dialog.locator('[data-testid="payment-success"]')
    await expect(successState).toBeVisible({ timeout: 30000 })

    await expect(successState.locator("text=Payment Successful! 🎉")).toBeVisible()
    await expect(
      successState.locator("text=Starter (monthly) subscription is now active")
    ).toBeVisible()
    await expect(successState.locator("text=Redirecting to dashboard...")).toBeVisible()

    // ── Step 13: Wait for redirect to dashboard ──────────────────────
    await page.waitForURL(/dashboard/, { timeout: 15000 })
    await expect(page).toHaveURL(/dashboard/)
  })

  test("shows processing then success for M-Pesa payment method", async ({ page }) => {
    // ── Authenticate and open pricing ─────────────────────────────────
    await authenticateViaApi(page)

    const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
    await expect(choosePlanButton).toBeVisible({ timeout: 15000 })

    // Open dialog and select M-Pesa
    await choosePlanButton.click()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    await dialog.locator("button", { hasText: "M-Pesa" }).click()

    // Verify M-Pesa form
    await expect(dialog.locator("text=Pay with M-Pesa")).toBeVisible()
    await expect(dialog.locator("#phone")).toBeVisible()

    // Fill phone
    await dialog.locator("#phone").fill("254712345678")

    // Verify Pay button enabled
    const payButton = dialog.locator("button", { hasText: /Pay \$50 via M-Pesa/ })
    await expect(payButton).toBeEnabled()

    // Intercept API calls for M-Pesa simulation
    const MOCK_TX_REF = `devmode-mpesa-${Date.now()}`

    await page.route("**/api/payments/initiate", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          paymentId: `devmode-mpesa-pay-1`,
          txRef: MOCK_TX_REF,
          authUrl: undefined,
        }),
      })
    })

    // Polling: return success after one pending response
    let mpesaPollCount = 0
    await page.route("**/api/payments/status**", async (route: Route) => {
      mpesaPollCount++
      if (mpesaPollCount >= 2) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ status: "success", tier: "starter", plan: "monthly" }),
        })
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ status: "pending" }),
        })
      }
    })

    // Click Pay
    await payButton.click()

    // Verify processing with M-Pesa specific message
    const processingState = dialog.locator('[data-testid="payment-processing"]')
    await expect(processingState).toBeVisible({ timeout: 5000 })
    await expect(processingState.locator("text=M-Pesa STK Push")).toBeVisible()

    // Verify success
    const successState = dialog.locator('[data-testid="payment-success"]')
    await expect(successState).toBeVisible({ timeout: 30000 })
    await expect(successState.locator("text=Payment Successful! 🎉")).toBeVisible()

    // Wait for dashboard redirect
    await page.waitForURL(/dashboard/, { timeout: 15000 })
  })

  test("shows error state when payment initiation fails", async ({ page }) => {
    await authenticateViaApi(page)

    const choosePlanButton = page.locator("button", { hasText: "Choose Plan" }).first()
    await expect(choosePlanButton).toBeVisible({ timeout: 15000 })
    await choosePlanButton.click()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Select card
    await dialog.locator("button", { hasText: "Credit / Debit Card" }).click()

    // Fill card details
    await dialog.locator("#cardNumber").fill("4242 4242 4242 4242")
    await dialog.locator("label", { hasText: "Expiry" })
      .locator("..")
      .locator("select")
      .first()
      .selectOption("12")
    const currentYear = new Date().getFullYear() % 100
    const yearOptions = Array.from({ length: 10 }, (_, i) => String(currentYear + i))
    await dialog.locator("label", { hasText: "Expiry" })
      .locator("..")
      .locator("select")
      .nth(1)
      .selectOption(yearOptions[3])
    await dialog.locator("#cvv").fill("123")

    // Intercept initiate endpoint to return a failure (simulating declined card)
    await page.route("**/api/payments/initiate", async (route: Route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Card declined. Please try a different card." }),
      })
    })

    // Click Pay
    const payButton = dialog.locator('[data-testid="pay-button"]')
    await payButton.click()

    // Verify error state
    const errorState = dialog.locator('[data-testid="payment-error"]')
    await expect(errorState).toBeVisible({ timeout: 10000 })
    await expect(errorState.locator("text=Payment Failed")).toBeVisible()
    await expect(errorState.locator("text=Card declined. Please try a different card.")).toBeVisible()

    // Verify Try Again button is present
    const tryAgainButton = errorState.locator('[data-testid="back-button"]')
    await expect(tryAgainButton).toBeVisible()
    await expect(tryAgainButton).toContainText("Try Again")
  })
})
