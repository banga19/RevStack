"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  Plus, Search, Zap, Trash2, Users, Sparkles, Loader2,
  Flame, Thermometer, Snowflake, HelpCircle,
  Building2, Phone, Globe, FileText, Tag, Mail, Clock,
  TrendingUp,
} from "lucide-react"

type Lead = {
  id: string
  companyName: string
  contactName: string
  email: string
  phone: string | null
  whatsapp: string | null
  industry: string | null
  country: string | null
  status: string
  qualificationScore: number | null
  qualificationTier: string | null
  qualificationBreakdown: string | null
  notes: string | null
  source: string | null
  createdAt: string
}

type QualifyBreakdown = {
  base: number
  industry: number
  country: number
  contact: number
  notes: number
  source: number
  sourceQuality: number
  emailQuality: number
  recencyPenalty: number
}

const statusTabs = ["all", "new", "qualified", "disqualified", "converted"]
const statusColors: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800",
  qualified: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800",
  disqualified: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800",
  converted: "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800",
}

const tierConfig: Record<string, { label: string; color: string; icon: any }> = {
  hot: { label: "Hot", color: "bg-red-500/15 text-red-600 border-red-300 dark:border-red-700", icon: Flame },
  qualified: { label: "Warm", color: "bg-orange-500/15 text-orange-600 border-orange-300 dark:border-orange-700", icon: Thermometer },
  lukewarm: { label: "Lukewarm", color: "bg-yellow-500/15 text-yellow-600 border-yellow-300 dark:border-yellow-700", icon: HelpCircle },
  cold: { label: "Cold", color: "bg-blue-500/15 text-blue-600 border-blue-300 dark:border-blue-700", icon: Snowflake },
}

type BreakdownRowProps = {
  icon: any
  label: string
  value: string
  isPositive: boolean
  isNegative: boolean
}

function BreakdownRow({ icon: Icon, label, value, isPositive, isNegative }: BreakdownRowProps) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <span className={cn(
        "font-mono",
        isPositive && "text-emerald-500",
        isNegative && "text-red-400",
        !isPositive && !isNegative && "text-foreground"
      )}>
        {value}
      </span>
    </div>
  )
}

function parseBreakdown(raw: string | null): QualifyBreakdown | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as QualifyBreakdown
  } catch {
    return null
  }
}

function ScoreTooltip({ score, tier, breakdownRaw }: { score: number | null; tier: string | null; breakdownRaw: string | null }) {
  if (score === null) return <span className="text-muted-foreground text-sm">—</span>

  const t = tier || (score >= 80 ? "hot" : score >= 60 ? "qualified" : score >= 40 ? "lukewarm" : "cold")
  const cfg = tierConfig[t] || tierConfig.lukewarm
  const TierIcon = cfg.icon

  const breakdown = parseBreakdown(breakdownRaw)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1.5 cursor-help">
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium gap-1 border", cfg.color)}>
            <TierIcon className="h-3 w-3" />
            {cfg.label}
          </Badge>
          <span className={cn(
            "font-mono text-sm font-medium",
            score >= 60 ? "text-emerald-500" : "text-amber-500"
          )}>
            {score}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="center" className={cn("p-3", breakdown ? "w-72" : "w-64")}>
        <div className="space-y-2">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            {breakdown ? "Score Details" : "Scoring Breakdown"}
          </p>

          {breakdown ? (
            <div className="space-y-1 text-xs">
              <BreakdownRow icon={TrendingUp} label="Base" value={`${breakdown.base}`} isPositive isNegative={false} />
              {breakdown.industry > 0 && (
                <BreakdownRow icon={Building2} label="Industry" value={`+${breakdown.industry}`} isPositive isNegative={false} />
              )}
              {breakdown.country > 0 && (
                <BreakdownRow icon={Globe} label="Country" value={`+${breakdown.country}`} isPositive isNegative={false} />
              )}
              {breakdown.contact > 0 && (
                <BreakdownRow icon={Phone} label="Phone/WhatsApp" value={`+${breakdown.contact}`} isPositive isNegative={false} />
              )}
              {breakdown.notes > 0 && (
                <BreakdownRow icon={FileText} label="Detailed notes" value={`+${breakdown.notes}`} isPositive isNegative={false} />
              )}
              {breakdown.source > 0 && (
                <BreakdownRow icon={Tag} label="Has source" value={`+${breakdown.source}`} isPositive isNegative={false} />
              )}
              {breakdown.sourceQuality > 0 && (
                <BreakdownRow icon={TrendingUp} label="Source quality" value={`+${breakdown.sourceQuality}`} isPositive isNegative={false} />
              )}
              {breakdown.emailQuality > 0 && (
                <BreakdownRow icon={Mail} label="Professional email" value={`+${breakdown.emailQuality}`} isPositive isNegative={false} />
              )}
              {breakdown.recencyPenalty > 0 && (
                <BreakdownRow icon={Clock} label="Recency penalty" value={`-${breakdown.recencyPenalty}`} isPositive={false} isNegative />
              )}
              <div className="flex justify-between border-t pt-1 mt-1 font-semibold text-xs">
                <span>Total</span>
                <span className={cn(
                  "font-mono",
                  score >= 60 ? "text-emerald-500" : "text-amber-500"
                )}>
                  {score}/100
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-xs">
              <BreakdownRow icon={TrendingUp} label="Base score" value="40" isPositive isNegative={false} />
              <BreakdownRow icon={Building2} label="Industry" value="+15" isPositive isNegative={false} />
              <BreakdownRow icon={Globe} label="Country" value="+10" isPositive isNegative={false} />
              <BreakdownRow icon={Phone} label="Phone/WhatsApp" value="+15" isPositive isNegative={false} />
              <BreakdownRow icon={FileText} label="Detailed notes" value="+10" isPositive isNegative={false} />
              <BreakdownRow icon={Tag} label="Source" value="+10" isPositive isNegative={false} />
              <BreakdownRow icon={Mail} label="Professional email" value="+5" isPositive isNegative={false} />
              <BreakdownRow icon={TrendingUp} label="Source quality" value="+0-10" isPositive isNegative={false} />
              <BreakdownRow icon={Clock} label="Recency penalty" value="−0 to 15" isPositive={false} isNegative />
              <div className="flex justify-between border-t pt-1 mt-1 font-semibold text-xs">
                <span>Total score</span>
                <span className="font-mono">{score}/100</span>
              </div>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground pt-1 border-t">
            80+ Hot · 60-79 Warm · 40-59 Lukewarm · &lt;40 Cold
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ companyName: "", contactName: "", email: "", phone: "", whatsapp: "", industry: "", country: "", notes: "", source: "" })
  const [batchQualifying, setBatchQualifying] = useState(false)

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (search) params.set("search", search)
      const res = await fetch(`/api/leads?${params}`)
      const data = await res.json()
      setLeads(data)
    } catch (e) {
      console.error("Failed to fetch leads", e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const createLead = async () => {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setDialogOpen(false)
      setForm({ companyName: "", contactName: "", email: "", phone: "", whatsapp: "", industry: "", country: "", notes: "", source: "" })
      fetchLeads()
    }
  }

  const qualifySingle = async (id: string) => {
    await fetch(`/api/leads/${id}/qualify`, { method: "POST" })
    fetchLeads()
  }

  const qualifyAll = async () => {
    setBatchQualifying(true)
    try {
      await fetch("/api/hermes/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskType: "qualify_leads" }),
      })
      // Wait a moment for async processing, then refresh
      await new Promise((r) => setTimeout(r, 1500))
      await fetchLeads()
    } catch (e) {
      console.error("Batch qualify failed", e)
    } finally {
      setBatchQualifying(false)
    }
  }

  const deleteLead = async (id: string) => {
    await fetch(`/api/leads/${id}`, { method: "DELETE" })
    fetchLeads()
  }

  const newLeadsCount = leads.filter((l) => l.status === "new").length

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="shimmer h-8 w-48 rounded mb-6" />
        {[1, 2, 3].map((i) => (
          <Card key={i}><CardContent className="p-6"><div className="shimmer h-16 w-full rounded" /></CardContent></Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads Pipeline</h1>
          <p className="text-muted-foreground mt-1">Manage and qualify incoming prospects</p>
        </div>
        <div className="flex items-center gap-2">
          {newLeadsCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={qualifyAll}
              disabled={batchQualifying}
            >
              {batchQualifying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {batchQualifying ? "Qualifying..." : `Qualify All (${newLeadsCount})`}
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Lead</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Lead</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Company Name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                <Input placeholder="Contact Name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                  <Input placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
                <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                <Input placeholder="Source (e.g. referral, website)" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
                <Button className="w-full" onClick={createLead} disabled={!form.companyName || !form.contactName || !form.email}>
                  Create Lead
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex gap-1 flex-wrap">
          {statusTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                statusFilter === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Leads Table */}
      <TooltipProvider delayDuration={200}>
      {leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No leads yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your first lead to start building your pipeline.</p>
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Lead</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="text-left py-3 px-4 font-medium">Company</th>
                <th className="text-left py-3 px-4 font-medium">Contact</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Email</th>
                <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">Country</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Score / Tier</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4 font-medium">{lead.companyName}</td>
                  <td className="py-3 px-4">{lead.contactName}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground hidden md:table-cell">{lead.email}</td>
                  <td className="py-3 px-4 text-sm hidden lg:table-cell">{lead.country || "—"}</td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className={cn("text-xs font-medium", statusColors[lead.status])}>
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <ScoreTooltip score={lead.qualificationScore} tier={lead.qualificationTier} breakdownRaw={lead.qualificationBreakdown} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {lead.status === "new" && (
                        <Button variant="ghost" size="sm" onClick={() => qualifySingle(lead.id)} title="Qualify">
                          <Zap className="h-4 w-4 text-amber-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => deleteLead(lead.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </TooltipProvider>
    </div>
  )
}
