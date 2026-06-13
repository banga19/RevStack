"use client"

import { useUser, useAuth } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Navbar } from "@/components/navbar"
import { PageWrapper } from "@/components/page-wrapper"
import { SiteLoading } from "@/components/site-loading"
import { SubscriptionBanner } from "@/components/subscription-banner"
import { SubscriptionGate } from "@/components/subscription-gate"

const PUBLIC_PATHS = ["/", "/login", "/signup", "/onboarding", "/needs-assessment", "/terms", "/privacy", "/pricing"]

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) return <SiteLoading />

  return (
    <SubscriptionGate>
      <SubscriptionBanner />
      <Navbar />
      <Sidebar />
      <PageWrapper>{children}</PageWrapper>
    </SubscriptionGate>
  )
}
