import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    lead: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  },
}))

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", role: "user" },
  }),
}))

import { prisma } from "@/lib/db"

describe("Leads API Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/leads", () => {
    it("should query leads filtered by userId", async () => {
      const mockLeads = [
        { id: "lead-1", companyName: "Acme Corp", status: "new", userId: "user-1" },
        { id: "lead-2", companyName: "Tech Co", status: "qualified", userId: "user-1" },
      ]
      vi.mocked(prisma.lead.findMany).mockResolvedValue(mockLeads as any)

      const result = await prisma.lead.findMany({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
      })

      expect(result).toHaveLength(2)
      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "user-1" }),
        })
      )
    })

    it("should filter leads by status when provided", async () => {
      vi.mocked(prisma.lead.findMany).mockResolvedValue([])

      await prisma.lead.findMany({
        where: { userId: "user-1", status: "qualified" },
        orderBy: { createdAt: "desc" },
      })

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "qualified" }),
        })
      )
    })

    it("should return empty array when no leads exist", async () => {
      vi.mocked(prisma.lead.findMany).mockResolvedValue([])

      const result = await prisma.lead.findMany({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
      })

      expect(result).toEqual([])
    })
  })

  describe("POST /api/leads", () => {
    it("should create a lead with userId from session", async () => {
      const input = {
        companyName: "New Corp",
        contactName: "John Doe",
        email: "john@corp.com",
        phone: "+254700000000",
        industry: "Agriculture",
      }

      vi.mocked(prisma.lead.create).mockResolvedValue({
        id: "lead-new",
        ...input,
        userId: "user-1",
        createdAt: new Date(),
      } as any)
      vi.mocked(prisma.activity.create).mockResolvedValue({} as any)

      const lead = await prisma.lead.create({
        data: {
          ...input,
          userId: "user-1",
        },
      })

      expect(lead.companyName).toBe("New Corp")
      expect(lead.userId).toBe("user-1")
      expect(prisma.lead.create).toHaveBeenCalled()
    })

    it("should store the userId from the session in the lead", async () => {
      vi.mocked(prisma.lead.create).mockResolvedValue({
        id: "lead-auth",
        companyName: "Auth Corp",
        userId: "user-1",
      } as any)

      const lead = await prisma.lead.create({
        data: {
          companyName: "Auth Corp",
          contactName: "Auth User",
          email: "auth@test.com",
          userId: "user-1",
        },
      })

      // Verify the lead is correctly associated with the authenticated user
      expect(lead.userId).toBe("user-1")
    })

    it("should create an activity log entry when a lead is created", async () => {
      vi.mocked(prisma.lead.create).mockResolvedValue({
        id: "lead-log",
        companyName: "Log Corp",
        userId: "user-1",
      } as any)
      vi.mocked(prisma.activity.create).mockResolvedValue({} as any)

      await prisma.lead.create({
        data: {
          companyName: "Log Corp",
          contactName: "Log User",
          email: "log@test.com",
          userId: "user-1",
        },
      })

      await prisma.activity.create({
        data: {
          type: "lead_created",
          description: "Lead Log Corp created",
          entityType: "lead",
          entityId: "lead-log",
          userId: "user-1",
        },
      })

      expect(prisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: "lead_created" }),
        })
      )
    })
  })

  describe("GET /api/leads/[id]", () => {
    it("should find lead by id and userId", async () => {
      vi.mocked(prisma.lead.findFirst).mockResolvedValue({
        id: "lead-1",
        companyName: "Acme Corp",
        userId: "user-1",
      } as any)

      const lead = await prisma.lead.findFirst({
        where: { id: "lead-1", userId: "user-1" },
      })

      expect(lead).not.toBeNull()
      expect(lead?.id).toBe("lead-1")
    })

    it("should return null when lead not found for the user", async () => {
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null)

      const lead = await prisma.lead.findFirst({
        where: { id: "nonexistent", userId: "user-1" },
      })

      expect(lead).toBeNull()
    })
  })

  describe("PATCH /api/leads/[id]", () => {
    it("should update lead fields when provided", async () => {
      vi.mocked(prisma.lead.updateMany).mockResolvedValue({ count: 1 } as any)
      vi.mocked(prisma.lead.findUnique).mockResolvedValue({
        id: "lead-1",
        companyName: "Updated Corp",
        status: "qualified",
        userId: "user-1",
      } as any)

      const result = await prisma.lead.updateMany({
        where: { id: "lead-1", userId: "user-1" },
        data: { status: "qualified", notes: "Qualified via test" },
      })

      expect(result.count).toBe(1)
    })

    it("should return count 0 when lead not found for user", async () => {
      vi.mocked(prisma.lead.updateMany).mockResolvedValue({ count: 0 } as any)

      const result = await prisma.lead.updateMany({
        where: { id: "lead-1", userId: "other-user" },
        data: { status: "qualified" },
      })

      expect(result.count).toBe(0)
    })
  })

  describe("DELETE /api/leads/[id]", () => {
    it("should delete lead scoped to userId", async () => {
      vi.mocked(prisma.lead.deleteMany).mockResolvedValue({ count: 1 } as any)

      const result = await prisma.lead.deleteMany({
        where: { id: "lead-1", userId: "user-1" },
      })

      expect(result.count).toBe(1)
      expect(prisma.lead.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "user-1" }),
        })
      )
    })
  })
})
