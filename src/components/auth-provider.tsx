"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { SessionProvider, useSession } from "next-auth/react"

// ── Organization context ─────────────────────────────────────────

export interface Organization {
  id: string
  name: string
  slug: string
  plan: string
}

interface OrgContextValue {
  organization: Organization | null
  organizations: Organization[]
  loading: boolean
  switchOrg: (orgId: string) => Promise<void>
  refreshOrgs: () => Promise<void>
}

const OrgContext = createContext<OrgContextValue>({
  organization: null,
  organizations: [],
  loading: true,
  switchOrg: async () => {},
  refreshOrgs: async () => {},
})

export function useOrganization() {
  return useContext(OrgContext)
}

// ── Org provider (lives inside the auth session) ─────────────────

function OrgProviderInner({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrgs = useCallback(async () => {
    if (!session?.user) {
      setOrganization(null)
      setOrganizations([])
      setLoading(false)
      return
    }
    try {
      const res = await fetch("/api/organizations")
      const data = await res.json()
      if (data.organizations) {
        setOrganizations(data.organizations)
        const stored = localStorage.getItem("activeOrgId")
        const active = stored
          ? data.organizations.find((o: Organization) => o.id === stored)
          : data.organizations[0]
        setOrganization(active || data.organizations[0] || null)
      }
    } catch {
      // Silently fail — org might not exist yet
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    fetchOrgs()
  }, [fetchOrgs])

  const switchOrg = async (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId)
    if (org) {
      setOrganization(org)
      localStorage.setItem("activeOrgId", orgId)
    }
  }

  return (
    <OrgContext.Provider value={{ organization, organizations, loading, switchOrg, refreshOrgs: fetchOrgs }}>
      {children}
    </OrgContext.Provider>
  )
}

// ── Combined Auth + Org provider ─────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <OrgProviderInner>
        {children}
      </OrgProviderInner>
    </SessionProvider>
  )
}
