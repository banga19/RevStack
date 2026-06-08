/**
 * Tests for the Flutterwave webhook route handler.
 *
 * Covers:
 *   - Signature verification (missing secret, mismatched, matching)
 *   - Invalid JSON payload
 *   - Missing/malformed event fields
 *   - Amount validation (mismatch -> 400 + marks payment FAILED)
 *   - Payment not found -> 404
 *   - Idempotency (already processed -> 200)
 *   - Successful charge -> payment SUCCESSFUL, user active, subscription created
 *   - Failed charge -> payment FAILED, no subscription
 *   - flutterwaveCustomerId saved when customer.id present
 *   - flutterwaveTxId set on payment update
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks -- use vi.hoisted for variables referenced in both factories and tests
// ---------------------------------------------------------------------------

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    payment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    subscription: {
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}))

// ── Rate limiter mock ─────────────────────────────────────────────────────

const { mockCheckRateLimit, mockRateLimitError } = vi.hoisted(() => {
  class MockRateLimitError extends Error {
    retryAfter: number
    constructor(retryAfter: number) {
      super("Too many requests")
      this.name = "RateLimitError"
      this.retryAfter = retryAfter
    }
  }

  return {
    mockCheckRateLimit: vi.fn().mockReturnValue(29),
    mockRateLimitError: MockRateLimitError,
  }
})

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: mockCheckRateLimit,
  RateLimitError: mockRateLimitError,
  ipFromRequest: vi.fn().mockReturnValue("127.0.0.1"),
}))

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { POST } from "./route"
import { NextRequest } from "next/server"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET = "test-webhook-secret-123"

function buildRequest(
  body: Record<string, any>,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest("http://localhost:3000/api/webhooks/flutterwave", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "verif-hash": WEBHOOK_SECRET,
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

function buildPayment(overrides: Record<string, any> = {}) {
  return {
    id: "pay-1",
    userId: "user-1",
    amount: 6500,
    currency: "KES",
    provider: "flutterwave",
    paymentMethod: "card",
    flutterwaveTxRef: "tx-ref-001",
    flutterwaveTxId: null,
    status: "PENDING",
    tier: "starter",
    plan: "monthly",
    metadata: JSON.stringify({
      phone: null,
      email: "test@example.com",
      initiatedAt: new Date().toISOString(),
    }),
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: "user-1", name: "Test User", email: "test@example.com" },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/webhooks/flutterwave", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("FLUTTERWAVE_WEBHOOK_SECRET", WEBHOOK_SECRET)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Signature verification
  // ─────────────────────────────────────────────────────────────────────────

  describe("signature verification", () => {
    it("returns 500 when webhook secret is not configured", async () => {
      vi.stubEnv("FLUTTERWAVE_WEBHOOK_SECRET", "")
      vi.stubEnv("FLW_WEBHOOK_HASH", "") // Clear fallback too

      const res = await POST(buildRequest({ event: "charge.completed", data: {} }))
      const body = await res.json()

      expect(res.status).toBe(500)
      expect(body.error).toBe("Missing webhook secret")
      expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled()
    })

    it("returns 401 when verif-hash header does not match", async () => {
      const res = await POST(
        buildRequest(
          { event: "charge.completed", data: {} },
          { "verif-hash": "wrong-secret" }
        )
      )
      const body = await res.json()

      expect(res.status).toBe(401)
      expect(body.error).toBe("Unauthorized")
      expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled()
    })

    it("returns 401 when verif-hash header is empty", async () => {
      const res = await POST(
        buildRequest(
          { event: "charge.completed", data: {} },
          { "verif-hash": "" }
        )
      )
      const body = await res.json()

      expect(res.status).toBe(401)
      expect(body.error).toBe("Unauthorized")
    })

    it("returns 401 when verif-hash header is missing entirely", async () => {
      const req = new NextRequest("http://localhost:3000/api/webhooks/flutterwave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "charge.completed", data: {} }),
      })

      const res = await POST(req)
      const body = await res.json()

      expect(res.status).toBe(401)
      expect(body.error).toBe("Unauthorized")
    })

    it("proceeds when signature matches", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null)

      const res = await POST(
        buildRequest({ event: "charge.completed", data: { tx_ref: "test" } })
      )
      const body = await res.json()

      // The signature passed -- now it fails on payment not found (expected)
      expect(res.status).toBe(404)
      expect(body.error).toBe("Payment not found")
      expect(mockPrisma.payment.findUnique).toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Payload parsing
  // ─────────────────────────────────────────────────────────────────────────

  describe("payload parsing", () => {
    it("returns 400 when payload is not valid JSON", async () => {
      const req = new NextRequest("http://localhost:3000/api/webhooks/flutterwave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "verif-hash": WEBHOOK_SECRET,
        },
        body: "this is not json",
      })

      const res = await POST(req)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe("Invalid payload")
    })

    it("handles non charge.completed events gracefully", async () => {
      const res = await POST(
        buildRequest({ event: "transfer.completed", data: { id: 789 } })
      )
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.received).toBe(true)
      expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled()
    })

    it("handles events with empty event type gracefully", async () => {
      const res = await POST(buildRequest({ event: "", data: {} }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.received).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Amount validation
  // ─────────────────────────────────────────────────────────────────────────

  describe("amount validation", () => {
    it("returns 400 and marks payment FAILED when amount does not match", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        buildPayment({ status: "PENDING" })
      )
      mockPrisma.payment.update.mockResolvedValue({} as any)

      const res = await POST(
        buildRequest({
          event: "charge.completed",
          data: {
            id: 123456,
            tx_ref: "tx-ref-001",
            status: "successful",
            amount: 9999, // Mismatches payment.amount (6500)
            currency: "KES",
          },
        })
      )
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe("Amount mismatch")

      // Payment was marked FAILED
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay-1" },
          data: expect.objectContaining({ status: "FAILED" }),
        })
      )

      // Should NOT activate subscription or create anything
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled()
    })

    it("skips amount validation when amount is not provided in webhook", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        buildPayment({ status: "PENDING" })
      )
      mockPrisma.payment.update.mockResolvedValue({} as any)
      mockPrisma.user.update.mockResolvedValue({} as any)
      mockPrisma.subscription.create.mockResolvedValue({} as any)

      const res = await POST(
        buildRequest({
          event: "charge.completed",
          data: {
            id: 123456,
            tx_ref: "tx-ref-001",
            status: "successful",
            // No amount field
          },
        })
      )

      expect(res.status).toBe(200)
      // Payment processed (amount check was skipped)
      expect(mockPrisma.payment.update).toHaveBeenCalled()
      expect(mockPrisma.user.update).toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Payment lookup
  // ─────────────────────────────────────────────────────────────────────────

  describe("payment lookup", () => {
    it("returns 400 when tx_ref is missing", async () => {
      const res = await POST(
        buildRequest({
          event: "charge.completed",
          data: { status: "successful" },
        })
      )
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe("Missing tx_ref")
    })

    it("returns 404 when payment is not found", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null)

      const res = await POST(
        buildRequest({
          event: "charge.completed",
          data: { tx_ref: "nonexistent-ref", status: "successful" },
        })
      )
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.error).toBe("Payment not found")
    })

    it("returns 200 with Already processed when payment is not PENDING (idempotency)", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        buildPayment({ status: "SUCCESSFUL" }) // Already processed
      )

      const res = await POST(
        buildRequest({
          event: "charge.completed",
          data: { tx_ref: "tx-ref-001", status: "successful" },
        })
      )
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.message).toBe("Already processed")

      // Should not update anything
      expect(mockPrisma.payment.update).not.toHaveBeenCalled()
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Successful charge
  // ─────────────────────────────────────────────────────────────────────────

  describe("successful charge processing", () => {
    const successData = {
      id: 123456,
      tx_ref: "tx-ref-001",
      status: "successful",
      amount: 6500,
      currency: "KES",
    }

    beforeEach(() => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        buildPayment({ status: "PENDING" })
      )
      mockPrisma.payment.update.mockResolvedValue({} as any)
      mockPrisma.user.update.mockResolvedValue({} as any)
      mockPrisma.subscription.create.mockResolvedValue({} as any)
    })

    it("updates payment to SUCCESSFUL and sets flutterwaveTxId", async () => {
      await POST(
        buildRequest({ event: "charge.completed", data: successData })
      )

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay-1" },
          data: expect.objectContaining({
            status: "SUCCESSFUL",
            flutterwaveTxId: 123456,
          }),
        })
      )
    })

    it("activates user subscription and clears trial dates", async () => {
      await POST(
        buildRequest({ event: "charge.completed", data: successData })
      )

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({
            subscriptionStatus: "active",
            subscriptionTier: "starter",
            subscriptionPlan: "monthly",
            trialStartsAt: null,
            trialEndsAt: null,
          }),
        })
      )
    })

    it("creates a subscription record with correct fields", async () => {
      await POST(
        buildRequest({ event: "charge.completed", data: successData })
      )

      expect(mockPrisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            tier: "starter",
            plan: "monthly",
            status: "ACTIVE",
            flutterwaveTxRef: "tx-ref-001",
            flutterwaveTxId: 123456,
            amount: 6500,
            currency: "KES",
          }),
        })
      )
    })

    it("saves flutterwaveCustomerId when customer.id is present", async () => {
      await POST(
        buildRequest({
          event: "charge.completed",
          data: {
            ...successData,
            customer: { id: 9999, email: "test@example.com" },
          },
        })
      )

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            flutterwaveCustomerId: "9999",
          }),
        })
      )
    })

    it("does not save flutterwaveCustomerId when customer.id is absent", async () => {
      await POST(
        buildRequest({
          event: "charge.completed",
          data: {
            ...successData,
            customer: { email: "test@example.com" }, // No id
          },
        })
      )

      const updateCall = mockPrisma.user.update.mock.calls[0][0]
      expect(updateCall.data.flutterwaveCustomerId).toBeUndefined()
    })

    it("handles uppercase tier names from payment record", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        buildPayment({ status: "PENDING", tier: "STARTER" })
      )

      await POST(
        buildRequest({ event: "charge.completed", data: successData })
      )

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subscriptionTier: "STARTER" }),
        })
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Failed charge
  // ─────────────────────────────────────────────────────────────────────────

  describe("failed charge handling", () => {
    it("marks payment as FAILED when charge status is failed", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        buildPayment({ status: "PENDING" })
      )
      mockPrisma.payment.update.mockResolvedValue({} as any)

      const res = await POST(
        buildRequest({
          event: "charge.completed",
          data: {
            id: 123456,
            tx_ref: "tx-ref-001",
            status: "failed",
            amount: 6500,
            currency: "KES",
          },
        })
      )
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.received).toBe(true)

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay-1" },
          data: expect.objectContaining({ status: "FAILED" }),
        })
      )

      // Should NOT create subscription or activate user
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled()
    })

    it("marks payment FAILED when status is cancelled (not successful)", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        buildPayment({ status: "PENDING" })
      )
      mockPrisma.payment.update.mockResolvedValue({} as any)

      await POST(
        buildRequest({
          event: "charge.completed",
          data: {
            id: 123456,
            tx_ref: "tx-ref-001",
            status: "cancelled",
            amount: 6500,
            currency: "KES",
          },
        })
      )

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "FAILED" }),
        })
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Edge cases
  // ─────────────────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("returns 404 with Payment not found when payment lookup fails", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null)

      const res = await POST(
        buildRequest({
          event: "charge.completed",
          data: { tx_ref: "missing-ref", status: "successful" },
        })
      )

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBe("Payment not found")
    })

    it("falls back to FLW_WEBHOOK_HASH env var when FLUTTERWAVE_WEBHOOK_SECRET is not set", async () => {
      vi.stubEnv("FLUTTERWAVE_WEBHOOK_SECRET", "")
      vi.stubEnv("FLW_WEBHOOK_HASH", "fallback-hash")

      mockPrisma.payment.findUnique.mockResolvedValue(null)

      const res = await POST(
        buildRequest(
          { event: "charge.completed", data: { tx_ref: "test" } },
          { "verif-hash": "fallback-hash" }
        )
      )

      // The fallback hash matched, so it proceeds to payment lookup
      expect(res.status).toBe(404)
      expect(mockPrisma.payment.findUnique).toHaveBeenCalled()
    })

    // ── Duplicate charge.completed with different transaction ID ────────

    it("returns Already processed when duplicate charge.completed has different transaction ID", async () => {
      // Payment already SUCCESSFUL with tx ID 100
      mockPrisma.payment.findUnique.mockResolvedValue(
        buildPayment({
          status: "SUCCESSFUL",
          flutterwaveTxId: 100,
        })
      )

      // Webhook arrives with same tx_ref but different transaction ID 200
      const res = await POST(
        buildRequest({
          event: "charge.completed",
          data: {
            id: 200,
            tx_ref: "tx-ref-001",
            status: "successful",
            amount: 6500,
            currency: "KES",
          },
        })
      )
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.message).toBe("Already processed")

      // Should NOT update anything — idempotency check fires first
      expect(mockPrisma.payment.update).not.toHaveBeenCalled()
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled()
    })

    // ── Null/undefined tier ─────────────────────────────────────────────

    it("defaults tier to starter and plan to monthly when payment tier and plan are null", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        buildPayment({
          status: "PENDING",
          tier: null,
          plan: null,
        })
      )
      mockPrisma.payment.update.mockResolvedValue({} as any)
      mockPrisma.user.update.mockResolvedValue({} as any)
      mockPrisma.subscription.create.mockResolvedValue({} as any)

      await POST(
        buildRequest({
          event: "charge.completed",
          data: {
            id: 654321,
            tx_ref: "tx-ref-001",
            status: "successful",
            amount: 6500,
            currency: "KES",
          },
        })
      )

      // User update should use defaults for tier and plan
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subscriptionTier: "starter",
            subscriptionPlan: "monthly",
          }),
        })
      )

      // Subscription create should use defaults for tier and plan
      expect(mockPrisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tier: "starter",
            plan: "monthly",
          }),
        })
      )
    })

    it("defaults tier to starter when only tier is null", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        buildPayment({
          status: "PENDING",
          tier: null,
          plan: "yearly", // plan is provided
        })
      )
      mockPrisma.payment.update.mockResolvedValue({} as any)
      mockPrisma.user.update.mockResolvedValue({} as any)
      mockPrisma.subscription.create.mockResolvedValue({} as any)

      await POST(
        buildRequest({
          event: "charge.completed",
          data: {
            id: 654322,
            tx_ref: "tx-ref-001",
            status: "successful",
            amount: 6500,
            currency: "KES",
          },
        })
      )

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subscriptionTier: "starter",
            subscriptionPlan: "yearly", // Preserved from payment
          }),
        })
      )
    })

    it("defaults plan to monthly when only plan is null", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        buildPayment({
          status: "PENDING",
          tier: "growth", // tier is provided
          plan: null,
        })
      )
      mockPrisma.payment.update.mockResolvedValue({} as any)
      mockPrisma.user.update.mockResolvedValue({} as any)
      mockPrisma.subscription.create.mockResolvedValue({} as any)

      await POST(
        buildRequest({
          event: "charge.completed",
          data: {
            id: 654323,
            tx_ref: "tx-ref-001",
            status: "successful",
            amount: 6500,
            currency: "KES",
          },
        })
      )

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subscriptionTier: "growth", // Preserved from payment
            subscriptionPlan: "monthly",
          }),
        })
      )
    })

    it("defaults tier to starter when tier is an empty string (falsy)", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(
        buildPayment({
          status: "PENDING",
          tier: "",
          plan: "monthly",
        })
      )
      mockPrisma.payment.update.mockResolvedValue({} as any)
      mockPrisma.user.update.mockResolvedValue({} as any)
      mockPrisma.subscription.create.mockResolvedValue({} as any)

      await POST(
        buildRequest({
          event: "charge.completed",
          data: {
            id: 654324,
            tx_ref: "tx-ref-001",
            status: "successful",
            amount: 6500,
            currency: "KES",
          },
        })
      )

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subscriptionTier: "starter",
            subscriptionPlan: "monthly",
          }),
        })
      )
    })

    // ── Rate limiting ───────────────────────────────────────────────────

    it("returns 429 when rate limit is exceeded", async () => {
      mockCheckRateLimit.mockImplementationOnce(() => {
        throw new mockRateLimitError(60)
      })

      const res = await POST(
        buildRequest({ event: "charge.completed", data: { tx_ref: "test" } })
      )
      const body = await res.json()

      expect(res.status).toBe(429)
      expect(body.error).toBe("Too many requests. Please slow down.")
      expect(body.retryAfter).toBe(60)
      expect(res.headers.get("Retry-After")).toBe("60")

      // Should not proceed to any business logic
      expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.payment.update).not.toHaveBeenCalled()
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled()
    })

    it("proceeds normally when rate limit is not exceeded", async () => {
      // Mock returns 29 (remaining) — no throw
      mockCheckRateLimit.mockReturnValue(29)
      mockPrisma.payment.findUnique.mockResolvedValue(
        buildPayment({ status: "PENDING" })
      )
      mockPrisma.payment.update.mockResolvedValue({} as any)
      mockPrisma.user.update.mockResolvedValue({} as any)
      mockPrisma.subscription.create.mockResolvedValue({} as any)

      const res = await POST(
        buildRequest({
          event: "charge.completed",
          data: {
            id: 123456,
            tx_ref: "tx-ref-001",
            status: "successful",
            amount: 6500,
            currency: "KES",
          },
        })
      )

      expect(res.status).toBe(200)
      expect(mockPrisma.payment.findUnique).toHaveBeenCalled()
      expect(mockPrisma.payment.update).toHaveBeenCalled()
      expect(mockPrisma.user.update).toHaveBeenCalled()
    })

    it("includes retryAfter in 429 response body and Retry-After header", async () => {
      mockCheckRateLimit.mockImplementationOnce(() => {
        throw new mockRateLimitError(15)
      })

      const res = await POST(
        buildRequest({ event: "charge.completed", data: {} })
      )
      const body = await res.json()

      expect(res.status).toBe(429)
      expect(body.retryAfter).toBe(15)
      expect(res.headers.get("Retry-After")).toBe("15")
    })
  })
})
