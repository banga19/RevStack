import { describe, it, expect, vi, beforeEach } from "vitest"
import { buildCacheControl, applyCacheHeaders, PUBLIC_1M, PUBLIC_1H, PUBLIC_24H, PRIVATE_NO_CACHE, NO_STORE } from "@/lib/cache"

describe("cache", () => {
  it("builds public cache control string", () => {
    expect(buildCacheControl({ scope: "public", maxAgeSeconds: 60, staleWhileRevalidateSeconds: 300 })).toContain("public")
    expect(buildCacheControl({ scope: "public", maxAgeSeconds: 60, staleWhileRevalidateSeconds: 300 })).toContain("max-age=60")
  })

  it("builds private cache control string", () => {
    expect(PRIVATE_NO_CACHE).toContain("private")
    expect(PRIVATE_NO_CACHE).toContain("must-revalidate")
  })

  it("builds no-store correctly", () => {
    expect(NO_STORE).toBe("no-store, no-cache, must-revalidate, max-age=0")
  })

  it("applies cache headers to a Response", async () => {
    const res = new Response("ok", { status: 200 })
    const out = await applyCacheHeaders(res, { scope: "public", maxAgeSeconds: 60, etag: true })
    expect(out.headers.get("Cache-Control")).toContain("public")
    expect(out.headers.get("ETag")).toBeTruthy()
  })
})
