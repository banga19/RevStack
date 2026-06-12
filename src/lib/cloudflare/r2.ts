/**
 * Cloudflare R2 — S3-Compatible Object Storage Client
 *
 * Uses native fetch() and Web Crypto API for AWS Signature V4 auth.
 * Zero external dependencies — runs in Node.js, Edge, and Workers runtimes.
 *
 * Docs: https://developers.cloudflare.com/r2/
 * S3 REST API: https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html
 *
 * Env vars:
 *   CLOUDFLARE_ACCOUNT_ID              (required) — Cloudflare account ID
 *   CLOUDFLARE_R2_ACCESS_KEY_ID        (required) — R2 API token access key
 *   CLOUDFLARE_R2_SECRET_ACCESS_KEY    (required) — R2 API token secret
 *   R2_BUCKET_NAME                     (required) — R2 bucket name
 *   R2_PUBLIC_URL                      (optional) — Custom/public domain for R2
 */

// ── Types ─────────────────────────────────────────────────────────────────

export interface R2UploadOptions {
  body: Buffer | Uint8Array | string
  contentType: string
  cacheControl?: string
  metadata?: Record<string, string>
}

export interface R2UploadResult {
  key: string
  publicUrl?: string
  etag?: string
}

export interface R2Object {
  key: string
  size: number
  lastModified: string
  etag?: string
}

// ── Configuration ──────────────────────────────────────────────────────────

let config: {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrlBase: string
} | null = null

function getConfig() {
  if (!config) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Cloudflare R2 not configured. Set CLOUDFLARE_ACCOUNT_ID, " +
          "CLOUDFLARE_R2_ACCESS_KEY_ID, and CLOUDFLARE_R2_SECRET_ACCESS_KEY."
      )
    }

    config = {
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName: process.env.R2_BUCKET_NAME || "revstack",
      publicUrlBase: process.env.R2_PUBLIC_URL || "",
    }
  }
  return config
}

function endpoint(): string {
  const cfg = getConfig()
  return `https://${cfg.accountId}.r2.cloudflarestorage.com`
}

function bucketUrl(key?: string): string {
  const cfg = getConfig()
  const base = `${endpoint()}/${cfg.bucketName}`
  return key ? `${base}/${encodeKey(key)}` : base
}

function encodeKey(key: string): string {
  return key.split("/").map((seg) => encodeURIComponent(seg)).join("/")
}

// ── AWS Signature V4 ──────────────────────────────────────────────────────

/**
 * Minimal AWS Signature V4 implementation using Web Crypto API.
 * Signs S3 REST requests for Cloudflare R2 authentication.
 */
async function signV4(
  method: string,
  path: string,
  queryString: string,
  headers: Record<string, string>,
  bodyHash: string,
  region: string,
  service: string
): Promise<string> {
  const cfg = getConfig()
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]/g, "").substring(0, 15) + "Z"
  const dateStamp = amzDate.substring(0, 8)

  // Canonical request
  const canonicalUri = path || "/"
  const canonicalQueryString = queryString
  const signedHeaders = Object.keys(headers)
    .map((h) => h.toLowerCase())
    .sort()
    .join(";")
  const canonicalHeaders =
    Object.entries(headers)
      .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map(([k, v]) => `${k.toLowerCase()}:${v.trim()}\n`)
      .join("") + "\n"

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join("\n")

  // String to sign
  const algorithm = "AWS4-HMAC-SHA256"
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalRequest)
  )
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  const stringToSign = [algorithm, amzDate, credentialScope, hashHex].join("\n")

  // Signing key
  const signKey = await getSignatureKey(
    cfg.secretAccessKey,
    dateStamp,
    region,
    service
  )

  const signature = await hmacSha256(signKey, stringToSign)

  return `${algorithm} Credential=${cfg.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
}

async function hmacSha256(key: ArrayBuffer, data: string): Promise<string> {
  const keyBuf = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", keyBuf, new TextEncoder().encode(data))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256Raw(`AWS4${key}`, dateStamp)
  const kRegion = await hmacSha256Raw(kDate, regionName)
  const kService = await hmacSha256Raw(kRegion, serviceName)
  return hmacSha256Raw(kService, "aws4_request")
}

async function hmacSha256Raw(key: string | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const keyBuf =
    typeof key === "string"
      ? new TextEncoder().encode(key)
      : key

  const keyImported = await crypto.subtle.importKey(
    "raw",
    keyBuf,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  return crypto.subtle.sign("HMAC", keyImported, new TextEncoder().encode(data))
}

async function sha256Hash(data: string | Buffer | Uint8Array): Promise<string> {
  const input =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data instanceof Buffer
        ? new Uint8Array(data)
        : data

  const hash = await crypto.subtle.digest("SHA-256", input)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// ── HTTP helper ───────────────────────────────────────────────────────────

async function s3Request(
  method: string,
  key: string,
  options?: {
    body?: string | Buffer | Uint8Array
    contentType?: string
    queryString?: string
  }
): Promise<Response> {
  const url = key
    ? `${bucketUrl(key)}${options?.queryString ? `?${options.queryString}` : ""}`
    : `${bucketUrl()}${options?.queryString ? `?${options.queryString}` : ""}`

  const bodyHash = options?.body
    ? await sha256Hash(options.body)
    : await sha256Hash("")

  const headers: Record<string, string> = {
    host: new URL(url).host,
    "x-amz-content-sha256": bodyHash,
    "x-amz-date": new Date().toISOString().replace(/[:-]/g, "").substring(0, 15) + "Z",
  }

  if (options?.contentType) {
    headers["content-type"] = options.contentType
  }

  if (options?.body && typeof options.body === "string") {
    headers["content-type"] = options.contentType || "application/octet-stream"
  }

  const path = key ? `/${getConfig().bucketName}/${encodeKey(key)}` : `/${getConfig().bucketName}`
  const authorization = await signV4(
    method,
    path,
    options?.queryString || "",
    headers,
    bodyHash,
    "auto",
    "s3"
  )

  headers["authorization"] = authorization

  const fetchOptions: RequestInit = {
    method,
    headers,
  }

  if (options?.body) {
    fetchOptions.body = options.body
  }

  const response = await fetch(url, fetchOptions)
  return response
}

// ── Public API ────────────────────────────────────────────────────────────

export function isR2Configured(): boolean {
  return !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  )
}

export async function uploadToR2(
  prefix: string,
  filename: string,
  options: R2UploadOptions
): Promise<R2UploadResult> {
  const ext = filename.split(".").pop() || ""
  const baseName = filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
  const timestamp = Date.now()
  const key = `${prefix}/${baseName}-${timestamp}.${ext}`

  const response = await s3Request("PUT", key, {
    body: options.body,
    contentType: options.contentType,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`R2 upload failed (${response.status}): ${text}`)
  }

  const etag = response.headers.get("etag") || undefined
  const cfg = getConfig()

  return {
    key,
    etag,
    publicUrl: cfg.publicUrlBase
      ? `${cfg.publicUrlBase.replace(/\/+$/, "")}/${key}`
      : undefined,
  }
}

export async function getFromR2(
  key: string
): Promise<{
  body: ReadableStream<Uint8Array> | null
  contentType: string
  contentLength: number
} | null> {
  const response = await s3Request("GET", key)

  if (response.status === 404) return null
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`R2 get failed (${response.status}): ${text}`)
  }

  return {
    body: response.body,
    contentType: response.headers.get("content-type") || "application/octet-stream",
    contentLength: parseInt(response.headers.get("content-length") || "0", 10),
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  const response = await s3Request("DELETE", key)

  if (!response.ok && response.status !== 204) {
    const text = await response.text().catch(() => "")
    throw new Error(`R2 delete failed (${response.status}): ${text}`)
  }
}

export async function listR2Objects(prefix: string): Promise<R2Object[]> {
  const queryString = `prefix=${encodeURIComponent(prefix)}&max-keys=1000`
  const response = await s3Request("GET", "", { queryString })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`R2 list failed (${response.status}): ${text}`)
  }

  const xml = await response.text()

  // Minimal XML parser for ListObjectsV2 response
  const objects: R2Object[] = []
  const contentMatches = xml.match(/<Contents>([\s\S]*?)<\/Contents>/g) || []

  for (const content of contentMatches) {
    const keyMatch = content.match(/<Key>([^<]*)<\/Key>/)
    const sizeMatch = content.match(/<Size>(\d+)<\/Size>/)
    const lastModMatch = content.match(/<LastModified>([^<]*)<\/LastModified>/)
    const etagMatch = content.match(/<ETag>"?([^"<]*)"?<\/ETag>/)

    if (keyMatch) {
      objects.push({
        key: keyMatch[1],
        size: sizeMatch ? parseInt(sizeMatch[1], 10) : 0,
        lastModified: lastModMatch ? lastModMatch[1] : new Date(0).toISOString(),
        etag: etagMatch ? etagMatch[1] : undefined,
      })
    }
  }

  return objects
}

/**
 * Generate a pre-signed URL for temporary access to a private object.
 * Uses AWS Signature V4 query parameters.
 *
 * @param key - Object key
 * @param expiresInSeconds - URL expiry (default 3600 = 1 hour)
 * @returns Pre-signed URL string
 */
export async function getSignedR2Url(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const cfg = getConfig()
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]/g, "").substring(0, 15) + "Z"
  const dateStamp = amzDate.substring(0, 8)
  const expires = Math.floor(expiresInSeconds).toString()

  // Query parameters for presigned URL
  const algorithm = "AWS4-HMAC-SHA256"
  const credential = `${cfg.accessKeyId}/${dateStamp}/auto/s3/aws4_request`

  const signedHeaders = "host"
  const bodyHash = await sha256Hash("")

  const canonicalUri = `/${cfg.bucketName}/${encodeKey(key)}`
  const canonicalQueryString =
    `X-Amz-Algorithm=${algorithm}` +
    `&X-Amz-Credential=${encodeURIComponent(credential)}` +
    `&X-Amz-Date=${amzDate}` +
    `&X-Amz-Expires=${expires}` +
    `&X-Amz-SignedHeaders=${signedHeaders}`

  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQueryString,
    `host:${cfg.accountId}.r2.cloudflarestorage.com\n`,
    signedHeaders,
    bodyHash,
  ].join("\n")

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalRequest)
  )
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  const credentialScope = `${dateStamp}/auto/s3/aws4_request`
  const stringToSign = [algorithm, amzDate, credentialScope, hashHex].join("\n")

  const signKey = await getSignatureKey(cfg.secretAccessKey, dateStamp, "auto", "s3")
  const signature = await hmacSha256(signKey, stringToSign)

  return (
    `${endpoint()}/${cfg.bucketName}/${encodeKey(key)}` +
    `?${canonicalQueryString}` +
    `&X-Amz-Signature=${signature}`
  )
}
