import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { AuthenticatedShell } from "@/components/authenticated-shell"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/lib/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { LanguageProvider } from "@/lib/i18n/language-context"
import { CookieConsent } from "@/components/cookie-consent"
import { PushNotificationManager } from "@/components/push-notification-manager"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Mapato — AI-Powered Revenue Operations for B2B Trading Companies — Like Polsia.com, but for B2B Trade",
  description: "A seamless, everlasting, and euphoric AI experience that generates revenue for your trading business. Like polsia.com for e-commerce, but purpose-built for B2B trade at half the success fee. Built in collaboration with Sokogate.com and UltimoTradingLtd.co.ke.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Mapato",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "Mapato",
    "msapplication-TileColor": "#7C3AED",
    "msapplication-TileImage": "/icons/icon.svg",
    "theme-color": "#7C3AED",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              const theme = localStorage.getItem("theme") || "dark";
              document.documentElement.className = theme;
            } catch {}
          `}
        </Script>
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <TooltipProvider>
            <AuthProvider>
              <LanguageProvider>
                <AuthenticatedShell>{children}</AuthenticatedShell>
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
