/**
 * Playwright E2E test: RevStack dashboard — invoice list and client health widgets.
 *
 * Flow:
 *   1. Seed a dedicated test user
 *   2. Log in via DOM form POST (same proven pattern as checkout-flow.spec.ts)
 *      with callbackUrl=/revstack so NextAuth redirects straight there
 *   3. Intercept /api/central-brain/revstack with mock invoice and health data
 *   4. Verify the invoice list widget renders (titles, rows, statuses, amounts)
 *   5. Verify the client health score widget renders (titles, scores, tiers, badges)
 *
 * Prerequisites:
 *   - Dev server running on localhost:3000
 *   - Database migrated (npx prisma db push)
 *   - Run: NODE_ENV=development npx next dev --port 3000
 */

import { test, expect, type Page, type Route } from "@playwright/test"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const BASE_URL = process.env.BASE_URL || "http://localhost:3000"
const TEST_EMAIL = "revstack-dashboard-test@example.com"
const TEST_PASSWORD = "RevStackPass789!"

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
      console.log("[Seed] Cleaned up existing test user")
    }

    const hash = await bcrypt.hash(TEST_PASSWORD, 12)
    const now = new Date()
    const user = await prisma.user.create({
      data: {
        name: "RevStack Dashboard Test",
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

async function dismissCookieConsent(page: Page) {
  const acceptButton = page.locator("button", { hasText: "Accept All Cookies" })
  if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptButton.click()
    await page.waitForTimeout(300)
  }
}

async function blockBackgroundRequests(page: Page) {
  await page.route("**/sw.js", (route) => route.abort())
  await page.route("**/api/notifications/stream", (route) => {
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: 'data: {"type":"connected"}\n\ndata: {"type":"close"}\n\n',
    })
  })
}

/**
 * Authenticate by DOM form POST to the NextAuth credentials callback.
 * Uses callbackUrl=/revstack so the post-login hard redirect lands straight
 * on the RevStack dashboard (no intermediate /dashboard hop).
 *
 * This is the exact same proven pattern used by checkout-flow.spec.ts and
 * dev-mode-checkout.spec.ts — it bypasses React strict mode / router issues.
 */
async function loginAsTestUser(page: Page) {
  await blockBackgroundRequests(page)

  await page.goto(`${BASE_URL}/login`, { waitUntil: "load" })

  const cookieConsent = page.locator("button", { hasText: "Accept All Cookies" })
  if (await cookieConsent.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cookieConsent.click()
    await page.waitForTimeout(500)
  }

  const { csrfToken } = await page.evaluate(() =>
    fetch("/api/auth/csrf").then((r) => r.json())
  )

  await page.evaluate(
    async ({ email, password, csrfToken }: { email: string; password: string; csrfToken: string }) => {
      const form = document.createElement("form")
      form.method = "POST"
      form.action = "/api/auth/callback/credentials"

      const addField = (name: string, value: string) => {
        const input = document.createElement("input")
        input.type = "hidden"
        input.name = name
        input.value = value
        form.appendChild(input)
      }

      addField("csrfToken", csrfToken)
      addField("email", email)
      addField("password", password)
      addField("callbackUrl", "/revstack")

      document.body.appendChild(form)
      form.submit()
    },
    { email: TEST_EMAIL, password: TEST_PASSWORD, csrfToken }
  )

  // Accept either /revstack (success) or /login (failure) so we get a clear
  // error instead of a 90s blind timeout when something goes wrong.
  await page.waitForURL(/revstack|login/, { timeout: 90000 })

  if (page.url().includes("/login")) {
    const errorMsg = page.locator("text=Invalid email or password")
    if (await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
      throw new Error("Login failed: invalid credentials for " + TEST_EMAIL)
    }
    throw new Error("Login failed: redirected back to /login after POST to credentials callback")
  }

  await page.waitForLoadState("networkidle").catch(() => {})
  await page.waitForTimeout(500)
}

function getMockRevStackData() {
  const now = new Date()
  const dueSoon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
  const dueLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const issued = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
  const paidAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()

  return {
    stats: {
      totalLeads: 42,
      qualifiedLeads: 18,
      activeClients: 12,
      monthlyRecurringRevenue: 8500,
      pendingFollowups: 5,
      conversionRate: 32,
      totalMessages: 124,
      hermesRunsToday: 7,
    },
    revenue: [
      { month: "Jan", revenue: 5000, newClients: 1 },
      { month: "Feb", revenue: 6200, newClients: 2 },
      { month: "Mar", revenue: 7100, newClients: 1 },
      { month: "Apr", revenue: 7800, newClients: 2 },
      { month: "May", revenue: 8200, newClients: 1 },
      { month: "Jun", revenue: 8500, newClients: 0 },
    ],
    pipeline: { new: 10, qualified: 18, disqualified: 8, converted: 6 },
    activity: [
      {
        id: "act-1",
        type: "followup_sent",
        description: "Follow-up sent to Acme Corp",
        entityType: "followup",
        createdAt: now.toISOString(),
      },
      {
        id: "act-2",
        type: "client_onboarded",
        description: "New client onboarded: Globex Inc",
        entityType: "client",
        createdAt: new Date(now.getTime() - 3600000).toISOString(),
      },
    ],
    runs: [
      {
        id: "run-1",
        taskType: "qualify_leads",
        status: "completed",
        output: "Processed 15 leads",
        leadsProcessed: 15,
        messagesQueued: null,
        createdAt: new Date(now.getTime() - 7200000).toISOString(),
        completedAt: new Date(now.getTime() - 7000000).toISOString(),
      },
    ],
    invoices: [
      {
        id: "inv-1",
        invoiceNumber: "INV-001",
        amountUsd: 2500,
        currency: "USD",
        status: "paid",
        dueDate: dueLater,
        issuedAt: issued,
        paidAt: paidAt,
        notes: null,
        client: { name: "Acme Corp", company: "Acme Industries" },
      },
      {
        id: "inv-2",
        invoiceNumber: "INV-002",
        amountUsd: 1800,
        currency: "USD",
        status: "sent",
        dueDate: dueSoon,
        issuedAt: issued,
        paidAt: null,
        notes: "Q2 retainer",
        client: { name: "Globex Inc", company: "Globex Ltd" },
      },
      {
        id: "inv-3",
        invoiceNumber: "INV-003",
        amountUsd: 1200,
        currency: "USD",
        status: "overdue",
        dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        issuedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        paidAt: null,
        notes: null,
        client: { name: "Initech", company: "Initech Corp" },
      },
    ],
    invoiceMetrics: {
      totalOutstanding: 3000,
      overdueCount: 1,
      paidThisMonth: 1,
      totalInvoices: 3,
    },
    clientHealth: {
      scoredClients: [
        {
          id: "client-1",
          name: "Acme Corp",
          company: "Acme Industries",
          status: "active",
          tier: "healthy",
          score: 88,
          retainerValue: 2500,
          factors: { revenue: 90, engagement: 85, compliance: 95, status: 90, tenure: 80 },
        },
        {
          id: "client-2",
          name: "Globex Inc",
          company: "Globex Ltd",
          status: "active",
          tier: "medium",
          score: 62,
          retainerValue: 1800,
          factors: { revenue: 70, engagement: 55, compliance: 60, status: 65, tenure: 60 },
        },
        {
          id: "client-3",
          name: "Initech",
          company: "Initech Corp",
          status: "active",
          tier: "high-risk",
          score: 34,
          retainerValue: 1200,
          factors: { revenue: 30, engagement: 25, compliance: 40, status: 35, tenure: 40 },
        },
      ],
      healthyCount: 1,
      mediumRiskCount: 1,
      highRiskCount: 1,
      totalScored: 3,
      averageScore: 61,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Setup / Teardown
// ═══════════════════════════════════════════════════════════════════════════

test.beforeAll(async () => {
  await seedTestUser()
})

test.afterEach(async ({ page }) => {
  await page.goto("about:blank").catch(() => {})
})

test.afterAll(async () => {
  await cleanupTestUser()
})

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

test.describe("RevStack Dashboard", () => {
  test("invoice list and client health widgets render correctly", async ({ page }) => {
    // ── Step 1: Log in (callbackUrl=/revstack → lands on /revstack) ───
    await loginAsTestUser(page)

    // Sanity check: we must already be on /revstack after login
    expect(page.url()).toContain("/revstack")

    // ── Step 2: Intercept the central-brain API with mock data ─────────
    const mockData = getMockRevStackData()

    await page.route("**/api/central-brain/revstack", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockData),
      })
    })

    await page.route("**/api/central-brain/revstack?*", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockData),
      })
    })

    // ── Step 3: Reload so the intercepts catch the page's data fetch ───
    await page.reload({ waitUntil: "load" })
    await dismissCookieConsent(page)

    // Wait for the dashboard content to appear
    await expect(page.locator("text=RevStack Dashboard")).toBeVisible({ timeout: 20000 })
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.waitForTimeout(500)

    // ── Step 4: Verify invoice list widget renders ──────────────────────
    await expect(page.locator("text=Recent Invoices")).toBeVisible()
    await expect(page.locator("text=Latest invoices from active retainers")).toBeVisible()

    // Verify metrics badges are present
    await expect(page.locator("text=$3,000 outstanding")).toBeVisible()
    await expect(page.locator("text=1 overdue")).toBeVisible()

    // Verify individual invoice rows
    await expect(page.locator("text=INV-001")).toBeVisible()
    await expect(page.locator("text=INV-002")).toBeVisible()
    await expect(page.locator("text=INV-003")).toBeVisible()

    // Verify invoice statuses
    await expect(page.locator("text=paid").first()).toBeVisible()
    await expect(page.locator("text=sent").first()).toBeVisible()
    await expect(page.locator("text=overdue").first()).toBeVisible()

    // Verify client names appear in invoice rows
    await expect(page.locator("text=Acme Corp").first()).toBeVisible()
    await expect(page.locator("text=Globex Inc").first()).toBeVisible()
    await expect(page.locator("text=Initech").first()).toBeVisible()

    // Verify amounts
    await expect(page.locator("text=$2,500.00")).toBeVisible()
    await expect(page.locator("text=$1,800.00")).toBeVisible()
    await expect(page.locator("text=$1,200.00")).toBeVisible()

    // ── Step 5: Verify client health score widget renders ───────────────
    await expect(page.locator("text=Client Health Scores")).toBeVisible()
    await expect(page.locator("text=3 active clients · Avg 61/100")).toBeVisible()

    // Verify health badges
    await expect(page.locator("text=1 healthy")).toBeVisible()
    await expect(page.locator("text=1 at risk")).toBeVisible()

    // Verify scored client entries
    await expect(page.locator("text=88").first()).toBeVisible()
    await expect(page.locator("text=62").first()).toBeVisible()
    await expect(page.locator("text=34").first()).toBeVisible()

    // Verify tier badges
    await expect(page.locator("text=healthy").first()).toBeVisible()
    await expect(page.locator("text=medium").first()).toBeVisible()
    await expect(page.locator("text=high-risk").first()).toBeVisible()

    // Verify retainer values are shown
    await expect(page.locator("text=$2,500.00/mo")).toBeVisible()
    await expect(page.locator("text=$1,800.00/mo")).toBeVisible()
    await expect(page.locator("text=$1,200.00/mo")).toBeVisible()

    // Verify factor legend is present
    await expect(page.locator("text=Revenue")).toBeVisible()
    await expect(page.locator("text=Engagement")).toBeVisible()
    await expect(page.locator("text=Compliance")).toBeVisible()
    await expect(page.locator("text=Status")).toBeVisible()
    await expect(page.locator("text=Tenure")).toBeVisible()
  })

  test("invoice and health widgets show empty state when no data", async ({ page }) => {
    // ── Step 1: Log in ──────────────────────────────────────────────────
    await loginAsTestUser(page)
    expect(page.url()).toContain("/revstack")

    // ── Step 2: Intercept with empty invoices and clientHealth ──────────
    const emptyData = {
      ...getMockRevStackData(),
      invoices: [],
      invoiceMetrics: { totalOutstanding: 0, overdueCount: 0, paidThisMonth: 0, totalInvoices: 0 },
      clientHealth: { scoredClients: [], healthyCount: 0, mediumRiskCount: 0, highRiskCount: 0, totalScored: 0, averageScore: 0 },
    }

    await page.route("**/api/central-brain/revstack", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyData),
      })
    })

    await page.route("**/api/central-brain/revstack?*", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyData),
      })
    })

    // ── Step 3: Reload so intercepts catch the data fetch ───────────────
    await page.reload({ waitUntil: "load" })
    await dismissCookieConsent(page)

    await expect(page.locator("text=RevStack Dashboard")).toBeVisible({ timeout: 20000 })
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.waitForTimeout(500)

    // ── Step 4: Verify empty state messages ─────────────────────────────
    await expect(
      page.locator("text=No invoices yet — run RevStack Operations to generate invoices from active retainers")
    ).toBeVisible()

    await expect(
      page.locator("text=No clients scored yet — clients need active status and data to generate health scores")
    ).toBeVisible()

    // Metrics badges should not be present when metrics are empty
    await expect(page.locator("text=$0 outstanding")).not.toBeVisible()
    await expect(page.locator("text=0 at risk")).not.toBeVisible()
  })
})
