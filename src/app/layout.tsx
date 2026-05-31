import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AI Business OS - 75-Day Plan to $22,500/mo",
  description: "One-person AI business automation system for B2B lead qualification, follow-ups, and client onboarding",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <TooltipProvider>
          <Sidebar />
          <main className="lg:pl-64 min-h-screen transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 lg:pt-8">
              {children}
            </div>
          </main>
        </TooltipProvider>
      </body>
    </html>
  )
}
