/**
 * Server-side tests for the /api/subscribe newsletter endpoint.
 *
 * Covers:
 *   - Email validation (missing, non-string, missing @)
 *   - Duplicate detection (already subscribed)
 *   - CSRF handling (valid, invalid, missing cookie — allowed for landing page)
 *   - Successful subscription with default source
 *   - Google Sheets fire-and-forget
 *   - Error handling (DB failure)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks — use vi.hoisted so variables are available to vi.mock factories
// ---------------------------------------------------------------------------

const { mockValidateCsrf } = vi.hoisted(() => ({
  mockValidateCsrf: vi.fn().mockResolvedValue({ valid: true }),
}))

const { mockAppendSubscriberRow } = vi.hoisted(() => ({
  mockAppendSubscriberRow: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/db", () => ({
  prisma: {
    subscriber: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/google-sheets", () => ({
  appendSubscriberRow: mockAppendSubscriberRow,
}))

vi.mock("@/lib/csrf", () => ({
  validateCsrf: mockValidateCsrf,
}))

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db"
import { POST } from "./route"
import { NextRequest } from "next/server"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRequest(body: Record<string, any>, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/subscribe — newsletter signup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: CSRF is valid
    mockValidateCsrf.mockResolvedValue({ valid: true })
    mockAppendSubscriberRow.mockResolvedValue(undefined)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // CSRF handling
  // ─────────────────────────────────────────────────────────────────────────

  describe("CSRF validation", () => {
    it("allows request with valid CSRF token", async () => {
      mockValidateCsrf.mockResolvedValue({ valid: true })
      vi.mocked(prisma.subscriber.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.subscriber.create).mockResolvedValue({
        id: "sub-1",
        email: "test@example.com",
        source: "landing-page",
        createdAt: new Date(),
      } as any)

      const res = await POST(buildRequest({ email: "test@example.com" }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.message).toBe("Subscribed successfully")
      expect(prisma.subscriber.create).toHaveBeenCalled()
    })

    it("allows request when CSRF cookie is missing (anonymous landing page)", async () => {
      mockValidateCsrf.mockResolvedValue({ valid: false, reason: "Missing CSRF cookie" })
      vi.mocked(prisma.subscriber.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.subscriber.create).mockResolvedValue({
        id: "sub-2",
        email: "anon@example.com",
        source: "landing-page",
        createdAt: new Date(),
      } as any)

      const res = await POST(buildRequest({ email: "anon@example.com" }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.message).toBe("Subscribed successfully")
    })

    it("rejects request with invalid CSRF token", async () => {
      mockValidateCsrf.mockResolvedValue({ valid: false, reason: "CSRF token mismatch" })

      const res = await POST(buildRequest({ email: "test@example.com" }))
      const body = await res.json()

      expect(res.status).toBe(403)
      expect(body.error).toBe("Invalid or missing security token")
      // Should NOT attempt to create subscriber
      expect(prisma.subscriber.create).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Email validation
  // ─────────────────────────────────────────────────────────────────────────

  describe("email validation", () => {
    it("rejects missing email field", async () => {
      const res = await POST(buildRequest({}))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe("Valid email is required")
      expect(prisma.subscriber.create).not.toHaveBeenCalled()
    })

    it("rejects null email", async () => {
      const res = await POST(buildRequest({ email: null }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe("Valid email is required")
    })

    it("rejects non-string email", async () => {
      const res = await POST(buildRequest({ email: 12345 }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe("Valid email is required")
    })

    it("rejects email without @ symbol", async () => {
      const res = await POST(buildRequest({ email: "not-an-email" }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe("Valid email is required")
    })

    it("rejects empty string email", async () => {
      const res = await POST(buildRequest({ email: "" }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe("Valid email is required")
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Duplicate detection
  // ─────────────────────────────────────────────────────────────────────────

  describe("duplicate detection", () => {
    it("returns Already subscribed when email exists", async () => {
      vi.mocked(prisma.subscriber.findUnique).mockResolvedValue({
        id: "existing-1",
        email: "existing@example.com",
        source: "landing-page",
        createdAt: new Date(),
      } as any)

      const res = await POST(buildRequest({ email: "existing@example.com" }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.message).toBe("Already subscribed")
      // Should NOT attempt to create a duplicate
      expect(prisma.subscriber.create).not.toHaveBeenCalled()
    })

    it("queries subscriber by email for dedup check", async () => {
      vi.mocked(prisma.subscriber.findUnique).mockResolvedValue({
        id: "dup",
        email: "dup@example.com",
        source: "landing-page",
      } as any)

      await POST(buildRequest({ email: "dup@example.com" }))

      expect(prisma.subscriber.findUnique).toHaveBeenCalledWith({
        where: { email: "dup@example.com" },
      })
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Successful subscription
  // ─────────────────────────────────────────────────────────────────────────

  describe("successful subscription", () => {
    it("creates subscriber and returns success message", async () => {
      const createdAt = new Date("2026-06-07T12:00:00Z")
      vi.mocked(prisma.subscriber.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.subscriber.create).mockResolvedValue({
        id: "sub-new",
        email: "new@example.com",
        source: "landing-page",
        createdAt,
      } as any)

      const res = await POST(buildRequest({ email: "new@example.com" }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.message).toBe("Subscribed successfully")
      expect(prisma.subscriber.create).toHaveBeenCalledWith({
        data: { email: "new@example.com", source: "landing-page" },
      })
    })

    it("defaults source to landing-page when not provided", async () => {
      vi.mocked(prisma.subscriber.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.subscriber.create).mockResolvedValue({
        id: "sub-default",
        email: "default-src@example.com",
        source: "landing-page",
        createdAt: new Date(),
      } as any)

      await POST(buildRequest({ email: "default-src@example.com" }))

      expect(prisma.subscriber.create).toHaveBeenCalledWith({
        data: { email: "default-src@example.com", source: "landing-page" },
      })
    })

    it("uses custom source when provided", async () => {
      vi.mocked(prisma.subscriber.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.subscriber.create).mockResolvedValue({
        id: "sub-custom",
        email: "custom@example.com",
        source: "needs-assessment",
        createdAt: new Date(),
      } as any)

      await POST(buildRequest({ email: "custom@example.com", source: "needs-assessment" }))

      expect(prisma.subscriber.create).toHaveBeenCalledWith({
        data: { email: "custom@example.com", source: "needs-assessment" },
      })
    })

    it("fire-and-forgets Google Sheets append with correct data", async () => {
      const createdAt = new Date("2026-06-07T12:00:00Z")
      vi.mocked(prisma.subscriber.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.subscriber.create).mockResolvedValue({
        id: "sub-sheets",
        email: "sheets@example.com",
        source: "landing-page",
        createdAt,
      } as any)

      await POST(buildRequest({ email: "sheets@example.com" }))

      expect(mockAppendSubscriberRow).toHaveBeenCalledWith({
        email: "sheets@example.com",
        name: null,
        source: "landing-page",
        createdAt: createdAt.toISOString(),
      })
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Error handling
  // ─────────────────────────────────────────────────────────────────────────

  describe("error handling", () => {
    it("returns 500 when subscriber creation fails", async () => {
      vi.mocked(prisma.subscriber.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.subscriber.create).mockRejectedValue(new Error("DB error"))

      const res = await POST(buildRequest({ email: "error@example.com" }))
      const body = await res.json()

      expect(res.status).toBe(500)
      expect(body.error).toBe("Failed to subscribe. Please try again.")
    })
  })
})
