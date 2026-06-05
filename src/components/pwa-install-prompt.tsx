"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Download, X, MonitorSmartphone, Loader2 } from "lucide-react"

/**
 * PwaInstallPrompt captures the browser's `beforeinstallprompt` event
 * and displays an install banner. It also checks if the app is already
 * installed (display-mode: standalone) and hides itself in that case.
 */
export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if the app is already running in standalone mode (installed)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    ) {
      setIsStandalone(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Don't show immediately — wait a few seconds so the page loads first
      setTimeout(() => {
        setIsVisible(true)
      }, 5000)
    }

    window.addEventListener("beforeinstallprompt", handler)

    // Check if already installed via the related_applications or launch handler
    // This is a secondary check
    const isStandaloneCheck = () => {
      if (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true
      ) {
        setIsStandalone(true)
        setIsVisible(false)
      }
    }

    // Also listen for the appinstalled event
    const installedHandler = () => {
      setIsVisible(false)
      setDeferredPrompt(null)
      setIsStandalone(true)
    }
    window.addEventListener("appinstalled", installedHandler)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      window.removeEventListener("appinstalled", installedHandler)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return

    setIsInstalling(true)
    const promptEvent = deferredPrompt as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: string }>
    }

    try {
      await promptEvent.prompt()
      const choiceResult = await promptEvent.userChoice

      if (choiceResult.outcome === "accepted") {
        setIsVisible(false)
        setDeferredPrompt(null)
      } else {
        setDeferredPrompt(null)
      }
    } catch (error) {
      console.error("[PWA] Install failed:", error)
      setDeferredPrompt(null)
    } finally {
      setIsInstalling(false)
    }
  }, [deferredPrompt])

  const handleManualInstall = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : "/"
    alert(
      `To install Mapato:\n1. Open Chrome menu (⋮)\n2. Click "Install Mapato" or "Add to Home Screen"\n\nCurrent URL: ${url}`
    )
  }, [])

  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    setDismissed(true)
    // Re-show after a longer delay if dismissed
    setTimeout(() => setDismissed(false), 7 * 24 * 60 * 60 * 1000) // 7 days
  }, [])

  // Don't show if already installed, not supported, or dismissed
  if (isStandalone || !deferredPrompt || !isVisible || dismissed) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-20 sm:w-80 z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-2xl shadow-primary/10 backdrop-blur-xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MonitorSmartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Install Mapato</p>
                <p className="text-xs text-muted-foreground">AI-Powered Trade Ops</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-md hover:bg-accent transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Install our app for quick access, offline support, and push notifications — just like a native app.
          </p>

           <div className="flex flex-col gap-2 w-full">
            <Button
              size="sm"
              className="w-full gap-1.5"
              onClick={handleInstall}
              disabled={isInstalling || !deferredPrompt}
            >
              {isInstalling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Install App
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleManualInstall}
            >
              Manual Install
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="w-full"
              onClick={handleDismiss}
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
