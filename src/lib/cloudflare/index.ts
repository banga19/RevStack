/**
 * Cloudflare Integration
 *
 * Central export point for all Cloudflare-related modules.
 *
 * Services integrated:
 *   - Turnstile — Bot protection (signup forms)
 *   - R2 — Object storage (documents, images)
 *   - Images — Edge image optimization (via remotePatterns in next.config.js)
 *   - DNS/CDN — Traffic proxying (domain nameserver configuration, CSP updates)
 *   - Workers + KV — Edge compute (deployed via Wrangler CLI)
 *
 * Docs: https://developers.cloudflare.com/
 */

export {
  verifyTurnstileToken,
  requireTurnstileToken,
  TurnstileError,
} from "./turnstile"
export type { TurnstileVerifyResult } from "./turnstile"

export {
  isR2Configured,
  uploadToR2,
  getFromR2,
  deleteFromR2,
  listR2Objects,
  getSignedR2Url,
} from "./r2"
export type { R2UploadOptions, R2UploadResult, R2Object } from "./r2"
