"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Brain, 
  Zap, 
  Globe, 
  MessageSquare, 
  BarChart3, 
  Shield, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  ChevronDown,
  Menu,
  X,
  Star,
  Sparkles,
  Bot,
  FileText,
  DollarSign,
  Send,
  Loader2,
  TrendingUp,
  Clock,
  Target,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"
import { LanguageToggle } from "@/components/language-toggle"
import { ContactBar } from "@/components/contact-bar"
import { CONTACT_INFO } from "@/lib/contact-info"

export default function LandingPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSubscribing(true)
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing-page" }),
      })
      if (res.ok) {
        setSubscribed(true)
      } else {
        router.push(`/needs-assessment?email=${encodeURIComponent(email)}`)
      }
    } catch {
      router.push(`/needs-assessment?email=${encodeURIComponent(email)}`)
    } finally {
      setSubscribing(false)
    }
  }

  if (!mounted) return null

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-bold">Mapato</span>
              <Badge variant="outline" className="ml-2 text-[10px] font-mono text-muted-foreground">Mapato</Badge>
              <Badge className="ml-2 text-[10px] bg-primary/20 text-primary border-primary/30">God Mode</Badge>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => scrollTo("features")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.features")}</button>
              <button onClick={() => scrollTo("how-it-works")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.howItWorks")}</button>
              <button onClick={() => scrollTo("pricing")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.pricing")}</button>
              <button onClick={() => scrollTo("testimonials")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.results")}</button>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <LanguageToggle variant="header" />
              <Link href="/login">
                <Button variant="ghost" size="sm">{t("nav.signIn")}</Button>
              </Link>
              <Link href="/needs-assessment">
                <Button size="sm">
                  {t("nav.getStarted")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-md hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
            <div className="px-4 py-4 space-y-2">
              <button onClick={() => scrollTo("features")} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm">{t("nav.features")}</button>
              <button onClick={() => scrollTo("how-it-works")} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm">{t("nav.howItWorks")}</button>
              <button onClick={() => scrollTo("pricing")} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm">{t("nav.pricing")}</button>
              <button onClick={() => scrollTo("testimonials")} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm">{t("nav.results")}</button>
              <div className="pt-2 border-t border-border/50 flex gap-2">
                <div className="flex justify-center mb-2">
                  <LanguageToggle variant="header" />
                </div>
                <Link href="/login" className="flex-1"><Button variant="outline" className="w-full">{t("nav.signIn")}</Button></Link>
                <Link href="/needs-assessment" className="flex-1"><Button className="w-full">{t("nav.getStarted")}</Button></Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/[0.02] blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-6 animate-fade-in">
              <Sparkles className="h-4 w-4" />
              <span>{t("hero.badge")}</span>
              <span className="text-muted-foreground mx-1">·</span>
              <span className="text-primary font-semibold">Autonomous AI Agents</span>
              <span className="text-muted-foreground mx-1">·</span>
              <span className="text-xs text-muted-foreground">
                <a href="https://polsia.com" target="_blank" rel="noopener noreferrer" className="link-hover-orange">Polsia.com</a>
                {" "}inspired — half the success fee
              </span>
              <span className="text-muted-foreground mx-1">·</span>
              <span className="text-xs text-muted-foreground">
                A{" "}
                <a href="https://sokogate.com" target="_blank" rel="noopener noreferrer" className="link-hover-orange">Sokogate</a>
                {" "}×{" "}
                <a href="https://ultimotradingltd.co.ke" target="_blank" rel="noopener noreferrer" className="link-hover-orange">Ultimo Trading</a>
                {" "}collaboration
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in">
              {t("hero.title")}{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-orange-400 text-transparent bg-clip-text">
                {t("hero.titleHighlight")}
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 animate-fade-in">
              {t("hero.subtitle")}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in">
              <Link href="/needs-assessment">
                <Button size="lg" className="h-12 px-8 text-base">
                  {t("hero.cta")} <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base"
                onClick={() => scrollTo("how-it-works")}
              >
                {t("hero.seeHow")}
              </Button>
            </div>

            {/* Social proof */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-sm text-muted-foreground animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 border-2 border-background flex items-center justify-center text-[10px] font-bold text-white">
                      {["U", "S", "T"][i - 1]}
                    </div>
                  ))}
                </div>
                <span>{t("hero.trustedBy")}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="ml-1">{t("hero.rating")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Cloud */}
      <section className="py-12 border-y border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-muted-foreground uppercase tracking-widest mb-6">{t("logoCloud.title")}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-50">
            {["WATI.io", "QMe", "Make.com", "Zoho CRM", "Instantly.ai", "Voiceflow", "Sokogate"].map((name) => (
              <div key={name} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
                  <span className="text-[8px] font-bold">{name[0]}</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">{t("problem.badge")}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("problem.title")}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("problem.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Clock, title: t("problem.hours"), desc: t("problem.hoursDesc") },
              { icon: Target, title: t("problem.leads"), desc: t("problem.leadsDesc") },
              { icon: BarChart3, title: t("problem.pipeline"), desc: t("problem.pipelineDesc") },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-xl border border-border/50 bg-card/50 hover:bg-card/80 transition-all duration-300 group">
                <div className="p-3 rounded-lg bg-destructive/10 w-fit mb-4 group-hover:scale-110 transition-transform">
                  <item.icon className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">{t("features.badge")}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("features.title")}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("features.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
               { icon: Bot, title: t("features.aiQual"), desc: t("features.aiQualDesc"), color: "primary", colorClass: "bg-primary/10 text-primary" },
               { icon: MessageSquare, title: t("features.whatsapp"), desc: t("features.whatsappDesc"), color: "emerald", colorClass: "bg-emerald-500/10 text-emerald-600" },
               { icon: Send, title: t("features.email"), desc: t("features.emailDesc"), color: "blue", colorClass: "bg-blue-500/10 text-blue-600" },
               { icon: Globe, title: t("features.trade"), desc: t("features.tradeDesc"), color: "purple", colorClass: "bg-purple-500/10 text-purple-600" },
               { icon: FileText, title: t("features.compliance"), desc: t("features.complianceDesc"), color: "amber", colorClass: "bg-amber-500/10 text-amber-600" },
               { icon: DollarSign, title: t("features.finance"), desc: t("features.financeDesc"), color: "emerald", colorClass: "bg-emerald-500/10 text-emerald-600" },
               { icon: BarChart3, title: t("features.crm"), desc: t("features.crmDesc"), color: "primary", colorClass: "bg-primary/10 text-primary" },
               { icon: TrendingUp, title: t("features.revenue"), desc: t("features.revenueDesc"), color: "green", colorClass: "bg-green-500/10 text-green-600" },
               { icon: Users, title: t("features.onboarding"), desc: t("features.onboardingDesc"), color: "cyan", colorClass: "bg-cyan-500/10 text-cyan-600" },
               { icon: Shield, title: t("features.ers"), desc: t("features.ersDesc"), color: "primary", colorClass: "bg-primary/10 text-primary" },
               { icon: Layers, title: t("features.content"), desc: t("features.contentDesc"), color: "orange", colorClass: "bg-orange-500/10 text-orange-600" },
               { icon: Zap, title: t("features.automations"), desc: t("features.automationsDesc"), color: "yellow", colorClass: "bg-yellow-500/10 text-yellow-600" },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className={cn(
                  "p-3 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform",
                  feature.colorClass
                )}>
                  <feature.icon className={cn("h-6 w-6", feature.colorClass.split(" ")[1])} />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">{t("how.badge")}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("how.title")}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("how.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", title: t("how.capture"), desc: t("how.captureDesc"), icon: MessageSquare },
              { step: "02", title: t("how.qualify"), desc: t("how.qualifyDesc"), icon: Bot },
              { step: "03", title: t("how.nurture"), desc: t("how.nurtureDesc"), icon: Send },
              { step: "04", title: t("how.onboard"), desc: t("how.onboardDesc"), icon: FileText },
            ].map((item, i) => (
              <div key={i} className="relative text-center p-6">
                {i < 3 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px border-t-2 border-dashed border-primary/20" />
                )}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary/30 mb-1">{item.step}</div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Ecosystem */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Integration Ecosystem</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powered by the best automation platforms</h2>              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Mapato was born from a direct collaboration between{" "}
                <a href="https://sokogate.com" target="_blank" rel="noopener noreferrer" className="link-hover-orange font-medium">Sokogate.com</a>
                {" "}and{" "}
                <a href="https://ultimotradingltd.co.ke" target="_blank" rel="noopener noreferrer" className="link-hover-orange font-medium">UltimoTradingLtd.co.ke</a>.
                We orchestrate the best tools into one seamless system.
              </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "WATI.io", role: "WhatsApp Business API", desc: "Bulk messaging, chatbots, shared inbox, and broadcast campaigns on WhatsApp.", bg: "from-green-500/10" },
              { name: "QMe", role: "AI Document Processing", desc: "Document intake, entity extraction, workflow triggers, and knowledge base population.", bg: "from-blue-500/10" },
              { name: "Make.com", role: "Workflow Automation", desc: "Custom automation scenarios connecting CRM, email, WhatsApp, and analytics together.", bg: "from-purple-500/10" },
              { name: "Voiceflow", role: "Conversational AI", desc: "No-code chatbot builder for lead qualification flows with scoring and routing.", bg: "from-amber-500/10" },
              { name: "Instantly.ai", role: "Email Outreach", desc: "Cold email campaigns with auto-warmup, deliverability optimization, and A/B testing.", bg: "from-red-500/10" },
              { name: "Sokogate", role: "Co-Creator & Trade Platform", desc: "Mapato was co-built with Sokogate — the B2B wholesale sourcing platform connecting African traders to global markets. Sokogate powers the trade corridor matching layer.", bg: "from-primary/10" },
            { name: "Ultimo Trading", role: "Co-Creator & Anchor Client", desc: "Mapato was co-built with Ultimo Trading Ltd — the company behind Sokogate. As the anchor client, Ultimo's operations shaped every feature from lead capture to compliance tracking.", bg: "from-amber-500/10" },
            ].map((tool, i) => (
              <div key={i} className="p-6 rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/50 hover:border-primary/20 transition-all duration-300">
                <div className={cn("p-3 rounded-lg bg-gradient-to-br mb-4 w-fit", tool.bg, "to-transparent")}>                      {i === 5 ? (
                    <a href="https://sokogate.com" target="_blank" rel="noopener noreferrer" className="block">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold">
                        {tool.name[0]}
                      </div>
                    </a>
                  ) : i === 6 ? (
                    <a href="https://ultimotradingltd.co.ke" target="_blank" rel="noopener noreferrer" className="block">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold">
                        {tool.name[0]}
                      </div>
                    </a>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold">
                      {tool.name[0]}
                    </div>
                  )}
                </div>
                <h3 className="font-semibold mb-1">{tool.name}</h3>
                <p className="text-xs text-primary/70 font-mono mb-2">{tool.role}</p>
                <p className="text-sm text-muted-foreground">{tool.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Polsia-inspired model */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">{t("pricing.badge")}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("pricing.title")}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("pricing.subtitle")}</p>
          </div>

          {/* Free Trial Banner */}
          <div className="mb-10 p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-emerald-500/10 border border-primary/20 text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">14-Day Free Trial. Full Access. No Credit Card.</h3>
            <p className="text-muted-foreground max-w-xl mx-auto mb-4">
              Try every Mapato feature — AI agents, God Mode, WhatsApp automation, pipeline CRM, compliance tracking,
              and trade finance. Your personalized plan is suggested after you complete onboarding.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-emerald-500">
                <CheckCircle2 className="h-4 w-4" /> All features unlocked
              </div>
              <div className="flex items-center gap-1.5 text-emerald-500">
                <CheckCircle2 className="h-4 w-4" /> No commitment
              </div>
              <div className="flex items-center gap-1.5 text-emerald-500">
                <CheckCircle2 className="h-4 w-4" /> Cancel anytime
              </div>
              <div className="flex items-center gap-1.5 text-emerald-500">
                <CheckCircle2 className="h-4 w-4" /> Plan tailored to your needs
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Starter - Polsia-inspired $50/mo + 10% success fee */}
            <div className="relative p-6 rounded-xl border border-border/50 bg-card hover:border-primary/20 transition-all duration-300 flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-bold">Starter</h3>
                <p className="text-sm text-muted-foreground mt-1">For solo traders and small teams getting started</p>
              </div>
              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">$50</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">or <strong>$500/year</strong> (save 2 months)</p>
                <p className="text-xs text-muted-foreground">+ 10% success fee on revenue generated</p>
                <Badge variant="outline" className="mt-2 text-[10px] font-mono">God Mode: $19/hr</Badge>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                {[
                  "Basic lead qualification bot (Voiceflow + WhatsApp)",
                  "WhatsApp & email follow-up sequences",
                  "Up to 500 contacts",
                  "Pipeline CRM access",
                  "Monthly performance report",
                  "Community support",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/needs-assessment">
                <Button variant="outline" className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" /> Start Free Trial
                </Button>
              </Link>
            </div>

            {/* Growth - Polsia-inspired $200/mo + 15% success fee */}
            <div className="relative p-6 rounded-xl border-2 border-primary/40 bg-card shadow-xl shadow-primary/5 transition-all duration-300 flex flex-col scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
              </div>
              <div className="mb-4">
                <h3 className="text-lg font-bold">Growth</h3>
                <p className="text-sm text-muted-foreground mt-1">For growing trading companies scaling operations</p>
              </div>
              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">$200</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">or <strong>$2,000/year</strong> (save 2 months)</p>
                <p className="text-xs text-muted-foreground">+ 15% success fee on revenue generated</p>
                <Badge variant="outline" className="mt-2 text-[10px] font-mono">God Mode: $14/hr</Badge>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                {[
                  "Advanced lead scoring & routing (AI-powered)",
                  "Multi-channel automation (WhatsApp, Email, LinkedIn)",
                  "Up to 5,000 contacts",
                  "Custom automation workflow builder",
                  "Revenue forecasting & predictive analytics",
                  "Trade compliance & certification tracking",
                  "Priority support",
                  "Dedicated account manager",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/needs-assessment">
                <Button className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" /> Start Free Trial
                </Button>
              </Link>
            </div>

            {/* Enterprise - Polsia-inspired $500/mo + 20% success fee + free God Mode */}
            <div className="relative p-6 rounded-xl border border-border/50 bg-card hover:border-primary/20 transition-all duration-300 flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-bold">Enterprise</h3>
                <p className="text-sm text-muted-foreground mt-1">Full-featured solution for established businesses</p>
              </div>
              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">$500</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">or <strong>$5,000/year</strong> (save 2 months)</p>
                <p className="text-xs text-muted-foreground">+ 20% success fee on revenue generated</p>
                <Badge className="mt-2 text-[10px] bg-emerald-500/20 text-emerald-500 border-emerald-500/30">God Mode Included</Badge>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                {[
                  "Enterprise-grade AI automation & orchestration",
                  "Omnichannel engagement platform",
                  "Unlimited contacts & workflows",
                  "Custom integrations & full API access",
                  "AI-powered predictive trade analytics",
                  "Trade finance application management",
                  "Export Readiness Scoring (ERS)",
                  "24/7 premium support & SLA guarantees",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/needs-assessment">
                <Button variant="outline" className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" /> Start Free Trial
                </Button>
              </Link>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              All plans include a <strong className="text-primary">14-day free trial</strong> with full access to every feature. No credit card required.{" "}
              <Link href="/needs-assessment" className="link-hover-orange font-semibold">Start your trial now →</Link>
            </p>
          </div>

          {/* Polsia Comparison Table */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <Badge variant="outline" className="mb-4">{t("pricing.badge")}</Badge>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">{t("compare.title")}</h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">{t("compare.subtitle")}</p>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-border/50 bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left px-6 py-4 font-semibold">{t("compare.feature")}</th>
                    <th className="text-center px-6 py-4">
                      <div>
                        <span className="font-bold text-foreground">Polsia</span>
                        <p className="text-[10px] text-muted-foreground font-normal mt-0.5">{t("compare.polsiaDesc")}</p>
                      </div>
                    </th>
                    <th className="text-center px-6 py-4 bg-primary/5">
                      <div>
                        <span className="font-bold text-primary">Mapato</span>
                        <p className="text-[10px] text-muted-foreground font-normal mt-0.5">{t("compare.mapatoDesc")}</p>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: t("compare.target"), polsia: t("compare.targetP"), mapato: t("compare.targetM"), highlight: true },
                    { feature: t("compare.monthly"), polsia: t("compare.monthlyP"), mapato: t("compare.monthlyM"), highlight: true },
                    { feature: t("compare.successFee"), polsia: <span className="text-destructive font-medium">{t("compare.successFeeP")}</span>, mapato: <span className="text-emerald-500 font-bold">{t("compare.successFeeM")}</span>, highlight: true },
                    { feature: t("compare.leadQual"), polsia: t("compare.check"), mapato: t("compare.check") },
                    { feature: t("compare.whatsapp"), polsia: t("compare.cross"), mapato: t("compare.check") },
                    { feature: t("compare.email"), polsia: t("compare.check"), mapato: t("compare.check") },
                    { feature: t("compare.crm"), polsia: t("compare.check"), mapato: t("compare.check") },
                    { feature: t("compare.forecasting"), polsia: t("compare.cross"), mapato: <span className="text-emerald-500">{t("compare.check")}</span> },
                    { feature: t("compare.trade"), polsia: t("compare.cross"), mapato: <span className="text-emerald-500">{t("compare.check")}</span> },
                    { feature: t("compare.ers"), polsia: t("compare.cross"), mapato: <span className="text-emerald-500">{t("compare.check")}</span> },
                    { feature: t("compare.finance"), polsia: t("compare.cross"), mapato: <span className="text-emerald-500">{t("compare.check")}</span> },
                    { feature: t("compare.compliance"), polsia: t("compare.cross"), mapato: <span className="text-emerald-500">{t("compare.check")}</span> },
                    { feature: t("compare.freeTrial"), polsia: t("compare.cross"), mapato: <span className="text-emerald-500 font-medium">{t("compare.trialDays")}</span> },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "border-b border-border/30 transition-colors",
                        i === 2 ? "bg-primary/[0.02]" : "",
                        row.highlight ? "hover:bg-muted/20" : "hover:bg-muted/10"
                      )}
                    >
                      <td className="px-6 py-3.5 font-medium text-sm">{row.feature}</td>
                      <td className="px-6 py-3.5 text-center text-sm text-muted-foreground">{row.polsia}</td>
                      <td className="px-6 py-3.5 text-center text-sm font-medium bg-primary/5">{row.mapato}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {[
                { feature: t("compare.target"), polsia: t("compare.targetP"), mapato: t("compare.targetM"), highlight: true },
                { feature: t("compare.monthly"), polsia: t("compare.monthlyP"), mapato: t("compare.monthlyM"), highlight: true },
                { feature: t("compare.successFee"), polsia: "20%", mapato: "From 10%", highlight: true },
                { feature: t("compare.leadQual"), polsia: "✅", mapato: "✅" },
                { feature: t("compare.whatsapp"), polsia: "❌", mapato: "✅" },
                { feature: t("compare.email"), polsia: "✅", mapato: "✅" },
                { feature: t("compare.crm"), polsia: "✅", mapato: "✅" },
                { feature: t("compare.forecasting"), polsia: "❌", mapato: "✅" },
                { feature: t("compare.trade"), polsia: "❌", mapato: "✅" },
                { feature: t("compare.ers"), polsia: "❌", mapato: "✅" },
                { feature: t("compare.finance"), polsia: "❌", mapato: "✅" },
                { feature: t("compare.compliance"), polsia: "❌", mapato: "✅" },
                { feature: t("compare.freeTrial"), polsia: "❌", mapato: "✅ 14-day free trial" },
              ].map((row, i) => (
                <div key={i} className={cn(
                  "p-4 rounded-xl border border-border/50",
                  i === 2 ? "bg-primary/[0.02] border-primary/20" : "bg-card"
                )}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{row.feature}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">{t("compare.polsia")}</p>
                      <p className={cn("text-sm", i === 2 && "text-destructive font-medium")}>{row.polsia}</p>
                    </div>
                    <div className="text-center bg-primary/5 rounded-lg p-2">
                      <p className="text-[10px] text-primary uppercase mb-1">{t("compare.mapato")}</p>
                      <p className={cn("text-sm font-semibold", i === 2 ? "text-emerald-500" : "")}>{row.mapato}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link href="/needs-assessment">
                <Button size="lg" className="h-12 px-8 text-base">
                  <Sparkles className="h-5 w-5 mr-2" />{t("nav.getStarted")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats / Testimonials */}
      <section id="testimonials" className="py-20 md:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">{t("stats.badge")}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("stats.title")}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { metric: "3x", label: "More qualified leads", desc: "AI lead qualification triples the number of sales-ready conversations." },
              { metric: "85%", label: "Faster response time", desc: "Automated WhatsApp replies cut first-response time from hours to seconds." },
              { metric: "60%", label: "Reduction in manual work", desc: "Automation handles follow-ups, data entry, and reporting." },
            ].map((stat, i) => (
              <div key={i} className="text-center p-8 rounded-xl border border-border/50 bg-card">
                <div className="text-4xl font-bold bg-gradient-to-r from-primary to-emerald-400 text-transparent bg-clip-text mb-2">
                  {stat.metric}
                </div>
                <h3 className="font-semibold mb-2">{stat.label}</h3>
                <p className="text-sm text-muted-foreground">{stat.desc}</p>
              </div>
            ))}
          </div>

          {/* Testimonial card */}
          <div className="mt-8 p-8 rounded-xl border border-border/50 bg-gradient-to-br from-card to-primary/5">
            <div className="flex items-start gap-4 md:gap-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold shrink-0">
                UT
              </div>
              <div>
                <p className="text-base md:text-lg italic text-muted-foreground mb-4">
                  &ldquo;Mapato automated our entire lead qualification process via WhatsApp. 
                  We went from 20 leads/month to 85 qualified conversations — and closed 3x more deals. 
                  The Korea corridor access through Sokogate is opening doors we couldn&apos;t reach before.&rdquo;
                </p>
                <div>
                  <p className="font-semibold text-sm">Bangaly Fofana</p>
                  <p className="text-xs text-muted-foreground">Operations Director, Ultimo Trading Ltd</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience / ICP Section */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">{t("icp.badge")}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("icp.title")}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("icp.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-border/50 bg-card">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" /> 
                {t("icp.fit")}
              </h3>
              <ul className="space-y-3">
                {[
                  t("icp.fit1"),
                  t("icp.fit2"),
                  t("icp.fit3"),
                  t("icp.fit4"),
                  t("icp.fit5"),
                  t("icp.fit6"),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 rounded-xl border border-border/50 bg-card">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <X className="h-5 w-5 text-destructive" /> 
                {t("icp.notFit")}
              </h3>
              <ul className="space-y-3">
                {[
                  t("icp.notFit1"),
                  t("icp.notFit2"),
                  t("icp.notFit3"),
                  t("icp.notFit4"),
                  t("icp.notFit5"),
                  t("icp.notFit6"),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-primary/5 via-background to-emerald-500/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="outline" className="mb-4">{t("cta.badge")}</Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">{t("cta.subtitle")}</p>

          {/* Email capture */}
          <form onSubmit={handleSubscribe} className="max-w-md mx-auto flex gap-3">
            <div className="flex-1">
              <Input 
                type="email" 
                placeholder="Enter your work email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
                required
              />
            </div>
            <Button type="submit" disabled={subscribing} className="h-12 px-6">                  {subscribing ? <Loader2 className="h-5 w-5 animate-spin" /> : t("cta.getAccess")}
            </Button>
          </form>

          {subscribed && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600 dark:text-emerald-400">
              ✅ {t("cta.subscribed")}
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/terms" className="link-hover-orange">{t("cta.terms")}</Link>
            <Link href="/login" className="link-hover-orange">{t("nav.signIn")}</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-bold">Mapato</span>
              <span className="text-xs text-muted-foreground font-mono">Mapato</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/docs" className="link-hover-orange text-muted-foreground">{t("nav.guides")}</Link>
              <Link href="/terms" className="link-hover-orange text-muted-foreground">{t("footer.terms")}</Link>
              <Link href="/privacy" className="link-hover-orange text-muted-foreground">{t("footer.privacy")}</Link>
              <a href={`mailto:${CONTACT_INFO.email}`} className="link-hover-orange text-muted-foreground">{t("footer.contact")}</a>
            </div>
            <div className="flex flex-col items-center md:items-end gap-1">
              <p className="text-xs text-muted-foreground">
                © 2026 Mapato. {t("footer.tagline")}
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                Built in collaboration with{" "}
                <a href="https://sokogate.com" target="_blank" rel="noopener noreferrer" className="text-primary/60 hover:text-primary transition-colors">Sokogate.com</a>
                {" "}×{" "}
                <a href="https://ultimotradingltd.co.ke" target="_blank" rel="noopener noreferrer" className="text-primary/60 hover:text-primary transition-colors">UltimoTradingLtd.co.ke</a>
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Bar */}
      <ContactBar />
    </div>
  )
}
