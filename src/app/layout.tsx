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
import { AnalyticsTracker } from "@/components/analytics-tracker"
import { OrgProvider } from "@/lib/organization"

const inter = Inter({ subsets: ["latin"] })

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://mapato.app"

// Bing Webmaster Tools — replace VERIFICATION_CODE with your actual code from Bing
const BING_VERIFICATION = process.env.NEXT_PUBLIC_BING_VERIFICATION || ""

export const metadata: Metadata = {
  title: {
    default: "Mapato — AI-Powered Revenue Operations for B2B Trading Companies",
    template: "%s | Mapato",
  },
  description: "AI-powered B2B trade automation: qualify leads, automate onboarding, manage trade corridors, and run autonomous agents — like Polsia.com but for B2B trade, at half the success fee.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Mapato",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
  },

  // ── Open Graph (Facebook, LinkedIn, Slack, WhatsApp) ─────
  openGraph: {
    title: "Mapato — AI-Powered Revenue Operations for B2B Trading Companies",
    description: "Qualify leads, automate onboarding, manage trade corridors, and run autonomous AI agents — purpose-built for B2B trade.",
    url: BASE_URL,
    siteName: "Mapato",
    images: [
      {
        url: `${BASE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "Mapato — AI-Powered B2B Trade Automation",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  // ── Twitter / X ─────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "Mapato — AI-Powered Revenue Operations for B2B Trading",
    description: "Automate lead qualification, onboarding, trade corridors, and revenue ops with autonomous AI agents.",
    images: [`${BASE_URL}/opengraph-image`],
    creator: "@mapato",
  },

  // ── Additional SEO ──────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Verification ────────────────────────────────────────
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || "",
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || "",
    ...(BING_VERIFICATION ? { other: { "msvalidate.01": BING_VERIFICATION } } : {}),
  },

  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "Mapato",
    "msapplication-TileColor": "#7C3AED",
    "msapplication-TileImage": "/icons/icon.svg",
    "theme-color": "#7C3AED",
    // Facebook domain verification (optional)
    ...(process.env.NEXT_PUBLIC_FACEBOOK_VERIFICATION
      ? { "fb:app_id": process.env.NEXT_PUBLIC_FACEBOOK_VERIFICATION }
      : {}),
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
                <OrgProvider>
                  <AuthenticatedShell>{children}</AuthenticatedShell>
                </OrgProvider>
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
