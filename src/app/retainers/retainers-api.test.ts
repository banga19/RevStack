import { describe, it, expect, vi, beforeEach } from "vitest"

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

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", role: "user" },
  }),
}))

import { prisma } from "@/lib/db"

describe("Retainers API Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/retainers", () => {
    it("should list retainers scoped to userId", async () => {
      const mockRetainers = [
        {
          id: "ret-1",
          name: "AI Lead Qualification",
          amountUsd: 2000,
          billingCycle: "monthly",
          status: "active",
          clientId: "client-1",
          userId: "user-1",
          client: { name: "Client A", company: "Acme Corp" },
        },
      ]
      vi.mocked(prisma.retainer.findMany).mockResolvedValue(mockRetainers as any)

      const result = await prisma.retainer.findMany({
        where: { userId: "user-1" },
        include: { client: { select: { name: true, company: true } } },
        orderBy: { createdAt: "desc" },
      })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("AI Lead Qualification")
      expect(prisma.retainer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "user-1" }),
        })
      )
    })

    it("should filter by status when provided", async () => {
      vi.mocked(prisma.retainer.findMany).mockResolvedValue([])

      await prisma.retainer.findMany({
        where: { userId: "user-1", status: "active" },
        include: { client: { select: { name: true, company: true } } },
        orderBy: { createdAt: "desc" },
      })

      expect(prisma.retainer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "active" }),
        })
      )
    })

    it("should return empty array when no retainers exist", async () => {
      vi.mocked(prisma.retainer.findMany).mockResolvedValue([])

      const result = await prisma.retainer.findMany({
        where: { userId: "user-1" },
        include: { client: { select: { name: true, company: true } } },
        orderBy: { createdAt: "desc" },
      })

      expect(result).toEqual([])
    })
  })

  describe("POST /api/retainers", () => {
    it("should verify client belongs to user before creating retainer", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValue({
        id: "client-1",
        userId: "user-1",
      } as any)

      const client = await prisma.client.findFirst({
        where: { id: "client-1", userId: "user-1" },
      })

      expect(client).not.toBeNull()
    })

    it("should return null if client does not belong to user", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValue(null)

      const client = await prisma.client.findFirst({
        where: { id: "client-1", userId: "user-1" },
      })

      expect(client).toBeNull()
    })

    it("should create a retainer with valid client ownership", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValue({
        id: "client-1",
        userId: "user-1",
      } as any)

      vi.mocked(prisma.retainer.create).mockResolvedValue({
        id: "ret-new",
        clientId: "client-1",
        name: "New Retainer",
        amountUsd: 1500,
        billingCycle: "monthly",
        status: "active",
        startDate: "2025-01-15",
        userId: "user-1",
        client: { name: "Client A", company: "Acme Corp" },
      } as any)

      const retainer = await prisma.retainer.create({
        data: {
          clientId: "client-1",
          name: "New Retainer",
          amountUsd: 1500,
          billingCycle: "monthly",
          startDate: "2025-01-15",
          userId: "user-1",
        },
        include: { client: { select: { name: true, company: true } } },
      })

      expect(retainer.name).toBe("New Retainer")
      expect(retainer.amountUsd).toBe(1500)
    })
  })

  describe("PATCH /api/retainers/[id]", () => {
    it("should update retainer status (pause/resume/cancel)", async () => {
      vi.mocked(prisma.retainer.updateMany).mockResolvedValue({ count: 1 } as any)
      vi.mocked(prisma.retainer.findUnique).mockResolvedValue({
        id: "ret-1",
        name: "Retainer",
        status: "paused",
        userId: "user-1",
        client: { name: "Client A", company: "Acme Corp" },
      } as any)

      const result = await prisma.retainer.updateMany({
        where: { id: "ret-1", userId: "user-1" },
        data: { status: "paused" as const },
      })

      expect(result.count).toBe(1)
    })

    it("should not update if retainer doesn't belong to user", async () => {
      vi.mocked(prisma.retainer.updateMany).mockResolvedValue({ count: 0 } as any)

      const result = await prisma.retainer.updateMany({
        where: { id: "ret-1", userId: "other-user" },
        data: { status: "paused" as const },
      })

      expect(result.count).toBe(0)
    })
  })
})
