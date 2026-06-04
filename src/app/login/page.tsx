"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Brain, Loader2, Eye, EyeOff, AlertCircle, Sparkles, ArrowRight } from "lucide-react"
import { useTranslation } from "@/lib/i18n/use-translation"
import { LanguageToggle } from "@/components/language-toggle"
import { ContactBar } from "@/components/contact-bar"
import { CONTACT_INFO } from "@/lib/contact-info"

function LoginForm() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || searchParams.get("returnTo") || "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const googleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up google loading timeout on unmount
  useEffect(() => {
    return () => {
      if (googleTimeoutRef.current) clearTimeout(googleTimeoutRef.current)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
        return
      }

      if (result?.ok) {
        // Check if user came from needs assessment
        const fromNeedsAssessment = searchParams.get("needsAssessment") === "true"
        if (fromNeedsAssessment) {
          // Redirect back to needs-assessment to link questionnaire
          router.push("/needs-assessment")
        } else {
          router.push(callbackUrl)
        }
        router.refresh()
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.02] blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/95 border-primary/10 shadow-2xl">
        <div className="absolute top-3 right-3 z-10">
          <LanguageToggle variant="header" />
        </div>
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20">
              <Brain className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t("auth.welcomeBack")}</CardTitle>
          <CardDescription>
            {t("auth.signInTitle")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Needs Assessment CTA - show only if not coming from needs-assessment flow */}
          {searchParams.get("needsAssessment") !== "true" && (
            <Link
              href="/needs-assessment"
              className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:from-primary/15 hover:to-primary/10 transition-all group"
            >
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t("auth.newHere")}</p>
                <p className="text-xs text-muted-foreground">{t("auth.takeAssessment")}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}

          {/* Google SSO */}
          <Button
            onClick={() => {
              setGoogleLoading(true)
              // Safety timeout: reset loading if redirect doesn't happen (popup blocker, etc.)
              if (googleTimeoutRef.current) clearTimeout(googleTimeoutRef.current)
              googleTimeoutRef.current = setTimeout(() => setGoogleLoading(false), 8000)
              const fromAssessment = searchParams.get("needsAssessment") === "true"
              signIn("google", {
                callbackUrl: fromAssessment
                  ? "/needs-assessment"
                  : "/dashboard",
              })
            }}
            disabled={googleLoading}
            className="w-full h-12 text-base relative overflow-hidden group"
            variant="outline"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            {googleLoading ? (
              <><Loader2 className="h-5 w-5 mr-3 animate-spin" /> Redirecting...</>
            ) : (
              <>
                <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t("nav.signIn")} Google
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t("form.email")}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-destructive font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">{t("form.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{t("form.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("nav.signIn")}...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> {t("form.signIn")}</>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pb-6">
          <p className="text-sm text-muted-foreground">
            {t("auth.dontHaveAccount")}{" "}              <Link href="/signup" className="font-medium link-hover-orange">
              {t("auth.createOne")}
            </Link>
          </p>
          <Link
            href="/needs-assessment"
            className="text-xs text-muted-foreground link-hover-orange underline underline-offset-4"
          >
            Take our needs assessment first
          </Link>
        </CardFooter>
      </Card>
      <ContactBar />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
