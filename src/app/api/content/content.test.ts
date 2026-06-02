import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "test-user", role: "admin" } }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}))

vi.mock("@/lib/db", () => ({
  prisma: {
    contentArticle: {
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

const mockArticles = [
  {
    id: "art-1",
    title: "WhatsApp Automation for Kenyan SMEs",
    keyword: "WhatsApp automation Kenya",
    description: "A guide to automating WhatsApp for SMEs",
    status: "published",
    publishDate: new Date("2026-06-01"),
    wordCount: 2000,
    url: "https://example.com/whatsapp-automation",
    views: 150,
    leadsGenerated: 5,
    week: 1,
    month: 1,
    createdAt: new Date("2026-05-01"),
    updatedAt: new Date("2026-05-01"),
  },
]

describe("GET /api/content", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns all articles ordered by createdAt desc", async () => {
    vi.mocked(prisma.contentArticle.findMany).mockResolvedValue(mockArticles)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe("art-1")
    expect(data[0].title).toBe("WhatsApp Automation for Kenyan SMEs")
    expect(prisma.contentArticle.findMany).toHaveBeenCalledWith({ orderBy: { week: "asc" } })
  })

  it("returns empty array on error", async () => {
    vi.mocked(prisma.contentArticle.findMany).mockRejectedValue(new Error("DB error"))

    const response = await GET()
    const data = await response.json()

    expect(data).toEqual([])
  })
})

describe("POST /api/content", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates a new article", async () => {
    const newArticle = { ...mockArticles[0], id: "art-2", title: "New Article" }
    vi.mocked(prisma.contentArticle.create).mockResolvedValue(newArticle)

    const req = new NextRequest("http://localhost:3000/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Article", keyword: "AI Kenya", week: "2", month: "1" }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.title).toBe("New Article")
    expect(prisma.contentArticle.create).toHaveBeenCalled()
  })

  it("returns 500 on create failure", async () => {
    vi.mocked(prisma.contentArticle.create).mockRejectedValue(new Error("Create failed"))

    const req = new NextRequest("http://localhost:3000/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test" }),
    })
    const response = await POST(req)
    expect(response.status).toBe(500)
  })
})

describe("PUT /api/content/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("updates an article", async () => {
    const updated = { ...mockArticles[0], status: "scheduled" }
    vi.mocked(prisma.contentArticle.update).mockResolvedValue(updated)

    const req = new NextRequest("http://localhost:3000/api/content/art-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "scheduled" }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "art-1" }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe("scheduled")
  })

  it("returns 500 on update failure", async () => {
    vi.mocked(prisma.contentArticle.update).mockRejectedValue(new Error("Update failed"))

    const req = new NextRequest("http://localhost:3000/api/content/art-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    })
    const response = await PUT(req, { params: Promise.resolve({ id: "art-1" }) })
    expect(response.status).toBe(500)
  })
})

describe("DELETE /api/content/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("deletes an article", async () => {
    vi.mocked(prisma.contentArticle.delete).mockResolvedValue(mockArticles[0])

    const req = new NextRequest("http://localhost:3000/api/content/art-1", { method: "DELETE" })
    const response = await DELETE(req, { params: Promise.resolve({ id: "art-1" }) })

    expect(response.status).toBe(200)
    expect(prisma.contentArticle.delete).toHaveBeenCalledWith({ where: { id: "art-1" } })
  })
})
