"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import type { Language } from "./translations"

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  toggleLang: () => void
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  toggleLang: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("en")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("mapato-lang") as Language | null
    if (saved && (saved === "en" || saved === "sw")) {
      setLang(saved)
    }
  }, [])

  const toggleLang = () => {
    const next = lang === "en" ? "sw" : "en"
    setLang(next)
    if (typeof window !== "undefined") {
      localStorage.setItem("mapato-lang", next)
    }
  }

  const handleSetLang = (newLang: Language) => {
    setLang(newLang)
    if (typeof window !== "undefined") {
      localStorage.setItem("mapato-lang", newLang)
    }
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
