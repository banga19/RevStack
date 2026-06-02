import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { PageWrapper } from "@/components/page-wrapper"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/lib/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { LanguageProvider } from "@/lib/i18n/language-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Mapato — AI-Powered Revenue Operations for B2B Trading Companies",
  description: "Automate lead qualification, client onboarding, and follow-ups across WhatsApp & email. sokogateOS — your AI operating system for B2B trade growth.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const theme = localStorage.getItem("theme") || "dark";
            document.documentElement.className = theme;
          } catch {}
        `}} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <TooltipProvider>
            <AuthProvider>
              <LanguageProvider>
                <Sidebar />
                <PageWrapper>{children}</PageWrapper>
              </LanguageProvider>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
