import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/lib/theme-provider"
import { AuthProvider } from "@/components/auth-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RevStack — Automated Revenue Operations for Solo Businesses",
  description: "CRM, outreach, content, and financial tracking — one system to manage every deal, every client, every dollar.",
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
              <Sidebar />
              <main className="lg:pl-64 min-h-screen transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 lg:pt-8">
                  {children}
                </div>
              </main>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
