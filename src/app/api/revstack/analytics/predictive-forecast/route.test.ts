import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "@/app/api/revstack/analytics/predictive-forecast/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"

vi.mock("@/lib/db", () => ({
  prisma: {
    client: { count: vi.fn() },
    lead: { count: vi.fn() },
    invoice: { findMany: vi.fn() },
  },
}))

vi.mock("@/lib/abac-middleware", () => ({
  withAuth: (handler: any) => async (req: NextRequest) => handler(req, { session: { user: { id: "user-1", email: "test@example.com", name: "Test" } } }),
}))

describe("GET /api/revstack/analytics/predictive-forecast", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns forecast payload with default orgId", async () => {
    ;(prisma.client.count as any).mockResolvedValue(12)
    ;(prisma.lead.count as any).mockResolvedValue(30)
    ;(prisma.invoice.findMany as any).mockResolvedValue([])

    const req = new NextRequest("http://localhost/api/revstack/analytics/predictive-forecast")
    const res = await GET(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.forecast).toHaveLength(3)
    expect(data.forecast[0].confidence).toBeGreaterThanOrEqual(40)
  })

  it("honors organizationId when provided", async () => {
    ;(prisma.client.count as any).mockResolvedValue(5)
    ;(prisma.lead.count as any).mockResolvedValue(10)
    ;(prisma.invoice.findMany as any).mockResolvedValue([])

    const req = new NextRequest("http://localhost/api/revstack/analytics/predictive-forecast?organizationId=org-1&months=6")
    const res = await GET(req)
    const data = await res.json()
    expect(data.periodMonths).toBe(6)
    expect(data.forecast).toHaveLength(6)
  })
})
