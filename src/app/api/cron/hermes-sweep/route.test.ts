/**
 * Hermes Cron Sweep — Unit Tests
 *
 * Covers auth boundary and sweep modes:
 *   1. x-cron-secret header authentication
 *   2. Admin session authentication
 *   3. Dev mode fallback (cron-trigger-dev)
 *   4. Unauthorized requests → 401
 *   5. Default, quick, and full sweep modes
 *   6. Queue error handling
 *   7. Response shape consistency
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

// ============================================================
// Hoisted mocks — must be before any imports
// ============================================================

// Mock auth — default to unauthenticated (cron routes rely on header, not session)
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}))

// Mock the BullMQ queue so no real Redis connection is attempted
const mockQueueAdd = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "mock-sweep-job-1" }))

vi.mock("@/lib/hermes/queue", () => ({
  hermesQueue: {
    add: mockQueueAdd,
  },
  redis: null,
  worker: null,
}))

// Mock Prisma (required by @/lib/hermes/queue at module level)
vi.mock("@/lib/db", () => ({
  prisma: {
    lead: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    hermesRun: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// ============================================================
// Import the route handler after mocks
// ============================================================

import { GET } from "./route"

// ============================================================
// Tests
// ============================================================

describe("GET /api/cron/hermes-sweep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Auth: x-cron-secret header ──────────────────────────
  describe("auth via x-cron-secret header", () => {
    beforeEach(() => {
      vi.stubEnv("CRON_SECRET", "test-secret")
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it("enqueues sweep when x-cron-secret matches CRON_SECRET", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/hermes-sweep", {
        headers: { "x-cron-secret": "test-secret" },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.queued).toBe(true)
      expect(data.jobType).toBe("sweep-leads")
      expect(data.timestamp).toBeDefined()
      expect(mockQueueAdd).toHaveBeenCalledWith("sweep-leads", expect.objectContaining({
        allLeads: true,
        triggeredBy: "cron:hermes-sweep",
      }))
    })

    it("returns 401 when x-cron-secret does not match", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/hermes-sweep", {
        headers: { "x-cron-secret": "wrong-secret" },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(mockQueueAdd).not.toHaveBeenCalled()
    })

    it("returns 401 when no x-cron-secret header is provided", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/hermes-sweep")

      const response = await GET(req)
      expect(response.status).toBe(401)
      expect(mockQueueAdd).not.toHaveBeenCalled()
    })
  })

  // ── Auth: admin session ──────────────────────────────────
  describe("auth via admin session", () => {
    it("enqueues sweep when user is an admin", async () => {
      // Override auth mock to return admin session
      const { auth } = await import("@/lib/auth")
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin", name: "Admin", email: "admin@test.com" },
        expires: new Date(Date.now() + 3600_000).toISOString(),
      })

      const req = new NextRequest("http://localhost:3000/api/cron/hermes-sweep", {
        // No x-cron-secret header — auth relies on session
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockQueueAdd).toHaveBeenCalledWith("sweep-leads", expect.objectContaining({
        userId: "admin-1",
      }))
    })

    it("returns 401 when user is logged in but not admin", async () => {
      const { auth } = await import("@/lib/auth")
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user-1", role: "user", name: "User", email: "user@test.com" },
        expires: new Date(Date.now() + 3600_000).toISOString(),
      })

      const req = new NextRequest("http://localhost:3000/api/cron/hermes-sweep")

      const response = await GET(req)
      expect(response.status).toBe(401)
      expect(mockQueueAdd).not.toHaveBeenCalled()
    })
  })

  // ── Auth: dev mode fallback ──────────────────────────────
  describe("auth via dev mode fallback", () => {
    it("allows requests when CRON_SECRET is set to cron-trigger-dev", async () => {
      vi.stubEnv("CRON_SECRET", "cron-trigger-dev")

      const req = new NextRequest("http://localhost:3000/api/cron/hermes-sweep")
      // No x-cron-secret header, no admin session

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockQueueAdd).toHaveBeenCalled()

      vi.unstubAllEnvs()
    })
  })

  // ── Sweep modes ──────────────────────────────────────────
  describe("sweep modes", () => {
    beforeEach(() => {
      vi.stubEnv("CRON_SECRET", "test-secret")
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it("uses default mode when no query param is provided", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/hermes-sweep", {
        headers: { "x-cron-secret": "test-secret" },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data.mode).toBe("default")
      expect(mockQueueAdd).toHaveBeenCalledWith("sweep-leads", expect.objectContaining({
        mode: "default",
      }))
    })

    it("accepts mode=quick query param", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/hermes-sweep?mode=quick", {
        headers: { "x-cron-secret": "test-secret" },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data.mode).toBe("quick")
      expect(mockQueueAdd).toHaveBeenCalledWith("sweep-leads", expect.objectContaining({
        mode: "quick",
      }))
    })

    it("accepts mode=full query param", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/hermes-sweep?mode=full", {
        headers: { "x-cron-secret": "test-secret" },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data.mode).toBe("full")
      expect(mockQueueAdd).toHaveBeenCalledWith("sweep-leads", expect.objectContaining({
        mode: "full",
      }))
    })

    it("passes through unknown mode values", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/hermes-sweep?mode=custom-hourly", {
        headers: { "x-cron-secret": "test-secret" },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data.mode).toBe("custom-hourly")
      expect(mockQueueAdd).toHaveBeenCalledWith("sweep-leads", expect.objectContaining({
        mode: "custom-hourly",
      }))
    })
  })

  // ── Response shape consistency ───────────────────────────
  describe("response shape", () => {
    beforeEach(() => {
      vi.stubEnv("CRON_SECRET", "test-secret")
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it("includes all expected fields on success", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/hermes-sweep?mode=full", {
        headers: { "x-cron-secret": "test-secret" },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data).toMatchObject({
        success: true,
        mode: "full",
        queued: true,
        jobType: "sweep-leads",
        message: expect.stringContaining("sweep enqueued"),
        timestamp: expect.any(String),
      })
    })

    it("includes a meaningful message", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/hermes-sweep?mode=quick", {
        headers: { "x-cron-secret": "test-secret" },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data.message).toBe("Hermes quick sweep enqueued — all unprocessed leads will be processed.")
    })

    it("includes ISO timestamp", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/hermes-sweep", {
        headers: { "x-cron-secret": "test-secret" },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(() => new Date(data.timestamp)).not.toThrow()
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp)
    })
  })

  // ── Error handling ──────────────────────────────────────
  describe("error handling", () => {
    beforeEach(() => {
      vi.stubEnv("CRON_SECRET", "test-secret")
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it("returns 500 when hermesQueue.add fails", async () => {
      mockQueueAdd.mockRejectedValueOnce(new Error("Redis connection refused"))

      const req = new NextRequest("http://localhost:3000/api/cron/hermes-sweep", {
        headers: { "x-cron-secret": "test-secret" },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("Failed to trigger Hermes sweep")
      expect(data.details).toBe("Redis connection refused")
      expect(data.timestamp).toBeDefined()
    })
  })
})
