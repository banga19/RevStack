"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Search,
  BookOpen,
  Bot,
  MessageSquare,
  Send,
  Globe,
  Shield,
  DollarSign,
  BarChart3,
  Users,
  FileText,
  Target,
  TrendingUp,
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Truck,
  Building2,
  User,
  Briefcase,
  PlayCircle,
  BookMarked,
  Lightbulb,
  Layers,
  ChevronRight,
} from "lucide-react"

// ============================================================
// Guide data — organized by target audience / ICP
// ============================================================

type GuideSection = {
  title: string
  items: { label: string; icon: React.ReactNode; time: string }[]
}

type Guide = {
  id: string
  icon: React.ReactNode
  audience: string
  subtitle: string
  badge: string
  badgeColor: string
  description: string
  problem: string
  sections: GuideSection[]
  nextSteps: { label: string; href: string }[]
}

const guides: Guide[] = [
  {
    id: "b2b-trading",
    icon: <Globe className="h-6 w-6" />,
    audience: "B2B Import/Export Trading Companies",
    subtitle: "The primary ICP — automate your entire trade operation",
    badge: "Primary ICP",
    badgeColor: "bg-primary/10 text-primary border-primary/20",
    description:
      "You run an import/export or wholesale trading company handling 50+ inbound WhatsApp inquiries per month. Your team is overwhelmed by repetitive pricing questions, stock checks, and follow-ups. Mapato automates the entire cycle — from lead capture to compliant onboarding.",
    problem:
      "Your sales team spends 60% of their day answering the same questions about pricing, availability, and delivery. Leads go cold because follow-ups don't happen. You have no visibility into your pipeline or conversion rates.",
    sections: [
      {
        title: "Getting Started",
        items: [
          { label: "Connect your WhatsApp Business account via WATI.io", icon: <MessageSquare className="h-4 w-4" />, time: "15 min" },
          { label: "Set up your lead qualification chatbot (Voiceflow template)", icon: <Bot className="h-4 w-4" />, time: "20 min" },
          { label: "Configure your trade corridors (China→Africa, Korea→Africa)", icon: <Globe className="h-4 w-4" />, time: "10 min" },
          { label: "Import your contact list or connect your CRM", icon: <Users className="h-4 w-4" />, time: "10 min" },
        ],
      },
      {
        title: "Daily Operations",
        items: [
          { label: "Monitor incoming leads in Pipeline CRM dashboard", icon: <BarChart3 className="h-4 w-4" />, time: "5 min" },
          { label: "Review AI-scored leads and prioritize hot prospects", icon: <Target className="h-4 w-4" />, time: "10 min" },
          { label: "Respond to high-intent leads flagged by the chatbot", icon: <MessageSquare className="h-4 w-4" />, time: "15 min" },
          { label: "Track compliance certificate renewals (HACCP, Halal, etc.)", icon: <Shield className="h-4 w-4" />, time: "5 min" },
        ],
      },
      {
        title: "Getting the Most Out of It",
        items: [
          { label: "Activate God Mode for fully autonomous lead management — runs 24/7", icon: <Sparkles className="h-4 w-4" />, time: "5 min" },
          { label: "Set up automated follow-up sequences (WhatsApp + Email) to re-engage cold leads", icon: <Send className="h-4 w-4" />, time: "15 min" },
          { label: "Submit trade finance applications (AfDB/AFAWA, LC) for working capital", icon: <DollarSign className="h-4 w-4" />, time: "20 min" },
          { label: "Review weekly revenue forecast and pipeline reports to spot trends", icon: <TrendingUp className="h-4 w-4" />, time: "10 min" },
        ],
      },
    ],
    nextSteps: [
      { label: "Start your free trial", href: "/signup" },
      { label: "View pipeline CRM", href: "/pipeline" },
      { label: "Explore trade finance", href: "/trade" },
    ],
  },
  {
    id: "wholesale-distributors",
    icon: <Truck className="h-6 w-6" />,
    audience: "Wholesale Distributors",
    subtitle: "Streamline bulk inquiries and order management",
    badge: "High Fit",
    badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    description:
      "You distribute goods (agriculture, electronics, building materials, etc.) to retailers and businesses. You receive hundreds of bulk inquiries daily asking for price lists, stock availability, and minimum order quantities. Mapato automates these responses and captures every order opportunity.",
    problem:
      "Your WhatsApp is flooded with 'what's the price of X?' and 'do you have Y in stock?' messages. Your team manually types the same responses dozens of times a day. Bulk order requests get lost in the chat. You can't track which inquiries convert to actual orders.",
    sections: [
      {
        title: "Getting Started",
        items: [
          { label: "Upload your product catalog with pricing tiers", icon: <FileText className="h-4 w-4" />, time: "30 min" },
          { label: "Set up auto-reply templates for stock & price inquiries", icon: <MessageSquare className="h-4 w-4" />, time: "15 min" },
          { label: "Configure bulk order intake form (Voiceflow)", icon: <Bot className="h-4 w-4" />, time: "20 min" },
          { label: "Connect your inventory management system via Make.com", icon: <Zap className="h-4 w-4" />, time: "25 min" },
        ],
      },
      {
        title: "Daily Operations",
        items: [
          { label: "Monitor automated price/stock replies in activity feed", icon: <BarChart3 className="h-4 w-4" />, time: "5 min" },
          { label: "Review bulk order requests and assign to sales", icon: <Users className="h-4 w-4" />, time: "10 min" },
          { label: "Update stock levels to keep auto-replies accurate", icon: <FileText className="h-4 w-4" />, time: "10 min" },
          { label: "Track inquiry-to-order conversion rates in Pipeline CRM", icon: <Target className="h-4 w-4" />, time: "5 min" },
        ],
      },
      {
        title: "Getting the Most Out of It",
        items: [
          { label: "Activate God Mode for autonomous order follow-ups after hours", icon: <Sparkles className="h-4 w-4" />, time: "5 min" },
          { label: "Create email sequences for abandoned inquiries to recover lost sales", icon: <Send className="h-4 w-4" />, time: "10 min" },
          { label: "Expand to new trade corridors via Sokogate matching for new suppliers", icon: <Globe className="h-4 w-4" />, time: "20 min" },
          { label: "Generate monthly distributor performance report to optimize pricing", icon: <TrendingUp className="h-4 w-4" />, time: "10 min" },
        ],
      },
    ],
    nextSteps: [
      { label: "Start your free trial", href: "/signup" },
      { label: "Explore outreach tools", href: "/outreach" },
      { label: "View content calendar", href: "/content" },
    ],
  },
  {
    id: "growing-companies",
    icon: <TrendingUp className="h-6 w-6" />,
    audience: "Growing Trading Companies",
    subtitle: "Scale operations with AI-powered automation",
    badge: "Growth Stage",
    badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    description:
      "You've been in business for 2-5 years and are ready to scale. You currently handle 100+ leads per month but your team of 5-15 can't keep up. You need automation to multiply your output without multiplying headcount. Mapato's Growth plan with God Mode is built for you.",
    problem:
      "You're stuck in the 'growth plateau' — you have the demand but not the capacity. Hiring more salespeople is expensive and slow. Your manual processes create bottlenecks in lead response, qualification, and onboarding. You need to 2x your output without 2x your team.",
    sections: [
      {
        title: "Getting Started",
        items: [
          { label: "Activate Growth plan and configure multi-channel inbox", icon: <MessageSquare className="h-4 w-4" />, time: "15 min" },
          { label: "Set up AI lead scoring with custom qualification criteria", icon: <Bot className="h-4 w-4" />, time: "20 min" },
          { label: "Connect WhatsApp + Email + LinkedIn automation channels", icon: <Send className="h-4 w-4" />, time: "25 min" },
          { label: "Configure custom automation workflows in Make.com", icon: <Zap className="h-4 w-4" />, time: "30 min" },
        ],
      },
      {
        title: "Daily Operations",
        items: [
          { label: "Review AI-scored lead queue and assign top prospects to your team", icon: <Target className="h-4 w-4" />, time: "10 min" },
          { label: "Monitor automated outreach campaign performance across channels", icon: <BarChart3 className="h-4 w-4" />, time: "10 min" },
          { label: "Check revenue forecast and pipeline health in the dashboard", icon: <TrendingUp className="h-4 w-4" />, time: "10 min" },
          { label: "Review God Mode agent activity logs for exceptions and wins", icon: <Sparkles className="h-4 w-4" />, time: "5 min" },
        ],
      },
      {
        title: "Getting the Most Out of It",
        items: [
          { label: "Activate God Mode for 24/7 autonomous lead management — scales without headcount", icon: <Sparkles className="h-4 w-4" />, time: "5 min" },
          { label: "A/B test outreach messaging across channels to optimize conversion", icon: <Send className="h-4 w-4" />, time: "15 min" },
          { label: "Expand to Enterprise plan for dedicated account manager and unlimited contacts", icon: <Building2 className="h-4 w-4" />, time: "10 min" },
          { label: "Request custom API integrations for your existing ERP or accounting tools", icon: <Layers className="h-4 w-4" />, time: "varies" },
        ],
      },
    ],
    nextSteps: [
      { label: "View Growth pricing", href: "/pricing" },
      { label: "Explore Operations Center", href: "/operations" },
      { label: "Check financial model", href: "/financial" },
    ],
  },
  {
    id: "solo-traders",
    icon: <User className="h-6 w-6" />,
    audience: "Solo Traders & Small Teams",
    subtitle: "Run your entire business with AI agents — no team needed",
    badge: "Quick Start",
    badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    description:
      "You're a solo entrepreneur or a 2-3 person team running a trading business. You wear every hat — sales, operations, compliance, and customer service. Mapato's Starter plan lets AI agents handle the repetitive work so you can focus on closing deals and building relationships.",
    problem:
      "As a solo operator, every minute counts. You spend hours answering the same WhatsApp questions, chasing leads for follow-ups, and manually onboarding clients. There aren't enough hours in the day. You're leaving revenue on the table because you simply can't get to every lead.",
    sections: [
      {
        title: "Quick Start (First Day)",
        items: [
          { label: "Create your account and start 14-day free trial", icon: <CheckCircle2 className="h-4 w-4" />, time: "2 min" },
          { label: "Complete onboarding questionnaire (tell us about your business)", icon: <FileText className="h-4 w-4" />, time: "3 min" },
          { label: "Connect your WhatsApp Business number via WATI.io", icon: <MessageSquare className="h-4 w-4" />, time: "10 min" },
          { label: "Activate the pre-built lead qualification chatbot — starts working immediately", icon: <Bot className="h-4 w-4" />, time: "5 min" },
        ],
      },
      {
        title: "Week 1: Go Live",
        items: [
          { label: "Set up auto-reply templates for your most common inquiries", icon: <MessageSquare className="h-4 w-4" />, time: "20 min" },
          { label: "Import your existing contacts or start fresh with new leads", icon: <Users className="h-4 w-4" />, time: "10 min" },
          { label: "Configure basic follow-up sequence (2 WhatsApp + 1 Email)", icon: <Send className="h-4 w-4" />, time: "15 min" },
          { label: "Review your first AI-scored leads in Pipeline CRM", icon: <BarChart3 className="h-4 w-4" />, time: "5 min" },
        ],
      },
      {
        title: "Getting the Most Out of It",
        items: [
          { label: "Spend just 15 min/day reviewing hot leads — AI handles the rest", icon: <Target className="h-4 w-4" />, time: "15 min" },
          { label: "Let God Mode handle follow-ups and re-engagement while you sleep", icon: <Sparkles className="h-4 w-4" />, time: "0 min" },
          { label: "Check weekly performance report (auto-generated) to see what's working", icon: <TrendingUp className="h-4 w-4" />, time: "10 min" },
          { label: "Upgrade to Growth plan when leads exceed 500/mo — seamless transition", icon: <TrendingUp className="h-4 w-4" />, time: "5 min" },
        ],
      },
    ],
    nextSteps: [
      { label: "Start free trial", href: "/signup" },
      { label: "View pricing", href: "/pricing" },
      { label: "Read strategy docs", href: "#" },
    ],
  },
  {
    id: "ops-directors",
    icon: <Briefcase className="h-6 w-6" />,
    audience: "Operations Directors & Sales Managers",
    subtitle: "Get full visibility and control over your trade pipeline",
    badge: "Management",
    badgeColor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    description:
      "You're responsible for the sales and operations performance of a trading company. You need visibility into every stage of the pipeline — from lead capture to onboarding to revenue. Mapato gives you real-time dashboards, team performance metrics, and automated reporting so you can make data-driven decisions.",
    problem:
      "You're flying blind. Leads come in through WhatsApp, email, and calls — but you can't track where they are in the pipeline. Your team claims they're 'following up' but you have no data to verify. Revenue forecasting is a guessing game. Reporting takes hours of manual spreadsheet work.",
    sections: [
      {
        title: "Dashboard Setup",
        items: [
          { label: "Configure your main dashboard with the KPIs that matter most to you", icon: <BarChart3 className="h-4 w-4" />, time: "15 min" },
          { label: "Set up team member access and role-based permissions", icon: <Users className="h-4 w-4" />, time: "10 min" },
          { label: "Connect revenue tracking (monthly retainer + success fees)", icon: <DollarSign className="h-4 w-4" />, time: "15 min" },
          { label: "Configure automated weekly report delivery to your inbox", icon: <FileText className="h-4 w-4" />, time: "10 min" },
        ],
      },
      {
        title: "Daily Management",
        items: [
          { label: "Review pipeline dashboard every morning for quick health check", icon: <BarChart3 className="h-4 w-4" />, time: "10 min" },
          { label: "Check team activity log and outreach stats for accountability", icon: <Users className="h-4 w-4" />, time: "10 min" },
          { label: "Monitor God Mode agent reports for any exceptions needing attention", icon: <Sparkles className="h-4 w-4" />, time: "5 min" },
          { label: "Review Operations Center for system health and automation status", icon: <Briefcase className="h-4 w-4" />, time: "5 min" },
        ],
      },
      {
        title: "Getting the Most Out of It",
        items: [
          { label: "Run monthly revenue vs forecast analysis in Financial Model to guide strategy", icon: <TrendingUp className="h-4 w-4" />, time: "20 min" },
          { label: "Review the conversion funnel (lead → qualified → client) to find bottlenecks", icon: <Target className="h-4 w-4" />, time: "15 min" },
          { label: "Export pipeline reports for stakeholder meetings and board updates", icon: <FileText className="h-4 w-4" />, time: "5 min" },
          { label: "Adjust automation workflows based on performance data to improve results", icon: <Zap className="h-4 w-4" />, time: "20 min" },
        ],
      },
    ],
    nextSteps: [
      { label: "Go to Dashboard", href: "/dashboard" },
      { label: "Explore Operations Center", href: "/operations" },
      { label: "View financial model", href: "/financial" },
    ],
  },
  {
    id: "compliance-teams",
    icon: <Shield className="h-6 w-6" />,
    audience: "Compliance & Documentation Teams",
    subtitle: "Track certifications and manage trade compliance at scale",
    badge: "Specialist",
    badgeColor: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    description:
      "You manage the certification, compliance, and documentation required for cross-border trade. Whether it's HACCP for food exports, Halal certification for Middle East markets, or Korean import permits — Mapato tracks every certificate, sends renewal alerts, and stores documents in one centralized system.",
    problem:
      "You're juggling spreadsheets, email threads, and physical files to track certification expiry dates. A single expired certificate can halt an entire shipment. Your team spends hours chasing document renewals. There's no centralized system for compliance status across clients and products.",
    sections: [
      {
        title: "Initial Setup",
        items: [
          { label: "Create client profiles with their specific compliance requirements", icon: <Users className="h-4 w-4" />, time: "20 min" },
          { label: "Upload existing certifications with their issue and expiry dates", icon: <FileText className="h-4 w-4" />, time: "30 min" },
          { label: "Configure auto-renewal alerts (30/60/90 day advance warnings)", icon: <Clock className="h-4 w-4" />, time: "10 min" },
          { label: "Link product certifications to the trade corridors they apply to", icon: <Globe className="h-4 w-4" />, time: "15 min" },
        ],
      },
      {
        title: "Ongoing Management",
        items: [
          { label: "Check the compliance dashboard daily for expiring or expired certs", icon: <BarChart3 className="h-4 w-4" />, time: "5 min" },
          { label: "Upload new certificates as they're obtained and update status", icon: <FileText className="h-4 w-4" />, time: "5 min" },
          { label: "Run Export Readiness Score (ERS) assessments for new trade corridors", icon: <Target className="h-4 w-4" />, time: "15 min" },
          { label: "Generate compliance status report for management review", icon: <FileText className="h-4 w-4" />, time: "10 min" },
        ],
      },
      {
        title: "Getting the Most Out of It",
        items: [
          { label: "Set up automated compliance workflows via Make.com to trigger renewals", icon: <Zap className="h-4 w-4" />, time: "20 min" },
          { label: "Integrate with QMe for AI document processing — auto-extract expiry dates", icon: <Bot className="h-4 w-4" />, time: "25 min" },
          { label: "Generate country-specific compliance checklists for each export destination", icon: <Shield className="h-4 w-4" />, time: "15 min" },
          { label: "Export audit trails for regulatory submissions and certification audits", icon: <FileText className="h-4 w-4" />, time: "10 min" },
        ],
      },
    ],
    nextSteps: [
      { label: "Explore trade features", href: "/trade" },
      { label: "View pipeline CRM", href: "/pipeline" },
      { label: "Contact support", href: "mailto:support@mapato.app" },
    ],
  },
  {
    id: "trade-finance",
    icon: <DollarSign className="h-6 w-6" />,
    audience: "Trade Finance Applicants",
    subtitle: "Access funding and financial tools for cross-border trade",
    badge: "Finance",
    badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    description:
      "You need working capital, letters of credit, or escrow services to facilitate your cross-border trades. Mapato integrates directly with AfDB/AFAWA funding programs, Sokogate Pay escrow, and traditional trade finance instruments — all accessible from one dashboard with guided workflows.",
    problem:
      "Accessing trade finance is slow, paperwork-heavy, and frustrating. Banks require extensive documentation. AfDB/AFAWA applications are complex. You don't have a clear view of which financing options are available for your specific trade corridors. Applications get stuck in bureaucratic limbo.",
    sections: [
      {
        title: "Application Setup",
        items: [
          { label: "Complete your business profile with trade history and financials", icon: <Building2 className="h-4 w-4" />, time: "20 min" },
          { label: "Upload required documentation (certificates, contracts, invoices)", icon: <FileText className="h-4 w-4" />, time: "25 min" },
          { label: "Explore available funding programs (AfDB, AFAWA, LC, escrow)", icon: <DollarSign className="h-4 w-4" />, time: "15 min" },
          { label: "Connect your bank account or mobile money for disbursements", icon: <Zap className="h-4 w-4" />, time: "10 min" },
        ],
      },
      {
        title: "Application Management",
        items: [
          { label: "Submit a trade finance application from the dashboard with one click", icon: <Send className="h-4 w-4" />, time: "15 min" },
          { label: "Track application status in real-time (draft → submitted → approved)", icon: <BarChart3 className="h-4 w-4" />, time: "5 min" },
          { label: "Respond to additional documentation requests directly through the platform", icon: <FileText className="h-4 w-4" />, time: "10 min" },
          { label: "Receive disbursement notifications and manage funds from the dashboard", icon: <DollarSign className="h-4 w-4" />, time: "5 min" },
        ],
      },
      {
        title: "Getting the Most Out of It",
        items: [
          { label: "Monitor trade finance repayment schedules to maintain good standing", icon: <Clock className="h-4 w-4" />, time: "10 min" },
          { label: "Apply for repeat funding with pre-filled applications — save hours", icon: <Zap className="h-4 w-4" />, time: "10 min" },
          { label: "Generate finance utilization reports for investor and board reviews", icon: <FileText className="h-4 w-4" />, time: "10 min" },
          { label: "Explore new financing options as your trade volumes grow across corridors", icon: <TrendingUp className="h-4 w-4" />, time: "15 min" },
        ],
      },
    ],
    nextSteps: [
      { label: "Explore trade features", href: "/trade" },
      { label: "View financial model", href: "/financial" },
      { label: "Start free trial", href: "/signup" },
    ],
  },
]

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeGuide, setActiveGuide] = useState<string>("b2b-trading")
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Auto-select first matching guide when search changes
  useEffect(() => {
    if (!mounted) return
    const filtered = guides.filter((g) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        g.audience.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.problem.toLowerCase().includes(q) ||
        g.sections.some((s) => s.items.some((i) => i.label.toLowerCase().includes(q)))
      )
    })
    if (searchQuery && filtered.length > 0 && !filtered.find((g) => g.id === activeGuide)) {
      setActiveGuide(filtered[0].id)
    }
  }, [searchQuery, activeGuide, mounted])

  if (!mounted) return null

  const filteredGuides = guides.filter((g) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      g.audience.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.problem.toLowerCase().includes(q) ||
      g.sections.some((s) => s.items.some((i) => i.label.toLowerCase().includes(q)))
    )
  })



  const active = filteredGuides.find((g) => g.id === activeGuide) || filteredGuides[0] || guides[0]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Platform Guides</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            How to use Mapato and get the most out of it — tailored to your role and business
          </p>
        </div>
        <Badge variant="info" className="text-sm px-3 py-1">
          <BookMarked className="h-3.5 w-3.5 mr-1" />
          {guides.length} guides
        </Badge>
      </div>

      {/* Search + Audience Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search guides by role, feature, or business type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </div>

      {/* Audience filter cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {filteredGuides.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveGuide(g.id)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all duration-200",
              activeGuide === g.id
                ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                : "border-border/50 bg-card hover:border-primary/30 hover:bg-muted/30"
            )}
          >
            <div className={cn(
              "p-2 rounded-lg",
              activeGuide === g.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {g.icon}
            </div>
            <span className={cn(
              "text-xs font-medium leading-tight line-clamp-2",
              activeGuide === g.id ? "text-primary" : "text-muted-foreground"
            )}>
              {g.audience.split("&")[0].replace(/\([^)]*\)/g, "").trim()}
            </span>
          </button>
        ))}
      </div>

      {/* Active Guide */}
      {active && (
        <div className="space-y-6">
          {/* Guide header */}
          <Card className="border-primary/10 bg-gradient-to-br from-card to-primary/5">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shrink-0 self-start">
                  {active.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn("text-[10px] font-medium", active.badgeColor)}>
                      {active.badge}
                    </Badge>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-1">{active.audience}</h2>
                  <p className="text-sm text-muted-foreground mb-3">{active.subtitle}</p>
                  <p className="text-sm text-muted-foreground">{active.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Problem + Guides grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Problem box */}
            <Card className="lg:col-span-1 bg-destructive/5 border-destructive/10 h-fit">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-destructive" />
                  <h3 className="font-semibold text-sm">Why this matters</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{active.problem}</p>
              </CardContent>
            </Card>

            {/* Guide sections */}
            <div className="lg:col-span-2 space-y-4">
              {active.sections.map((section, idx) => (
                <Card key={idx}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1 rounded bg-primary/10">
                        <PlayCircle className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="font-semibold text-sm">{section.title}</h3>
                    </div>
                    <div className="space-y-2">
                      {section.items.map((item, iIdx) => (
                        <div
                          key={iIdx}
                          className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors group"
                        >
                          <div className="p-1.5 rounded-md bg-muted text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{item.label}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground font-mono">
                            {item.time}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Next steps */}
          <Card className="bg-primary/5 border-primary/10">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Take Action</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {active.nextSteps.map((step, i) => (
                  <Link key={i} href={step.href}>
                    <Button size="sm" variant={i === 0 ? "default" : "outline"}>
                      {step.label} <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick reference for other audiences */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">Not your role? See guides for:</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredGuides.filter((g) => g.id !== activeGuide).map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGuide(g.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  {g.icon}
                  {g.audience}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredGuides.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-1">No guides match your search</p>
          <p className="text-sm">Try a different search term or browse all guides</p>
          <Button variant="outline" className="mt-4" onClick={() => setSearchQuery("")}>
            Clear search
          </Button>
        </div>
      )}

      {/* Strategy docs link */}
      <div className="text-center pt-4 pb-2">
        <p className="text-xs text-muted-foreground">
          Looking for the business strategy documents? They&apos;re available directly from the database.
        </p>
      </div>
    </div>
  )
}
