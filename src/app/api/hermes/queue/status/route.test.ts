/**
 * Hermes Queue Status API — Unit Tests
 *
 * Covers:
 *   1. Queue metrics (waiting, active, completed, failed, delayed counts)
 *   2. Recent jobs mapping
 *   3. HermesRun records with truncated previews
 *   4. Aggregates (byTaskType, byStatus, totalRuns)
 *   5. Limit parameter parsing and bounds
 *   6. WorkerRunning detection
 *   7. Degraded-data error handling (BullMQ failures)
 *   8. Degraded-data error handling (Prisma failures)
 *   9. Auth boundary (401, 403)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ============================================================
// Hoisted mocks — must be before any imports
// ============================================================

// Mock auth to return an admin session
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "admin-user-1", role: "admin", name: "Admin", email: "admin@test.com" },
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}))

// Mock ABAC — preserve real resources but override checkAccessFromSession
vi.mock("@/lib/abac", async () => {
  const actual = await vi.importActual<typeof import("@/lib/abac")>("@/lib/abac")
  return {
    ...actual,
    checkAccessFromSession: vi.fn().mockResolvedValue({
      session: { user: { id: "admin-user-1", role: "admin" } },
      decision: { allowed: true, reason: "Admin bypass", grants: ["admin:full"] },
    }),
  }
})

// ── Mock data fixtures ────────────────────────────────────
const now = new Date("2026-06-06T12:00:00Z")
const yesterday = new Date("2026-06-05T12:00:00Z")

const mockRuns = [
  {
    id: "run-1",
    taskType: "qualify_leads",
    status: "completed",
    leadsProcessed: 15,
    messagesQueued: 8,
    errorMessage: null,
    userId: "admin-user-1",
    createdAt: now,
    completedAt: now,
    input: JSON.stringify({ leadId: "clxx-1", companyName: "Acme Corp" }),
    output: JSON.stringify({ stage: "scored", score: 75 }),
  },
  {
    id: "run-2",
    taskType: "send_followups",
    status: "failed",
    leadsProcessed: 0,
    messagesQueued: 0,
    errorMessage: "WATI API rate limit exceeded",
    userId: "admin-user-1",
    createdAt: yesterday,
    completedAt: yesterday,
    input: JSON.stringify({ campaignId: "camp-1" }),
    output: null,
  },
]

const mockTypeAgg = [
  { taskType: "qualify_leads", _count: { id: 10 }, _max: { createdAt: now } },
  { taskType: "send_followups", _count: { id: 5 }, _max: { createdAt: yesterday } },
  { taskType: "custom", _count: { id: 2 }, _max: { createdAt: null } },
]

const mockStatusAgg = [
  { status: "completed", _count: { id: 14 } },
  { status: "failed", _count: { id: 2 } },
  { status: "running", _count: { id: 1 } },
]

const mockRecentJobs = [
  {
    id: "job-1",
    name: "sweep-leads",
    data: { allLeads: true },
    timestamp: 1717400000000,
    attemptsMade: 1,
  },
  {
    id: "job-2",
    name: "process-lead",
    data: { leadId: "clxx-lead-1" },
    timestamp: 1717390000000,
    attemptsMade: 0,
  },
]

// ── Mock functions (bare vi.fn with no persistent return values — set in beforeEach) ──
const mockGetWaitingCount = vi.hoisted(() => vi.fn())
const mockGetActiveCount = vi.hoisted(() => vi.fn())
const mockGetCompletedCount = vi.hoisted(() => vi.fn())
const mockGetFailedCount = vi.hoisted(() => vi.fn())
const mockGetDelayedCount = vi.hoisted(() => vi.fn())
const mockGetJobs = vi.hoisted(() => vi.fn())
const mockFindMany = vi.hoisted(() => vi.fn())
const mockTypeGroupBy = vi.hoisted(() => vi.fn())
const mockStatusGroupBy = vi.hoisted(() => vi.fn())
const mockCount = vi.hoisted(() => vi.fn())

// Plain async functions (not vi.fn) — not affected by clearAllMocks
const mockTypeGroupByFn = vi.hoisted(() => () => Promise.resolve(mockTypeAgg))
const mockStatusGroupByFn = vi.hoisted(() => () => Promise.resolve(mockStatusAgg))

vi.mock("@/lib/hermes/queue", () => ({
  hermesQueue: {
    getWaitingCount: mockGetWaitingCount,
    getActiveCount: mockGetActiveCount,
    getCompletedCount: mockGetCompletedCount,
    getFailedCount: mockGetFailedCount,
    getDelayedCount: mockGetDelayedCount,
    getJobs: mockGetJobs,
  },
  redis: null,
  worker: null,
}))

vi.mock("@/lib/db", () => ({
  prisma: {
    hermesRun: {
      findMany: mockFindMany,
      groupBy: vi.fn(({ by }: { by: string[] }) => {
        if (by[0] === "taskType") return mockTypeGroupByFn()
        if (by[0] === "status") return mockStatusGroupByFn()
        return []
      }),
      count: mockCount,
    },
  },
}))

// ============================================================
// Import the route handler
// ============================================================

import { GET } from "./route"

// ============================================================
// Test helpers
// ============================================================

function setupDefaultMocks() {
  mockGetWaitingCount.mockResolvedValue(12)
  mockGetActiveCount.mockResolvedValue(3)
  mockGetCompletedCount.mockResolvedValue(245)
  mockGetFailedCount.mockResolvedValue(8)
  mockGetDelayedCount.mockResolvedValue(0)
  mockGetJobs.mockResolvedValue(mockRecentJobs)
  mockFindMany.mockResolvedValue(mockRuns)
  mockTypeGroupBy.mockResolvedValue(mockTypeAgg)
  mockStatusGroupBy.mockResolvedValue(mockStatusAgg)
  mockCount.mockResolvedValue(17)
}

// ============================================================
// Tests
// ============================================================

describe("GET /api/hermes/queue/status", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  // ── Queue metrics ────────────────────────────────────────
  describe("queue metrics", () => {
    it("returns correct queue counts from BullMQ", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.queue).toMatchObject({
        name: "hermes-tasks",
        counts: {
          waiting: 12,
          active: 3,
          completed: 245,
          failed: 8,
          delayed: 0,
        },
        total: 268, // 12 + 3 + 245 + 8 + 0
      })
    })

    it("calls all BullMQ metric methods", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      await GET(req)

      expect(mockGetWaitingCount).toHaveBeenCalled()
      expect(mockGetActiveCount).toHaveBeenCalled()
      expect(mockGetCompletedCount).toHaveBeenCalled()
      expect(mockGetFailedCount).toHaveBeenCalled()
      expect(mockGetDelayedCount).toHaveBeenCalled()
      expect(mockGetJobs).toHaveBeenCalledWith(
        ["waiting", "active", "completed", "failed", "delayed"],
        0,
        10
      )
    })

    it("returns workerRunning=true in non-production env", async () => {
      vi.stubEnv("NODE_ENV", "development")

      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(data.queue.workerRunning).toBe(true)
      expect(data.queue.redisConnected).toBe(true)

      vi.unstubAllEnvs()
    })

    it("returns workerRunning=false in production without RUN_WORKER", async () => {
      vi.stubEnv("NODE_ENV", "production")

      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(data.queue.workerRunning).toBe(false)

      vi.unstubAllEnvs()
    })

    it("returns workerRunning=true in production with RUN_WORKER=true", async () => {
      vi.stubEnv("NODE_ENV", "production")
      vi.stubEnv("RUN_WORKER", "true")

      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(data.queue.workerRunning).toBe(true)

      vi.unstubAllEnvs()
    })

    it("reports redisConnected as true", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(data.queue.redisConnected).toBe(true)
    })
  })

  // ── Recent jobs ──────────────────────────────────────────
  describe("recent jobs", () => {
    it("maps recent jobs from BullMQ with expected fields", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(data.recentJobs).toHaveLength(2)
      expect(data.recentJobs[0]).toMatchObject({
        id: "job-1",
        name: "sweep-leads",
        data: { allLeads: true },
        status: "unknown",
        attemptsMade: 1,
      })
      expect(data.recentJobs[0].timestamp).toBeDefined()
    })
  })

  // ── HermesRun records ────────────────────────────────────
  describe("run records", () => {
    it("returns runs from Prisma with correct shape", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(data.runs).toHaveLength(2)
      expect(data.runs[0]).toMatchObject({
        id: "run-1",
        taskType: "qualify_leads",
        status: "completed",
        leadsProcessed: 15,
        messagesQueued: 8,
        errorMessage: null,
        userId: "admin-user-1",
      })
      expect(data.runs[0].createdAt).toBe(now.toISOString())
      expect(data.runs[0].completedAt).toBe(now.toISOString())
    })

    it("passes the limit query param to findMany", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status?limit=5")
      await GET(req)

      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    })

    it("defaults limit to 25 when no param provided", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      await GET(req)

      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        take: 25,
      })
    })

    it("clamps limit to 100 max", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status?limit=999")
      await GET(req)

      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    })

    it("clamps limit to 1 min", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status?limit=0")
      await GET(req)

      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        take: 1,
      })
    })

    it("handles non-numeric limit gracefully", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status?limit=abc")
      await GET(req)

      // parseInt(\"abc\") = NaN, NaN || 25 = 25
      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        take: 25,
      })
    })

    it("truncates long input previews to 120 chars", async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          ...mockRuns[0],
          input: "x".repeat(300),
          output: null,
        },
      ])

      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(data.runs[0].inputPreview).toBe("x".repeat(120) + "...")
    })

    it("truncates long output previews to 200 chars", async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          ...mockRuns[0],
          output: "y".repeat(500),
        },
      ])

      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(data.runs[0].outputPreview).toBe("y".repeat(200) + "...")
    })

    it("sets inputPreview to null when input is null", async () => {
      mockFindMany.mockResolvedValueOnce([
        { ...mockRuns[0], input: null, output: null },
      ])

      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(data.runs[0].inputPreview).toBeNull()
    })

    it("sets completedAt to null when run has not completed", async () => {
      mockFindMany.mockResolvedValueOnce([
        { ...mockRuns[0], completedAt: null, status: "running" },
      ])

      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(data.runs[0].completedAt).toBeNull()
      expect(data.runs[0].status).toBe("running")
    })
  })

  // ── Aggregates ───────────────────────────────────────────
  describe("aggregates", () => {
    it("returns byTaskType with count and lastRun", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(data.aggregates.byTaskType).toHaveLength(3)
      expect(data.aggregates.byTaskType[0]).toMatchObject({
        taskType: "qualify_leads",
        count: 10,
      })
      expect(data.aggregates.byTaskType[0].lastRun).toBe(now.toISOString())
    })

    it("returns null lastRun when _max.createdAt is null", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      const customEntry = data.aggregates.byTaskType.find(
        (t: any) => t.taskType === "custom"
      )
      expect(customEntry.lastRun).toBeNull()
    })

    it("returns byStatus with correct counts", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(data.aggregates.byStatus).toHaveLength(3)
      const completed = data.aggregates.byStatus.find(
        (s: any) => s.status === "completed"
      )
      expect(completed.count).toBe(14)
    })

    it("calls prisma.hermesRun.count() when there are runs", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      await GET(req)

      expect(mockCount).toHaveBeenCalled()
    })

    it("skips prisma.hermesRun.count() when there are no runs", async () => {
      mockFindMany.mockResolvedValueOnce([])

      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(data.aggregates.totalRuns).toBe(0)
      expect(mockCount).not.toHaveBeenCalled()
    })
  })

  // ── Error handling: degraded data ────────────────────────
  describe("degraded data on BullMQ failure", () => {
    it("returns 200 with degraded data when all BullMQ metrics fail", async () => {
      mockGetWaitingCount.mockRejectedValue(new Error("Redis timeout"))
      mockGetActiveCount.mockRejectedValue(new Error("Redis timeout"))
      mockGetCompletedCount.mockRejectedValue(new Error("Redis timeout"))
      mockGetFailedCount.mockRejectedValue(new Error("Redis timeout"))
      mockGetDelayedCount.mockRejectedValue(new Error("Redis timeout"))
      mockGetJobs.mockRejectedValue(new Error("Redis timeout"))

      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.queue.counts).toMatchObject({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      })
      expect(data.queue.total).toBe(0)
      expect(data.recentJobs).toEqual([])
      // Runs and aggregates from Prisma should still be present
      expect(data.runs.length).toBe(2)
      expect(data.aggregates.byTaskType.length).toBe(3)
    })
  })

  describe("degraded data on Prisma failure", () => {
    it("returns 200 with degraded data when Prisma query fails", async () => {
      mockFindMany.mockRejectedValue(new Error("Database connection lost"))

      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.queue.name).toBe("hermes-tasks")
      expect(data.queue.error).toBeDefined()
      expect(data.runs).toEqual([])
      expect(data.aggregates).toMatchObject({
        byTaskType: [],
        byStatus: [],
        totalRuns: 0,
      })
    })
  })

  // ── Auth boundary ────────────────────────────────────────
  describe("auth & ABAC", () => {
    it("returns 401 when not authenticated", async () => {
      const { checkAccessFromSession } = await import("@/lib/abac")
      vi.mocked(checkAccessFromSession).mockResolvedValueOnce({
        session: null,
        decision: { allowed: false, reason: "Not authenticated", grants: [] },
      })

      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Authentication required")
    })

    it("returns 403 when authenticated but not authorized", async () => {
      const { checkAccessFromSession } = await import("@/lib/abac")
      vi.mocked(checkAccessFromSession).mockResolvedValueOnce({
        session: { user: { id: "user-1", role: "user" } },
        decision: {
          allowed: false,
          reason: "Access denied to 'hermes-runs' for action 'admin'",
          grants: [],
        },
      })

      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe("access_denied")
    })

    it("returns 500 when middleware throws unexpectedly", async () => {
      const { checkAccessFromSession } = await import("@/lib/abac")
      vi.mocked(checkAccessFromSession).mockRejectedValueOnce(
        new Error("Unexpected auth error")
      )

      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })

  // ── Full response shape ──────────────────────────────────
  describe("full response shape", () => {
    it("includes all top-level fields on success", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/queue/status")
      const response = await GET(req)
      const data = await response.json()

      expect(data).toHaveProperty("queue")
      expect(data).toHaveProperty("recentJobs")
      expect(data).toHaveProperty("runs")
      expect(data).toHaveProperty("aggregates")

      // queue sub-fields
      expect(data.queue).toHaveProperty("name")
      expect(data.queue).toHaveProperty("counts")
      expect(data.queue).toHaveProperty("total")
      expect(data.queue).toHaveProperty("workerRunning")
      expect(data.queue).toHaveProperty("redisConnected")

      // aggregates sub-fields
      expect(data.aggregates).toHaveProperty("byTaskType")
      expect(data.aggregates).toHaveProperty("byStatus")
      expect(data.aggregates).toHaveProperty("totalRuns")
    })
  })
})
