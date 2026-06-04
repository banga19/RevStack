/**
 * Sentry Server Configuration
 *
 * Replace SENTRY_DSN with your actual DSN from https://sentry.io
 * Set in .env:
 *   SENTRY_DSN=https://your-dsn@sentry.io/your-project
 */

import * as Sentry from "@sentry/nextjs"

const dsn = process.env.SENTRY_DSN || ""
const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development"

Sentry.init({
  dsn,
  environment,
  tracesSampleRate: environment === "production" ? 0.1 : 1.0,
  enabled: !!dsn,
})
