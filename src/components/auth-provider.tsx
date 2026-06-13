"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { ClerkProvider, useAuth, useUser } from "@clerk/nextjs"

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

function OrgProviderInner({ children }: { children: ReactNode }) {
  const { isSignedIn, userId } = useAuth()
  const { user } = useUser()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrgs = useCallback(async () => {
    if (!isSignedIn || !userId) {
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
      // Org may not exist yet; leave state empty
    } finally {
      setLoading(false)
    }
  }, [isSignedIn, userId])

  useEffect(() => {
    fetchOrgs()
  }, [fetchOrgs])

  const switchOrg = async (orgId: string) => {
    const org = organizations.find((o: Organization) => o.id === orgId)
    if (org) {
      setOrganization(org)
      localStorage.setItem("activeOrgId", orgId)
    }
  }

  const refreshOrgs = useCallback(fetchOrgs, [fetchOrgs])

  return (
    <OrgContext.Provider value={{ organization, organizations, loading, switchOrg, refreshOrgs }}>
      {children}
    </OrgContext.Provider>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <OrgProviderInner>
        {children}
      </OrgProviderInner>
    </ClerkProvider>
  )
}
