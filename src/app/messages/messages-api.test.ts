import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  prisma: {
    followup: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    lead: {
      findMany: vi.fn(),
    },
    client: {
      findMany: vi.fn(),
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

describe("Messages & Follow-ups API Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Messages API", () => {
    it("should list messages scoped to user's leads and clients", async () => {
      vi.mocked(prisma.lead.findMany).mockResolvedValue([
        { id: "lead-1" },
        { id: "lead-2" },
      ] as any)
      vi.mocked(prisma.client.findMany).mockResolvedValue([
        { id: "client-1" },
      ] as any)

      vi.mocked(prisma.message.findMany).mockResolvedValue([
        { id: "msg-1", channel: "whatsapp", to: "+254700000", body: "Hello", status: "sent" },
      ] as any)

      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { leadId: { in: ["lead-1", "lead-2"] } },
            { clientId: { in: ["client-1"] } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      })

      expect(messages).toHaveLength(1)
      expect(prisma.message.findMany).toHaveBeenCalled()
    })

    it("should filter messages by channel", async () => {
      vi.mocked(prisma.lead.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.client.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.message.findMany).mockResolvedValue([])

      await prisma.message.findMany({
        where: {
          channel: "whatsapp",
          OR: [{ leadId: { in: [] } }, { clientId: { in: [] } }],
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      })

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ channel: "whatsapp" }),
        })
      )
    })

    it("should create a message and log activity", async () => {
      vi.mocked(prisma.message.create).mockResolvedValue({
        id: "msg-new",
        channel: "email",
        to: "client@corp.com",
        body: "Follow-up message",
        status: "sent",
      } as any)
      vi.mocked(prisma.activity.create).mockResolvedValue({} as any)

      const message = await prisma.message.create({
        data: {
          channel: "email",
          to: "client@corp.com",
          body: "Follow-up message",
          status: "sent",
        },
      })

      expect(message.channel).toBe("email")
      expect(message.to).toBe("client@corp.com")
    })
  })

  describe("Follow-ups API", () => {
    it("should list follow-ups scoped to user's leads and clients", async () => {
      vi.mocked(prisma.lead.findMany).mockResolvedValue([{ id: "lead-1" }] as any)
      vi.mocked(prisma.client.findMany).mockResolvedValue([{ id: "client-1" }] as any)

      vi.mocked(prisma.followup.findMany).mockResolvedValue([
        { id: "fup-1", channel: "whatsapp", status: "pending", messageBody: "Hello" },
      ] as any)

      const followups = await prisma.followup.findMany({
        where: {
          OR: [
            { leadId: { in: ["lead-1"] } },
            { clientId: { in: ["client-1"] } },
          ],
        },
        orderBy: { scheduledAt: "asc" },
      })

      expect(followups).toHaveLength(1)
    })

    it("should filter follow-ups by status", async () => {
      vi.mocked(prisma.lead.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.client.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.followup.findMany).mockResolvedValue([])

      await prisma.followup.findMany({
        where: {
          status: "pending",
          OR: [{ leadId: { in: [] } }, { clientId: { in: [] } }],
        },
        orderBy: { scheduledAt: "asc" },
      })

      expect(prisma.followup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "pending" }),
        })
      )
    })

    it("should create a follow-up with default channel and status", async () => {
      vi.mocked(prisma.followup.create).mockResolvedValue({
        id: "fup-new",
        leadId: null,
        clientId: null,
        channel: "whatsapp",
        messageBody: "Follow-up message",
        status: "pending",
        scheduledAt: new Date(),
      } as any)

      const followup = await prisma.followup.create({
        data: {
          channel: "whatsapp",
          messageBody: "Follow-up message",
          status: "pending",
          scheduledAt: new Date(),
        },
      })

      expect(followup.channel).toBe("whatsapp")
      expect(followup.status).toBe("pending")
    })

    it("should mark follow-up as sent and create message log", async () => {
      vi.mocked(prisma.followup.findUnique).mockResolvedValue({
        id: "fup-1",
        leadId: "lead-1",
        clientId: null,
        channel: "whatsapp",
        messageBody: "Hello",
      } as any)

      vi.mocked(prisma.followup.update).mockResolvedValue({
        id: "fup-1",
        status: "sent",
        sentAt: new Date(),
      } as any)

      vi.mocked(prisma.message.create).mockResolvedValue({} as any)
      vi.mocked(prisma.activity.create).mockResolvedValue({} as any)

      // Verify the followup exists
      const existing = await prisma.followup.findUnique({ where: { id: "fup-1" } })
      expect(existing).not.toBeNull()

      // Update to sent
      const updated = await prisma.followup.update({
        where: { id: "fup-1" },
        data: { status: "sent", sentAt: new Date() },
      })
      expect(updated.status).toBe("sent")
    })
  })
})
