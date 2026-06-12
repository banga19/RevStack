import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST, GET } from "@/app/api/partners/register/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"

vi.mock("@/lib/db", () => {
  const referralFindManyMock = vi.fn()
  return {
    prisma: {
      partner: {
        findUnique: vi.fn(),
        create: vi.fn(({ data }: any) => Promise.resolve({ id: "partner-1", ...data })),
      },
      user: {
        findUnique: vi.fn(),
      },
      referral: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: referralFindManyMock,
      },
    },
  }
})

vi.mock("@/lib/abac-middleware", () => ({
  withAuth: (handler: any) => async (req: NextRequest) => handler(req, { session: { user: { id: "user-1", email: "test@example.com", name: "Test" } } }),
}))

describe("POST /api/partners/register", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 409 if already registered", async () => {
    ;(prisma.partner.findUnique as any).mockResolvedValue({ id: "partner-1" })
    const req = new NextRequest("http://localhost/api/partners/register", { method: "POST" })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it("creates partner with affiliate tier when no clients", async () => {
    ;(prisma.partner.findUnique as any).mockResolvedValue(null)
    ;(prisma.user.findUnique as any).mockResolvedValue({ id: "user-1", _count: { clients: 0 } })

    const req = new NextRequest("http://localhost/api/partners/register", { method: "POST", body: JSON.stringify({ displayName: "Test" }), headers: { "Content-Type": "application/json" } })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(201)
    expect(data.partner.tier).toBe("affiliate")
  })

  it("creates reseller tier with 10+ clients", async () => {
    ;(prisma.partner.findUnique as any).mockResolvedValue(null)
    ;(prisma.user.findUnique as any).mockResolvedValue({ id: "user-1", _count: { clients: 12 } })

    const req = new NextRequest("http://localhost/api/partners/register", { method: "POST", body: JSON.stringify({ displayName: "Big Seller" }), headers: { "Content-Type": "application/json" } })
    const res = await POST(req)
    const data = await res.json()
    expect(data.partner.tier).toBe("reseller")
  })

  it("creates agency tier with 20+ clients", async () => {
    ;(prisma.partner.findUnique as any).mockResolvedValue(null)
    ;(prisma.user.findUnique as any).mockResolvedValue({ id: "user-1", _count: { clients: 25 } })

    const req = new NextRequest("http://localhost/api/partners/register", { method: "POST", body: JSON.stringify({ displayName: "Agency" }), headers: { "Content-Type": "application/json" } })
    const res = await POST(req)
    const data = await res.json()
    expect(data.partner.tier).toBe("agency")
    expect(data.partner.commissionRate).toBe(0.3)
  })
})

describe("GET /api/partners/register", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns registered false when no partner", async () => {
    ;(prisma.partner.findUnique as any).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/partners/register")
    const res = await GET(req)
    const data = await res.json()
    expect(data.registered).toBe(false)
  })

  it("returns partner profile with stats when registered", async () => {
    ;(prisma.partner.findUnique as any).mockResolvedValue({ id: "p1", referralCode: "ABC", tier: "reseller", createdAt: new Date(), displayName: "Test" })
    ;(prisma.referral.findFirst as any).mockResolvedValue(null)
    ;(prisma.referral.findMany as any).mockResolvedValue([])

    const req = new NextRequest("http://localhost/api/partners/register")
    const res = await GET(req)
    const data = await res.json()
    expect(data.registered).toBe(true)
    expect(data.partner.referralCode).toBe("ABC")
  })
})
