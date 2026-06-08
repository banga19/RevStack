/**
 * Tests for the /api/payments/initiate route handler.
 *
 * Covers:
 *   - Auth check (unauthenticated → 401)
 *   - Payment method validation (invalid → 400)
 *   - Tier validation (invalid → 400)
 *   - Plan validation (invalid → 400)
 *   - M-Pesa amount conversion (USD → KES)
 *   - Successful initiation → 200 with txRef
 *   - initiatePayment failure → 400 with error message
 *   - Admin role bypasses DB lookup for subscription status
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  prisma: {
    payment: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

const mockInitiatePayment = vi.hoisted(() => vi.fn())
vi.mock("@/lib/flutterwave", () => ({
  initiatePayment: mockInitiatePayment,
}))

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { POST } from "./route"
import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRequest(body: Record<string, any>): NextRequest {
  return new NextRequest("http://localhost:3000/api/payments/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function mockAuthenticated(overrides: Record<string, any> = {}) {
  vi.mocked(auth).mockResolvedValue({
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      role: "user",
      ...overrides,
    },
  } as any)
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    role: "user",
    subscriptionStatus: "trial",
    subscriptionTier: "enterprise",
  } as any)
}

function mockAdminAuthenticated() {
  vi.mocked(auth).mockResolvedValue({
    user: {
      id: "admin-1",
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
    },
  } as any)
}

function mockUnauthenticated() {
  vi.mocked(auth).mockResolvedValue(null)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/payments/initiate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NODE_ENV", "test")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // ── Auth checks ────────────────────────────────────────────────────────

  describe("auth checks", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockUnauthenticated()

      const res = await POST(buildRequest({
        paymentMethod: "mpesa",
        tier: "starter",
        plan: "monthly",
      }))
      const body = await res.json()

      expect(res.status).toBe(401)
      expect(body.error).toBe("Authentication required")
      expect(mockInitiatePayment).not.toHaveBeenCalled()
    })

    it("passes auth check for admin users (no DB lookup needed for sub status)", async () => {
      mockAdminAuthenticated()
      mockInitiatePayment.mockResolvedValue({
        success: true,
        txRef: "tx-admin-test",
        paymentId: "pay-admin-1",
      })

      const res = await POST(buildRequest({
        paymentMethod: "card",
        tier: "starter",
        plan: "monthly",
      }))

      expect(res.status).toBe(200)
      expect(prisma.user.findUnique).not.toHaveBeenCalled() // Admin skips DB lookup
    })
  })

  // ── Payment method validation ──────────────────────────────────────────

  describe("payment method validation", () => {
    it("returns 400 for missing payment method", async () => {
      mockAuthenticated()

      const res = await POST(buildRequest({
        tier: "starter",
        plan: "monthly",
      }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe("Invalid payment method")
      expect(mockInitiatePayment).not.toHaveBeenCalled()
    })

    it("returns 400 for invalid payment method", async () => {
      mockAuthenticated()

      const res = await POST(buildRequest({
        paymentMethod: "bitcoin",
        tier: "starter",
        plan: "monthly",
      }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe("Invalid payment method")
      expect(mockInitiatePayment).not.toHaveBeenCalled()
    })

    it("accepts mpesa as a valid payment method", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({ success: true, txRef: "tx-001" })

      const res = await POST(buildRequest({
        paymentMethod: "mpesa",
        tier: "starter",
        plan: "monthly",
      }))

      expect(res.status).toBe(200)
      expect(mockInitiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({ paymentMethod: "mpesa" })
      )
    })

    it("accepts mobile_money as a valid payment method", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({ success: true, txRef: "tx-002" })

      const res = await POST(buildRequest({
        paymentMethod: "mobile_money",
        tier: "starter",
        plan: "monthly",
      }))

      expect(res.status).toBe(200)
      expect(mockInitiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({ paymentMethod: "mobile_money" })
      )
    })

    it("accepts card as a valid payment method", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({ success: true, txRef: "tx-003" })

      const res = await POST(buildRequest({
        paymentMethod: "card",
        tier: "starter",
        plan: "monthly",
      }))

      expect(res.status).toBe(200)
      expect(mockInitiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({ paymentMethod: "card" })
      )
    })
  })

  // ── Tier validation ────────────────────────────────────────────────────

  describe("tier validation", () => {
    it("returns 400 for missing tier", async () => {
      mockAuthenticated()

      const res = await POST(buildRequest({
        paymentMethod: "card",
        plan: "monthly",
      }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe("Invalid tier")
    })

    it("returns 400 for invalid tier", async () => {
      mockAuthenticated()

      const res = await POST(buildRequest({
        paymentMethod: "card",
        tier: "platinum",
        plan: "monthly",
      }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe("Invalid tier")
    })

    it("accepts starter as a valid tier", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({ success: true, txRef: "tx-004" })

      const res = await POST(buildRequest({
        paymentMethod: "card",
        tier: "starter",
        plan: "monthly",
      }))

      expect(res.status).toBe(200)
    })

    it("accepts growth as a valid tier", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({ success: true, txRef: "tx-005" })

      const res = await POST(buildRequest({
        paymentMethod: "card",
        tier: "growth",
        plan: "monthly",
      }))

      expect(res.status).toBe(200)
    })

    it("accepts enterprise as a valid tier", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({ success: true, txRef: "tx-006" })

      const res = await POST(buildRequest({
        paymentMethod: "card",
        tier: "enterprise",
        plan: "monthly",
      }))

      expect(res.status).toBe(200)
    })
  })

  // ── Plan validation ────────────────────────────────────────────────────

  describe("plan validation", () => {
    it("returns 400 for missing plan", async () => {
      mockAuthenticated()

      const res = await POST(buildRequest({
        paymentMethod: "card",
        tier: "starter",
      }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe("Invalid plan")
    })

    it("returns 400 for invalid plan", async () => {
      mockAuthenticated()

      const res = await POST(buildRequest({
        paymentMethod: "card",
        tier: "starter",
        plan: "biannual",
      }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe("Invalid plan")
    })

    it("accepts monthly as a valid plan", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({ success: true, txRef: "tx-007" })

      const res = await POST(buildRequest({
        paymentMethod: "card",
        tier: "starter",
        plan: "monthly",
      }))

      expect(res.status).toBe(200)
    })

    it("accepts yearly as a valid plan", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({ success: true, txRef: "tx-008" })

      const res = await POST(buildRequest({
        paymentMethod: "card",
        tier: "starter",
        plan: "yearly",
      }))

      expect(res.status).toBe(200)
    })
  })

  // ── Payment amount ─────────────────────────────────────────────────────

  describe("amount calculation", () => {
    it("passes correct amount for M-Pesa (USD → KES conversion)", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({ success: true, txRef: "tx-mpesa" })

      await POST(buildRequest({
        paymentMethod: "mpesa",
        tier: "starter",
        plan: "monthly",
      }))

      // Starter monthly = $50, M-Pesa converts via Math.round(50 * 130) = 6500 KES
      expect(mockInitiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 6500,
          currency: "KES",
        })
      )
    })

    it("passes USD amount for card payments (no conversion)", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({ success: true, txRef: "tx-card" })

      await POST(buildRequest({
        paymentMethod: "card",
        tier: "starter",
        plan: "monthly",
      }))

      expect(mockInitiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50,
          currency: "USD",
        })
      )
    })

    it("passes growth tier pricing correctly", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({ success: true, txRef: "tx-growth" })

      await POST(buildRequest({
        paymentMethod: "card",
        tier: "growth",
        plan: "monthly",
      }))

      expect(mockInitiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 200 })
      )
    })

    it("passes enterprise yearly pricing correctly", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({ success: true, txRef: "tx-ent" })

      await POST(buildRequest({
        paymentMethod: "card",
        tier: "enterprise",
        plan: "yearly",
      }))

      expect(mockInitiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 5000 })
      )
    })
  })

  // ── Success / Error responses ──────────────────────────────────────────

  describe("response handling", () => {
    it("returns 200 with txRef and paymentId on success", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({
        success: true,
        txRef: "tx-success-001",
        paymentId: "pay-success-1",
        authUrl: undefined,
      })

      const res = await POST(buildRequest({
        paymentMethod: "card",
        tier: "starter",
        plan: "monthly",
      }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.txRef).toBe("tx-success-001")
      expect(body.paymentId).toBe("pay-success-1")
      expect(body.authUrl).toBeUndefined()
    })

    it("includes authUrl in response when provided by initiatePayment", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({
        success: true,
        txRef: "tx-3ds-001",
        paymentId: "pay-3ds-1",
        authUrl: "https://checkout.flutterwave.com/pay/3ds_abc123",
      })

      const res = await POST(buildRequest({
        paymentMethod: "card",
        tier: "starter",
        plan: "monthly",
        card: { number: "4187427415564246", cvv: "123", expiryMonth: "12", expiryYear: "28" },
      }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.authUrl).toBe("https://checkout.flutterwave.com/pay/3ds_abc123")
    })

    it("returns 400 with error message when initiatePayment fails", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({
        success: false,
        error: "Card declined. Please try a different card.",
      })

      const res = await POST(buildRequest({
        paymentMethod: "card",
        tier: "starter",
        plan: "monthly",
      }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe("Card declined. Please try a different card.")
    })

    it("returns a fallback error message when initiatePayment fails without a message", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({
        success: false,
        // No error message
      })

      const res = await POST(buildRequest({
        paymentMethod: "card",
        tier: "starter",
        plan: "monthly",
      }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe("Payment initiation failed")
    })
  })

  // ── Card details passthrough ────────────────────────────────────────────

  describe("card details passthrough", () => {
    it("passes card details and phone to initiatePayment", async () => {
      mockAuthenticated()
      mockInitiatePayment.mockResolvedValue({ success: true, txRef: "tx-card-details" })

      await POST(buildRequest({
        paymentMethod: "card",
        tier: "starter",
        plan: "monthly",
        phone: "254712345678",
        card: {
          number: "4187427415564246",
          cvv: "123",
          expiryMonth: "12",
          expiryYear: "28",
        },
      }))

      expect(mockInitiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "254712345678",
          card: expect.objectContaining({
            number: "4187427415564246",
            cvv: "123",
            expiryMonth: "12",
            expiryYear: "28",
          }),
        })
      )
    })
  })
})
