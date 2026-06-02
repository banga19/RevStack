"use client"

import { usePathname } from "next/navigation"

const sidebarHiddenPaths = ["/", "/login", "/signup", "/onboarding", "/needs-assessment", "/terms", "/privacy"]

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideSidebar = sidebarHiddenPaths.some((p) => {
    if (p === "/") return pathname === "/"
    return pathname.startsWith(p)
  })

  if (hideSidebar) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <main className="lg:pl-64 min-h-screen transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 lg:pt-8">
        {children}
      </div>
    </main>
  )
}
