import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "@/app/api/revstack/analytics/predictive-forecast/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"

vi.mock("@/lib/db", () => ({
  prisma: {
    retainer: { findMany: vi.fn() },
    invoice: { findMany: vi.fn() },
    lead: { count: vi.fn() },
    client: { count: vi.fn() },
  },
}))

vi.mock("@/lib/abac-middleware", () => ({
  withAuth: (handler: any) => async (req: NextRequest) => handler(req, { session: { user: { id: "user-1", email: "test@example.com", name: "Test" } } }),
}))

describe("GET /api/revstack/analytics/predictive-forecast", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns enriched forecast summary and plan targets", async () => {
    ;(prisma.retainer.findMany as any).mockResolvedValue([])
    ;(prisma.invoice.findMany as any).mockResolvedValue([])
    ;(prisma.lead.count as any).mockResolvedValue(8)
    ;(prisma.client.count as any).mockResolvedValue(4)

    const req = new NextRequest("http://localhost/api/revstack/analytics/predictive-forecast?months=6")
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.summary).toBeDefined()
    expect(data.summary.currentMrr).toBe(0)
    expect(data.summary.predictedMrr12).toBeGreaterThanOrEqual(0)
    expect(data.forecast).toHaveLength(12)
    expect(data.metadata.planTargets).toEqual({ 100: 25000, 150: 45000, 200: 70000, 365: 116000 })
  })

  it("honors organizationId when provided", async () => {
    ;(prisma.retainer.findMany as any).mockResolvedValue([])
    ;(prisma.invoice.findMany as any).mockResolvedValue([])
    ;(prisma.lead.count as any).mockResolvedValue(2)
    ;(prisma.client.count as any).mockResolvedValue(1)

    const req = new NextRequest("http://localhost/api/revstack/analytics/predictive-forecast?organizationId=org-1&months=6")
    const res = await GET(req)
    const data = await res.json()
    expect(data.summary).toBeDefined()
    expect(data.forecast).toHaveLength(12)
  })
})
