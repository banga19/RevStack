"use client"

import { useLanguage } from "@/lib/i18n/language-context"
import { REGIONS, type Region } from "@/lib/pricing"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface RegionSelectorProps {
  value: Region
  onChange: (region: Region) => void
  className?: string
}

const REGION_LIST = [
  REGIONS.ke,
  REGIONS.tz,
  REGIONS.ug,
  REGIONS.rw,
  REGIONS.intl,
]

export function RegionSelector({ value, onChange, className }: RegionSelectorProps) {
  const { lang } = useLanguage()
  const current = REGIONS[value]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5", className)}
        >
          <span className="text-sm">{current.flag}</span>
          <span className="text-xs font-medium">
            {lang === "sw" ? current.labelSw : current.label}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {current.currency}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {REGION_LIST.map((r) => (
          <DropdownMenuItem
            key={r.code}
            onClick={() => onChange(r.code)}
            className={cn(
              "flex items-center gap-3 cursor-pointer",
              value === r.code && "bg-primary/5 font-medium"
            )}
          >
            <span className="text-base">{r.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                {lang === "sw" ? r.labelSw : r.label}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {r.currency} · {r.symbol}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {r.paymentMethods.length} method{r.paymentMethods.length !== 1 ? "s" : ""}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
