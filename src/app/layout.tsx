import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ClientShell } from "@/components/client-shell"

import { allSchemas } from "@/components/json-ld"

export const viewport: Viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: {
    default:
      "Mapato — AI-Powered Revenue Operations for B2B Trading Companies",
    template: "%s | Mapato",
  },
  description:
    "AI-powered B2B trade automation: qualify leads via WhatsApp, automate onboarding, manage trade corridors (Korea-Africa), track compliance certifications, and run autonomous AI agents 24/7.",
  metadataBase: process.env.NEXT_PUBLIC_BASE_URL
    ? new URL(process.env.NEXT_PUBLIC_BASE_URL)
    : new URL("https://mapato.app"),
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon.svg", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mapato",
  },
  applicationName: "Mapato",
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  // ── Open Graph / Social ────────────────────────────────
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Mapato",
    title: "Mapato — AI Revenue Operations for B2B Trade",
    description:
      "AI-powered B2B trade automation: qualify leads, automate onboarding, manage Korea-Africa trade corridors, and run autonomous agents.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://mapato.app",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Mapato — AI-Powered B2B Trade Automation Platform",
      },
    ],
  },
  // ── Twitter Card ────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "Mapato — AI Revenue Operations for B2B Trade",
    description:
      "AI-powered B2B trade automation: qualify leads, automate onboarding, manage Korea-Africa trade corridors, and run autonomous AI agents.",
    images: ["/opengraph-image"],
  },
  // ── AEO / AI Search Optimization ─────────────────────────
  keywords: [
    "B2B trade automation",
    "AI lead qualification",
    "WhatsApp Business API",
    "Africa trade platform",
    "Korea Africa trade corridor",
    "export readiness score",
    "trade compliance tracking",
    "autonomous AI agents",
    "B2B revenue operations",
    "import export software",
    "African exporters",
    "supplier matching platform",
    "Polsia alternative",
    "trade finance",
    "Mapato",
  ],
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
  category: "technology",
  classification: "B2B SaaS",
  alternates: {
    canonical: process.env.NEXT_PUBLIC_BASE_URL || "https://mapato.app",
  },
}

const inter = Inter({ subsets: ["latin"] })

// ── JSON-LD Structured Data ─────────────────────────────────

function JsonLd() {
  const schemas = allSchemas()
  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Preconnect to analytics domains */}
        <link
          rel="preconnect"
          href="https://us.i.posthog.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <JsonLd />
          <ClientShell>{children}</ClientShell>
      </body>
    </html>
  )
}
