import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET, POST } from "@/app/api/partners/[id]/commissions/route"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

vi.mock("@/lib/db", () => ({
  prisma: {
    partner: {
      findUnique: vi.fn(),
    },
    referral: {
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/abac-middleware", () => ({
  withAuth: (handler: any) => async (req: NextRequest) => handler(req, { session: { user: { id: "user-1", email: "test@example.com", name: "Test" } } }),
}))

describe("GET /api/partners/[id]/commissions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 without partnerId", async () => {
    const req = new NextRequest("http://localhost/api/partners/p1/commissions")
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it("returns partner ledger", async () => {
    ;(prisma.partner.findUnique as any).mockResolvedValue({ id: "p1", commissionRate: 0.1, tier: "reseller", referrals: [] })
    const req = new NextRequest("http://localhost/api/partners/p1/commissions?partnerId=p1")
    const res = await GET(req)
    const data = await res.json()
    expect(data.partnerId).toBe("p1")
    expect(data.totalCommissionDue).toBe(0)
  })
})

describe("POST /api/partners/[id]/commissions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 without partnerId", async () => {
    const req = new NextRequest("http://localhost/api/partners/x/commissions", { method: "POST", body: JSON.stringify({}), headers: { "Content-Type": "application/json" } })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 without amount", async () => {
    const req = new NextRequest("http://localhost/api/partners/x/commissions", { method: "POST", body: JSON.stringify({ partnerId: "p1" }), headers: { "Content-Type": "application/json" } })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("creates ledger entry", async () => {
    ;(prisma.partner.findUnique as any).mockResolvedValue({ id: "p1", commissionRate: 0.1, tier: "reseller", referrals: [] })
    ;(prisma.referral.create as any).mockResolvedValue({ id: "l1", partnerId: "p1", commissionDue: 100, status: "pending" })

    const req = new NextRequest("http://localhost/api/partners/p1/commissions", {
      method: "POST",
      body: JSON.stringify({ partnerId: "p1", amount: 100, note: "Signing bonus" }),
      headers: { "Content-Type": "application/json" },
    })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(201)
    expect(data.ledger.id).toBe("l1")
  })
})
