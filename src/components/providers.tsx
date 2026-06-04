"use client"

/**
 * Single client-side providers wrapper.
 *
 * Next.js 16 (React 19) has stricter rules about importing multiple client
 * components directly in a server component layout. This file bundles all
 * client-side context providers into a single import boundary.
 */

import type { ReactNode } from "react"
import { ThemeProvider } from "@/lib/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/components/auth-provider"
import { LanguageProvider } from "@/lib/i18n/language-context"
import { AnalyticsTracker } from "@/components/analytics-tracker"
import { CookieConsent } from "@/components/cookie-consent"
import { PushNotificationManager } from "@/components/push-notification-manager"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { AuthenticatedShell } from "@/components/authenticated-shell"

export function Providers({ children }: { children: ReactNode }) {
  return (
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
  )
}
