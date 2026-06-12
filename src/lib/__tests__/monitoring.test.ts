import { describe, it, expect, beforeEach } from "vitest"
import { getSystemHealth, checkDatabase, checkRedis, checkFlutterwave, checkWati } from "@/lib/monitoring"

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}))

vi.mock("@/lib/hermes/queue", () => ({
  redis: { ping: vi.fn(() => Promise.resolve("PONG")) },
}))

import { prisma } from "@/lib/db"

describe("monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns ok when database responds", async () => {
    ;(prisma.$queryRaw as any).mockResolvedValue([])
    const health = await getSystemHealth()
    expect(health.checks.database.status).toBe("up")
  })

  it("returns down when database throws", async () => {
    ;(prisma.$queryRaw as any).mockRejectedValue(new Error("DB down"))
    const health = await getSystemHealth()
    expect(health.checks.database.status).toBe("down")
    expect(health.status).toBe("error")
  })
})
