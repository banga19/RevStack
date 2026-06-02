"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
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
    // Simulate subscription
    await new Promise(r => setTimeout(r, 1000))
    setSubscribed(true)
    setSubscribing(false)
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
              <Badge variant="outline" className="ml-2 text-[10px] font-mono text-muted-foreground">sokogateOS</Badge>
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
              <Link href="/signup">
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
                <Link href="/signup" className="flex-1"><Button className="w-full">{t("nav.getStarted")}</Button></Link>
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
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in">
              {t("hero.title")}{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-emerald-400 text-transparent bg-clip-text">
                {t("hero.titleHighlight")}
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 animate-fade-in">
              {t("hero.subtitle")}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in">
              <Link href="/signup">
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
              { icon: Bot, title: t("features.aiQual"), desc: t("features.aiQualDesc"), color: "primary" },
              { icon: MessageSquare, title: t("features.whatsapp"), desc: t("features.whatsappDesc"), color: "emerald" },
              { icon: Send, title: t("features.email"), desc: t("features.emailDesc"), color: "blue" },
              { icon: Globe, title: t("features.trade"), desc: t("features.tradeDesc"), color: "purple" },
              { icon: FileText, title: t("features.compliance"), desc: t("features.complianceDesc"), color: "amber" },
              { icon: DollarSign, title: t("features.finance"), desc: t("features.financeDesc"), color: "emerald" },
              { icon: BarChart3, title: t("features.crm"), desc: t("features.crmDesc"), color: "primary" },
              { icon: TrendingUp, title: t("features.revenue"), desc: t("features.revenueDesc"), color: "green" },
              { icon: Users, title: t("features.onboarding"), desc: t("features.onboardingDesc"), color: "cyan" },
              { icon: Shield, title: t("features.ers"), desc: t("features.ersDesc"), color: "primary" },
              { icon: Layers, title: t("features.content"), desc: t("features.contentDesc"), color: "orange" },
              { icon: Zap, title: t("features.automations"), desc: t("features.automationsDesc"), color: "yellow" },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className={cn(
                  "p-3 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform",
                  `bg-${feature.color}/10`
                )}>
                  <feature.icon className={cn("h-6 w-6", `text-${feature.color}`)} />
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powered by the best automation platforms</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We don't build everything from scratch. We orchestrate the best tools into one seamless system.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "WATI.io", role: "WhatsApp Business API", desc: "Bulk messaging, chatbots, shared inbox, and broadcast campaigns on WhatsApp.", bg: "from-green-500/10" },
              { name: "QMe", role: "AI Document Processing", desc: "Document intake, entity extraction, workflow triggers, and knowledge base population.", bg: "from-blue-500/10" },
              { name: "Make.com", role: "Workflow Automation", desc: "Custom automation scenarios connecting CRM, email, WhatsApp, and analytics together.", bg: "from-purple-500/10" },
              { name: "Voiceflow", role: "Conversational AI", desc: "No-code chatbot builder for lead qualification flows with scoring and routing.", bg: "from-amber-500/10" },
              { name: "Instantly.ai", role: "Email Outreach", desc: "Cold email campaigns with auto-warmup, deliverability optimization, and A/B testing.", bg: "from-red-500/10" },
              { name: "Sokogate", role: "B2B Trade Platform", desc: "Bulk product sourcing, trade corridor matching, and AfCFTA startup program access.", bg: "from-primary/10" },
            ].map((tool, i) => (
              <div key={i} className="p-6 rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/50 hover:border-primary/20 transition-all duration-300">
                <div className={cn("p-3 rounded-lg bg-gradient-to-br mb-4 w-fit", tool.bg, "to-transparent")}>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold">
                    {tool.name[0]}
                  </div>
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

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="relative p-6 rounded-xl border border-border/50 bg-card hover:border-primary/20 transition-all duration-300 flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-bold">Starter</h3>
                <p className="text-sm text-muted-foreground mt-1">For solo traders and small teams getting started</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">$50</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">+ 10% success fee on revenue generated</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Basic lead qualification bot",
                  "WhatsApp & email follow-ups",
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
              <Link href="/signup">
                <Button variant="outline" className="w-full">Get started</Button>
              </Link>
            </div>

            {/* Growth - Recommended */}
            <div className="relative p-6 rounded-xl border-2 border-primary/40 bg-card shadow-xl shadow-primary/5 transition-all duration-300 flex flex-col scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
              </div>
              <div className="mb-4">
                <h3 className="text-lg font-bold">Growth</h3>
                <p className="text-sm text-muted-foreground mt-1">For growing trading companies scaling operations</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">$200</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">+ 15% success fee on revenue generated</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Advanced lead scoring & routing",
                  "Multi-channel automation",
                  "Up to 5,000 contacts",
                  "Custom workflow builder",
                  "Revenue forecasting analytics",
                  "Priority support",
                  "Dedicated account manager",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <Button className="w-full">Get started</Button>
              </Link>
            </div>

            {/* Enterprise */}
            <div className="relative p-6 rounded-xl border border-border/50 bg-card hover:border-primary/20 transition-all duration-300 flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-bold">Enterprise</h3>
                <p className="text-sm text-muted-foreground mt-1">For established businesses with complex needs</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">$500</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">+ 20% success fee on revenue generated</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Enterprise-grade AI automation",
                  "Omnichannel orchestration",
                  "Unlimited contacts",
                  "Custom integrations & API",
                  "AI-powered predictive analytics",
                  "24/7 premium support",
                  "Customer success manager",
                  "SLA guarantees",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <Button variant="outline" className="w-full">Contact sales</Button>
              </Link>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              All plans include a 14-day free trial. No credit card required.{" "}
              <Link href="/signup" className="text-primary hover:underline">Start your trial →</Link>
            </p>
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
                  "sokogateOS automated our entire lead qualification process via WhatsApp. 
                  We went from 20 leads/month to 85 qualified conversations — and closed 3x more deals. 
                  The Korea corridor access through Sokogate is opening doors we couldn't reach before."
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
            <Link href="/terms" className="hover:text-foreground transition-colors">{t("cta.terms")}</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">{t("nav.signIn")}</Link>
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
              <span className="text-xs text-muted-foreground font-mono">sokogateOS</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
              <a href={`mailto:${CONTACT_INFO.email}`} className="hover:text-foreground transition-colors">{t("footer.contact")}</a>
            </div>
            <p className="text-xs text-muted-foreground">
              © 2026 Mapato. {t("footer.tagline")}
            </p>
          </div>
        </div>
      </footer>

      {/* Contact Bar */}
      <ContactBar />
    </div>
  )
}
