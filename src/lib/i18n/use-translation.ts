import { useLanguage } from "./language-context"
import { t as translate } from "./translations"

/**
 * Convenience hook that returns a `t()` function bound to the current language.
 * Usage: const { t } = useTranslation(); t("nav.features");
 */
export function useTranslation() {
  const { lang, toggleLang, setLang } = useLanguage()

  const t = (key: string): string => {
    return translate(key, lang)
  }

  return { t, lang, toggleLang, setLang }
}
