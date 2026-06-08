"use client"

import { ThemeProvider } from "@/lib/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/components/auth-provider"
import { LanguageProvider } from "@/lib/i18n/language-context"
import { AuthenticatedShell } from "@/components/authenticated-shell"
import { CookieConsent } from "@/components/cookie-consent"
import { PushNotificationManager } from "@/components/push-notification-manager"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { NotificationProvider } from "@/components/notification-provider"

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <LanguageProvider>
            <NotificationProvider>
              <AuthenticatedShell>{children}</AuthenticatedShell>
            </NotificationProvider>
            <CookieConsent />
            <PushNotificationManager />
            <PwaInstallPrompt />
          </LanguageProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
