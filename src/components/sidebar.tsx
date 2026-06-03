"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { cn, getInitials } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/lib/theme-provider"
import { useLanguage } from "@/lib/i18n/language-context"
import { LanguageToggle } from "@/components/language-toggle"
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  DollarSign,
  Send,
  Newspaper,
  Globe,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Brain,
  BookOpen,
  Flag,
  Mail,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
  Shield,
  Languages,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/operations", label: "Operations Center", icon: Brain },
  { href: "/plan", label: "75-Day Plan", icon: CalendarCheck },
  { href: "/pipeline", label: "Pipeline CRM", icon: Users },
  { href: "/korea", label: "Korea Corridor", icon: Flag },
  { href: "/korea/inquiries", label: "Buyer Inquiries", icon: Mail },
  { href: "/trade", label: "Trade & Export", icon: Globe },
  { href: "/financial", label: "Financial Model", icon: DollarSign },
  { href: "/outreach", label: "Outreach", icon: Send },
  { href: "/content", label: "Content Calendar", icon: Newspaper },
  { href: "/docs", label: "Platform Guides", icon: BookOpen },
]

// Auth/public pages where sidebar should be hidden
const authPages = ["/", "/login", "/signup", "/onboarding", "/needs-assessment", "/terms", "/privacy", "/pricing"]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { theme, toggleTheme } = useTheme()

  // Hide sidebar on auth pages
  if (authPages.some((page) => pathname.startsWith(page))) {
    return null
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-50 flex lg:hidden items-center justify-center w-10 h-10 rounded-md bg-background border shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-16 px-4 border-b border-sidebar-border",
          collapsed && "justify-center px-2"
        )}>
          <Brain className="h-7 w-7 text-primary shrink-0" />
          {!collapsed && (
            <span className="ml-3 font-bold text-lg whitespace-nowrap">Mapato</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {isActive && !collapsed && (
                  <div className="ml-auto w-1.5 h-5 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        {session?.user && (
          <div className="px-2 pb-2 border-t border-sidebar-border pt-2">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-200 hover:bg-sidebar-accent/50",
                  collapsed && "justify-center px-2"
                )}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold text-xs shrink-0 relative">
                  {getInitials(session.user.name || session.user.email || "U")}
                  {session.user.role === "admin" && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-sidebar flex items-center justify-center">
                      <Shield className="h-2 w-2 text-white" />
                    </div>
                  )}
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{session.user.name}</p>
                    <p className="text-xs text-sidebar-foreground/50 truncate">{session.user.email}</p>
                    {session.user.role === "admin" && (
                      <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wider">Admin</span>
                    )}
                  </div>
                )}
              </button>

              {/* User dropdown menu */}
              {showUserMenu && !collapsed && (
                <div className="absolute bottom-full left-2 right-2 mb-1 rounded-lg border border-sidebar-border bg-sidebar shadow-xl overflow-hidden">
                  <div className="p-3 border-b border-sidebar-border">
                    <p className="text-sm font-medium truncate">{session.user.name}</p>
                    <p className="text-xs text-sidebar-foreground/50 truncate">{session.user.email}</p>
                  </div>
                  <div className="p-1 space-y-0.5">
                    {session.user.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                      >
                        <Shield className="h-4 w-4" />
                        Admin Panel
                      </Link>
                    )}
                    <Link
                      href="/onboarding"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Update Profile
                    </Link>
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        signOut({ callbackUrl: "/login" })
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div className="p-2 border-t border-sidebar-border space-y-1">
          {/* Language toggle */}
          <LanguageToggle collapsed={collapsed} />

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              collapsed && "justify-center"
            )}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            {!collapsed && <span className="ml-2">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </Button>

          {/* Collapse toggle (desktop only) */}
          <div className="hidden lg:block">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                collapsed && "justify-center"
              )}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {!collapsed && <span className="ml-2">Collapse</span>}
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
