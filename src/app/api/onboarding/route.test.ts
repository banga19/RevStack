import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/api/onboarding/route"
import { prisma } from "@/lib/db"

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    onboardingResponse: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock("@/lib/abac-middleware", () => ({
  withAuth: (handler: any) => async (req: NextRequest) => handler(req, { session: { user: { id: "user-1", email: "test@example.com", name: "Test" } } }),
}))

describe("GET /api/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns completed false when no onboarding", async () => {
    ;(prisma.user.findUnique as any).mockResolvedValue({ id: "user-1" })
    ;(prisma.onboardingResponse.findFirst as any).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/onboarding")
    const res = await GET(req)
    const data = await res.json()
    expect(data.completed).toBe(false)
  })

  it("returns onboarding when completed", async () => {
    ;(prisma.user.findUnique as any).mockResolvedValue({ id: "user-1" })
    ;(prisma.onboardingResponse.findFirst as any).mockResolvedValue({ id: "onb-1", completed: true, businessName: "Test Co" })

    const req = new NextRequest("http://localhost/api/onboarding")
    const res = await GET(req)
    const data = await res.json()
    expect(data.completed).toBe(true)
    expect(data.businessName).toBe("Test Co")
  })

  it("returns completed false when user not found", async () => {
    ;(prisma.user.findUnique as any).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/onboarding")
    const res = await GET(req)
    const data = await res.json()
    expect(data.completed).toBe(false)
  })
})
