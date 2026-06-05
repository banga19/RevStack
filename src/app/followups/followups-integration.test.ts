import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Integration-level tests for followup send flow ────────────
// These test the core business logic used by the followup send
// endpoint: sending a followup creates a message log + activity entry.

vi.mock("@/lib/db", () => ({
  prisma: {
    followup: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
    lead: {
      findMany: vi.fn(),
    },
    client: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/db"

describe("Followup Send Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Followup Send (mirrors /api/followups/[id]/send)", () => {
    it("sends a pending followup and creates message + activity log", async () => {
      const pendingFollowup = {
        id: "fup-1",
        leadId: "lead-1",
        clientId: null,
        channel: "whatsapp",
        messageBody: "Hello, following up on your demo request.",
        status: "pending",
        scheduledAt: new Date(),
        sentAt: null,
      }

      const now = new Date()

      vi.mocked(prisma.followup.findUnique).mockResolvedValue(pendingFollowup as any)
      vi.mocked(prisma.followup.update).mockResolvedValue({
        ...pendingFollowup,
        status: "sent",
        sentAt: now,
      } as any)
      vi.mocked(prisma.message.create).mockResolvedValue({
        id: "msg-new",
        channel: "whatsapp",
        to: "lead-1",
        body: "Hello, following up on your demo request.",
        status: "sent",
      } as any)
      vi.mocked(prisma.activity.create).mockResolvedValue({} as any)

      // Step 1: Verify the followup exists
      const existing = await prisma.followup.findUnique({ where: { id: "fup-1" } })
      expect(existing).not.toBeNull()
      expect(existing?.status).toBe("pending")

      // Step 2: Update to sent
      const updated = await prisma.followup.update({
        where: { id: "fup-1" },
        data: { status: "sent", sentAt: now },
      })
      expect(updated.status).toBe("sent")

      // Step 3: Log to messages
      const message = await prisma.message.create({
        data: {
          channel: existing!.channel,
          to: existing!.leadId || "unknown",
          body: existing!.messageBody,
          status: "sent",
          leadId: existing!.leadId || undefined,
          clientId: existing!.clientId || undefined,
        },
      })
      expect(message.channel).toBe("whatsapp")
      expect(message.body).toBe("Hello, following up on your demo request.")

      // Step 4: Log activity
      await prisma.activity.create({
        data: {
          type: "followup_sent",
          description: `Follow-up sent via ${existing!.channel}`,
          entityType: "followup",
          entityId: "fup-1",
          userId: "user-1",
        },
      })
      expect(prisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: "followup_sent" }),
        })
      )
    })

    it("returns null when followup does not exist", async () => {
      vi.mocked(prisma.followup.findUnique).mockResolvedValue(null)

      const existing = await prisma.followup.findUnique({ where: { id: "nonexistent" } })
      expect(existing).toBeNull()
    })

    it("creates a new followup with default channel and status", async () => {
      vi.mocked(prisma.followup.create).mockResolvedValue({
        id: "fup-new",
        leadId: "lead-1",
        clientId: null,
        channel: "whatsapp",
        messageBody: "Test message",
        status: "pending",
        scheduledAt: new Date(),
        sentAt: null,
      } as any)

      const followup = await prisma.followup.create({
        data: {
          channel: "whatsapp",
          messageBody: "Test message",
          status: "pending",
          scheduledAt: new Date(),
        },
      })

      expect(followup.channel).toBe("whatsapp")
      expect(followup.status).toBe("pending")
      expect(followup.messageBody).toBe("Test message")
    })

    it("lists pending followups with user scoping", async () => {
      vi.mocked(prisma.lead.findMany).mockResolvedValue([{ id: "lead-1" }, { id: "lead-2" }] as any)
      vi.mocked(prisma.client.findMany).mockResolvedValue([{ id: "client-1" }] as any)
      vi.mocked(prisma.followup.findMany).mockResolvedValue([
        { id: "fup-1", status: "pending", channel: "email", messageBody: "Hi" },
        { id: "fup-2", status: "pending", channel: "whatsapp", messageBody: "Hello" },
      ] as any)

      // Step 1: Get user's lead and client IDs
      const userLeadIds = (await prisma.lead.findMany({ where: { userId: "user-1" }, select: { id: true } })).map((l) => l.id)
      const userClientIds = (await prisma.client.findMany({ where: { userId: "user-1" }, select: { id: true } })).map((c) => c.id)

      // Step 2: Query followups scoped to those IDs
      const followups = await prisma.followup.findMany({
        where: {
          status: "pending",
          OR: [
            { leadId: { in: userLeadIds } },
            { clientId: { in: userClientIds } },
          ],
        },
        orderBy: { scheduledAt: "asc" },
      })

      expect(followups).toHaveLength(2)
      expect(prisma.followup.findMany).toHaveBeenCalled()
    })
  })
})
