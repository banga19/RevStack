"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { cn, getInitials } from "@/lib/utils"
import { useTheme } from "@/lib/theme-provider"
import { useLanguage } from "@/lib/i18n/language-context"
import { LanguageToggle } from "@/components/language-toggle"
import {
  Brain,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  Shield,
  User,
  LayoutDashboard,
  ChevronDown,
  Globe,
  Send,
  DollarSign,
  BookOpen,
  Flag,
} from "lucide-react"

const topNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/operations", label: "Operations", icon: Brain },
  { href: "/financial", label: "Financial", icon: DollarSign },
  { href: "/korea", label: "Korea", icon: Flag },
  { href: "/outreach", label: "Outreach", icon: Send },
  { href: "/docs", label: "Guides", icon: BookOpen },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang } = useLanguage()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur border-b">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-muted"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Mapato</span>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-1">
          {topNavItems.slice(0, 5).map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex"
            onClick={() => setLang(lang === "en" ? "sw" : "en")}
          >
            <Globe className="h-4 w-4 mr-1" />
            {lang.toUpperCase()}
          </Button>

          <LanguageToggle />

          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              className="flex items-center gap-2"
              onClick={() => setUserOpen((o) => !o)}
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs">
                {getInitials(session?.user?.name || session?.user?.email || "U")}
              </div>
              <span className="hidden md:inline text-sm">{session?.user?.name}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>

            {userOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 rounded-md border bg-popover shadow-md z-50">
                  <div className="p-3 border-b">
                    <p className="text-sm font-medium truncate">{session?.user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
                    {session?.user?.role === "admin" && (
                      <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Admin</span>
                    )}
                  </div>
                  <div className="p-1">
                    {session?.user?.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setUserOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted"
                      >
                        <Shield className="h-4 w-4" />
                        Admin Panel
                      </Link>
                    )}
                    <Link
                      href="/onboarding"
                      onClick={() => setUserOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        setUserOpen(false)
                        window.location.href = "/login"
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t bg-background">
          <nav className="flex flex-col p-2 gap-1">
            {topNavItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
