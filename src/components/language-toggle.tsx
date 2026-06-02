"use client"

import { useLanguage } from "@/lib/i18n/language-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Globe } from "lucide-react"

interface LanguageToggleProps {
  collapsed?: boolean
  variant?: "sidebar" | "header"
}

export function LanguageToggle({ collapsed, variant = "sidebar" }: LanguageToggleProps) {
  const { lang, toggleLang } = useLanguage()

  if (variant === "header") {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground gap-1.5"
        onClick={toggleLang}
        title={lang === "en" ? "Switch to Kiswahili" : "Badilisha hadi Kiingereza"}
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-medium">{lang === "en" ? "SW" : "EN"}</span>
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
        collapsed && "justify-center"
      )}
      onClick={toggleLang}
    >
      <Globe className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <span className="ml-2">{lang === "en" ? "Kiswahili" : "English"}</span>
      )}
    </Button>
  )
}
