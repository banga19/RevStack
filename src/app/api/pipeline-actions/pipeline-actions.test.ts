import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock prisma
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "test-user", role: "admin" } }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}))

vi.mock("@/lib/db", () => ({
  prisma: {
    pipelineAction: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/db"
import { GET, POST } from "./route"
import { PUT, DELETE } from "./[id]/route"

const mockActions = [
  {
    id: "act-1",
    clientId: "client-1",
    type: "follow-up",
    note: "Call back next week",
    status: "pending",
    dueDate: new Date("2026-06-15"),
    completedAt: null,
    createdAt: new Date("2026-05-01"),
  },
  {
    id: "act-2",
    clientId: "client-1",
    type: "email-sent",
    note: "Sent proposal",
    status: "completed",
    dueDate: null,
    completedAt: new Date("2026-05-10"),
    createdAt: new Date("2026-05-01"),
  },
]

describe("GET /api/pipeline-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns actions filtered by clientId", async () => {
    vi.mocked(prisma.pipelineAction.findMany).mockResolvedValue(mockActions)

    const req = new NextRequest("http://localhost:3000/api/pipeline-actions?clientId=client-1")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
    expect(data[0].id).toBe("act-1")
    expect(data[1].id).toBe("act-2")
    expect(data[0].note).toBe("Call back next week")
    expect(prisma.pipelineAction.findMany).toHaveBeenCalledWith({
      where: { clientId: "client-1" },
      orderBy: { createdAt: "desc" },
    })
  })

  it("returns empty array if no clientId provided", async () => {
    vi.mocked(prisma.pipelineAction.findMany).mockResolvedValue([])

    const req = new NextRequest("http://localhost:3000/api/pipeline-actions")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it("returns empty array on error", async () => {
    vi.mocked(prisma.pipelineAction.findMany).mockRejectedValue(new Error("DB error"))

    const req = new NextRequest("http://localhost:3000/api/pipeline-actions?clientId=client-1")
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })
})

describe("POST /api/pipeline-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a new action", async () => {
    const newAction = {
      id: "act-3",
      clientId: "client-1",
      type: "call-held",
      note: "Had a great call",
      status: "pending",
      dueDate: null,
      completedAt: null,
      createdAt: new Date("2026-05-15"),
    }
    vi.mocked(prisma.pipelineAction.create).mockResolvedValue(newAction)

    const req = new NextRequest("http://localhost:3000/api/pipeline-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: "client-1",
        type: "call-held",
        note: "Had a great call",
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe("act-3")
    expect(data.note).toBe("Had a great call")
    expect(prisma.pipelineAction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: "client-1",
        type: "call-held",
        note: "Had a great call",
      }),
    })
  })

  it("returns 500 on create failure", async () => {
    vi.mocked(prisma.pipelineAction.create).mockRejectedValue(new Error("Create failed"))

    const req = new NextRequest("http://localhost:3000/api/pipeline-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: "client-1", type: "email-sent", note: "" }),
    })
    const response = await POST(req)

    expect(response.status).toBe(500)
  })
})

describe("PUT /api/pipeline-actions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates an action", async () => {
    const updated = { ...mockActions[0], status: "completed", completedAt: new Date("2026-05-15") }
    vi.mocked(prisma.pipelineAction.update).mockResolvedValue(updated)

    const req = new NextRequest("http://localhost:3000/api/pipeline-actions/act-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "act-1" }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe("completed")
    expect(data.note).toBe("Call back next week")
    expect(prisma.pipelineAction.update).toHaveBeenCalledWith({
      where: { id: "act-1" },
      data: { status: "completed" },
    })
  })

  it("returns 500 on update failure", async () => {
    vi.mocked(prisma.pipelineAction.update).mockRejectedValue(new Error("Update failed"))

    const req = new NextRequest("http://localhost:3000/api/pipeline-actions/act-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "act-1" }) })

    expect(response.status).toBe(500)
  })
})

describe("DELETE /api/pipeline-actions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deletes an action", async () => {
    vi.mocked(prisma.pipelineAction.delete).mockResolvedValue(mockActions[0])

    const req = new NextRequest("http://localhost:3000/api/pipeline-actions/act-1", { method: "DELETE" })
    const response = await DELETE(req, { params: Promise.resolve({ id: "act-1" }) })

    expect(response.status).toBe(200)
    expect(prisma.pipelineAction.delete).toHaveBeenCalledWith({ where: { id: "act-1" } })
  })

  it("returns 500 on delete failure", async () => {
    vi.mocked(prisma.pipelineAction.delete).mockRejectedValue(new Error("Delete failed"))

    const req = new NextRequest("http://localhost:3000/api/pipeline-actions/act-1", { method: "DELETE" })
    const response = await DELETE(req, { params: Promise.resolve({ id: "act-1" }) })

    expect(response.status).toBe(500)
  })
})
