/**
 * Cloudflare Turnstile Widget — React Component
 *
 * Renders a privacy-friendly CAPTCHA alternative on forms.
 * Uses Cloudflare's invisible challenge by default.
 *
 * Docs: https://developers.cloudflare.com/turnstile/get-started/
 *
 * Usage:
 *   <TurnstileWidget onToken={(token) => setTurnstileToken(token)} />
 *
 * The `cf-turnstile-response` token is passed to the form submit handler
 * and sent to the API route for server-side verification.
 */

"use client"

import { useEffect, useRef, useCallback, useState } from "react"

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string
          callback?: (token: string) => void
          "expired-callback"?: () => void
          "error-callback"?: () => void
          theme?: "light" | "dark" | "auto"
          size?: "normal" | "compact" | "invisible" | "flexible"
          tabindex?: number
          action?: string
          cdata?: string
        }
      ) => string | undefined
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
      getResponse: (widgetId: string) => string | undefined
    }
  }
}

interface TurnstileWidgetProps {
  /** Called with the token when the challenge is completed */
  onToken: (token: string) => void
  /** Called when the token expires (user needs to re-verify) */
  onExpire?: () => void
  /** Called when an error occurs */
  onError?: () => void
  /** Visual theme */
  theme?: "light" | "dark" | "auto"
  /** Widget size */
  size?: "normal" | "compact" | "invisible" | "flexible"
  /** Custom action name for analytics */
  action?: string
}

export function TurnstileWidget({
  onToken,
  onExpire,
  onError,
  theme = "auto",
  size = "flexible",
  action,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | undefined>(undefined)
  const [loaded, setLoaded] = useState(false)

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  // Load the Turnstile script dynamically
  useEffect(() => {
    if (!siteKey) return

    // Check if script is already loaded
    if (document.querySelector('script[src*="turnstile"]')) {
      setLoaded(true)
      return
    }

    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    script.async = true
    script.defer = true
    script.onload = () => setLoaded(true)
    document.head.appendChild(script)

    return () => {
      // Cleanup widget on unmount
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
    }
  }, [siteKey])

  // Render the widget once the script is loaded
  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !siteKey) return

    // Remove existing widget if any
    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current)
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onToken,
      "expired-callback": () => {
        onExpire?.()
      },
      "error-callback": () => {
        onError?.()
      },
      theme,
      size,
      ...(action ? { action } : {}),
    })
  }, [siteKey, onToken, onExpire, onError, theme, size, action])

  useEffect(() => {
    if (loaded) {
      // Small delay to ensure the container is in the DOM
      const timer = setTimeout(renderWidget, 100)
      return () => clearTimeout(timer)
    }
  }, [loaded, renderWidget])

  if (!siteKey) {
    // Invisible when not configured (e.g., local dev without env vars)
    return null
  }

  return (
    <div className="flex justify-center">
      <div ref={containerRef} />
    </div>
  )
}
