"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useCsrf } from "@/lib/use-csrf"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Brain, Loader2, Eye, EyeOff, AlertCircle, Sparkles, CheckCircle2, FileText, MessageSquare } from "lucide-react"
import { useTranslation } from "@/lib/i18n/use-translation"
import { LanguageToggle } from "@/components/language-toggle"
import { ContactBar } from "@/components/contact-bar"
import { CONTACT_INFO } from "@/lib/contact-info"

function SignupForm() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [name, setName] = useState("")
  const [email, setEmail] = useState(searchParams.get("email") || "")
  const [phone, setPhone] = useState("")
  const fromNeedsAssessment = searchParams.get("needsAssessment") === "true"
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { csrfToken, loading: csrfLoading } = useCsrf()

  useEffect(() => { setMounted(true) }, [])

  const passwordChecks = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains a letter", met: /[a-zA-Z]/.test(password) },
  ]
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!termsAccepted) {
      setError("You must accept the Terms & Conditions to create an account")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({ name, email, password, phone: phone || undefined, termsAccepted }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create account")
        return
      }

      setSuccess(true)
      // Auto-redirect to login after a moment
      // Preserve params so login page knows where to redirect back
      setTimeout(() => {
        const params = new URLSearchParams()
        if (fromNeedsAssessment) {
          params.set("needsAssessment", "true")
        }
        const returnTo = searchParams.get("returnTo")
        if (returnTo) {
          params.set("callbackUrl", returnTo)
        }
        const qs = params.toString()
        router.push(`/login${qs ? `?${qs}` : ""}`)
      }, 2000)
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/95 border-emerald-500/20 shadow-2xl text-center">
          <CardContent className="pt-8 pb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">{t("signup.success")}</h2>
            <p className="text-muted-foreground mb-4">{t("signup.redirecting")}</p>
            <Link href="/login">
              <Button variant="outline">{t("signup.signInNow")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.02] blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/95 border-primary/10 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20">
              <Brain className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t("form.createAccount")}</CardTitle>
          <CardDescription>
            {t("auth.signInTitle")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-destructive font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">{t("form.fullName")}</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">{t("form.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone <span className="text-muted-foreground font-normal">(optional — for WhatsApp updates)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="2547XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
                autoComplete="tel"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Include country code. Used for M-Pesa payments and WhatsApp follow-up reminders about your trial.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{t("form.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {passwordChecks.map((check, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className={check.met ? "text-emerald-500" : "text-muted-foreground"}>
                        {check.met ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />}
                      </div>
                      <span className={check.met ? "text-emerald-500" : "text-muted-foreground"}>{check.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">{t("form.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-11"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-destructive mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Terms & Conditions */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                {t("form.agreeTerms")}{" "}
                <Link href="/terms" target="_blank" className="link-hover-orange font-medium">
                  {t("form.termsConditions")}
                </Link>{" "}
                {t("form.and")}{" "}
                <Link href="/privacy" className="link-hover-orange font-medium">
                  {t("form.privacyPolicy")}
                </Link>
                . I confirm I have read and agree to the{" "}
                <Link href="/privacy#cookies" target="_blank" className="link-hover-orange font-medium">
                  Cookie Policy
                </Link>
                . {t("form.understand")}
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base"
              disabled={loading || csrfLoading || !name || !email || !password || !passwordsMatch || !termsAccepted}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("form.creatingAccount")}</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> {t("form.createAccount")}</>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center pb-6">
          <p className="text-sm text-muted-foreground">
            {t("form.alreadyHaveAccount")}{" "}
            <Link href="/login" className="font-medium link-hover-orange">
              {t("form.signIn")}        </Link>
          </p>
        </CardFooter>
      </Card>

      {/* Contact Bar */}
      <ContactBar />
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}


