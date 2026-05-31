"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Brain, Loader2, CheckCircle2, ArrowRight, ArrowLeft, Sparkles, BarChart3, Target, Users, DollarSign, Clock, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

const steps = [
  { id: "welcome", title: "Welcome", icon: Brain },
  { id: "business", title: "Your Business", icon: BarChart3 },
  { id: "goals", title: "Goals", icon: Target },
  { id: "audience", title: "Audience", icon: Users },
  { id: "budget", title: "Budget", icon: DollarSign },
  { id: "complete", title: "Complete", icon: CheckCircle2 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [formData, setFormData] = useState({
    businessName: "",
    industry: "",
    companySize: "",
    primaryGoal: "",
    secondaryGoals: "",
    currentChallenges: "",
    targetAudience: "",
    servicesNeeded: "",
    budgetRange: "",
    timeline: "",
    referralSource: "",
    additionalNotes: "",
  })

  useEffect(() => { setMounted(true) }, [])

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const canProceed = () => {
    const current = steps[step].id
    if (current === "welcome") return true
    if (current === "business") return formData.businessName.length > 0 && formData.industry.length > 0
    if (current === "goals") return formData.primaryGoal.length > 0
    if (current === "audience") return true
    if (current === "budget") return true
    return true
  }

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1)
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setCompleted(true)
        setTimeout(() => {
          router.push("/dashboard")
          router.refresh()
        }, 2500)
      }
    } catch (e) {
      console.error("Onboarding submit failed", e)
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) return null

  if (completed) {
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
              Your profile has been created. We&apos;ll tailor the experience to your goals.
            </p>
            <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
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
      {/* Decorative */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="w-full max-w-2xl relative">
        {/* Steps indicator */}
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
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20">
                {step === 0 ? <Brain className="h-8 w-8 text-white" /> :
                 step === 1 ? <BarChart3 className="h-8 w-8 text-white" /> :
                 step === 2 ? <Target className="h-8 w-8 text-white" /> :
                 step === 3 ? <Users className="h-8 w-8 text-white" /> :
                 step === 4 ? <DollarSign className="h-8 w-8 text-white" /> :
                 <CheckCircle2 className="h-8 w-8 text-white" />}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            {/* Step 0: Welcome */}
            {step === 0 && (
              <div className="space-y-6 text-center">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Let&apos;s get to know you</h2>
                  <p className="text-muted-foreground">
                    We&apos;ll ask a few questions to tailor your RevStack experience.
                    This helps us understand your goals and set you up for success.
                  </p>
                </div>
                <div className="grid gap-3 text-left">
                  {[
                    { icon: BarChart3, title: "Your Business", desc: "Tell us about your company and industry" },
                    { icon: Target, title: "Your Goals", desc: "What you want to achieve with AI automation" },
                    { icon: Users, title: "Your Audience", desc: "Who you serve and what services you offer" },
                    { icon: DollarSign, title: "Budget & Timeline", desc: "Your investment range and expected timeline" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  This should take about 3 minutes
                </p>
              </div>
            )}

            {/* Step 1: Business Info */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold">Tell us about your business</h2>
                  <p className="text-sm text-muted-foreground mt-1">This helps us understand your context.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business / Company name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => updateField("businessName", e.target.value)}
                    placeholder="e.g. Acme Trading Ltd"
                    className="h-11"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry *</Label>
                  <Select value={formData.industry} onValueChange={(v) => updateField("industry", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wholesale-trading">Wholesale & Trading</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="logistics">Logistics & Supply Chain</SelectItem>
                      <SelectItem value="retail-ecommerce">Retail & E-commerce</SelectItem>
                      <SelectItem value="professional-services">Professional Services</SelectItem>
                      <SelectItem value="real-estate">Real Estate</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="hospitality">Hospitality & Tourism</SelectItem>
                      <SelectItem value="finance">Finance & Insurance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company size</Label>
                  <Select value={formData.companySize} onValueChange={(v) => updateField("companySize", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select company size" />
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
              </div>
            )}

            {/* Step 2: Goals */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold">What are you looking to achieve?</h2>
                  <p className="text-sm text-muted-foreground mt-1">Tell us about your primary goals and challenges.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryGoal">Primary goal *</Label>
                  <Select value={formData.primaryGoal} onValueChange={(v) => updateField("primaryGoal", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select your primary goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generate-leads">Generate more leads & sales</SelectItem>
                      <SelectItem value="automate-followups">Automate client follow-ups</SelectItem>
                      <SelectItem value="qualify-leads">Automate lead qualification</SelectItem>
                      <SelectItem value="improve-outreach">Improve outreach response rates</SelectItem>
                      <SelectItem value="scale-operations">Scale operations with fewer resources</SelectItem>
                      <SelectItem value="reduce-costs">Reduce operational costs</SelectItem>
                      <SelectItem value="content-marketing">Build content marketing engine</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryGoals">Other goals</Label>
                  <Textarea
                    id="secondaryGoals"
                    value={formData.secondaryGoals}
                    onChange={(e) => updateField("secondaryGoals", e.target.value)}
                    placeholder="e.g. Improve response times, streamline onboarding, automate reporting..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentChallenges">Current challenges</Label>
                  <Textarea
                    id="currentChallenges"
                    value={formData.currentChallenges}
                    onChange={(e) => updateField("currentChallenges", e.target.value)}
                    placeholder="What's holding you back? e.g. Limited time, manual processes, low conversion rates..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Audience & Services */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold">Who do you serve?</h2>
                  <p className="text-sm text-muted-foreground mt-1">Help us understand your target audience and services.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target audience</Label>
                  <Textarea
                    id="targetAudience"
                    value={formData.targetAudience}
                    onChange={(e) => updateField("targetAudience", e.target.value)}
                    placeholder="e.g. B2B trading companies in East Africa, wholesale distributors..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servicesNeeded">Services you need help with</Label>
                  <Select value={formData.servicesNeeded} onValueChange={(v) => updateField("servicesNeeded", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select primary service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead-generation">Lead Generation & Outreach</SelectItem>
                      <SelectItem value="crm-automation">CRM & Pipeline Automation</SelectItem>
                      <SelectItem value="content-creation">Content Creation & Marketing</SelectItem>
                      <SelectItem value="full-stack-automation">Full-Stack Automation</SelectItem>
                      <SelectItem value="consulting">Consulting & Strategy</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referralSource">How did you find us?</Label>
                  <Select value={formData.referralSource} onValueChange={(v) => updateField("referralSource", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="twitter-x">Twitter / X</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="search">Search Engine</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 4: Budget & Timeline */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold">Budget & timeline</h2>
                  <p className="text-sm text-muted-foreground mt-1">Help us scope the right solution for you.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetRange">Budget range <span className="text-muted-foreground font-normal">(monthly)</span></Label>
                  <Select value={formData.budgetRange} onValueChange={(v) => updateField("budgetRange", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select budget range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under-1000">Under $1,000</SelectItem>
                      <SelectItem value="1000-2500">$1,000 – $2,500</SelectItem>
                      <SelectItem value="2500-5000">$2,500 – $5,000</SelectItem>
                      <SelectItem value="5000-10000">$5,000 – $10,000</SelectItem>
                      <SelectItem value="10000+">$10,000+</SelectItem>
                      <SelectItem value="not-sure">Not sure yet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeline">Expected timeline</Label>
                  <Select value={formData.timeline} onValueChange={(v) => updateField("timeline", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asap">ASAP - Within 1 month</SelectItem>
                      <SelectItem value="1-3-months">1 - 3 months</SelectItem>
                      <SelectItem value="3-6-months">3 - 6 months</SelectItem>
                      <SelectItem value="6-12-months">6 - 12 months</SelectItem>
                      <SelectItem value="exploring">Just exploring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="additionalNotes">Anything else you&apos;d like to share?</Label>
                  <Textarea
                    id="additionalNotes"
                    value={formData.additionalNotes}
                    onChange={(e) => updateField("additionalNotes", e.target.value)}
                    placeholder="Any specific requirements, questions, or context..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            )}

            {/* Step 5: Summary & Complete */}
            {step === 5 && (
              <div className="space-y-5">
                <div className="text-center">
                  <h2 className="text-xl font-bold">Review your answers</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Here&apos;s a summary of your responses. You can go back to make changes.
                  </p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Business", value: formData.businessName },
                    { label: "Industry", value: formData.industry },
                    { label: "Company Size", value: formData.companySize },
                    { label: "Primary Goal", value: formData.primaryGoal },
                    { label: "Target Audience", value: formData.targetAudience },
                    { label: "Budget", value: formData.budgetRange },
                    { label: "Timeline", value: formData.timeline },
                  ].filter((item) => item.value).map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm font-medium mt-0.5 capitalize">{item.value.replace(/-/g, " ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <Sparkles className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Ready to launch? We&apos;ll tailor your dashboard based on your responses.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className={cn(
              "flex items-center mt-8 pt-6 border-t border-border/50",
              step === 0 ? "justify-center" : "justify-between"
            )}>
              {step > 0 && (
                <Button variant="outline" onClick={handleBack} disabled={submitting}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              )}
              {step < steps.length - 1 ? (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting} className="min-w-[160px]">
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> Complete Setup</>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
