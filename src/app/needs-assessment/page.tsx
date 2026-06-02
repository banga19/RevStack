"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  Brain,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  BarChart3,
  Target,
  Users,
  DollarSign,
  Clock,
  MessageSquare,
  Mail,
  Shield,
  Github,
  AlertCircle,
  CalendarDays,
} from "lucide-react"


// Available services for multi-select
const servicesOptions = [
  { id: "lead-generation", label: "Lead Generation & Outreach" },
  { id: "crm-automation", label: "CRM & Pipeline Automation" },
  { id: "content-creation", label: "Content Creation & Marketing" },
  { id: "full-stack-automation", label: "Full-Stack Automation" },
  { id: "consulting", label: "Consulting & Strategy" },
  { id: "product-sourcing", label: "Bulk Product Sourcing (Sokogate)" },
  { id: "lead-qualification", label: "Lead Qualification (via Ultimo)" },
]

const steps = [
  { id: "welcome", title: "Welcome", icon: Brain, description: "Tell us what brings you here" },
  { id: "business", title: "Your Business", icon: BarChart3, description: "About your company" },
  { id: "goals", title: "Goals", icon: Target, description: "What you want to achieve" },
  { id: "timeline", title: "Timeline", icon: Clock, description: "When and budget" },
  { id: "review", title: "Review", icon: CheckCircle2, description: "Review & sign in" },
]

// Generate a temp ID for storing questionnaire data before auth
function generateTempId(): string {
  return `preauth-${crypto.randomUUID?.() || Math.random().toString(36).slice(2, 15)}`
}

function NeedsAssessmentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status: authStatus } = useSession()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [tempId, setTempId] = useState<string>("")
  const [mounted, setMounted] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [authLoading, setAuthLoading] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    whatBringsYou: "",
    businessType: "",
    industry: "",
    companySize: "",
    role: "",
    primaryGoal: "",
    biggestChallenge: "",
    servicesInterest: [] as string[],
    timeline: "",
    budgetRange: "",
    howDidYouHear: "",
  })

  // Initialize temp ID on mount
  useEffect(() => {
    setMounted(true)
    const stored = sessionStorage.getItem("mapato-needs-temp-id")
    if (stored) {
      setTempId(stored)
    } else {
      const id = generateTempId()
      setTempId(id)
      sessionStorage.setItem("mapato-needs-temp-id", id)
    }

    // Restore saved form data from sessionStorage
    try {
      const saved = sessionStorage.getItem("mapato-needs-data")
      if (saved) {
        const parsed = JSON.parse(saved)
        setFormData((prev) => ({ ...prev, ...parsed }))
      }
    } catch {}
  }, [])

  // Persist form data to sessionStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      sessionStorage.setItem("mapato-needs-data", JSON.stringify(formData))
    }
  }, [formData, mounted])

  // Check for existing saved questionnaire after auth redirect
  useEffect(() => {
    if (authStatus === "authenticated" && tempId && !completed) {
      // User may have been redirected back after Google SSO — check if a completed questionnaire exists
      fetch(`/api/auth/questionnaire?tempId=${tempId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.completed) {
            setCompleted(true)
          }
        })
        .catch(() => {
          // No saved questionnaire — user starts fresh
        })
    }
  }, [authStatus, tempId, completed])

  const linkQuestionnaireToUser = useCallback(async () => {
    try {
      await fetch("/api/auth/questionnaire", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempId }),
      })
      // Clear session storage
      sessionStorage.removeItem("mapato-needs-data")
      sessionStorage.removeItem("mapato-needs-temp-id")
      // Redirect to dashboard
      router.push("/dashboard")
      router.refresh()
    } catch (e) {
      console.error("Failed to link questionnaire", e)
      // Still redirect
      router.push("/dashboard")
    }
  }, [tempId, router])

  // Handle auth completion - link questionnaire to user
  useEffect(() => {
    if (authStatus === "authenticated" && completed && tempId) {
      linkQuestionnaireToUser()
    }
  }, [authStatus, completed, tempId, linkQuestionnaireToUser])

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleService = (serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      servicesInterest: prev.servicesInterest.includes(serviceId)
        ? prev.servicesInterest.filter((s) => s !== serviceId)
        : [...prev.servicesInterest, serviceId],
    }))
  }

  const canProceed = () => {
    const current = steps[step].id
    if (current === "welcome") return formData.whatBringsYou.length > 0
    if (current === "business") return formData.primaryGoal.length > 0
    if (current === "goals") return true
    if (current === "timeline") return true
    return true
  }

  const handleNext = () => {
    if (!canProceed()) return
    if (step < steps.length - 1) {
      setStep((s) => s + 1)
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1)
    }
  }

  const saveQuestionnaire = async () => {
    setSaveStatus("saving")
    try {
      const res = await fetch("/api/auth/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempId,
          ...formData,
          servicesInterest: formData.servicesInterest.join(","),
          completed: true,
        }),
      })
      if (res.ok) {
        setSaveStatus("saved")
        return true
      } else {
        setSaveStatus("error")
        return false
      }
    } catch (e) {
      console.error("Save failed", e)
      setSaveStatus("error")
      return false
    }
  }

  const handleComplete = async () => {
    setSubmitting(true)
    const saved = await saveQuestionnaire()
    if (saved) {
      setCompleted(true)
    }
    setSubmitting(false)
  }

  const handleGoogleSignIn = async () => {
    setAuthLoading("google")
    setAuthError(null)
    try {
      // First save the questionnaire
      await saveQuestionnaire()
      // Then sign in with Google — preserve any email param in callback URL
      const email = searchParams.get("email")
      const callbackUrl = email
        ? `${window.location.pathname}?email=${encodeURIComponent(email)}`
        : window.location.href
      await signIn("google", { callbackUrl })
    } catch (e) {
      setAuthError("Failed to sign in with Google. Please try again.")
      setAuthLoading(null)
    }
  }

  const handleEmailSignIn = async () => {
    setAuthLoading("email")
    setAuthError(null)
    try {
      await saveQuestionnaire()
      const email = searchParams.get("email")
      const params = new URLSearchParams({ needsAssessment: "true" })
      if (email) params.set("email", email)
      router.push(`/signup?${params.toString()}`)
    } catch (e) {
      setAuthError("Failed to proceed. Please try again.")
      setAuthLoading(null)
    }
  }

  if (!mounted) return null

  // If already authenticated and questionnaire is completed, redirect
  if (authStatus === "authenticated" && completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md text-center border-emerald-500/20 shadow-2xl">
          <CardContent className="pt-10 pb-10">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-emerald-500/10 animate-in zoom-in-50 duration-500">
                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">You&apos;re all set!</h2>
            <p className="text-muted-foreground mb-2">
              Your needs assessment is complete. We&apos;re tailoring your experience.
            </p>
            <p className="text-sm text-muted-foreground">Taking you to your dashboard...</p>
            <div className="mt-6 flex justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const progress = ((step) / (steps.length - 1)) * 100

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 py-8">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-emerald-500/[0.02] blur-3xl" />
      </div>

      <div className="w-full max-w-2xl relative">
        {/* Steps indicator - desktop */}
        <div className="hidden sm:flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
                i === step
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : i < step
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}>
                <s.icon className="h-3 w-3" />
                <span className="hidden md:inline">{s.title}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  "w-8 h-px transition-colors duration-300",
                  i < step ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <Progress value={progress} className="h-1.5 mb-8 sm:hidden" />

        <Card className="backdrop-blur-sm bg-card/95 border-primary/10 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className={cn(
                "p-3 rounded-2xl bg-gradient-to-br shadow-lg shadow-primary/20 transition-all duration-500",
                completed ? "from-emerald-500 to-emerald-600" : "from-primary to-primary/60"
              )}>
                {step === 0 ? <Brain className="h-8 w-8 text-white" /> :
                 step === 1 ? <BarChart3 className="h-8 w-8 text-white" /> :
                 step === 2 ? <Target className="h-8 w-8 text-white" /> :
                 step === 3 ? <Clock className="h-8 w-8 text-white" /> :
                 <CheckCircle2 className="h-8 w-8 text-white" />}
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              {step === 0 && "What brings you here?"}
              {step === 1 && "Tell us about your business"}
              {step === 2 && "Your goals & challenges"}
              {step === 3 && "Timeline & investment"}
              {step === 4 && "Review & sign in"}
            </CardTitle>
            <CardDescription>
              {steps[step].description}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            {/* Step 0: Welcome - What brings you here */}
            {step === 0 && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll ask a few quick questions to understand your needs.
                    This helps us personalize your experience from day one.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">
                    What are you looking to achieve?
                  </Label>
                  <div className="grid gap-2">
                    {[
                      { value: "generate-leads", label: "Generate more leads & sales", icon: Target, desc: "I need a steady flow of qualified leads" },
                      { value: "automate-followups", label: "Automate client follow-ups", icon: MessageSquare, desc: "Stop losing leads due to slow responses" },
                      { value: "qualify-leads", label: "Qualify leads automatically", icon: Shield, desc: "Spend time on the right opportunities" },
                      { value: "improve-outreach", label: "Improve outreach response rates", icon: Mail, desc: "Get more replies from cold outreach" },
                      { value: "scale-operations", label: "Scale operations with fewer resources", icon: BarChart3, desc: "Do more with less" },
                      { value: "content-marketing", label: "Build a content marketing engine", icon: Sparkles, desc: "Generate inbound leads through content" },
                      { value: "product-sourcing", label: "Source products from global suppliers", icon: Users, desc: "Connect with wholesalers via Sokogate" },
                      { value: "other", label: "Something else", icon: Brain, desc: "Tell us more" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField("whatBringsYou", option.value)}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-200 border",
                          formData.whatBringsYou === option.value
                            ? "border-primary bg-primary/5 shadow-sm shadow-primary/10 ring-1 ring-primary/20"
                            : "border-border/50 hover:border-primary/30 hover:bg-muted/30 hover:shadow-sm"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-lg shrink-0 transition-colors",
                          formData.whatBringsYou === option.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}>
                          <option.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{option.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{option.desc}</p>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all",
                          formData.whatBringsYou === option.value
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        )}>
                          {formData.whatBringsYou === option.value && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>This takes about 2 minutes. Your responses help us tailor everything to your needs.</span>
                </div>
              </div>
            )}

            {/* Step 1: Business Info */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="primaryGoal">What&apos;s your primary goal? *</Label>
                  <Select value={formData.primaryGoal} onValueChange={(v) => updateField("primaryGoal", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select your primary goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generate-leads">Generate more leads</SelectItem>
                      <SelectItem value="automate-sales">Automate sales follow-ups</SelectItem>
                      <SelectItem value="qualify-leads">Qualify leads automatically</SelectItem>
                      <SelectItem value="improve-outreach">Improve outreach</SelectItem>
                      <SelectItem value="scale-operations">Scale operations</SelectItem>
                      <SelectItem value="source-products">Source products globally</SelectItem>
                      <SelectItem value="other">Something else</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessType">Business type</Label>
                    <Select value={formData.businessType} onValueChange={(v) => updateField("businessType", v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solo">Solo / Self-employed</SelectItem>
                        <SelectItem value="small-agency">Small Agency</SelectItem>
                        <SelectItem value="ecommerce">E-commerce</SelectItem>
                        <SelectItem value="trading-wholesale">Trading / Wholesale</SelectItem>
                        <SelectItem value="professional-services">Professional Services</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={formData.industry} onValueChange={(v) => updateField("industry", v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wholesale-trading">Wholesale & Trading</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="logistics">Logistics & Supply Chain</SelectItem>
                        <SelectItem value="retail-ecommerce">Retail & E-commerce</SelectItem>
                        <SelectItem value="professional-services">Professional Services</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companySize">Company size</Label>
                    <Select value={formData.companySize} onValueChange={(v) => updateField("companySize", v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Solo (1 person)</SelectItem>
                        <SelectItem value="2-10">Micro (2-10)</SelectItem>
                        <SelectItem value="11-50">Small (11-50)</SelectItem>
                        <SelectItem value="51-200">Medium (51-200)</SelectItem>
                        <SelectItem value="201+">Large (201+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Your role</Label>
                    <Select value={formData.role} onValueChange={(v) => updateField("role", v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="founder-ceo">Founder / CEO</SelectItem>
                        <SelectItem value="sales-marketing">Sales / Marketing</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Goals & Challenges */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>What services are you interested in? (select all that apply)</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {servicesOptions.map((service) => (
                      <label
                        key={service.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                          formData.servicesInterest.includes(service.id)
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-primary/30 hover:bg-muted/20"
                        )}
                      >
                        <Checkbox
                          checked={formData.servicesInterest.includes(service.id)}
                          onCheckedChange={() => toggleService(service.id)}
                          className="mt-0.5"
                        />
                        <span className="text-sm">{service.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="biggestChallenge">What&apos;s your biggest challenge right now?</Label>
                  <Textarea
                    id="biggestChallenge"
                    value={formData.biggestChallenge}
                    onChange={(e) => updateField("biggestChallenge", e.target.value)}
                    placeholder="e.g. Not enough leads, manual follow-ups take too long, low conversion rates..."
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="howDidYouHear">How did you hear about us?</Label>
                  <Select value={formData.howDidYouHear} onValueChange={(v) => updateField("howDidYouHear", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="twitter">Twitter / X</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="search">Search Engine</SelectItem>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="sokogate">Sokogate (sourcing partner)</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: Timeline & Budget */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="timeline">When are you looking to get started?</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { value: "asap", label: "ASAP - Within 1 month", icon: Clock, desc: "Ready to move fast" },
                      { value: "1-3-months", label: "1 - 3 months", icon: CalendarDays, desc: "Planning ahead" },
                      { value: "3-6-months", label: "3 - 6 months", icon: CalendarDays, desc: "Future planning" },
                      { value: "exploring", label: "Just exploring", icon: Brain, desc: "Researching options" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField("timeline", option.value)}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-200 border",
                          formData.timeline === option.value
                            ? "border-primary bg-primary/5 shadow-sm shadow-primary/10 ring-1 ring-primary/20"
                            : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-lg shrink-0 transition-colors",
                          formData.timeline === option.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}>
                          <option.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{option.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{option.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budgetRange">Monthly budget range</Label>
                  <Select value={formData.budgetRange} onValueChange={(v) => updateField("budgetRange", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select budget range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under-500">Under $500</SelectItem>
                      <SelectItem value="500-1000">$500 - $1,000</SelectItem>
                      <SelectItem value="1000-2500">$1,000 - $2,500</SelectItem>
                      <SelectItem value="2500-5000">$2,500 - $5,000</SelectItem>
                      <SelectItem value="5000+">$5,000+</SelectItem>
                      <SelectItem value="not-sure">Not sure yet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">We&apos;ll tailor your experience</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on your answers, we&apos;ll customize your dashboard, suggest relevant features,
                      and show you the content that matters most to your goals.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review & Sign In */}
            {step === 4 && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Responses</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { label: "What brings you", value: formData.whatBringsYou },
                      { label: "Primary goal", value: formData.primaryGoal },
                      { label: "Business type", value: formData.businessType },
                      { label: "Industry", value: formData.industry },
                      { label: "Company size", value: formData.companySize },
                      { label: "Your role", value: formData.role },
                      { label: "Timeline", value: formData.timeline },
                      { label: "Budget", value: formData.budgetRange },
                    ].filter((item) => item.value).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                          <p className="text-xs font-medium capitalize mt-0.5 truncate">
                            {item.value.replace(/-/g, " ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {formData.servicesInterest.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-muted/30">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Services interested in</p>
                      <div className="flex flex-wrap gap-1">
                        {formData.servicesInterest.map((s) => {
                          const svc = servicesOptions.find((o) => o.id === s)
                          return svc ? (
                            <span key={s} className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                              {svc.label}
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}
                  {formData.biggestChallenge && (
                    <div className="p-2.5 rounded-lg bg-muted/30">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Biggest challenge</p>
                      <p className="text-xs">{formData.biggestChallenge}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Sign In Options */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">Create your account</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sign in to save your responses and access your personalized dashboard.
                    </p>
                  </div>

                  {authError && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <p className="text-destructive font-medium">{authError}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleGoogleSignIn}
                    disabled={authLoading !== null}
                    className="w-full h-12 text-base relative overflow-hidden group"
                    variant="outline"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {authLoading === "google" ? (
                      <><Loader2 className="h-5 w-5 mr-3 animate-spin" /> Connecting...</>
                    ) : (
                      <>
                        <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleEmailSignIn}
                    disabled={authLoading !== null}
                    variant="outline"
                    className="w-full h-11 text-base"
                  >
                    {authLoading === "email" ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...</>
                    ) : (
                      <><Mail className="h-4 w-4 mr-2" /> Sign in with email</>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                    Your responses will be saved to your account.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}

            {/* Before review step (steps 0-3): Next/Back navigation */}
            {step < 4 && (
              <div className={cn(
                "flex items-center mt-8 pt-6 border-t border-border/50",
                step === 0 ? "justify-center" : "justify-between"
              )}>
                {step > 0 && (
                  <Button variant="outline" onClick={handleBack} disabled={submitting}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                )}
                {step < 3 ? (
                  <Button onClick={handleNext} disabled={!canProceed()}>
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleComplete} disabled={submitting} className="min-w-[160px]">
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><CheckCircle2 className="h-4 w-4 mr-2" /> Review Responses</>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Save status indicator */}
            {saveStatus === "saving" && (
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving your responses...
              </div>
            )}
            {saveStatus === "saved" && (
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-emerald-500">
                <CheckCircle2 className="h-3 w-3" /> Responses saved
              </div>
            )}
            {saveStatus === "error" && (
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" /> Failed to save. Your data is stored locally.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skip link */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-xs text-muted-foreground">
            Skip questionnaire and{" "}
            <button
              onClick={() => router.push("/login")}
              className="text-xs text-muted-foreground link-hover-orange underline underline-offset-4"
            >
              sign in
            </button>
            {" or "}
            <button
              onClick={() => router.push("/signup")}
              className="text-xs text-muted-foreground link-hover-orange underline underline-offset-4"
            >
              create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function NeedsAssessmentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <NeedsAssessmentForm />
    </Suspense>
  )
}
