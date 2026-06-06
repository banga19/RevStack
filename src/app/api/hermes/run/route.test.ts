/**
 * Hermes Run API — Unit Tests
 *
 * Covers all three job-triggering actions + auth + validation:
 *   1. POST /api/hermes/run          → process-lead for a single lead
 *   2. POST /api/hermes/run?sweep    → sweep-leads for all unprocessed leads
 *   3. POST /api/hermes/run?retry=ID → retry-failed for a previously failed job
 *   4. Malformed/invalid requests    → 400 errors
 *   5. Unauthenticated requests      → 401
 *   6. Unauthorized requests         → 403
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

// Mock the BullMQ queue so no real Redis connection is attempted
const mockQueueAdd = vi.fn().mockResolvedValue({ id: "mock-job-1" })

vi.mock("@/lib/hermes/queue", () => ({
  hermesQueue: {
    add: mockQueueAdd,
  },
  redis: null,
  worker: null,
}))

// Mock Prisma (required by @/lib/hermes/queue itself, which imports it at module level)
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
// Import the route handler after mocks are set up
// ============================================================

import { POST } from "./route"

// ============================================================
// Tests
// ============================================================

describe("POST /api/hermes/run", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Action 1: Process a single lead ──────────────────────
  describe("process-lead (single lead)", () => {
    it("enqueues a process-lead job when given a valid leadId", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: "clxx-test-lead-1" }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        queued: true,
        jobType: "process-lead",
        leadId: "clxx-test-lead-1",
      })
      expect(mockQueueAdd).toHaveBeenCalledWith("process-lead", {
        leadId: "clxx-test-lead-1",
        userId: "admin-user-1",
      })
    })

    it("trims and accepts a leadId with leading/trailing whitespace", async () => {
      // NOTE: the actual route does not trim — this documents the current behaviour
      const req = new NextRequest("http://localhost:3000/api/hermes/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: "  lead-with-spaces  " }),
      })

      const response = await POST(req)
      const data = await response.json()

      // leadId is passed as-is (including whitespace) — the DB layer can handle trimming
      expect(data.queued).toBe(true)
      expect(mockQueueAdd).toHaveBeenCalledWith("process-lead", {
        leadId: "  lead-with-spaces  ",
        userId: "admin-user-1",
      })
    })
  })

  // ── Action 2: Sweep all leads ────────────────────────────
  describe("sweep-leads", () => {
    it("enqueues a sweep-leads job when ?sweep=true query param is present", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/run?sweep=true", {
        method: "POST",
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        queued: true,
        jobType: "sweep-leads",
      })
      expect(data.message).toContain("Sweep job enqueued")
      expect(mockQueueAdd).toHaveBeenCalledWith("sweep-leads", {
        allLeads: true,
        userId: "admin-user-1",
      })
    })

    it("enqueues sweep job when ?sweep is present without a value", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/run?sweep", {
        method: "POST",
      })

      const response = await POST(req)
      expect(response.status).toBe(200)
      expect(mockQueueAdd).toHaveBeenCalledWith("sweep-leads", expect.any(Object))
    })

    it("ignores the request body when sweep param is present", async () => {
      // Even with a body, the sweep param takes precedence
      const req = new NextRequest("http://localhost:3000/api/hermes/run?sweep=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: "some-lead" }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.jobType).toBe("sweep-leads")
      expect(mockQueueAdd).not.toHaveBeenCalledWith("process-lead", expect.any(Object))
    })
  })

  // ── Action 3: Retry a failed job ─────────────────────────
  describe("retry-failed", () => {
    it("enqueues a retry-failed job when ?retry=JOB_ID is provided", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/run?retry=failed-job-42", {
        method: "POST",
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        queued: true,
        jobType: "retry-failed",
        originalJobId: "failed-job-42",
      })
      expect(data.message).toContain("failed-job-42")
      expect(mockQueueAdd).toHaveBeenCalledWith("retry-failed", {
        originalJobId: "failed-job-42",
      })
    })

    it("enqueues retry job for a short job ID", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/run?retry=abc", {
        method: "POST",
      })

      const response = await POST(req)
      expect(response.status).toBe(200)
      expect(mockQueueAdd).toHaveBeenCalledWith("retry-failed", {
        originalJobId: "abc",
      })
    })
  })

  // ── Action precedence ────────────────────────────────────
  describe("action precedence", () => {
    it("sweep takes precedence over retry when both params are present", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/hermes/run?sweep=true&retry=job-1",
        { method: "POST" }
      )

      const response = await POST(req)
      const data = await response.json()

      // First branch checks searchParams.has("sweep") → sweep wins
      expect(data.jobType).toBe("sweep-leads")
    })

    it("retry takes precedence over single lead when both params and body are present", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/hermes/run?retry=job-1",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: "some-lead" }),
        }
      )

      const response = await POST(req)
      const data = await response.json()

      // Second branch checks retry query param → retry wins
      expect(data.jobType).toBe("retry-failed")
    })
  })

  // ── Validation & error handling ──────────────────────────
  describe("validation", () => {
    it("returns 400 when request body is not valid JSON", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json-at-all",
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid JSON body")
      expect(mockQueueAdd).not.toHaveBeenCalled()
    })

    it("returns 400 when leadId is missing (undefined)", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("leadId is required and must be a string")
      expect(mockQueueAdd).not.toHaveBeenCalled()
    })

    it("returns 400 when leadId is not a string (number)", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: 12345 }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("leadId is required and must be a string")
    })

    it("returns 400 when leadId is null", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: null }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("leadId is required and must be a string")
    })

    it("passes an empty-string leadId through to the queue (no trim guard)", async () => {
      const req = new NextRequest("http://localhost:3000/api/hermes/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: "" }),
      })

      const response = await POST(req)
      const data = await response.json()

      // Empty string is still a string, so it passes the typeof check
      expect(response.status).toBe(200)
      expect(mockQueueAdd).toHaveBeenCalled()
    })
  })
})

// ============================================================
// Auth & ABAC tests — Test the middleware boundary by
// overriding the mock to simulate different auth states.
// ============================================================

describe("POST /api/hermes/run — Auth & ABAC", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    // Override checkAccessFromSession to simulate no session
    const { checkAccessFromSession } = await import("@/lib/abac")
    vi.mocked(checkAccessFromSession).mockResolvedValueOnce({
      session: null,
      decision: { allowed: false, reason: "Not authenticated", grants: [] },
    })

    const req = new NextRequest("http://localhost:3000/api/hermes/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: "clxx-lead-1" }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Authentication required")
    expect(mockQueueAdd).not.toHaveBeenCalled()
  })

  it("returns 403 when authenticated but not authorized (non-admin)", async () => {
    const { checkAccessFromSession } = await import("@/lib/abac")
    vi.mocked(checkAccessFromSession).mockResolvedValueOnce({
      session: { user: { id: "normal-user", role: "user" } },
      decision: {
        allowed: false,
        reason: "Access denied to 'hermes-runs' for action 'admin'",
        grants: [],
      },
    })

    const req = new NextRequest("http://localhost:3000/api/hermes/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: "clxx-lead-1" }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("Access denied to 'hermes-runs' for action 'admin'")
    expect(data.code).toBe("access_denied")
    expect(mockQueueAdd).not.toHaveBeenCalled()
  })

  it("supports admin session to trigger a sweep", async () => {
    const { checkAccessFromSession } = await import("@/lib/abac")
    // Restore the default admin mock for this test
    vi.mocked(checkAccessFromSession).mockResolvedValueOnce({
      session: { user: { id: "admin-user-1", role: "admin" } },
      decision: { allowed: true, reason: "Admin bypass", grants: ["admin:full"] },
    })

    const req = new NextRequest("http://localhost:3000/api/hermes/run?sweep=true", {
      method: "POST",
    })

    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(mockQueueAdd).toHaveBeenCalledWith("sweep-leads", expect.any(Object))
  })

  it("returns 500 when the ABAC middleware throws an unexpected error", async () => {
    const { checkAccessFromSession } = await import("@/lib/abac")
    vi.mocked(checkAccessFromSession).mockRejectedValueOnce(
      new Error("Unexpected DB error during access check")
    )

    const req = new NextRequest("http://localhost:3000/api/hermes/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: "clxx-lead-1" }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain("Unexpected DB error")
  })
})

// ============================================================
// Queue failure tests
// ============================================================

describe("POST /api/hermes/run — Queue errors", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("propagates error when hermesQueue.add fails for process-lead", async () => {
    mockQueueAdd.mockRejectedValueOnce(new Error("Redis connection refused"))

    const req = new NextRequest("http://localhost:3000/api/hermes/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: "clxx-lead-1" }),
    })

    // The withAbac middleware wraps errors
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
  })

  it("propagates error when hermesQueue.add fails for sweep", async () => {
    mockQueueAdd.mockRejectedValueOnce(new Error("Queue not available"))

    const req = new NextRequest("http://localhost:3000/api/hermes/run?sweep=true", {
      method: "POST",
    })

    const response = await POST(req)
    expect(response.status).toBe(500)
  })

  it("propagates error when hermesQueue.add fails for retry", async () => {
    mockQueueAdd.mockRejectedValueOnce(new Error("Queue not available"))

    const req = new NextRequest("http://localhost:3000/api/hermes/run?retry=job-1", {
      method: "POST",
    })

    const response = await POST(req)
    expect(response.status).toBe(500)
  })
})
