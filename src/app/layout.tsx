"use client"

/**
 * Root Layout — Client Component
 *
 * Inlines ALL client-side providers directly instead of using a separate
 * Providers wrapper module. This eliminates cross-file module resolution
 * issues that were causing 'Element type is invalid' errors in Next.js 16.
 */

import { useEffect, useRef } from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/lib/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/components/auth-provider"
import { LanguageProvider } from "@/lib/i18n/language-context"
import { AnalyticsTracker } from "@/components/analytics-tracker"
import { CookieConsent } from "@/components/cookie-consent"
import { PushNotificationManager } from "@/components/push-notification-manager"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { AuthenticatedShell } from "@/components/authenticated-shell"

const inter = Inter({ subsets: ["latin"] })

const BASE_URL = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_BASE_URL) || "https://mapato.app"

function setMeta(nameOrProp: string, content: string, useProperty = nameOrProp.includes(":")) {
  const attr = useProperty ? "property" : "name"
  let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`)
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute(attr, nameOrProp)
    document.head.appendChild(el)
  }
  el.setAttribute("content", content)
}

function setLink(rel: string, href: string, extra?: Record<string, string>) {
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement("link")
    el.setAttribute("rel", rel)
    document.head.appendChild(el)
  }
  el.setAttribute("href", href)
  if (extra) {
    for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v)
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const injected = useRef(false)

  useEffect(() => {
    if (injected.current) return
    injected.current = true

    document.title = "Mapato — AI-Powered Revenue Operations for B2B Trading Companies"
    setMeta("description", "AI-powered B2B trade automation: qualify leads, automate onboarding, manage trade corridors, and run autonomous agents.")
    setMeta("og:title", "Mapato — AI-Powered Revenue Operations for B2B Trading Companies")
    setMeta("og:description", "Qualify leads, automate onboarding, manage trade corridors, and run autonomous AI agents — purpose-built for B2B trade.")
    setMeta("og:url", BASE_URL)
    setMeta("og:image", `${BASE_URL}/opengraph-image`)
    setMeta("og:type", "website")
    setMeta("og:site_name", "Mapato")
    setMeta("twitter:card", "summary_large_image")
    setMeta("twitter:title", "Mapato — AI-Powered Revenue Operations for B2B Trading")
    setMeta("twitter:description", "Automate lead qualification, onboarding, trade corridors, and revenue ops with autonomous AI agents.")
    setMeta("twitter:image", `${BASE_URL}/opengraph-image`)
    setMeta("twitter:creator", "@mapato")
    setLink("manifest", "/manifest.json")
    setLink("icon", "/favicon.ico")
    setLink("icon", "/icons/icon.svg", { type: "image/svg+xml" })
    setMeta("theme-color", "#7C3AED")
    setMeta("mobile-web-app-capable", "yes")
    setMeta("apple-mobile-web-app-title", "Mapato")
    setMeta("msapplication-TileColor", "#7C3AED")
    setMeta("msapplication-TileImage", "/icons/icon.svg")
    setMeta("robots", "index, follow")
    const bingVerification = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_BING_VERIFICATION) || ""
    if (bingVerification) setMeta("msvalidate.01", bingVerification, false)
    const googleVerification = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION) || ""
    if (googleVerification) setMeta("google-site-verification", googleVerification, false)
  }, [])

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <TooltipProvider>
            <AuthProvider>
              <LanguageProvider>
                <AuthenticatedShell>{children}</AuthenticatedShell>
                <AnalyticsTracker />
                <CookieConsent />
                <PushNotificationManager />
                <PwaInstallPrompt />
              </LanguageProvider>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
