"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { cn, formatCurrency } from "@/lib/utils"
import {
  Flag,
  Target,
  Building2,
  Users,
  FlaskConical,
  Plus,
  Loader2,
  TrendingUp,
  Globe,
  Edit3,
  Trash2,
  ListChecks,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

type KoreanTarget = {
  id: string
  company: string
  tier: string
  focus: string
  status: string
  stage: string
  contactName: string | null
  contactTitle: string | null
  contactEmail: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

type PilotParticipant = {
  id: string
  cohortId: string
  companyName: string
  contactName: string | null
  contactEmail: string | null
  country: string | null
  commodity: string | null
  trialStartedAt: string | null
  trialEndsAt: string | null
  status: string
  notes: string | null
  cohort?: { name: string; type: string }
}

type PilotCohort = {
  id: string
  name: string
  type: string
  count: number
  enrolled: number
  startMonth: string
  startDate: string | null
  endDate: string | null
  status: string
  notes: string | null
  participants: PilotParticipant[]
}

const statusColor: Record<string, string> = {
  Identified: "text-muted-foreground bg-muted",
  "Outreach Ready": "text-blue-500 bg-blue-500/10",
  "Contact Made": "text-amber-500 bg-amber-500/10",
  "Warm Lead": "text-emerald-500 bg-emerald-500/10",
  "Hot Lead": "text-rose-500 bg-rose-500/10",
}

const stageColors: Record<string, string> = {
  Researching: "bg-slate-500/10 text-slate-600",
  "Outreach Ready": "bg-blue-500/10 text-blue-600",
  "Intro Sent": "bg-cyan-500/10 text-cyan-600",
  "Initial Call": "bg-indigo-500/10 text-indigo-600",
  "Second Meeting": "bg-purple-500/10 text-purple-600",
  "Demo Scheduled": "bg-amber-500/10 text-amber-600",
  Proposal: "bg-orange-500/10 text-orange-600",
  Negotiation: "bg-rose-500/10 text-rose-600",
  Closed: "bg-emerald-500/10 text-emerald-600",
}

const pilotStatusColor: Record<string, string> = {
  Planning: "bg-muted text-muted-foreground",
  Recruiting: "bg-blue-500/10 text-blue-600",
  Active: "bg-emerald-500/10 text-emerald-600",
  Completed: "bg-violet-500/10 text-violet-600",
}

const participantStatusColor: Record<string, string> = {
  invited: "bg-blue-500/10 text-blue-600",
  active: "bg-emerald-500/10 text-emerald-600",
  completed: "bg-violet-500/10 text-violet-600",
  churned: "bg-red-500/10 text-red-600",
}

const tierColors: Record<string, string> = {
  "Chaebol Supplier": "bg-purple-500/10 text-purple-600 border-purple-200",
  "Trading House": "bg-blue-500/10 text-blue-600 border-blue-200",
  "Mid-Sized Manufacturer": "bg-emerald-500/10 text-emerald-600 border-emerald-200",
}

const stageOrder: Record<string, number> = {
  Researching: 1, "Outreach Ready": 2, "Intro Sent": 3, "Initial Call": 4,
  "Second Meeting": 5, "Demo Scheduled": 6, Proposal: 7, Negotiation: 8, Closed: 9,
}

export default function KoreaPage() {
  const [targets, setTargets] = useState<KoreanTarget[]>([])
  const [cohorts, setCohorts] = useState<PilotCohort[]>([])
  const [participants, setParticipants] = useState<PilotParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("pipeline")

  // Target dialog
  const [targetDialogOpen, setTargetDialogOpen] = useState(false)
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null)
  const [targetForm, setTargetForm] = useState({
    company: "", tier: "Mid-Sized Manufacturer", focus: "", status: "Identified",
    stage: "Researching", contactName: "", contactTitle: "", contactEmail: "", notes: "",
  })
  const [savingTarget, setSavingTarget] = useState(false)

  // Cohort dialog
  const [cohortDialogOpen, setCohortDialogOpen] = useState(false)
  const [editingCohortId, setEditingCohortId] = useState<string | null>(null)
  const [cohortForm, setCohortForm] = useState({
    name: "", type: "", count: "5", enrolled: "0", startMonth: "", status: "Planning",
    startDate: "", endDate: "", notes: "",
  })
  const [savingCohort, setSavingCohort] = useState(false)

  // Participant dialog
  const [participantDialogOpen, setParticipantDialogOpen] = useState(false)
  const [participantForm, setParticipantForm] = useState({
    cohortId: "", companyName: "", contactName: "", contactEmail: "",
    country: "", commodity: "", status: "invited", trialStartedAt: "", trialEndsAt: "", notes: "",
  })
  const [savingParticipant, setSavingParticipant] = useState(false)

  // Expanded sections
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set())
  const [expandedCohorts, setExpandedCohorts] = useState<Set<string>>(new Set())

  const loadData = async () => {
    try {
      const [targetsRes, cohortsRes, participantsRes] = await Promise.all([
        fetch("/api/korea/targets"),
        fetch("/api/korea/cohorts"),
        fetch("/api/korea/participants"),
      ])
      setTargets(await targetsRes.json())
      setCohorts(await cohortsRes.json())
      setParticipants(await participantsRes.json())
    } catch (e) {
      console.error("Load Korea data failed", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Derived data
  const hotLeads = targets.filter(
    (t) => t.status === "Hot Lead" || t.status === "Warm Lead"
  ).length
  const contactsMade = targets.filter(
    (t) => t.status !== "Identified" && t.status !== "Outreach Ready"
  ).length
  const totalEnrolled = cohorts.reduce((s, c) => s + c.enrolled, 0)
  const totalCapacity = cohorts.reduce((s, c) => s + c.count, 0)
  const activeParticipants = participants.filter((p) => p.status === "active").length
  const pipelineValue = contactsMade * 2500 // $2,500/mo estimated per active target

  const stageData = Object.entries(
    targets.reduce((acc: Record<string, number>, t) => {
      acc[t.stage] = (acc[t.stage] || 0) + 1
      return acc
    }, {})
  )
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => (stageOrder[a.stage] || 0) - (stageOrder[b.stage] || 0))

  const statusDistribution = Object.entries(
    targets.reduce((acc: Record<string, number>, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1
      return acc
    }, {})
  ).map(([status, count]) => ({ status, count }))

  const toggleTargetExpand = (id: string) => {
    const next = new Set(expandedTargets)
    next.has(id) ? next.delete(id) : next.add(id)
    setExpandedTargets(next)
  }

  const toggleCohortExpand = (id: string) => {
    const next = new Set(expandedCohorts)
    next.has(id) ? next.delete(id) : next.add(id)
    setExpandedCohorts(next)
  }

  // Target CRUD
  const openNewTarget = () => {
    setEditingTargetId(null)
    setTargetForm({ company: "", tier: "Mid-Sized Manufacturer", focus: "", status: "Identified", stage: "Researching", contactName: "", contactTitle: "", contactEmail: "", notes: "" })
    setTargetDialogOpen(true)
  }

  const openEditTarget = (t: KoreanTarget) => {
    setEditingTargetId(t.id)
    setTargetForm({
      company: t.company, tier: t.tier, focus: t.focus, status: t.status, stage: t.stage,
      contactName: t.contactName || "", contactTitle: t.contactTitle || "", contactEmail: t.contactEmail || "", notes: t.notes || "",
    })
    setTargetDialogOpen(true)
  }

  const saveTarget = async () => {
    setSavingTarget(true)
    try {
      const url = editingTargetId ? `/api/korea/targets/${editingTargetId}` : "/api/korea/targets"
      const method = editingTargetId ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetForm),
      })
      if (res.ok) { setTargetDialogOpen(false); loadData() }
    } catch (e) { console.error(e) }
    finally { setSavingTarget(false) }
  }

  const deleteTarget = async (id: string) => {
    try {
      await fetch(`/api/korea/targets/${id}`, { method: "DELETE" })
      loadData()
    } catch (e) { console.error(e) }
  }

  // Cohort CRUD
  const openNewCohort = () => {
    setEditingCohortId(null)
    setCohortForm({ name: "", type: "", count: "5", enrolled: "0", startMonth: "", status: "Planning", startDate: "", endDate: "", notes: "" })
    setCohortDialogOpen(true)
  }

  const openEditCohort = (c: PilotCohort) => {
    setEditingCohortId(c.id)
    setCohortForm({
      name: c.name, type: c.type, count: c.count.toString(), enrolled: c.enrolled.toString(),
      startMonth: c.startMonth, status: c.status,
      startDate: c.startDate ? c.startDate.split("T")[0] : "",
      endDate: c.endDate ? c.endDate.split("T")[0] : "",
      notes: c.notes || "",
    })
    setCohortDialogOpen(true)
  }

  const saveCohort = async () => {
    setSavingCohort(true)
    try {
      const url = editingCohortId ? `/api/korea/cohorts/${editingCohortId}` : "/api/korea/cohorts"
      const method = editingCohortId ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cohortForm, count: parseInt(cohortForm.count), enrolled: parseInt(cohortForm.enrolled) }),
      })
      if (res.ok) { setCohortDialogOpen(false); loadData() }
    } catch (e) { console.error(e) }
    finally { setSavingCohort(false) }
  }

  const deleteCohort = async (id: string) => {
    try { await fetch(`/api/korea/cohorts/${id}`, { method: "DELETE" }); loadData() }
    catch (e) { console.error(e) }
  }

  // Participant CRUD
  const openNewParticipant = (cohortId?: string) => {
    setParticipantForm({
      cohortId: cohortId || "", companyName: "", contactName: "", contactEmail: "",
      country: "", commodity: "", status: "invited", trialStartedAt: "", trialEndsAt: "", notes: "",
    })
    setParticipantDialogOpen(true)
  }

  const saveParticipant = async () => {
    setSavingParticipant(true)
    try {
      const res = await fetch("/api/korea/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(participantForm),
      })
      if (res.ok) { setParticipantDialogOpen(false); loadData() }
    } catch (e) { console.error(e) }
    finally { setSavingParticipant(false) }
  }

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : "—"

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="shimmer h-8 w-56 rounded mb-2" />
        <div className="shimmer h-4 w-80 rounded mb-8" />
        <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="shimmer h-24 rounded" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Korea Corridor</h1>
          <p className="text-muted-foreground mt-1">
            Korean corporate procurement targets · Sokogate platform pilot · Compliance & certifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="text-sm px-3 py-1 bg-rose-500/10 text-rose-500 border-rose-500/20">
            <Flag className="h-3.5 w-3.5 mr-1" />
            {targets.length} targets · {hotLeads} hot
          </Badge>
          <a href="/KOREA-CORPORATE-STRATEGY.md" target="_blank">
            <Button size="sm" variant="outline">
              <ListChecks className="h-4 w-4 mr-1" /> Strategy
            </Button>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-rose-500/20 bg-gradient-to-br from-card to-rose-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10"><Flag className="h-5 w-5 text-rose-500" /></div>
            <div>
              <div className="text-2xl font-bold">{targets.length}</div>
              <div className="text-xs text-muted-foreground">Corporate targets</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><Target className="h-5 w-5 text-emerald-500" /></div>
            <div>
              <div className="text-2xl font-bold">{hotLeads}</div>
              <div className="text-xs text-muted-foreground">Hot / Warm leads</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-5 w-5 text-blue-500" /></div>
            <div>
              <div className="text-2xl font-bold">{contactsMade}</div>
              <div className="text-xs text-muted-foreground">Contacts made</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><FlaskConical className="h-5 w-5 text-amber-500" /></div>
            <div>
              <div className="text-2xl font-bold">{totalEnrolled}/{totalCapacity}</div>
              <div className="text-xs text-muted-foreground">Pilot enrolled</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10"><TrendingUp className="h-5 w-5 text-violet-500" /></div>
            <div>
              <div className="text-2xl font-bold">{formatCurrency(pipelineValue)}</div>
              <div className="text-xs text-muted-foreground">Pipeline value/mo</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="pipeline"><Flag className="h-4 w-4 mr-1.5" /> Pipeline</TabsTrigger>
          <TabsTrigger value="pilot"><FlaskConical className="h-4 w-4 mr-1.5" /> Pilot</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1.5" /> Analytics</TabsTrigger>
        </TabsList>

        {/* === PIPELINE TAB === */}
        <TabsContent value="pipeline" className="space-y-6 mt-6">
          {/* Pipeline chart */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flag className="h-4 w-4 text-primary" /> Deal Pipeline
                </CardTitle>
                <CardDescription>Korean targets by deal stage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stageData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis type="category" dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={11} width={110} />
                      <RechartsTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-primary" /> Status Distribution
                </CardTitle>
                <CardDescription>Outreach readiness breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <RechartsTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {statusDistribution.map((entry, i) => {
                          const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"]
                          return <Cell key={entry.status} fill={colors[i % colors.length]} />
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Targets list */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" /> Korean Corporate Targets
                </CardTitle>
                <CardDescription>{targets.length} target companies</CardDescription>
              </div>
              <Button size="sm" onClick={openNewTarget}>
                <Plus className="h-4 w-4 mr-1" /> Add Target
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {targets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Flag className="h-12 w-12 mb-3 opacity-50" />
                  <p>No Korean targets yet. Add your first procurement target.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {targets.map((target) => (
                    <div key={target.id} className="group">
                      <div
                        className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => toggleTargetExpand(target.id)}
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 font-bold text-sm shrink-0">
                          {target.company.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{target.company}</p>
                            <Badge variant="outline" className={cn("text-[10px] capitalize", tierColors[target.tier] || "")}>
                              {target.tier}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{target.focus}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={cn("text-[10px]", statusColor[target.status] || "bg-muted text-muted-foreground")}>
                            {target.status}
                          </Badge>
                          <Badge variant="outline" className={cn("text-[10px]", stageColors[target.stage] || "")}>
                            {target.stage}
                          </Badge>
                          {expandedTargets.has(target.id) ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {expandedTargets.has(target.id) && (
                        <div className="px-4 pb-4 pt-0 space-y-2">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-muted/30 rounded-lg p-3">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Contact</p>
                              <p className="text-sm">{target.contactName || "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Title</p>
                              <p className="text-sm">{target.contactTitle || "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</p>
                              <p className="text-sm truncate">{target.contactEmail || "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Updated</p>
                              <p className="text-sm">{new Date(target.updatedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {target.notes && (
                            <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                              {target.notes}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); openEditTarget(target) }}>
                              <Edit3 className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); deleteTarget(target.id) }}>
                              <Trash2 className="h-3 w-3 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === PILOT TAB === */}
        <TabsContent value="pilot" className="space-y-6 mt-6">
          {/* Pilot overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10"><FlaskConical className="h-5 w-5 text-blue-500" /></div>
                <div>
                  <div className="text-2xl font-bold">{cohorts.length}</div>
                  <div className="text-xs text-muted-foreground">Pilot cohorts</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10"><Users className="h-5 w-5 text-emerald-500" /></div>
                <div>
                  <div className="text-2xl font-bold">{activeParticipants}</div>
                  <div className="text-xs text-muted-foreground">Active participants</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10"><Target className="h-5 w-5 text-amber-500" /></div>
                <div>
                  <div className="text-2xl font-bold">{totalEnrolled}/{totalCapacity}</div>
                  <div className="text-xs text-muted-foreground">Enrolled / Capacity</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10"><Globe className="h-5 w-5 text-violet-500" /></div>
                <div>
                  <div className="text-2xl font-bold">{new Set(participants.map((p) => p.country)).size}</div>
                  <div className="text-xs text-muted-foreground">Countries represented</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cohorts list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Pilot Cohorts</h3>
              <Button size="sm" onClick={openNewCohort}>
                <Plus className="h-4 w-4 mr-1" /> New Cohort
              </Button>
            </div>

            {cohorts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FlaskConical className="h-12 w-12 mb-3 opacity-50" />
                  <p>No pilot cohorts yet. Create your first Sokogate platform trial cohort.</p>
                </CardContent>
              </Card>
            ) : cohorts.map((cohort) => (
              <Card key={cohort.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <FlaskConical className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <h4 className="font-medium">{cohort.name}</h4>
                        <p className="text-xs text-muted-foreground">{cohort.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-[10px]", pilotStatusColor[cohort.status])}>{cohort.status}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCohort(cohort)}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => deleteCohort(cohort.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Enrollment</span>
                        <span>{cohort.enrolled}/{cohort.count}</span>
                      </div>
                      <Progress value={(cohort.enrolled / cohort.count) * 100} className="h-2" />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">Starts {cohort.startMonth}</span>
                  </div>

                  {/* Participants section */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      {cohort.participants.length} participant{cohort.participants.length !== 1 ? "s" : ""}
                    </span>
                    <Button
                      variant="outline" size="sm" className="h-7 text-xs"
                      onClick={() => openNewParticipant(cohort.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Company
                    </Button>
                  </div>

                  {cohort.participants.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {cohort.participants.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-[10px] shrink-0">
                            {p.companyName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{p.companyName}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {p.country && `${p.country} · `}{p.commodity}
                            </p>
                          </div>
                          <Badge className={cn("text-[10px]", participantStatusColor[p.status])}>
                            {p.status}
                          </Badge>
                          {p.trialEndsAt && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              Until {new Date(p.trialEndsAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* === ANALYTICS TAB === */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" /> Target by Tier
                </CardTitle>
                <CardDescription>Chaebol suppliers vs trading houses vs manufacturers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(
                      targets.reduce((acc: Record<string, number>, t) => {
                        acc[t.tier] = (acc[t.tier] || 0) + 1
                        return acc
                      }, {})
                    ).map(([tier, count]) => ({ tier, count }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="tier" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <RechartsTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"].map((color, i) => (
                          <Cell key={i} fill={color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4 text-primary" /> Pilot by Country
                </CardTitle>
                <CardDescription>Geographic distribution of pilot participants</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(
                      participants.reduce((acc: Record<string, number>, p) => {
                        const country = p.country || "Unspecified"
                        acc[country] = (acc[country] || 0) + 1
                        return acc
                      }, {})
                    ).map(([country, count]) => ({ country, count }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis type="category" dataKey="country" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
                      <RechartsTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="hsl(var(--chart-4))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary card */}
          <Card className="bg-gradient-to-br from-rose-500/5 to-amber-500/5 border-rose-500/10">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Korean Corridor Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Target Companies</p>
                  <p className="text-xl font-bold">{targets.length}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {targets.filter((t) => t.tier === "Chaebol Supplier").length} chaebol suppliers
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Pilot Enrollment</p>
                  <p className="text-xl font-bold">{totalEnrolled}/{totalCapacity}</p>
                  <p className="text-[10px] text-muted-foreground">{activeParticipants} active trials</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Pipeline Value</p>
                  <p className="text-xl font-bold">{formatCurrency(pipelineValue)}</p>
                  <p className="text-[10px] text-muted-foreground">per month estimated</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Projected Annual</p>
                  <p className="text-xl font-bold">{formatCurrency(pipelineValue * 12)}</p>
                  <p className="text-[10px] text-muted-foreground">at current pipeline</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Target Dialog */}
      <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTargetId ? "Edit Korean Target" : "Add Korean Target"}</DialogTitle>
            <DialogDescription>Add a Korean procurement company to target.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company *</Label>
                <Input value={targetForm.company} onChange={(e) => setTargetForm({ ...targetForm, company: e.target.value })} placeholder="Hyundai Auto Parts Co." />
              </div>
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select value={targetForm.tier} onValueChange={(v) => setTargetForm({ ...targetForm, tier: v })}>
                  <SelectTrigger><SelectValue placeholder="Tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Chaebol Supplier">Chaebol Supplier</SelectItem>
                    <SelectItem value="Trading House">Trading House</SelectItem>
                    <SelectItem value="Mid-Sized Manufacturer">Mid-Sized Manufacturer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Procurement Focus</Label>
              <Input value={targetForm.focus} onChange={(e) => setTargetForm({ ...targetForm, focus: e.target.value })} placeholder="Steel, aluminum, rubber" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={targetForm.status} onValueChange={(v) => setTargetForm({ ...targetForm, status: v })}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Identified">Identified</SelectItem>
                    <SelectItem value="Outreach Ready">Outreach Ready</SelectItem>
                    <SelectItem value="Contact Made">Contact Made</SelectItem>
                    <SelectItem value="Warm Lead">Warm Lead</SelectItem>
                    <SelectItem value="Hot Lead">Hot Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={targetForm.stage} onValueChange={(v) => setTargetForm({ ...targetForm, stage: v })}>
                  <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Researching">Researching</SelectItem>
                    <SelectItem value="Outreach Ready">Outreach Ready</SelectItem>
                    <SelectItem value="Intro Sent">Intro Sent</SelectItem>
                    <SelectItem value="Initial Call">Initial Call</SelectItem>
                    <SelectItem value="Second Meeting">Second Meeting</SelectItem>
                    <SelectItem value="Demo Scheduled">Demo Scheduled</SelectItem>
                    <SelectItem value="Proposal">Proposal</SelectItem>
                    <SelectItem value="Negotiation">Negotiation</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input value={targetForm.contactName} onChange={(e) => setTargetForm({ ...targetForm, contactName: e.target.value })} placeholder="Kim Min-joon" />
              </div>
              <div className="space-y-2">
                <Label>Contact Title</Label>
                <Input value={targetForm.contactTitle} onChange={(e) => setTargetForm({ ...targetForm, contactTitle: e.target.value })} placeholder="Procurement Director" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input type="email" value={targetForm.contactEmail} onChange={(e) => setTargetForm({ ...targetForm, contactEmail: e.target.value })} placeholder="kmj@hyundai.co.kr" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={targetForm.notes} onChange={(e) => setTargetForm({ ...targetForm, notes: e.target.value })} placeholder="Research notes, key insights..." />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={saveTarget} disabled={savingTarget || !targetForm.company}>
              {savingTarget ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : editingTargetId ? "Update Target" : "Add Target"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Cohort Dialog */}
      <Dialog open={cohortDialogOpen} onOpenChange={setCohortDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCohortId ? "Edit Cohort" : "New Pilot Cohort"}</DialogTitle>
            <DialogDescription>Create a Sokogate platform trial cohort.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cohort Name</Label>
                <Input value={cohortForm.name} onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })} placeholder="Cohort 1: Agriculture" />
              </div>
              <div className="space-y-2">
                <Label>Commodity Type</Label>
                <Input value={cohortForm.type} onChange={(e) => setCohortForm({ ...cohortForm, type: e.target.value })} placeholder="Coffee, tea, nuts" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input type="number" value={cohortForm.count} onChange={(e) => setCohortForm({ ...cohortForm, count: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Start Month</Label>
                <Input value={cohortForm.startMonth} onChange={(e) => setCohortForm({ ...cohortForm, startMonth: e.target.value })} placeholder="Month 1" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={cohortForm.status} onValueChange={(v) => setCohortForm({ ...cohortForm, status: v })}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planning">Planning</SelectItem>
                    <SelectItem value="Recruiting">Recruiting</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={cohortForm.startDate} onChange={(e) => setCohortForm({ ...cohortForm, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={cohortForm.endDate} onChange={(e) => setCohortForm({ ...cohortForm, endDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={cohortForm.notes} onChange={(e) => setCohortForm({ ...cohortForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={saveCohort} disabled={savingCohort || !cohortForm.name}>
              {savingCohort ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : editingCohortId ? "Update Cohort" : "Create Cohort"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Participant Dialog */}
      <Dialog open={participantDialogOpen} onOpenChange={setParticipantDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Pilot Participant</DialogTitle>
            <DialogDescription>Enroll a company in the Sokogate platform pilot.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Cohort</Label>
              <Select value={participantForm.cohortId} onValueChange={(v) => setParticipantForm({ ...participantForm, cohortId: v })}>
                <SelectTrigger><SelectValue placeholder="Select cohort" /></SelectTrigger>
                <SelectContent>
                  {cohorts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input value={participantForm.companyName} onChange={(e) => setParticipantForm({ ...participantForm, companyName: e.target.value })} placeholder="Kenya Coffee Exporters Ltd" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input value={participantForm.contactName} onChange={(e) => setParticipantForm({ ...participantForm, contactName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input type="email" value={participantForm.contactEmail} onChange={(e) => setParticipantForm({ ...participantForm, contactEmail: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={participantForm.country} onChange={(e) => setParticipantForm({ ...participantForm, country: e.target.value })} placeholder="Kenya" />
              </div>
              <div className="space-y-2">
                <Label>Commodity</Label>
                <Input value={participantForm.commodity} onChange={(e) => setParticipantForm({ ...participantForm, commodity: e.target.value })} placeholder="Coffee" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trial Start</Label>
                <Input type="date" value={participantForm.trialStartedAt} onChange={(e) => setParticipantForm({ ...participantForm, trialStartedAt: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Trial End</Label>
                <Input type="date" value={participantForm.trialEndsAt} onChange={(e) => setParticipantForm({ ...participantForm, trialEndsAt: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={participantForm.status} onValueChange={(v) => setParticipantForm({ ...participantForm, status: v })}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="active">Active (Trial)</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={participantForm.notes} onChange={(e) => setParticipantForm({ ...participantForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={saveParticipant} disabled={savingParticipant || !participantForm.companyName || !participantForm.cohortId}>
              {savingParticipant ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Add Participant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
