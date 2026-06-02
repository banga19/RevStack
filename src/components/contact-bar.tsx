"use client"

import { Phone, MessageSquare, Mail } from "lucide-react"
import { CONTACT_INFO } from "@/lib/contact-info"
import { useLanguage } from "@/lib/i18n/language-context"
import { t } from "@/lib/i18n/translations"

export function ContactBar() {
  const { lang } = useLanguage()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-xl md:bottom-4 md:left-auto md:right-4 md:w-auto md:rounded-xl md:border md:shadow-lg">
      <div className="flex items-center justify-center gap-4 px-4 py-3 md:flex-col md:gap-2 md:p-3">
        <a
          href={`tel:${CONTACT_INFO.phone}`}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          title={t("contact.callNow", lang)}
        >
          <div className="p-1.5 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Phone className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="hidden sm:inline text-xs">{CONTACT_INFO.phone}</span>
        </a>

        <a
          href={`https://wa.me/${CONTACT_INFO.whatsapp.replace(/[^0-9]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          title={t("contact.callNow", lang)}
        >
          <div className="p-1.5 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
            <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <span className="hidden sm:inline text-xs">WhatsApp</span>
        </a>

        <a
          href={`mailto:${CONTACT_INFO.email}`}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
        >
          <div className="p-1.5 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
            <Mail className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <span className="hidden sm:inline text-xs truncate max-w-[150px]">{CONTACT_INFO.email}</span>
        </a>
      </div>
    </div>
  )
}
