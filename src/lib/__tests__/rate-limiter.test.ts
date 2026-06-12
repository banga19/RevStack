import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextResponse } from "next/server"
import { checkRateLimit, RateLimitError, getDefaultLimits, ipFromRequest } from "@/lib/rate-limiter"
import { applySecurityHeaders } from "@/lib/security-headers"

describe("rate-limiter integration with security headers", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it("throws RateLimitError when limit exceeded", () => {
    checkRateLimit("1.2.3.4", { pathPrefix: "/api/test", max: 1, windowMs: 60_000 })
    expect(() => checkRateLimit("1.2.3.4", { pathPrefix: "/api/test", max: 1, windowMs: 60_000 })).toThrow(RateLimitError)
  })

  it("returns remaining requests when within limit", () => {
    expect(checkRateLimit("1.2.3.4", { pathPrefix: "/api/ok", max: 5, windowMs: 60_000 })).toBe(4)
  })

  it("applies security headers to error responses", async () => {
    const res = new NextResponse(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    const secured = applySecurityHeaders(res, { enableCsp: true, enableHsts: true })
    expect(secured.headers.get("Content-Security-Policy")).toBeTruthy()
    expect(secured.headers.get("Strict-Transport-Security")).toBeTruthy()
  })
})

describe("ipFromRequest", () => {
  it("reads x-forwarded-for first", () => {
    const req = new Request("http://localhost/", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } })
    expect(ipFromRequest(req)).toBe("1.2.3.4")
  })

  it("falls back to x-real-ip", () => {
    const req = new Request("http://localhost/", { headers: { "x-real-ip": "10.0.0.1" } })
    expect(ipFromRequest(req)).toBe("10.0.0.1")
  })

  it("returns unknown when absent", () => {
    const req = new Request("http://localhost/")
    expect(ipFromRequest(req)).toBe("unknown")
  })
})
