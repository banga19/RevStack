/**
 * Integration test: Flutterwave Payment → Webhook → Subscription Activation Pipeline
 *
 * Tests the core payment lifecycle:
 *   1. Initiate payment (dev mode auto-simulates)
 *   2. Simulate webhook via handleSuccessfulPayment
 *   3. Verify payment → user → subscription → revenue data flow
 *   4. Verify payment status polling
 *   5. Edge cases: duplicates, missing payments, failed payments
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock Prisma — all models touched by the payment pipeline
vi.mock("@/lib/db", () => ({
  prisma: {
    payment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    subscription: {
      create: vi.fn(),
    },
    revenueEntry: {
      create: vi.fn(),
    },
  },
}))

// ---------------------------------------------------------------------------
// Mock SDK for card payment tests
// We inject a mock via sdkOverride instead of mocking flutterwave-node-v3,
// because vi.mock doesn't intercept runtime require() calls inside function bodies.
// ---------------------------------------------------------------------------

const mockFlwChargeCard = vi.hoisted(() => vi.fn())
const mockMobileMoneyKenya = vi.hoisted(() => vi.fn())

// Flutterwave sandbox test card — Visa
const SANDBOX_VISA = "4187427415564246"

import { prisma } from "@/lib/db"
import { initiatePayment, checkPaymentStatus, handleWebhookEvent } from "@/lib/flutterwave"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock SDK object with controllable methods */
function mockSdk() {
  return {
    Charge: { card: mockFlwChargeCard },
    MobileMoney: { kenya: mockMobileMoneyKenya, mobile_money: vi.fn() },
    Transaction: { verify: vi.fn() },
  } as any
}

/**
 * Build a mock user that matches what prisma.payment.findUnique
 * returns when called with `include: { user: true }`.
 */
function buildPaymentWithUser(overrides: Record<string, any> = {}) {
  return {
    id: "pay-1",
    userId: "user-1",
    amount: 6500,
    currency: "KES",
    provider: "flutterwave",
    paymentMethod: "mpesa",
    flutterwaveTxRef: "tx-ref-001",
    flutterwaveTxId: null,
    status: "pending",
    tier: "starter",
    plan: "monthly",
    metadata: JSON.stringify({ phone: "254712345678", email: "test@example.com", initiatedAt: new Date().toISOString() }),
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Flutterwave Payment → Subscription Activation Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // initiatePayment — core flow (with mock SDK)
  // ─────────────────────────────────────────────────────────────────────────

  describe("initiatePayment", () => {
    it("creates a pending payment and returns txRef", async () => {
      mockMobileMoneyKenya.mockResolvedValue({ status: "success", data: { id: 123456 } })
      const createdPayment = buildPaymentWithUser({ flutterwaveTxRef: expect.stringMatching(/^mapato-/) })
      vi.mocked(prisma.payment.create).mockResolvedValue(createdPayment as any)

      const result = await initiatePayment({
        userId: "user-1",
        email: "test@example.com",
        amount: 6500,
        currency: "KES",
        paymentMethod: "mpesa",
        tier: "starter",
        plan: "monthly",
        phone: "254712345678",
      }, mockSdk())

      // Verify the payment record was created
      expect(prisma.payment.create).toHaveBeenCalledOnce()
      const createCall = vi.mocked(prisma.payment.create).mock.calls[0][0]
      expect(createCall.data.userId).toBe("user-1")
      expect(createCall.data.amount).toBe(6500)
      expect(createCall.data.paymentMethod).toBe("mpesa")
      expect(createCall.data.tier).toBe("starter")
      expect(createCall.data.status).toBe("pending")

      // Verify the result
      expect(result.success).toBe(true)
      expect(result.txRef).toBeDefined()
      expect(typeof result.txRef).toBe("string")
      expect(result.authUrl).toBeUndefined()
    })

    it("returns error when Flutterwave is not configured and no sdkOverride provided", async () => {
      // Explicitly clear env vars that may be set in .env or shell
      vi.stubEnv("FLUTTERWAVE_SECRET_KEY", "")
      vi.stubEnv("NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY", "")

      vi.mocked(prisma.payment.create).mockResolvedValue(buildPaymentWithUser() as any)

      const result = await initiatePayment({
        userId: "user-1",
        email: "test@example.com",
        amount: 6500,
        currency: "KES",
        paymentMethod: "mpesa",
        tier: "starter",
        plan: "monthly",
        phone: "254712345678",
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Flutterwave is not configured")
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // handleSuccessfulPayment — core pipeline logic
  // ─────────────────────────────────────────────────────────────────────────

  describe("handleSuccessfulPayment", () => {
    it("activates subscription and creates all related records", async () => {
      const payment = buildPaymentWithUser({
        flutterwaveTxRef: "tx-ref-001",
        flutterwaveTxId: null,
        status: "pending",
      })
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(payment as any)
      vi.mocked(prisma.payment.update).mockResolvedValue({ ...payment, status: "success" } as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.subscription.create).mockResolvedValue({} as any)
      vi.mocked(prisma.revenueEntry.create).mockResolvedValue({} as any)

      // Import and call handleSuccessfulPayment directly
      // (it's internal to flutterwave.ts — we call it through handleWebhookEvent)
      await handleWebhookEvent("charge.completed", {
        id: 123456,
        tx_ref: "tx-ref-001",
        status: "successful",
        amount: 6500,
        currency: "KES",
        customer: { id: 123456, email: "test@example.com" },
      })

      // Payment updated to success
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay-1" },
          data: expect.objectContaining({ status: "success" }),
        })
      )

      // User subscription activated
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({
            subscriptionStatus: "active",
            subscriptionTier: "starter",
            subscriptionPlan: "monthly",
          }),
        })
      )

      // flutterwaveCustomerId saved for tokenized recurring payments
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            flutterwaveCustomerId: "123456",
          }),
        })
      )

      // Subscription record created
      expect(prisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            tier: "starter",
            plan: "monthly",
            status: "ACTIVE",
            flutterwaveTxId: 123456,
          }),
        })
      )

      // Revenue entry logged
      expect(prisma.revenueEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 6500,
            type: "setup-fee",
            category: "starter",
          }),
        })
      )
    })

    it("skips processing when payment is already successful (idempotency)", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(
        buildPaymentWithUser({ status: "success" }) as any
      )

      await handleWebhookEvent("charge.completed", {
        id: 123456,
        tx_ref: "tx-ref-001",
        status: "successful",
        amount: 6500,
        currency: "KES",
        customer: { email: "test@example.com" },
      })

      // Should NOT update or create anything
      expect(prisma.payment.update).not.toHaveBeenCalled()
      expect(prisma.user.update).not.toHaveBeenCalled()
      expect(prisma.subscription.create).not.toHaveBeenCalled()
      expect(prisma.revenueEntry.create).not.toHaveBeenCalled()
    })

    it("returns gracefully when payment reference is not found", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(null)

      // Should not throw
      await expect(
        handleWebhookEvent("charge.completed", {
          id: 999999,
          tx_ref: "nonexistent-ref",
          status: "successful",
          amount: 6500,
          currency: "KES",
          customer: { email: "test@example.com" },
        })
      ).resolves.toBe(true)

      // Should not update or create anything
      expect(prisma.payment.update).not.toHaveBeenCalled()
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it("marks payment as failed when charge status is not successful", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(
        buildPaymentWithUser({ flutterwaveTxRef: "tx-ref-001", status: "pending" }) as any
      )
      vi.mocked(prisma.payment.update).mockResolvedValue({} as any)

      await handleWebhookEvent("charge.completed", {
        id: 123456,
        tx_ref: "tx-ref-001",
        status: "failed",
        amount: 6500,
        currency: "KES",
        customer: { email: "test@example.com" },
      })

      // Payment updated to failed
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { flutterwaveTxRef: "tx-ref-001" },
          data: expect.objectContaining({ status: "failed" }),
        })
      )

      // Should NOT activate subscription
      expect(prisma.user.update).not.toHaveBeenCalled()
      expect(prisma.subscription.create).not.toHaveBeenCalled()
    })

    it("processes event without amount validation (route handler does that)", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(
        buildPaymentWithUser({ flutterwaveTxRef: "tx-ref-001", status: "pending" }) as any
      )
      vi.mocked(prisma.payment.update).mockResolvedValue({} as any)

      // Call handleWebhookEvent — the webhook handler validates amount
      // Note: this calls handleWebhookEvent which calls handleSuccessfulPayment
      // which doesn't validate amount — the webhook handler in the route does.
      // So this test just verifies the event is processed.
      await handleWebhookEvent("charge.completed", {
        id: 123456,
        tx_ref: "tx-ref-001",
        status: "successful",
        amount: 9999, // Mismatched amount
        currency: "KES",
        customer: { email: "test@example.com" },
      })

      // handleWebhookEvent in lib/flutterwave.ts delegates to handleSuccessfulPayment
      // which doesn't validate amount. Amount validation happens in the
      // API route handler (webhooks/flutterwave/route.ts), not in the lib function.
      // So this should still process successfully since handleSuccessfulPayment
      // trusts the webhook.
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "success" }),
        })
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // checkPaymentStatus — frontend polling
  // ─────────────────────────────────────────────────────────────────────────

  describe("checkPaymentStatus", () => {
    it("returns success status for a completed payment", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        status: "success",
        tier: "starter",
        plan: "monthly",
      } as any)

      const result = await checkPaymentStatus("tx-ref-001")

      expect(result.status).toBe("success")
      expect(result.tier).toBe("starter")
      expect(result.plan).toBe("monthly")
    })

    it("returns pending status for an in-progress payment", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        status: "pending",
        tier: "starter",
        plan: "monthly",
      } as any)

      const result = await checkPaymentStatus("tx-ref-001")

      expect(result.status).toBe("pending")
    })

    it("returns not-found when no payment exists for txRef", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(null)

      const result = await checkPaymentStatus("nonexistent-ref")

      expect(result.status).toBe("not-found")
    })

    it("returns failed status for a failed payment", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        status: "failed",
        tier: null,
        plan: null,
      } as any)

      const result = await checkPaymentStatus("tx-ref-failed")

      expect(result.status).toBe("failed")
      expect(result.tier).toBeUndefined()
      expect(result.plan).toBeUndefined()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // handleWebhookEvent — webhook routing
  // ─────────────────────────────────────────────────────────────────────────

  describe("handleWebhookEvent — event routing", () => {
    it("processes charge.completed event", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(
        buildPaymentWithUser({ flutterwaveTxRef: "tx-ref-001", status: "pending" }) as any
      )
      vi.mocked(prisma.payment.update).mockResolvedValue({} as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.subscription.create).mockResolvedValue({} as any)
      vi.mocked(prisma.revenueEntry.create).mockResolvedValue({} as any)

      const result = await handleWebhookEvent("charge.completed", {
        id: 123456,
        tx_ref: "tx-ref-001",
        status: "successful",
        amount: 6500,
        currency: "KES",
      })

      expect(result).toBe(true)
      expect(prisma.payment.findUnique).toHaveBeenCalledWith({
        where: { flutterwaveTxRef: "tx-ref-001" },
        include: { user: true },
      })
    })

    it("handles transfer.completed events gracefully", async () => {
      const result = await handleWebhookEvent("transfer.completed", {
        id: 789,
        status: "successful",
      })

      expect(result).toBe(true)
      // Should not touch payment/subscription records
      expect(prisma.payment.findUnique).not.toHaveBeenCalled()
    })

    it("handles unknown event types gracefully", async () => {
      const result = await handleWebhookEvent("unknown.event.type", {
        id: 999,
      })

      expect(result).toBe(true)
      expect(prisma.payment.findUnique).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Card payment (production mode — mocked Flutterwave SDK)
  // Uses Flutterwave sandbox test card: Visa 4187 4274 1556 4246
  // ─────────────────────────────────────────────────────────────────────────

  describe("card payment — production mode with sandbox test card", () => {
    beforeEach(() => {
      // Override dev mode: set NODE_ENV to production + provide fake keys
      // so isDevMode() returns false and the SDK call path is exercised
      vi.stubEnv("NODE_ENV", "production")
      vi.stubEnv("FLUTTERWAVE_SECRET_KEY", "test-secret-key-production")
      vi.stubEnv("FLUTTERWAVE_PUBLIC_KEY", "test-public-key")
      vi.stubEnv("NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY", "test-pub-key")
      // Reset the SDK mock between tests
      mockFlwChargeCard.mockReset()
    })

    afterEach(() => {
      mockFlwChargeCard.mockReset()
    })

    /** Build a mock SDK object with a controllable Charge.card() */
    function mockSdk() {
      return {
        Charge: { card: mockFlwChargeCard },
        MobileMoney: { kenya: vi.fn(), mobile_money: vi.fn() },
        Transaction: { verify: vi.fn() },
      } as any
    }

    it("initiates a card payment with the sandbox test card details", async () => {
      // Arrange: SDK returns success (no 3DS redirect, immediate success)
      mockFlwChargeCard.mockResolvedValue({
        status: "success",
        data: { id: 111222 },
      })

      vi.mocked(prisma.payment.create).mockResolvedValue(
        buildPaymentWithUser({ id: "pay-card-1", paymentMethod: "card" }) as any
      )
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(
        buildPaymentWithUser({ id: "pay-card-1", paymentMethod: "card", status: "pending" }) as any
      )
      vi.mocked(prisma.payment.update).mockResolvedValue({} as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.subscription.create).mockResolvedValue({} as any)
      vi.mocked(prisma.revenueEntry.create).mockResolvedValue({} as any)

      // Act: call initiatePayment with the sandbox test card and mock SDK
      const result = await initiatePayment({
        userId: "user-1",
        email: "test@example.com",
        amount: 50,
        currency: "USD",
        paymentMethod: "card",
        tier: "starter",
        plan: "monthly",
        card: {
          number: SANDBOX_VISA,
          cvv: "123",
          expiryMonth: "12",
          expiryYear: "28",
        },
      }, mockSdk())

      // Assert: payment record was created with card payment method
      expect(prisma.payment.create).toHaveBeenCalledOnce()
      const createCall = vi.mocked(prisma.payment.create).mock.calls[0][0]
      expect(createCall.data.paymentMethod).toBe("card")
      expect(createCall.data.status).toBe("pending")
      expect(createCall.data.tier).toBe("starter")
      expect(createCall.data.amount).toBe(50)

      // The SDK should have been called with the sandbox test card details
      expect(mockFlwChargeCard).toHaveBeenCalledOnce()
      const sdkCall = mockFlwChargeCard.mock.calls[0][0]
      expect(sdkCall.card_number).toBe(SANDBOX_VISA)
      expect(sdkCall.cvv).toBe("123")
      expect(sdkCall.expiry_month).toBe("12")
      expect(sdkCall.expiry_year).toBe("28")
      expect(sdkCall.amount).toBe("50")
      expect(sdkCall.currency).toBe("USD")

      // AuthUrl not needed (immediate success), subscription was activated
      expect(result.success).toBe(true)
      expect(result.authUrl).toBeUndefined()
      expect(result.txRef).toBeDefined()
      expect(result.transactionId).toBe(111222)
    })

    it("returns authUrl for 3DS redirect when SDK provides authorization redirect", async () => {
      // Arrange: SDK card charge returns with 3DS auth URL
      mockFlwChargeCard.mockResolvedValue({
        status: "success",
        meta: {
          authorization: {
            redirect: "https://checkout.flutterwave.com/pay/3ds_abc123",
            url: "https://checkout.flutterwave.com/pay/3ds_abc123",
            mode: "redirect",
          },
        },
        data: {
          id: 987654,
          tx_ref: "tx-ref-auth-3ds",
        },
      })

      vi.mocked(prisma.payment.create).mockResolvedValue(
        buildPaymentWithUser({ id: "pay-card-auth", paymentMethod: "card" }) as any
      )

      // Act: call initiatePayment with sandbox test card + mock SDK
      const result = await initiatePayment({
        userId: "user-1",
        email: "test@example.com",
        amount: 50,
        currency: "USD",
        paymentMethod: "card",
        tier: "starter",
        plan: "monthly",
        card: {
          number: SANDBOX_VISA,
          cvv: "123",
          expiryMonth: "12",
          expiryYear: "28",
        },
      }, mockSdk())

      // Assert: authUrl is returned, no subscription activation yet
      expect(result.success).toBe(true)
      expect(result.authUrl).toBe("https://checkout.flutterwave.com/pay/3ds_abc123")
      expect(result.txRef).toBeDefined()
      expect(result.transactionId).toBeUndefined() // Not activated yet — waiting for 3DS

      // handleSuccessfulPayment should NOT have been called (waiting for 3DS callback)
      expect(prisma.payment.update).not.toHaveBeenCalled()
      expect(prisma.user.update).not.toHaveBeenCalled()
      expect(prisma.subscription.create).not.toHaveBeenCalled()
    })

    it("processes payment immediately when 3DS is not required (no authUrl)", async () => {
      // Arrange: SDK returns success with no 3DS redirect
      mockFlwChargeCard.mockResolvedValue({
        status: "success",
        data: {
          id: 555111,
          tx_ref: "tx-ref-immediate",
        },
        // No meta.authorization — card was charged without 3DS
      })

      vi.mocked(prisma.payment.create).mockResolvedValue(
        buildPaymentWithUser({
          id: "pay-immediate",
          flutterwaveTxRef: "tx-ref-immediate",
          paymentMethod: "card",
          status: "pending",
        }) as any
      )

      // handleSuccessfulPayment will look up the payment by txRef
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(
        buildPaymentWithUser({
          id: "pay-immediate",
          flutterwaveTxRef: "tx-ref-immediate",
          paymentMethod: "card",
          status: "pending",
        }) as any
      )
      vi.mocked(prisma.payment.update).mockResolvedValue({} as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.subscription.create).mockResolvedValue({} as any)
      vi.mocked(prisma.revenueEntry.create).mockResolvedValue({} as any)

      // Act: call initiatePayment with sandbox test card + mock SDK
      const result = await initiatePayment({
        userId: "user-1",
        email: "test@example.com",
        amount: 50,
        currency: "USD",
        paymentMethod: "card",
        tier: "starter",
        plan: "monthly",
        card: {
          number: SANDBOX_VISA,
          cvv: "123",
          expiryMonth: "12",
          expiryYear: "28",
        },
      }, mockSdk())

      // Assert: payment succeeded immediately, subscription activated
      expect(result.success).toBe(true)
      expect(result.authUrl).toBeUndefined()
      expect(result.txRef).toBeDefined()
      expect(result.transactionId).toBe(555111)

      // handleSuccessfulPayment should have been called
      expect(prisma.payment.update).toHaveBeenCalled()
      expect(prisma.user.update).toHaveBeenCalled()
      expect(prisma.subscription.create).toHaveBeenCalled()
    })

    it("marks payment as FAILED when the Flutterwave SDK returns an error (declined card)", async () => {
      // Arrange: SDK returns failure
      mockFlwChargeCard.mockResolvedValue({
        status: "error",
        message: "Card declined. Please try a different card.",
      })

      vi.mocked(prisma.payment.create).mockResolvedValue(
        buildPaymentWithUser({ id: "pay-declined", paymentMethod: "card" }) as any
      )
      vi.mocked(prisma.payment.update).mockResolvedValue({} as any)

      // Act: call initiatePayment with sandbox test card + mock SDK
      const result = await initiatePayment({
        userId: "user-1",
        email: "test@example.com",
        amount: 50,
        currency: "USD",
        paymentMethod: "card",
        tier: "starter",
        plan: "monthly",
        card: {
          number: SANDBOX_VISA,
          cvv: "123",
          expiryMonth: "12",
          expiryYear: "28",
        },
      }, mockSdk())

      // Assert: payment failed
      expect(result.success).toBe(false)
      expect(result.error).toContain("Card declined")
      expect(result.authUrl).toBeUndefined()
      // txRef is generated but not returned on the failure result object

      // Payment record was marked as failed
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "failed",
          }),
        })
      )

      // Should NOT activate subscription
      expect(prisma.user.update).not.toHaveBeenCalled()
      expect(prisma.subscription.create).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Full pipeline: initiation → webhook completion → status check
  // ─────────────────────────────────────────────────────────────────────────

  describe("Full pipeline (initiate → webhook → poll status)", () => {
    it("flows end-to-end from payment creation to status check via webhook", async () => {
      // Step 1: Initiate payment (with mock SDK)
      mockFlwChargeCard.mockResolvedValue({
        status: "success",
        data: { id: 999888 },
      })

      const createdPayment = buildPaymentWithUser({
        id: "pay-full-1",
        flutterwaveTxRef: "tx-ref-full-001",
        status: "pending",
      })
      vi.mocked(prisma.payment.create).mockResolvedValue(createdPayment as any)

      // For handleSuccessfulPayment (called from card payment with immediate success)
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(createdPayment as any)
      vi.mocked(prisma.payment.update).mockResolvedValue({} as any)
      vi.mocked(prisma.user.update).mockResolvedValue({} as any)
      vi.mocked(prisma.subscription.create).mockResolvedValue({} as any)
      vi.mocked(prisma.revenueEntry.create).mockResolvedValue({} as any)

      const initResult = await initiatePayment({
        userId: "user-1",
        email: "test@example.com",
        amount: 50,
        currency: "USD",
        paymentMethod: "card",
        tier: "starter",
        plan: "monthly",
        card: {
          number: SANDBOX_VISA,
          cvv: "123",
          expiryMonth: "12",
          expiryYear: "28",
        },
      }, mockSdk())

      // Payment was successful immediately (no 3DS) via handleSuccessfulPayment
      expect(initResult.success).toBe(true)
      const txRef = initResult.txRef!
      expect(txRef).toBeDefined()

      // handleSuccessfulPayment was called internally → payment + subscription created
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "success" }),
        })
      )
      expect(prisma.user.update).toHaveBeenCalled()
      expect(prisma.subscription.create).toHaveBeenCalled()
      expect(prisma.revenueEntry.create).toHaveBeenCalled()

      // Step 2: After processing — payment status is success
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        status: "success",
        tier: "starter",
        plan: "monthly",
      } as any)

      const statusResult = await checkPaymentStatus(txRef)
      expect(statusResult.status).toBe("success")
      expect(statusResult.tier).toBe("starter")
    })
  })
})
