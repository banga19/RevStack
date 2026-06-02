import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "test-user", role: "admin" } }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}))

vi.mock("@/lib/db", () => ({
  prisma: {
    document: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}))

import { prisma } from "@/lib/db"
import fs from "fs"
import { GET as GET_LIST } from "./route"
import { GET as GET_BY_ID } from "./[id]/route"

const mockDocs = [
  {
    id: "doc-1",
    filename: "75-DAY-AI-BUSINESS-PLAN.md",
    title: "75-Day AI Business Plan",
    description: "Complete roadmap",
    category: "plan",
    pages: 75,
    content: null,
    createdAt: new Date("2026-01-01"),
  },
]

describe("GET /api/documents", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns all documents ordered by category", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue(mockDocs)

    const req = new Request("http://localhost:3000/api/documents")
    const response = await GET_LIST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe("doc-1")
    expect(data[0].title).toBe("75-Day AI Business Plan")
    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: "desc" },
    })
  })

  it("returns error response on error", async () => {
    vi.mocked(prisma.document.findMany).mockRejectedValue(new Error("DB error"))
    const req = new Request("http://localhost:3000/api/documents")
    const response = await GET_LIST(req)
    const data = await response.json()
    expect(response.status).toBe(500)
    expect(data).toHaveProperty("error")
  })
})

describe("GET /api/documents/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns a document with file content", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocs[0])
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue("# 75-Day Plan\n\nThis is the content.")

    const req = new Request("http://localhost:3000/api/documents/doc-1")
    const response = await GET_BY_ID(req, { params: Promise.resolve({ id: "doc-1" }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe("doc-1")
    expect(data.content).toBe("# 75-Day Plan\n\nThis is the content.")
  })

  it("returns 404 if document not found", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(null)

    const req = new Request("http://localhost:3000/api/documents/doc-404")
    const response = await GET_BY_ID(req, { params: Promise.resolve({ id: "doc-404" }) })

    expect(response.status).toBe(404)
  })

  it("rejects path traversal filenames", async () => {
    const doc = { ...mockDocs[0], filename: "../../../etc/passwd" }
    vi.mocked(prisma.document.findUnique).mockResolvedValue(doc)

    const req = new Request("http://localhost:3000/api/documents/doc-1")
    const response = await GET_BY_ID(req, { params: Promise.resolve({ id: "doc-1" }) })
    const data = await response.json()

    // Should not read the file since it contains ..
    expect(fs.existsSync).not.toHaveBeenCalled()
    expect(data.content).toBe("")
  })

  it("returns empty content if file doesn't exist on disk", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocs[0])
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const req = new Request("http://localhost:3000/api/documents/doc-1")
    const response = await GET_BY_ID(req, { params: Promise.resolve({ id: "doc-1" }) })
    const data = await response.json()

    expect(data.content).toBe("")
  })
})
