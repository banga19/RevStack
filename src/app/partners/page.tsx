"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import {
  Loader2, Users, Star, TrendingUp, DollarSign, CheckCircle2, ArrowUpRight,
  Shield, Award, Building2, Target, Gift, Sparkles, Handshake, Copy,
  Link2, ExternalLink, Clock, UserPlus, Wallet, BarChart3, Share2,
  Settings, LogIn, UserCheck, CreditCard, PartyPopper, X, Globe,
  ChevronRight, AlertTriangle, Zap, RefreshCw,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────

type PartnerTier = { id: string; name: string; commission: number; description: string; requirements: string; badgeColor: string }

type Partner = {
  id: string; name: string; email: string; joinedAt: string
  tier: PartnerTier; tierId: string; totalClients: number; totalPayments: number; totalLeads: number
  estimatedEarnings: number; eligibleForUpgrade: boolean
}

type PartnerStats = {
  totalReferrals: number; pendingReferrals: number; signedUpReferrals: number
  convertedReferrals: number; totalCommissionEarned: number
}

type Referral = {
  id: string; referredEmail: string | null; referredName: string | null
  referralCode: string; status: string; commissionEarned: number
  convertedAt: string | null; signedUpAt: string | null
  createdAt: string; expiresAt: string | null
  referredUser: { name: string; email: string } | null
}

type ReferralStats = {
  total: number; pending: number; signedUp: number; converted: number; paid: number; totalCommissionEarned: number
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatCommission(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

function getStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    "signed-up": { label: "Signed Up", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    converted: { label: "Converted", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    paid: { label: "Paid", className: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  }
  const c = config[status] || { label: status, className: "bg-muted text-muted-foreground" }
  return <Badge variant="outline" className={cn("text-[10px]", c.className)}>{c.label}</Badge>
}

// ── Main Component ───────────────────────────────────────────────────────

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [tiers, setTiers] = useState<PartnerTier[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("marketplace")

  // Partner registration state
  const [partnerReg, setPartnerReg] = useState<{ registered: boolean; partner?: any; stats?: PartnerStats; referralLink?: string } | null>(null)
  const [regLoading, setRegLoading] = useState(true)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [regForm, setRegForm] = useState({ displayName: "", bio: "", website: "", payoutMethod: "mpesa", companyName: "", region: "ke", phone: "", payoutDetails: "" })

  const regionOptions = [
    { value: "ke", label: "Kenya (KE)", hint: "KES pricing, KEPSA-aligned onboarding if available" },
    { value: "tz", label: "Tanzania (TZ)", hint: "TZS pricing, DAR partner network" },
    { value: "ug", label: "Uganda (UG)", hint: "UGX pricing, Kampala corridor" },
    { value: "rw", label: "Rwanda (RW)", hint: "RWF pricing, Kigali hub" },
    { value: "ng", label: "Nigeria (NG)", hint: "NGN pricing, Lagos hub" },
    { value: "gh", label: "Ghana (GH)", hint: "GHS pricing, Accra hub" },
    { value: "sn", label: "Senegal (SN)", hint: "XOF pricing, Dakar hub" },
    { value: "intl", label: "International", hint: "USD pricing, remote/online" },
  ]
  const [regSubmitting, setRegSubmitting] = useState(false)
  const [regError, setRegError] = useState<string | null>(null)
  const [regSuccess, setRegSuccess] = useState(false)

  // Referral state
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [refStats, setRefStats] = useState<ReferralStats | null>(null)
  const [refLoading, setRefLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Load partner marketplace data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/partners")
      if (res.ok) { const d = await res.json(); setPartners(d.partners); setTiers(d.tiers); setSummary(d.summary) }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  // Load partner registration status
  const loadReg = useCallback(async () => {
    setRegLoading(true)
    try {
      const res = await fetch("/api/partners/register")
      if (res.ok) {
        const d = await res.json()
        setPartnerReg(d)
        if (d.registered) {
          setRegForm((f) => ({ ...f, displayName: d.partner.displayName }))
        }
      }
    } catch (e) { console.error(e) } finally { setRegLoading(false) }
  }, [])

  // Load referrals
  const loadReferrals = useCallback(async () => {
    setRefLoading(true)
    try {
      const res = await fetch("/api/partners/referrals")
      if (res.ok) { const d = await res.json(); setReferrals(d.referrals); setRefStats(d.stats) }
    } catch (e) { console.error(e) } finally { setRefLoading(false) }
  }, [])

  useEffect(() => { loadData(); loadReg() }, [loadData, loadReg])

  // Load referrals automatically when partner is detected as registered
  useEffect(() => {
    if (partnerReg?.registered) {
      loadReferrals()
    }
  }, [partnerReg?.registered, loadReferrals])

  // Register as partner
  const handleRegister = async () => {
    setRegSubmitting(true)
    setRegError(null)
    try {
      const res = await fetch("/api/partners/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm),
      })
      const d = await res.json()
      if (!res.ok) { setRegError(d.error); return }
      setPartnerReg(d)
      setRegSuccess(true)
      setTimeout(() => { setShowRegisterForm(false); setRegSuccess(false) }, 2000)
    } catch (e) { setRegError("Failed to register. Please try again.") } finally { setRegSubmitting(false) }
  }

  // Copy referral link
  const copyLink = () => {
    if (!partnerReg?.referralLink) return
    navigator.clipboard.writeText(partnerReg.referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isLoading = loading || regLoading

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="shimmer h-8 w-56 rounded mb-2" />
        <div className="shimmer h-4 w-72 rounded mb-8" />
        <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="shimmer h-24 rounded" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Handshake className="h-7 w-7 text-primary" />
            Partner Network
          </h1>
          <p className="text-muted-foreground mt-1">
            Join our partner program, earn commissions, and grow with Mapato
          </p>
        </div>
        {partnerReg?.registered ? (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1.5 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Partner since {formatDate(partnerReg.partner.createdAt)}
          </Badge>
        ) : (
          <Button onClick={() => setShowRegisterForm(true)} className="gap-2">
            <Handshake className="h-4 w-4" />
            Join Partner Program
          </Button>
        )}
      </div>

      {/* ── Registration Modal ──────────────────────────────────── */}
      {showRegisterForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !regSubmitting && setShowRegisterForm(false)}>
          <Card className="w-full max-w-lg animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Handshake className="h-5 w-5 text-primary" />
                  Join the Partner Program
                </CardTitle>
                <CardDescription>Earn commissions by referring clients to Mapato</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowRegisterForm(false)} disabled={regSubmitting}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {regSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <PartyPopper className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-semibold">Welcome to the Partner Program! 🎉</h3>
                  <p className="text-sm text-muted-foreground">
                    Your referral code is ready. Start sharing your unique link to earn commissions.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm">
                    <div className="flex items-center gap-2 mb-1 font-medium">
                      <Sparkles className="h-4 w-4 text-primary" />
                      What you get:
                    </div>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• Unique referral link to track your referrals</li>
                      <li>• Up to 30% commission on referred clients</li>
                      <li>• Tier upgrades as you grow (Affiliate → Reseller → Agency)</li>
                      <li>• Real-time dashboard with earnings and stats</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Display Name *</label>
                      <Input
                        value={regForm.displayName}
                        onChange={(e) => setRegForm((f) => ({ ...f, displayName: e.target.value }))}
                        placeholder="Your public partner name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Company / Organization (optional)</label>
                      <Input
                        value={regForm.companyName}
                        onChange={(e) => setRegForm((f) => ({ ...f, companyName: e.target.value }))}
                        placeholder="Your company or agency name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Region</label>
                      <select
                        value={regForm.region}
                        onChange={(e) => setRegForm((f) => ({ ...f, region: e.target.value }))}
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                      >
                        {regionOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {regionOptions.find((o) => o.value === regForm.region)?.hint}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Phone (optional)</label>
                      <Input
                        value={regForm.phone}
                        onChange={(e) => setRegForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="+254..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Bio (optional)</label>
                      <Textarea
                        value={regForm.bio}
                        onChange={(e) => setRegForm((f) => ({ ...f, bio: e.target.value }))}
                        placeholder="Tell other partners about yourself..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Website (optional)</label>
                      <Input
                        value={regForm.website}
                        onChange={(e) => setRegForm((f) => ({ ...f, website: e.target.value }))}
                        placeholder="https://your-website.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Payout Method</label>
                      <select
                        value={regForm.payoutMethod}
                        onChange={(e) => setRegForm((f) => ({ ...f, payoutMethod: e.target.value }))}
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                      >
                        <option value="mpesa">M-Pesa</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="flutterwave">Flutterwave</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Payout Details (optional)</label>
                      <Input
                        value={regForm.payoutDetails}
                        onChange={(e) => setRegForm((f) => ({ ...f, payoutDetails: e.target.value }))}
                        placeholder="Account / phone number"
                      />
                    </div>
                  </div>

                  {regError && (
                    <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 p-2.5 rounded-lg">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {regError}
                    </div>
                  )}

                  <Button className="w-full" onClick={handleRegister} disabled={regSubmitting || !regForm.displayName}>
                    {regSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Handshake className="h-4 w-4 mr-2" />}
                    Register as Partner
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Main Tabs ──────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="marketplace" className="gap-2">
            <Building2 className="h-4 w-4" /> Marketplace
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-2" disabled={!partnerReg?.registered}>
            <Share2 className="h-4 w-4" /> My Referrals
          </TabsTrigger>
        </TabsList>

        {/* ──── MARKETPLACE TAB ──────────────────────────────────── */}
        <TabsContent value="marketplace" className="space-y-6 mt-4">
          {summary && (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
              <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{summary.totalPartners}</div><div className="text-xs text-muted-foreground">Total Partners</div></CardContent></Card>
              <Card className="border-blue-500/20"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-blue-500">{summary.affiliates}</div><div className="text-xs text-muted-foreground">Affiliates</div></CardContent></Card>
              <Card className="border-violet-500/20"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-violet-500">{summary.resellers}</div><div className="text-xs text-muted-foreground">Resellers</div></CardContent></Card>
              <Card className="border-amber-500/20"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-amber-500">{summary.agencies}</div><div className="text-xs text-muted-foreground">Agencies</div></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-emerald-500">{formatCurrency(summary.totalEstimatedEarnings)}</div><div className="text-xs text-muted-foreground">Est. Total Earnings</div></CardContent></Card>
            </div>
          )}

          {/* Tier Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {tiers.map((tier, i) => (
              <Card key={tier.id} className={cn(
                "relative overflow-hidden",
                i === 1 && "border-violet-500/40 ring-1 ring-violet-500/20",
                i === 2 && "border-amber-500/40"
              )}>
                {i === 1 && <div className="absolute top-0 right-0"><Badge className="bg-violet-500 text-white text-[9px] rounded-bl-lg rounded-tr-lg px-2 py-0.5">Popular</Badge></div>}
                {i === 2 && <div className="absolute top-0 right-0"><Badge className="bg-amber-500 text-white text-[9px] rounded-bl-lg rounded-tr-lg px-2 py-0.5">Premium</Badge></div>}
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("p-1.5 rounded", i === 0 ? "bg-blue-500/10" : i === 1 ? "bg-violet-500/10" : "bg-amber-500/10")}>
                      {i === 0 ? <Users className={cn("h-4 w-4", "text-blue-500")} /> : i === 1 ? <Star className="h-4 w-4 text-violet-500" /> : <Award className="h-4 w-4 text-amber-500" />}
                    </div>
                    <span className="font-semibold">{tier.name}</span>
                    <Badge className={cn("text-[9px] ml-auto", tier.badgeColor)}>{formatCommission(tier.commission)} commission</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{tier.description}</p>
                  <div className="text-xs text-muted-foreground mb-3"><Shield className="h-3 w-3 inline mr-1" />{tier.requirements}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <DollarSign className="h-3 w-3 text-emerald-500" />
                    <span>Est. earnings per client: <strong className="text-foreground">{formatCurrency(Math.round(200 * tier.commission))}/mo</strong></span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Partner Roster */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Partner Roster</CardTitle>
              <CardDescription>{partners.length} registered partner{partners.length !== 1 ? "s" : ""}</CardDescription>
            </CardHeader>
            <CardContent>
              {partners.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No partners yet. Partners are automatically tiered based on client count.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {partners.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold text-xs shrink-0">
                        {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                      </div>
                      <Badge className={cn("text-[9px]", p.tier.badgeColor)}>{p.tier.name}</Badge>
                      <div className="text-center"><div className="text-sm font-bold">{p.totalClients}</div><div className="text-[9px] text-muted-foreground">Clients</div></div>
                      <div className="text-center"><div className="text-sm font-bold text-emerald-500">{formatCurrency(p.estimatedEarnings)}</div><div className="text-[9px] text-muted-foreground">Est. earnings</div></div>
                      {p.eligibleForUpgrade && <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/30"><Sparkles className="h-2.5 w-2.5 mr-0.5" /> Upgrade eligible</Badge>}
                      <Button size="sm" variant="ghost" className="h-7"><ArrowUpRight className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── REFERRALS TAB ────────────────────────────────────── */}
        <TabsContent value="referrals" className="space-y-6 mt-4">
          {partnerReg?.registered && (
            <>
              {/* Referral Link Card */}
              <Card className="bg-gradient-to-br from-primary/5 to-emerald-500/5 border-primary/10">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
                      <Link2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1">Your Referral Link</h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        Share this link with potential clients. You earn <strong className="text-foreground">{formatCommission(partnerReg.partner.commissionRate)}</strong> commission on each converted referral.
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-2.5 rounded-lg bg-background border text-xs font-mono truncate">
                          {partnerReg.referralLink}
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0 h-9 gap-1.5" onClick={copyLink}>
                          {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 h-9 gap-1.5"
                          onClick={() => {
                            if (partnerReg.referralLink) {
                              window.open(partnerReg.referralLink, "_blank")
                            }
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Grid */}
              <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{partnerReg.stats?.totalReferrals || 0}</div>
                    <div className="text-xs text-muted-foreground">Total Referrals</div>
                  </CardContent>
                </Card>
                <Card className="border-amber-500/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-amber-500">{partnerReg.stats?.pendingReferrals || 0}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </CardContent>
                </Card>
                <Card className="border-blue-500/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-500">{partnerReg.stats?.signedUpReferrals || 0}</div>
                    <div className="text-xs text-muted-foreground">Signed Up</div>
                  </CardContent>
                </Card>
                <Card className="border-emerald-500/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-500">{partnerReg.stats?.convertedReferrals || 0}</div>
                    <div className="text-xs text-muted-foreground">Converted</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-500">{formatCurrency(partnerReg.stats?.totalCommissionEarned || 0)}</div>
                    <div className="text-xs text-muted-foreground">Commission Earned</div>
                  </CardContent>
                </Card>
              </div>

              {/* Tier Progress */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Tier Progress
                  </CardTitle>
                  <CardDescription>Current tier: <strong>{partnerReg.partner.tier.charAt(0).toUpperCase() + partnerReg.partner.tier.slice(1)}</strong></CardDescription>
                </CardHeader>
                <CardContent>
                  {partnerReg.partner.tier === "affiliate" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress to Reseller (5 clients)</span>
                        <span className="font-medium">{partnerReg.stats?.convertedReferrals || 0} / 5</span>
                      </div>
                      <Progress value={Math.min(100, ((partnerReg.stats?.convertedReferrals || 0) / 5) * 100)} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Refer 5 clients to unlock <strong className="text-violet-500">25% commission</strong> as a Reseller
                      </p>
                    </div>
                  ) : partnerReg.partner.tier === "reseller" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress to Agency Partner (20 clients)</span>
                        <span className="font-medium">{partnerReg.stats?.convertedReferrals || 0} / 20</span>
                      </div>
                      <Progress value={Math.min(100, ((partnerReg.stats?.convertedReferrals || 0) / 20) * 100)} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Reach 20 clients to unlock <strong className="text-amber-500">30% commission</strong> as an Agency Partner
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-amber-500/10 text-amber-600 text-sm flex items-center gap-2">
                      <Award className="h-5 w-5 shrink-0" />
                      You're at the top tier! Enjoy 30% commission on all referrals.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Referral Table */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <UserPlus className="h-4 w-4 text-primary" />
                        Referral History
                      </CardTitle>
                      <CardDescription>Track your referrals and their status</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="h-8" onClick={loadReferrals}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {refLoading ? (
                    <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                  ) : referrals.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No referrals yet. Start sharing your referral link!</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/20">
                            <th className="py-2.5 px-4 text-left font-medium text-muted-foreground text-xs">Referred</th>
                            <th className="py-2.5 px-4 text-left font-medium text-muted-foreground text-xs">Contact</th>
                            <th className="py-2.5 px-4 text-center font-medium text-muted-foreground text-xs">Status</th>
                            <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-xs">Commission</th>
                            <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-xs">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {referrals.map((r) => (
                            <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 px-4 text-xs font-medium">
                                {r.referredName || r.referredUser?.name || "Anonymous"}
                              </td>
                              <td className="py-2.5 px-4 text-xs text-muted-foreground">
                                {r.referredEmail || r.referredUser?.email || "—"}
                              </td>
                              <td className="py-2.5 px-4 text-center">{getStatusBadge(r.status)}</td>
                              <td className="py-2.5 px-4 text-right text-xs font-mono">
                                {r.commissionEarned > 0 ? formatCurrency(r.commissionEarned) : "—"}
                              </td>
                              <td className="py-2.5 px-4 text-right text-xs text-muted-foreground">
                                {formatDate(r.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
