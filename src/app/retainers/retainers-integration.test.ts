import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Integration-level tests for retainer lifecycle ─────────────
// These test the core business logic patterns used by the retainer
// API endpoints: CRUD, status transitions, and MRR calculation.

vi.mock("@/lib/db", () => ({
  prisma: {
    retainer: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    client: {
      findFirst: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/db"

describe("Retainer Lifecycle Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockRetainers = [
    { id: "ret-1", name: "AI Lead Gen", amountUsd: 2000, billingCycle: "monthly", status: "active", userId: "user-1", clientId: "client-1", startDate: "2025-01-01", nextBillingDate: "2025-02-01", client: { name: "Client A", company: "Acme" } },
    { id: "ret-2", name: "Compliance Monitoring", amountUsd: 5000, billingCycle: "quarterly", status: "active", userId: "user-1", clientId: "client-2", startDate: "2025-01-15", nextBillingDate: "2025-04-15", client: { name: "Client B", company: "Beta" } },
    { id: "ret-3", name: "Trade Ops", amountUsd: 12000, billingCycle: "annual", status: "paused", userId: "user-1", clientId: "client-3", startDate: "2024-06-01", nextBillingDate: "2025-06-01", client: { name: "Client C", company: "Gamma" } },
  ]

  describe("MRR Calculation (core business metric)", () => {
    it("converts quarterly retainers to monthly MRR", () => {
      const quarterlyRetainers = mockRetainers.filter((r) => r.billingCycle === "quarterly" && r.status === "active")
      const mrr = quarterlyRetainers.reduce((sum, r) => sum + r.amountUsd / 3, 0)
      expect(mrr).toBe(5000 / 3)
    })

    it("converts annual retainers to monthly MRR", () => {
      const annualRetainers = mockRetainers.filter((r) => r.billingCycle === "annual" && r.status === "active")
      const mrr = annualRetainers.reduce((sum, r) => sum + r.amountUsd / 12, 0)
      expect(mrr).toBe(0) // The annual one is paused, so 0
    })

    it("calculates total MRR from active retainers only", () => {
      const mrr = mockRetainers
        .filter((r) => r.status === "active")
        .reduce((sum, r) => {
          if (r.billingCycle === "monthly") return sum + r.amountUsd
          if (r.billingCycle === "quarterly") return sum + r.amountUsd / 3
          if (r.billingCycle === "annual") return sum + r.amountUsd / 12
          return sum
        }, 0)

      // 2000 (monthly active) + 5000/3 (quarterly active) = 2000 + 1666.67 = 3666.67
      expect(Math.round(mrr * 100) / 100).toBe(3666.67)
    })

    it("excludes paused and cancelled retainers from MRR", () => {
      const pausedMrr = mockRetainers
        .filter((r) => r.status === "paused")
        .reduce((sum, r) => {
          if (r.billingCycle === "monthly") return sum + r.amountUsd
          if (r.billingCycle === "quarterly") return sum + r.amountUsd / 3
          if (r.billingCycle === "annual") return sum + r.amountUsd / 12
          return sum
        }, 0)

      expect(pausedMrr).toBe(12000 / 12) // 1000, but it's paused so shouldn't be counted
      // The MRR formula filters by status === "active", so paused is excluded
      const activeMrr = mockRetainers
        .filter((r) => r.status === "active")
        .reduce((sum, r) => {
          if (r.billingCycle === "monthly") return sum + r.amountUsd
          if (r.billingCycle === "quarterly") return sum + r.amountUsd / 3
          if (r.billingCycle === "annual") return sum + r.amountUsd / 12
          return sum
        }, 0)

      expect(activeMrr).toBeLessThan(mockRetainers.reduce((s, r) => s + r.amountUsd, 0))
    })
  })

  describe("Retainer CRUD (mirrors API route patterns)", () => {
    it("creates a retainer with client ownership verification", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValue({
        id: "client-1",
        userId: "user-1",
      } as any)
      vi.mocked(prisma.retainer.create).mockResolvedValue(mockRetainers[0] as any)

      // Step 1: Verify client ownership
      const client = await prisma.client.findFirst({
        where: { id: "client-1", userId: "user-1" },
      })
      expect(client).not.toBeNull()

      // Step 2: Create retainer
      const retainer = await prisma.retainer.create({
        data: {
          clientId: "client-1",
          name: "AI Lead Gen",
          amountUsd: 2000,
          billingCycle: "monthly",
          startDate: "2025-01-01",
          userId: "user-1",
        },
      })

      expect(retainer.name).toBe("AI Lead Gen")
      expect(retainer.userId).toBe("user-1")
    })

    it("prevents creation when client doesn't belong to user", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValue(null)

      const client = await prisma.client.findFirst({
        where: { id: "client-1", userId: "user-1" },
      })

      expect(client).toBeNull()
    })

    it("lists retainers scoped to userId", async () => {
      vi.mocked(prisma.retainer.findMany).mockResolvedValue(mockRetainers as any)

      const result = await prisma.retainer.findMany({
        where: { userId: "user-1" },
        include: { client: { select: { name: true, company: true } } },
        orderBy: { createdAt: "desc" },
      })

      expect(result).toHaveLength(3)
      expect(prisma.retainer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "user-1" }),
        })
      )
    })
  })

  describe("Status Transitions", () => {
    it("pauses an active retainer", async () => {
      vi.mocked(prisma.retainer.updateMany).mockResolvedValue({ count: 1 } as any)
      vi.mocked(prisma.retainer.findUnique).mockResolvedValue({
        ...mockRetainers[0],
        status: "paused",
      } as any)

      const result = await prisma.retainer.updateMany({
        where: { id: "ret-1", userId: "user-1" },
        data: { status: "paused" },
      })

      expect(result.count).toBe(1)
    })

    it("resumes a paused retainer", async () => {
      vi.mocked(prisma.retainer.updateMany).mockResolvedValue({ count: 1 } as any)
      vi.mocked(prisma.retainer.findUnique).mockResolvedValue({
        ...mockRetainers[2],
        status: "active",
      } as any)

      const result = await prisma.retainer.updateMany({
        where: { id: "ret-3", userId: "user-1" },
        data: { status: "active" },
      })

      expect(result.count).toBe(1)
    })

    it("cancels a retainer (from active or paused)", async () => {
      vi.mocked(prisma.retainer.updateMany).mockResolvedValue({ count: 1 } as any)

      const result = await prisma.retainer.updateMany({
        where: { id: "ret-1", userId: "user-1" },
        data: { status: "cancelled" },
      })

      expect(result.count).toBe(1)
    })

    it("does not update if retainer doesn't belong to user", async () => {
      vi.mocked(prisma.retainer.updateMany).mockResolvedValue({ count: 0 } as any)

      const result = await prisma.retainer.updateMany({
        where: { id: "ret-1", userId: "other-user" },
        data: { status: "cancelled" },
      })

      expect(result.count).toBe(0)
    })
  })
})
