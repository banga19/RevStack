import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET, POST } from "@/app/api/korea/matching/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"

vi.mock("@/lib/db", () => ({
  prisma: {
    client: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("@/lib/abac-middleware", () => ({
  withAuth: (handler: any) => async (req: NextRequest) => handler(req, { session: { user: { id: "user-1", email: "test@example.com", name: "Test" } } }),
}))

describe("GET /api/korea/matching", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns all corridor-enabled clients when no params", async () => {
    ;(prisma.client.findMany as any).mockResolvedValue([
      { id: "c1", name: "Acme", company: "Acme Ltd", corridor: "ke-korea", ersScore: 82, ersBreakdown: null, tier: "growth" },
    ])
    const req = new NextRequest("http://localhost/api/korea/matching")
    const res = await GET(req)
    const data = await res.json()
    expect(data.items).toHaveLength(1)
    expect(data.items[0].readinessLevel).toBe("export-ready")
  })

  it("filters by clientId", async () => {
    ;(prisma.client.findUnique as any).mockResolvedValue({ id: "c2", name: "Beta", company: "Beta Corp", corridor: "afcfta-intra", ersScore: 60, ersBreakdown: null, tier: "starter" })
    const req = new NextRequest("http://localhost/api/korea/matching?clientId=c2")
    const res = await GET(req)
    const data = await res.json()
    expect(data.items[0].id).toBe("c2")
  })
})

describe("POST /api/korea/matching", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 without clientId or origin/destination", async () => {
    const req = new NextRequest("http://localhost/api/korea/matching", { method: "POST", body: JSON.stringify({}), headers: { "Content-Type": "application/json" } })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 404 when clientId not found", async () => {
    ;(prisma.client.findUnique as any).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/korea/matching", { method: "POST", body: JSON.stringify({ clientId: "missing" }), headers: { "Content-Type": "application/json" } })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it("returns match payload when clientId exists", async () => {
    ;(prisma.client.findUnique as any).mockResolvedValue({ id: "c3", name: "Gamma", company: "Gamma Inc", corridor: "ke-korea", ersScore: 90, ersBreakdown: null, tier: "enterprise" })
    const req = new NextRequest("http://localhost/api/korea/matching", { method: "POST", body: JSON.stringify({ clientId: "c3" }), headers: { "Content-Type": "application/json" } })
    const res = await POST(req)
    const data = await res.json()
    expect(data.matches).toHaveLength(1)
    expect(data.matches[0].clientId).toBe("c3")
  })
})
