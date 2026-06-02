"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Cookie, X } from "lucide-react"

const COOKIE_CONSENT_KEY = "mapato-cookie-consent"

type CookieConsentStatus = "accepted" | "rejected" | null

export function CookieConsent() {
  const [status, setStatus] = useState<CookieConsentStatus>(null)
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY) as CookieConsentStatus
      setStatus(stored)
      if (!stored) {
        // Show consent banner after a short delay
        const timer = setTimeout(() => setVisible(true), 500)
        return () => clearTimeout(timer)
      }
    } catch {
      setStatus(null)
      setVisible(true)
    }
  }, [])

  const accept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, "accepted")
    } catch {}
    setStatus("accepted")
    setVisible(false)
  }

  const reject = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, "rejected")
    } catch {}
    setStatus("rejected")
    setVisible(false)
  }

  if (!mounted || !visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-3 md:p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto p-4 md:p-5 rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-primary/10 shrink-0 hidden sm:block">
            <Cookie className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold">We use cookies</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  We use cookies and similar technologies to enhance your experience, analyze traffic,
                  and personalize content. By clicking &ldquo;Accept,&rdquo; you consent to our use of cookies.
                  You can learn more in our{" "}
                  <Link
                    href="/privacy"
                    className="text-primary hover:underline font-medium"
                    target="_blank"
                  >
                    Privacy Policy
                  </Link>
                  {" "}and{" "}
                  <Link
                    href="/terms"
                    className="text-primary hover:underline font-medium"
                    target="_blank"
                  >
                    Terms &amp; Conditions
                  </Link>.
                </p>
              </div>
              <button
                onClick={reject}
                className="p-1 rounded-md hover:bg-muted transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <Button size="sm" onClick={accept} className="h-9 px-5 text-xs">
                Accept All Cookies
              </Button>
              <Button size="sm" variant="outline" onClick={reject} className="h-9 px-5 text-xs">
                Reject Non-Essential
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
