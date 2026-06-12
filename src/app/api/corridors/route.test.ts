import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST, GET } from "@/app/api/corridors/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"

const CORRIDOR_COUNT = 8

vi.mock("@/lib/db", () => ({
  prisma: {
    onboardingResponse: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/abac-middleware", () => ({
  withAuth: (handler: any) => async (req: NextRequest) => handler(req, { session: { user: { id: "user-1", email: "test@example.com", name: "Test" } } }),
}))

describe("GET /api/corridors", () => {
  it("returns all corridors", async () => {
    const req = new NextRequest("http://localhost/api/corridors")
    const res = await GET(req)
    const data = await res.json()
    expect(data.corridors).toHaveLength(CORRIDOR_COUNT)
  })

  it("filters corridors by country", async () => {
    const req = new NextRequest("http://localhost/api/corridors?country=kenya")
    const res = await GET(req)
    const data = await res.json()
    expect(data.corridors.every((c: any) => c.countries.some((coun: string) => coun === "kenya"))).toBe(true)
  })

  it("filters corridors by id", async () => {
    const req = new NextRequest("http://localhost/api/corridors?corridorId=ke-korea")
    const res = await GET(req)
    const data = await res.json()
    expect(data.corridors).toHaveLength(1)
    expect(data.corridors[0].id).toBe("ke-korea")
  })
})

describe("POST /api/corridors", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 for invalid corridorId", async () => {
    const req = new NextRequest("http://localhost/api/corridors", { method: "POST", body: JSON.stringify({ corridorId: "invalid" }), headers: { "Content-Type": "application/json" } })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("enrolls user by updating onboarding", async () => {
    ;(prisma.onboardingResponse.findFirst as any).mockResolvedValue({ id: "onb-1", userId: "user-1" })
    ;(prisma.onboardingResponse.update as any).mockResolvedValue({ id: "onb-1" })

    const req = new NextRequest("http://localhost/api/corridors", { method: "POST", body: JSON.stringify({ corridorId: "ke-korea", notes: "Pilot" }), headers: { "Content-Type": "application/json" } })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(201)
    expect(data.corridor.id).toBe("ke-korea")
  })

  it("creates onboarding if not found", async () => {
    ;(prisma.onboardingResponse.findFirst as any).mockResolvedValue(null)
    ;(prisma.onboardingResponse.create as any).mockResolvedValue({ id: "new-onb-1" })

    const req = new NextRequest("http://localhost/api/corridors", { method: "POST", body: JSON.stringify({ corridorId: "afcfta-intra" }), headers: { "Content-Type": "application/json" } })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
