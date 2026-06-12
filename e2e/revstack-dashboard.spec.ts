/**
 * Playwright E2E test: RevStack dashboard — analytics, forecast, and client health widgets.
 *
 * Flow:
 *   1. Seed a dedicated test user
 *   2. Log in via DOM form POST with callbackUrl=/revstack
 *   3. Intercept /api/central-brain/revstack AND /api/revstack/analytics/forecast
 *      with mock data matching the current page's expected data structure
 *   4. Verify KPI cards, revenue forecast chart, pipeline funnel, revenue summary,
 *      client health distribution, scored client rows, and at-risk section
 *   5. Verify empty state when no data is available
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
 * on the RevStack dashboard.
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

  await page.waitForURL(/revstack|login/, { timeout: 90000 })

  if (page.url().includes("/login")) {
    throw new Error("Login failed: redirected back to /login after POST to credentials callback")
  }

  await page.waitForLoadState("networkidle").catch(() => {})
  await page.waitForTimeout(500)
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock Data — matches the shape of GET /api/revstack/analytics/forecast
// ═══════════════════════════════════════════════════════════════════════════

const NOW = new Date()

function getMonthLabel(offset: number): string {
  const d = new Date(NOW.getFullYear(), NOW.getMonth() + offset, 1)
  return d.toLocaleString("default", { month: "short", year: "2-digit" })
}

function getForecastMockData() {
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
    forecast: {
      monthly: (() => {
        const months = []
        for (let i = -6; i <= 2; i++) {
          months.push({
            month: `${NOW.getFullYear()}-${String(NOW.getMonth() + i + 1).padStart(2, "0")}`,
            label: getMonthLabel(i),
            actual: i < 0 ? 5000 + (i + 6) * 600 : 0,
            projected: i >= 0 ? 8600 + i * 200 : 0,
            newClients: i < 0 ? Math.abs(i % 2) : 1,
            invoices: i < 0 ? 3000 + (i + 6) * 400 : 0,
          })
        }
        return months
      })(),
      currentMrr: 8500,
      projectedMrr: 9000,
      totalInvoiced: 18500,
      paidInvoiced: 14000,
      outstanding: 4500,
    },
    pipeline: {
      totalLeads: 42,
      byStage: { new: 10, qualified: 18, disqualified: 8, converted: 6 },
      conversionRate: 32,
      avgConversionDays: 18,
      totalFollowups: 24,
      responseRate: 45,
      totalMessages: 124,
      activeClients: 12,
    },
    clientHealth: {
      scored: [
        {
          id: "client-1",
          name: "Acme Corp",
          company: "Acme Industries",
          score: 88,
          tier: "healthy",
          scoreFactors: { revenue: 30, engagement: 20, compliance: 18, status: 12, tenure: 8 },
          retainerValue: 2500,
          lastInvoiceDate: new Date(NOW.getTime() - 2 * 86400000).toISOString(),
        },
        {
          id: "client-2",
          name: "Globex Inc",
          company: "Globex Ltd",
          score: 62,
          tier: "medium",
          scoreFactors: { revenue: 15, engagement: 12, compliance: 15, status: 10, tenure: 10 },
          retainerValue: 1800,
          lastInvoiceDate: new Date(NOW.getTime() - 15 * 86400000).toISOString(),
        },
        {
          id: "client-3",
          name: "Initech",
          company: "Initech Corp",
          score: 34,
          tier: "at-risk",
          scoreFactors: { revenue: 8, engagement: 5, compliance: 8, status: 5, tenure: 8 },
          retainerValue: 1200,
          lastInvoiceDate: null,
        },
      ],
      healthyCount: 1,
      mediumCount: 1,
      riskCount: 1,
      totalScored: 3,
      averageScore: 61,
    },
  }
}

function getEmptyForecastData() {
  return {
    stats: {
      totalLeads: 0,
      qualifiedLeads: 0,
      activeClients: 0,
      monthlyRecurringRevenue: 0,
      pendingFollowups: 0,
      conversionRate: 0,
      totalMessages: 0,
      hermesRunsToday: 0,
    },
    forecast: {
      monthly: [],
      currentMrr: 0,
      projectedMrr: 0,
      totalInvoiced: 0,
      paidInvoiced: 0,
      outstanding: 0,
    },
    pipeline: {
      totalLeads: 0,
      byStage: { new: 0, qualified: 0, disqualified: 0, converted: 0 },
      conversionRate: 0,
      avgConversionDays: null,
      totalFollowups: 0,
      responseRate: 0,
      totalMessages: 0,
      activeClients: 0,
    },
    clientHealth: {
      scored: [],
      healthyCount: 0,
      mediumCount: 0,
      riskCount: 0,
      totalScored: 0,
      averageScore: 0,
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
  test("widgets render correctly with data", async ({ page }) => {
    // ── Step 1: Log in (callbackUrl=/revstack → lands on /revstack) ───
    await loginAsTestUser(page)
    expect(page.url()).toContain("/revstack")

    // ── Step 2: Intercept both API endpoints the page fetches ──────────
    const mockData = getForecastMockData()

    await page.route("**/api/central-brain/revstack**", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockData),
      })
    })

    await page.route("**/api/revstack/analytics/forecast**", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockData),
      })
    })

    // ── Step 3: Reload so intercepts catch the page's data fetch ──────
    await page.reload({ waitUntil: "load" })
    await dismissCookieConsent(page)

    // Wait for dashboard content to appear
    await expect(page.locator("h1", { hasText: "RevStack Dashboard" })).toBeVisible({ timeout: 20000 })
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.waitForTimeout(500)

    // ── Step 4: Verify KPI cards ──────────────────────────────────────
    await expect(page.locator("text=MRR")).toBeVisible()
    await expect(page.locator("text=$8,500")).toBeVisible()
    await expect(page.locator("text=Leads")).toBeVisible()
    await expect(page.locator("text=42")).toBeVisible()
    await expect(page.locator("text=Clients")).toBeVisible()
    await expect(page.locator("text=Pipeline Velocity")).toBeVisible()

    // KPI subtitles
    await expect(page.locator("text=1 healthy · 1 at risk").first()).toBeVisible()
    await expect(page.locator("text=Growing")).toBeVisible()

    // ── Step 5: Verify Revenue Forecast section ────────────────────────
    await expect(page.locator("text=Revenue Forecast")).toBeVisible()
    await expect(page.locator("text=6-month actuals + 3-month projection")).toBeVisible()
    // Projected badge
    await expect(page.locator("text=$9,000 projected")).toBeVisible()

    // ── Step 6: Verify Pipeline Funnel section ─────────────────────────
    await expect(page.locator("text=Pipeline Funnel")).toBeVisible()
    await expect(page.locator("text=Lead stages from new to converted")).toBeVisible()
    await expect(page.locator("text=32% conversion")).toBeVisible()

    // Stage values
    await expect(page.locator("text=18").first()).toBeVisible()
    await expect(page.locator("text=6").first()).toBeVisible()

    // Velocity metrics
    await expect(page.locator("text=18d").first()).toBeVisible()
    await expect(page.locator("text=45% response rate")).toBeVisible()
    await expect(page.locator("text=24 follow-ups")).toBeVisible()

    // ── Step 7: Verify Revenue Summary section ─────────────────────────
    await expect(page.locator("text=Revenue Summary")).toBeVisible()
    await expect(page.locator("text=Invoiced, collected, and outstanding")).toBeVisible()
    await expect(page.locator("text=Monthly Recurring Revenue")).toBeVisible()
    await expect(page.locator("text=Total Invoiced")).toBeVisible()
    await expect(page.locator("text=$18,500")).toBeVisible()
    await expect(page.locator("text=Collected")).toBeVisible()
    await expect(page.locator("text=$14,000")).toBeVisible()
    await expect(page.locator("text=Outstanding")).toBeVisible()
    await expect(page.locator("text=$4,500")).toBeVisible()

    // ── Step 8: Verify Client Health Distribution section ──────────────
    await expect(page.locator("text=Client Health Distribution")).toBeVisible()
    await expect(page.locator("text=3 clients · Avg 61/100")).toBeVisible()

    // Health badges
    await expect(page.locator("text=1 at risk").first()).toBeVisible()
    await expect(page.locator("text=1 healthy").first()).toBeVisible()

    // Legend labels in the donut
    await expect(page.locator("text=Healthy").first()).toBeVisible()
    await expect(page.locator("text=Medium").first()).toBeVisible()
    await expect(page.locator("text=At Risk").first()).toBeVisible()

    // ── Step 9: Verify At-Risk Clients section ─────────────────────────
    await expect(page.locator("text=At-Risk Clients")).toBeVisible()
    await expect(
      page.locator("text=These clients need attention")
    ).toBeVisible()
    await expect(page.locator("text=Initech").first()).toBeVisible()
    await expect(page.locator("text=Initech Corp").first()).toBeVisible()
    // Factor labels displayed for at-risk client
    await expect(page.locator("text=Revenue:").first()).toBeVisible()

    // ── Step 10: Verify All Client Health Scores section ───────────────
    await expect(page.locator("text=All Client Health Scores")).toBeVisible()

    // Client names in the scored list
    await expect(page.locator("text=Acme Corp").first()).toBeVisible()
    await expect(page.locator("text=Globex Inc").first()).toBeVisible()
    await expect(page.locator("text=Initech").first()).toBeVisible()

    // Score values (displayed as badge numbers)
    await expect(page.locator("text=88").first()).toBeVisible()
    await expect(page.locator("text=62").first()).toBeVisible()

    // Tier badges
    await expect(page.locator("text=healthy")).toBeVisible()
    await expect(page.locator("text=medium")).toBeVisible()
    await expect(page.locator("text=at-risk")).toBeVisible()

    // Retainer values shown
    await expect(page.locator("text=$2,500/mo")).toBeVisible()
    await expect(page.locator("text=$1,800/mo")).toBeVisible()
    await expect(page.locator("text=$1,200/mo")).toBeVisible()

    // Factor legend at the bottom
    await expect(page.locator("text=Revenue").last()).toBeVisible()
    await expect(page.locator("text=Engagement").last()).toBeVisible()
    await expect(page.locator("text=Compliance").last()).toBeVisible()
    await expect(page.locator("text=Status").last()).toBeVisible()
    await expect(page.locator("text=Tenure").last()).toBeVisible()
  })

  test("shows empty state when no data", async ({ page }) => {
    // ── Step 1: Log in ──────────────────────────────────────────────────
    await loginAsTestUser(page)
    expect(page.url()).toContain("/revstack")

    // ── Step 2: Intercept with empty data ───────────────────────────────
    const emptyData = getEmptyForecastData()

    await page.route("**/api/central-brain/revstack**", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyData),
      })
    })

    await page.route("**/api/revstack/analytics/forecast**", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyData),
      })
    })

    // ── Step 3: Reload so intercepts catch the data fetch ───────────────
    await page.reload({ waitUntil: "load" })
    await dismissCookieConsent(page)

    await page.waitForTimeout(2000)

    // ── Step 4: Verify empty state ──────────────────────────────────────
    await expect(page.locator("h1", { hasText: "RevStack Dashboard" })).toBeVisible({ timeout: 20000 })

    // Empty state messaging
    await expect(page.locator("text=No Data Yet")).toBeVisible()
    await expect(
      page.locator("text=Add leads, clients, and retainers to populate your dashboard")
    ).toBeVisible()

    // Action buttons in empty state
    await expect(page.locator("button", { hasText: "Add Leads" })).toBeVisible()
    await expect(page.locator("button", { hasText: "Refresh" })).toBeVisible()
  })
})
