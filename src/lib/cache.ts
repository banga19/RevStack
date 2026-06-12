/**
 * Caching helpers for API responses and data fetching.
 *
 * Provides:
 *  - Standard Cache-Control presets for public, private, and no-cache responses.
 *  - Next.js route handler cache headers.
 *  - Redis-backed response cache for expensive, low-churn queries.
 */

export type CacheScope = "public" | "private" | "no-store"

export interface CacheConfig {
  scope: CacheScope
  maxAgeSeconds?: number
  staleWhileRevalidateSeconds?: number
  sMaxAgeSeconds?: number
  mustRevalidate?: boolean
  etag?: boolean
}

const DEFAULT_PUBLIC: CacheConfig = {
  scope: "public",
  maxAgeSeconds: 60,
  staleWhileRevalidateSeconds: 300,
  sMaxAgeSeconds: 60,
}

const DEFAULT_PRIVATE: CacheConfig = {
  scope: "private",
  maxAgeSeconds: 0,
  mustRevalidate: true,
}

const DEFAULT_NO_STORE: CacheConfig = {
  scope: "no-store",
  maxAgeSeconds: 0,
}

export function buildCacheControl(config: CacheConfig = DEFAULT_PUBLIC): string {
  const parts: string[] = [config.scope]

  if (config.scope === "no-store") {
    return "no-store, no-cache, must-revalidate, max-age=0"
  }

  if (config.maxAgeSeconds !== undefined) {
    parts.push(`max-age=${config.maxAgeSeconds}`)
  }

  if (config.staleWhileRevalidateSeconds !== undefined) {
    parts.push(`stale-while-revalidate=${config.staleWhileRevalidateSeconds}`)
  }

  if (config.sMaxAgeSeconds !== undefined) {
    parts.push(`s-maxage=${config.sMaxAgeSeconds}`)
  }

  if (config.mustRevalidate) {
    parts.push("must-revalidate")
  }

  return parts.join(", ")
}

export const PUBLIC_1M = buildCacheControl({
  scope: "public",
  maxAgeSeconds: 60,
  staleWhileRevalidateSeconds: 300,
  sMaxAgeSeconds: 60,
})

export const PUBLIC_1H = buildCacheControl({
  scope: "public",
  maxAgeSeconds: 3600,
  staleWhileRevalidateSeconds: 600,
  sMaxAgeSeconds: 3600,
})

export const PUBLIC_24H = buildCacheControl({
  scope: "public",
  maxAgeSeconds: 86400,
  staleWhileRevalidateSeconds: 3600,
  sMaxAgeSeconds: 86400,
})

export const PRIVATE_NO_CACHE = buildCacheControl(DEFAULT_PRIVATE)
export const NO_STORE = buildCacheControl(DEFAULT_NO_STORE)

export async function applyCacheHeaders(response: Response, config: CacheConfig = DEFAULT_PUBLIC): Promise<Response> {
  const headers = new Headers(response.headers)
  headers.set("Cache-Control", buildCacheControl(config))
  if (config.etag) {
    const cloned = response.clone()
    const body = await cloned.text().catch(() => "")
    const hash = `"${Buffer.from(body).toString("base64").slice(0, 16)}"`
    headers.set("ETag", hash)
    headers.set("Vary", "Accept-Encoding, Authorization")
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
