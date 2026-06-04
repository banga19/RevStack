"use client"

import { useSession } from "next-auth/react"
import { Sidebar } from "@/components/sidebar"
import { Navbar } from "@/components/navbar"
import { PageWrapper } from "@/components/page-wrapper"
import { SiteLoading } from "@/components/site-loading"
import { SubscriptionBanner } from "@/components/subscription-banner"
import { SubscriptionGate } from "@/components/subscription-gate"

const PUBLIC_PATHS = ["/", "/login", "/signup", "/onboarding", "/needs-assessment", "/terms", "/privacy", "/pricing"]

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  if (status === "loading") return <SiteLoading />

  if (!session?.user) return <main className="min-h-screen">{children}</main>

  return (
    <SubscriptionGate>
      <SubscriptionBanner />
      <Navbar />
      <Sidebar />
      <PageWrapper>{children}</PageWrapper>
    </SubscriptionGate>
  )
}
