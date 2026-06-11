"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { cn, formatCurrency } from "@/lib/utils"
import { parseBreakdown, readinessLabel, readinessBadgeColor, type ErsBreakdown, type ErsResult } from "@/lib/ers-scoring"
import {
  Globe,
  PackageSearch,
  ShieldCheck,
  Banknote,
  Ship,
  TrendingUp,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  BarChart3,
  Layers,
  Users,
  Target,
  Flag,
  FlaskConical,
  Building2,
  ListChecks,
  Phone,
  Mail,
  Sparkles,
  ChevronRight,
} from "lucide-react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

type Client = {
  id: string
  name: string
  company: string
  corridor: string | null
  ersScore: number | null
  ersBreakdown: string | null
  monthlyRetainer: number | null
  tier: string | null
}

type Product = {
  id: string
  clientId: string
  name: string
  category: string | null
  description: string | null
  certifications: string | null
  exportVolume: string | null
  unit: string | null
  pricing: string | null
}

type ComplianceRecord = {
  id: string
  clientId: string
  productId: string | null
  certificationType: string
  status: string
  issuer: string | null
  notes: string | null
  appliedAt: string | null
  obtainedAt: string | null
  expiresAt: string | null
  product?: { name: string } | null
}

type TradeFinanceApp = {
  id: string
  clientId: string
  program: string
  amount: number | null
  currency: string
  status: string
  notes: string | null
  appliedAt: string | null
  approvedAt: string | null
  disbursedAt: string | null
}

const complianceStatusColor: Record<string, string> = {
  obtained: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  "in-progress": "text-blue-500 bg-blue-500/10 border-blue-500/30",
  "not-started": "text-muted-foreground bg-muted/30 border-muted-foreground/20",
  expired: "text-red-500 bg-red-500/10 border-red-500/30",
}

const complianceStatusIcon: Record<string, React.ReactNode> = {
  obtained: <CheckCircle2 className="h-3.5 w-3.5" />,
  "in-progress": <Clock className="h-3.5 w-3.5" />,
  "not-started": <XCircle className="h-3.5 w-3.5" />,
  expired: <AlertCircle className="h-3.5 w-3.5" />,
}

const programLabels: Record<string, string> = {
  "afdb-afawa": "AfDB AFAWA Fund",
  "sokogate-pay-escrow": "Sokogate Pay Escrow",
  "letter-of-credit": "Letter of Credit",
  "export-credit": "Export Credit",
}

const financeStatusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/10 text-blue-600",
  "under-review": "bg-amber-500/10 text-amber-600",
  approved: "bg-emerald-500/10 text-emerald-600",
  disbursed: "bg-violet-500/10 text-violet-600",
  rejected: "bg-red-500/10 text-red-600",
}

const labelColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"]

// Korean corporate target pipeline (static tracking for MVP)
const koreanTargets = [
  { company: "Hyundai Auto Parts Co.", tier: "Chaebol Supplier", focus: "Steel, aluminum, rubber", status: "Outreach Ready", stage: "Identified" },
  { company: "Samsung Electronics Supply Chain", tier: "Chaebol Supplier", focus: "Chemicals, packaging", status: "Contact Made", stage: "Intro Sent" },
  { company: "LG Components Ltd.", tier: "Chaebol Supplier", focus: "Electronics, minerals", status: "Identified", stage: "Researching" },
  { company: "Seoul Trading Corp.", tier: "Trading House", focus: "Multi-commodity", status: "Warm Lead", stage: "Demo Scheduled" },
  { company: "Busan Food Processors", tier: "Mid-Sized Manufacturer", focus: "Coffee, cocoa, tea", status: "Hot Lead", stage: "Proposal" },
  { company: "Daegu Textile Mill", tier: "Mid-Sized Manufacturer", focus: "Cotton, textiles", status: "Identified", stage: "Researching" },
  { company: "Incheon Chemical Co.", tier: "Mid-Sized Manufacturer", focus: "Industrial chemicals", status: "Contact Made", stage: "Initial Call" },
  { company: "Korea Commodities Import", tier: "Trading House", focus: "Agricultural commodities", status: "Warm Lead", stage: "Second Meeting" },
  { company: "POSCO Supply Chain Partners", tier: "Chaebol Supplier", focus: "Graphite, minerals", status: "Identified", stage: "Researching" },
  { company: "Hanwha Procurement Group", tier: "Chaebol Supplier", focus: "Multi-category", status: "Identified", stage: "Outreach Ready" },
]

// Sokogate Platform Pilot cohorts
const pilotCohorts = [
  { name: "Cohort 1: Agriculture", count: 5, type: "Coffee, tea, nuts, spices", startMonth: "Month 1", status: "Recruiting", completed: 0 },
  { name: "Cohort 2: Minerals & Metals", count: 5, type: "Titanium, graphite, copper", startMonth: "Month 2", status: "Planning", completed: 0 },
  { name: "Cohort 3: Manufactured Goods", count: 5, type: "Textiles, processed foods", startMonth: "Month 3", status: "Planning", completed: 0 },
  { name: "Cohort 4: Mixed Commodities", count: 5, type: "Pan-Africa → Korea", startMonth: "Month 4", status: "Planning", completed: 0 },
]

export default function TradePage() {
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [compliance, setCompliance] = useState<ComplianceRecord[]>([])
  const [financeApps, setFinanceApps] = useState<TradeFinanceApp[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [koreaSubTab, setKoreaSubTab] = useState("pipeline")
  const [selectedClient, setSelectedClient] = useState<string>("all")

  // Product dialog
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [productForm, setProductForm] = useState({ clientId: "", name: "", category: "", description: "", certifications: "", exportVolume: "", unit: "", pricing: "" })
  const [savingProduct, setSavingProduct] = useState(false)

  // Compliance dialog
  const [complianceDialogOpen, setComplianceDialogOpen] = useState(false)
  const [complianceForm, setComplianceForm] = useState({ clientId: "", productId: "", certificationType: "", status: "not-started", issuer: "", notes: "", appliedAt: "" })
  const [savingCompliance, setSavingCompliance] = useState(false)

  // Finance dialog
  const [financeDialogOpen, setFinanceDialogOpen] = useState(false)
  const [financeForm, setFinanceForm] = useState({ clientId: "", program: "afdb-afawa", amount: "", currency: "USD", status: "draft", notes: "", appliedAt: "" })
  const [savingFinance, setSavingFinance] = useState(false)

  // ERS history chart
  type ErsSnapshotData = { snapshotDate: string; totalScore: number }
  const [ersHistory, setErsHistory] = useState<ErsSnapshotData[]>([])

  const loadData = async () => {
    try {
      const [clientsRes, productsRes, complianceRes, financeRes] = await Promise.all([
        fetch("/api/central-brain/revstack/data?page=clients"),
        fetch("/api/central-brain/revstack/data?page=products"),
        fetch("/api/central-brain/revstack/data?page=compliance-records"),
        fetch("/api/central-brain/revstack/data?page=trade-finance"),
      ])
      const [clientsData, productsData, complianceData, financeData] = await Promise.all([
        clientsRes.json(),
        productsRes.json(),
        complianceRes.json(),
        financeRes.json(),
      ])
      setClients(clientsData.data || clientsData)
      setProducts(productsData.data || productsData)
      setCompliance(complianceData.data || complianceData)
      setFinanceApps(financeData.data || financeData)
    } catch (e) {
      console.error("Load trade data failed", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Fetch ERS history when a client is selected
  useEffect(() => {
    if (selectedClient !== "all") {
      fetch(`/api/central-brain/revstack/data?page=ers-snapshots&clientId=${selectedClient}&limit=20`)
        .then((r) => r.json())
        .then((res) => {
          const data = res.data || res
          setErsHistory(Array.isArray(data) ? data.reverse() : [])
        })
        .catch(() => setErsHistory([]))
    } else {
      setErsHistory([])
    }
  }, [selectedClient])

  const getClientName = (clientId: string) => clients.find((c) => c.id === clientId)?.name || "Unknown"
  const filterByClient = <T extends { clientId: string }>(items: T[]) =>
    selectedClient === "all" ? items : items.filter((i) => i.clientId === selectedClient)

  // Product actions
  const createProduct = async () => {
    setSavingProduct(true)
    try {
      const res = await fetch("/api/clients/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productForm),
      })
      if (res.ok) {
        setProductDialogOpen(false)
        setProductForm({ clientId: "", name: "", category: "", description: "", certifications: "", exportVolume: "", unit: "", pricing: "" })
        loadData()
      }
    } catch (e) { console.error(e) }
    finally { setSavingProduct(false) }
  }

  const deleteProduct = async (id: string) => {
    try {
      await fetch(`/api/clients/products/${id}`, { method: "DELETE" })
      loadData()
    } catch (e) { console.error(e) }
  }

  // Compliance actions
  const createCompliance = async () => {
    setSavingCompliance(true)
    try {
      const res = await fetch("/api/clients/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(complianceForm),
      })
      if (res.ok) {
        setComplianceDialogOpen(false)
        setComplianceForm({ clientId: "", productId: "", certificationType: "", status: "not-started", issuer: "", notes: "", appliedAt: "" })
        loadData()
      }
    } catch (e) { console.error(e) }
    finally { setSavingCompliance(false) }
  }

  // Finance actions
  const createFinanceApp = async () => {
    setSavingFinance(true)
    try {
      const res = await fetch("/api/clients/trade-finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(financeForm),
      })
      if (res.ok) {
        setFinanceDialogOpen(false)
        setFinanceForm({ clientId: "", program: "afdb-afawa", amount: "", currency: "USD", status: "draft", notes: "", appliedAt: "" })
        loadData()
      }
    } catch (e) { console.error(e) }
    finally { setSavingFinance(false) }
  }

  const deleteFinance = async (id: string) => {
    try {
      await fetch(`/api/clients/trade-finance/${id}`, { method: "DELETE" })
      loadData()
    } catch (e) { console.error(e) }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="shimmer h-8 w-48 rounded mb-2" />
        <div className="shimmer h-4 w-72 rounded mb-8" />
        <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="shimmer h-24 rounded" />)}</div>
      </div>
    )
  }

  // Derived analytics
  const totalProducts = products.length
  const totalCompliance = compliance.length
  const obtainedCompliance = compliance.filter((c) => c.status === "obtained").length
  const totalFinanceAmount = financeApps.reduce((s, a) => s + (a.amount || 0), 0)
  const approvedFinance = financeApps.filter((a) => a.status === "approved" || a.status === "disbursed").length
  const complianceProgress = totalCompliance > 0 ? Math.round((obtainedCompliance / totalCompliance) * 100) : 0
  const avgErs = clients.filter((c) => c.ersScore !== null).reduce((s, c) => s + (c.ersScore || 0), 0) / (clients.filter((c) => c.ersScore !== null).length || 1)

  // Korea-specific analytics
  const koreaCorridorClients = clients.filter((c) => c.corridor === "korea-africa")
  const koreaComplianceItems = compliance.filter((c) =>
    ["haccp", "halal", "korean-import", "fda", "phytosanitary"].includes(c.certificationType)
  )
  const koreaComplianceObtained = koreaComplianceItems.filter((c) => c.status === "obtained").length
  const hotKoreanLeads = koreanTargets.filter((t) => t.status === "Hot Lead" || t.status === "Warm Lead").length
  const pilotCompaniesEnrolled = pilotCohorts.reduce((sum, c) => sum + (c.status === "Recruiting" || c.status === "Active" ? c.count : 0), 0)

  const corridorData = [
    { name: "China→Africa", value: clients.filter((c) => c.corridor === "china-africa").length, color: "hsl(var(--chart-1))" },
    { name: "Korea→Africa", value: koreaCorridorClients.length, color: "hsl(var(--chart-2))" },
    { name: "Africa↔Africa", value: clients.filter((c) => c.corridor === "africa-africa").length, color: "hsl(var(--chart-3))" },
    { name: "Unassigned", value: clients.filter((c) => !c.corridor).length, color: "hsl(var(--chart-5))" },
  ]

  const ersDistribution = [
    { range: "80-100", count: clients.filter((c) => c.ersScore !== null && c.ersScore >= 80).length },
    { range: "50-79", count: clients.filter((c) => c.ersScore !== null && c.ersScore >= 50 && c.ersScore < 80).length },
    { range: "0-49", count: clients.filter((c) => c.ersScore !== null && c.ersScore < 50).length },
    { range: "N/A", count: clients.filter((c) => c.ersScore === null).length },
  ]

  const complianceByType = Array.from(new Set(compliance.map((c) => c.certificationType))).map((type) => ({
    type,
    total: compliance.filter((c) => c.certificationType === type).length,
    obtained: compliance.filter((c) => c.certificationType === type && c.status === "obtained").length,
  }))

  const stageOrder: Record<string, number> = { Researching: 1, "Outreach Ready": 2, "Intro Sent": 3, "Initial Call": 4, "Second Meeting": 5, "Demo Scheduled": 6, Proposal: 7, Negotiation: 8, Closed: 9 }

  const koreaStageData = Object.entries(
    koreanTargets.reduce((acc: Record<string, number>, t) => {
      acc[t.stage] = (acc[t.stage] || 0) + 1
      return acc
    }, {})
  )
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => (stageOrder[a.stage] || 0) - (stageOrder[b.stage] || 0))

  const statusColor: Record<string, string> = {
    Identified: "text-muted-foreground bg-muted",
    "Outreach Ready": "text-blue-500 bg-blue-500/10",
    "Contact Made": "text-amber-500 bg-amber-500/10",
    "Warm Lead": "text-emerald-500 bg-emerald-500/10",
    "Hot Lead": "text-rose-500 bg-rose-500/10",
  }

  const pilotStatusColor: Record<string, string> = {
    Planning: "bg-muted text-muted-foreground",
    Recruiting: "bg-blue-500/10 text-blue-600",
    Active: "bg-emerald-500/10 text-emerald-600",
    Completed: "bg-violet-500/10 text-violet-600",
  }

  // ERS breakdown helpers
  const getErsBreakdown = (clientId: string): ErsBreakdown | null => {
    const client = clients.find((c) => c.id === clientId)
    return client?.ersBreakdown ? parseBreakdown(client.ersBreakdown) : null
  }

  const getClientErsResult = (clientId: string): ErsResult | null => {
    const client = clients.find((c) => c.id === clientId)
    if (!client) return null
    if (client.ersBreakdown) {
      const parsed = parseBreakdown(client.ersBreakdown)
      if (parsed) return { total: client.ersScore || 0, breakdown: parsed, readinessLevel: (client.ersScore || 0) >= 80 ? "export-ready" : (client.ersScore || 0) >= 50 ? "developing" : "needs-work" }
    }
    return null
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade & Export Readiness</h1>
          <p className="text-muted-foreground mt-1">
            Products · Compliance · ERS scoring · Trade finance · Korea corridor
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info" className="text-sm px-3 py-1">
            <Globe className="h-3.5 w-3.5 mr-1" />
            Avg ERS: {avgErs.toFixed(0)}
          </Badge>
          <Badge className="text-sm px-3 py-1 bg-rose-500/10 text-rose-500 border-rose-500/20">
            <Flag className="h-3.5 w-3.5 mr-1" />
            Korea: {hotKoreanLeads} hot leads
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><PackageSearch className="h-5 w-5 text-primary" /></div>
            <div>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <div className="text-xs text-muted-foreground">Products listed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><ShieldCheck className="h-5 w-5 text-emerald-500" /></div>
            <div>
              <div className="text-2xl font-bold">{obtainedCompliance}/{totalCompliance}</div>
              <div className="text-xs text-muted-foreground">Compliance obtained</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Banknote className="h-5 w-5 text-blue-500" /></div>
            <div>
              <div className="text-2xl font-bold">{formatCurrency(totalFinanceAmount)}</div>
              <div className="text-xs text-muted-foreground">Trade finance total</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Ship className="h-5 w-5 text-amber-500" /></div>
            <div>
              <div className="text-2xl font-bold">{clients.filter((c) => c.corridor).length}</div>
              <div className="text-xs text-muted-foreground">Clients on corridors</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10"><TrendingUp className="h-5 w-5 text-violet-500" /></div>
            <div>
              <div className="text-2xl font-bold">{clients.length}</div>
              <div className="text-xs text-muted-foreground">Export-ready clients</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-xl">
          <TabsTrigger value="overview"><Layers className="h-4 w-4 mr-1.5" /> Overview</TabsTrigger>
          <TabsTrigger value="korea"><Flag className="h-4 w-4 mr-1.5" /> Korea</TabsTrigger>
          <TabsTrigger value="products"><PackageSearch className="h-4 w-4 mr-1.5" /> Products</TabsTrigger>
          <TabsTrigger value="compliance"><ShieldCheck className="h-4 w-4 mr-1.5" /> Compliance</TabsTrigger>
          <TabsTrigger value="finance"><Banknote className="h-4 w-4 mr-1.5" /> Trade Finance</TabsTrigger>
        </TabsList>

        {/* === OVERVIEW TAB === */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Corridor Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Trade Corridors</CardTitle>
                <CardDescription>Client distribution across trade routes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={corridorData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
                      <RechartsTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {corridorData.map((entry, i) => (<Cell key={entry.name} fill={entry.color} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* ERS Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> ERS Score Distribution</CardTitle>
                <CardDescription>Export Readiness Scores across clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ersDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <RechartsTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="hsl(var(--chart-1))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-emerald-500" /> 80-100 (Export Ready)</span>
                  <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-amber-500" /> 50-79 (Developing)</span>
                  <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-500" /> 0-49 (Needs Work)</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ERS Score History (when a client is selected) */}
          {selectedClient !== "all" && ersHistory.length >= 2 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" /> ERS Score History
                </CardTitle>
                <CardDescription>{getClientName(selectedClient)} — score changes over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ersHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="snapshotDate"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tickFormatter={(v: string) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      />
                      <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <RechartsTooltip
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        labelFormatter={(v: string) => new Date(v).toLocaleDateString()}
                      />
                      <Line
                        type="monotone"
                        dataKey="totalScore"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--chart-2))", r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compliance Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Compliance by Certification Type</CardTitle>
              <CardDescription>Track progress toward Korea market readiness</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceByType.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No compliance records yet. Start tracking certifications needed for Korea/AfCFTA market access.</p>
                ) : complianceByType.map((ct) => (
                  <div key={ct.type} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{ct.type.replace(/-/g, " ")}</span>
                      <span className="text-muted-foreground">{ct.obtained}/{ct.total} obtained</span>
                    </div>
                    <Progress value={(ct.obtained / ct.total) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === KOREA TAB === */}
        <TabsContent value="korea" className="space-y-6 mt-6">
          {/* Korea KPI row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="border-rose-500/20 bg-gradient-to-br from-card to-rose-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10"><Flag className="h-5 w-5 text-rose-500" /></div>
                <div>
                  <div className="text-2xl font-bold">{koreanTargets.length}</div>
                  <div className="text-xs text-muted-foreground">Korean targets</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10"><Target className="h-5 w-5 text-emerald-500" /></div>
                <div>
                  <div className="text-2xl font-bold">{hotKoreanLeads}</div>
                  <div className="text-xs text-muted-foreground">Hot/Warm leads</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10"><FlaskConical className="h-5 w-5 text-amber-500" /></div>
                <div>
                  <div className="text-2xl font-bold">{pilotCompaniesEnrolled}/20</div>
                  <div className="text-xs text-muted-foreground">Pilot enrolled</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10"><ShieldCheck className="h-5 w-5 text-violet-500" /></div>
                <div>
                  <div className="text-2xl font-bold">{koreaComplianceObtained}/{koreaComplianceItems.length}</div>
                  <div className="text-xs text-muted-foreground">Korea certs</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-5 w-5 text-blue-500" /></div>
                <div>
                  <div className="text-2xl font-bold">{koreaCorridorClients.length}</div>
                  <div className="text-xs text-muted-foreground">African suppliers on platform</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Korean sub-tabs */}
          <Tabs value={koreaSubTab} onValueChange={setKoreaSubTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full max-w-2xl">
              <TabsTrigger value="pipeline"><Users className="h-4 w-4 mr-1.5" /> Pipeline</TabsTrigger>
              <TabsTrigger value="matching"><Target className="h-4 w-4 mr-1.5" /> Supplier Matching</TabsTrigger>
              <TabsTrigger value="compliance"><ShieldCheck className="h-4 w-4 mr-1.5" /> Compliance & ERS</TabsTrigger>
              <TabsTrigger value="conversion"><TrendingUp className="h-4 w-4 mr-1.5" /> Pilot Conversion</TabsTrigger>
            </TabsList>

            {/* Pipeline sub-tab */}
            <TabsContent value="pipeline" className="space-y-4 mt-4">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="h-4 w-4 text-primary" /> Korean Corporate Pipeline
                    </CardTitle>
                    <CardDescription>10 target procurement teams by deal stage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={koreaStageData} layout="vertical">
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
                      <FlaskConical className="h-4 w-4 text-primary" /> Sokogate Platform Pilot
                    </CardTitle>
                    <CardDescription>20 African exporters on 3-month free trials</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pilotCohorts.map((cohort, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-card/50">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium">{cohort.name}</p>
                            <p className="text-xs text-muted-foreground">{cohort.type}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{cohort.completed}/{cohort.count}</span>
                            <Badge className={cn("text-[10px]", pilotStatusColor[cohort.status])}>{cohort.status}</Badge>
                          </div>
                        </div>
                        <Progress value={(cohort.completed / cohort.count) * 100} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground mt-1">Starts {cohort.startMonth}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Korean target companies table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4 text-primary" /> Korean Procurement Targets
                  </CardTitle>
                  <CardDescription>10 corporate customers target list</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left bg-muted/20">
                          <th className="py-3 px-4 font-medium text-muted-foreground">Company</th>
                          <th className="py-3 px-4 font-medium text-muted-foreground">Tier</th>
                          <th className="py-3 px-4 font-medium text-muted-foreground">Procurement Focus</th>
                          <th className="py-3 px-4 font-medium text-muted-foreground">Status</th>
                          <th className="py-3 px-4 font-medium text-muted-foreground">Stage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {koreanTargets.map((target, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 font-medium">{target.company}</td>
                            <td className="py-3 px-4 text-muted-foreground text-xs">{target.tier}</td>
                            <td className="py-3 px-4 text-muted-foreground text-xs">{target.focus}</td>
                            <td className="py-3 px-4">
                              <Badge className={cn("text-[10px]", statusColor[target.status] || "bg-muted text-muted-foreground")}>
                                {target.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-xs text-muted-foreground">{target.stage}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Supplier Matching sub-tab */}
            <TabsContent value="matching" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4 text-primary" /> Korean Buyer ↔ African Supplier Matching
                  </CardTitle>
                  <CardDescription>Automated match suggestions based on procurement focus and product categories</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { korean: "Busan Food Processors", focus: "Coffee, cocoa, tea", supplier: "Kenya Coffee Exporters Ltd", match: 94, commodity: "Specialty Arabica coffee", country: "Kenya", certs: "HACCP, Organic" },
                    { korean: "Seoul Trading Corp.", focus: "Multi-commodity", supplier: "Tanzania Tea Growers Co-op", match: 88, commodity: "Premium black tea", country: "Tanzania", certs: "Halal" },
                    { korean: "Daegu Textile Mill", focus: "Cotton, textiles", supplier: "Uganda Cotton & Textiles Ltd", match: 91, commodity: "Organic cotton fabric", country: "Uganda", certs: "GOTS, Organic" },
                    { korean: "Incheon Chemical Co.", focus: "Industrial chemicals", supplier: "DRC Cobalt Supply Co.", match: 78, commodity: "Cobalt hydroxide", country: "DRC", certs: "Conflict-free" },
                    { korean: "LG Components Ltd.", focus: "Electronics, minerals", supplier: "Zambia Copper Export Corp", match: 85, commodity: "Copper cathode", country: "Zambia", certs: "ISO 9001" },
                    { korean: "Busan Food Processors", focus: "Coffee, cocoa, tea", supplier: "Ethiopian Spice Traders", match: 76, commodity: "Premium spices", country: "Ethiopia", certs: "Organic" },
                  ].map((match, i) => {
                    const matchColor = match.match >= 90 ? "text-emerald-500" : match.match >= 80 ? "text-blue-500" : "text-amber-500"
                    return (
                      <div key={i} className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-rose-500/10 shrink-0">
                          <div className="text-center">
                            <p className={cn("text-lg font-bold leading-none", matchColor)}>{match.match}%</p>
                            <p className="text-[8px] text-muted-foreground mt-0.5">match</p>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Korean Buyer</p>
                            <p className="font-medium text-xs">{match.korean}</p>
                            <p className="text-[10px] text-muted-foreground">{match.focus}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase">African Supplier</p>
                            <p className="font-medium text-xs">{match.supplier}</p>
                            <p className="text-[10px] text-muted-foreground">{match.country}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Commodity</p>
                            <p className="text-xs">{match.commodity}</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <p className="text-[10px] text-muted-foreground uppercase">Certifications</p>
                            <div className="flex flex-wrap gap-1">
                              {match.certs.split(", ").map((cert) => (
                                <span key={cert} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-200/50">
                                  {cert}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs">
                          <Mail className="h-3 w-3 mr-1" /> Intro
                        </Button>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-500/10">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                    <Target className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">How Matching Works</h3>
                    <p className="text-sm text-muted-foreground">
                      Matches are generated by cross-referencing Korean buyer procurement focus with African exporter
                      commodity categories, certifications, and ERS scores. Each match is scored by product fit (40%),
                      compliance readiness (35%), and export capacity (25%).
                    </p>
                    <Button size="sm" variant="outline" className="mt-3 h-7 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" /> Run Full Matching
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Compliance & ERS sub-tab */}
            <TabsContent value="compliance" className="space-y-4 mt-4">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ShieldCheck className="h-4 w-4 text-primary" /> Korea Certification Tracking
                    </CardTitle>
                    <CardDescription>Certification status across all pilot participants</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { cert: "HACCP", total: 12, obtained: 8, inProgress: 2, notStarted: 2 },
                      { cert: "Halal", total: 8, obtained: 5, inProgress: 1, notStarted: 2 },
                      { cert: "Organic", total: 10, obtained: 6, inProgress: 2, notStarted: 2 },
                      { cert: "Korean Import Permit", total: 5, obtained: 0, inProgress: 3, notStarted: 2 },
                      { cert: "FDA Approval", total: 6, obtained: 2, inProgress: 1, notStarted: 3 },
                      { cert: "ISO 9001", total: 4, obtained: 3, inProgress: 0, notStarted: 1 },
                      { cert: "GOTS", total: 3, obtained: 2, inProgress: 0, notStarted: 1 },
                      { cert: "Phytosanitary", total: 7, obtained: 4, inProgress: 2, notStarted: 1 },
                    ].map((c) => (
                      <div key={c.cert} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-xs">{c.cert}</span>
                          <span className="text-xs text-muted-foreground">
                            <span className="text-emerald-500">{c.obtained} obtained</span>
                            {c.inProgress > 0 && <span className="text-blue-500"> · {c.inProgress} in progress</span>}
                          </span>
                        </div>
                        <Progress
                          value={(c.obtained / c.total) * 100}
                          className="h-1.5"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-4 w-4 text-primary" /> ERS Scorecards
                    </CardTitle>
                    <CardDescription>Export Readiness Scores for pilot participants</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { company: "Ghana Cocoa Processing Co.", score: 85, country: "Ghana", certStatus: "High" },
                      { company: "South Africa Premium Wines", score: 82, country: "South Africa", certStatus: "High" },
                      { company: "Kenya Coffee Exporters Ltd", score: 78, country: "Kenya", certStatus: "Medium" },
                      { company: "Egyptian Cotton Exports", score: 76, country: "Egypt", certStatus: "Medium" },
                      { company: "Tanzania Tea Growers Co-op", score: 72, country: "Tanzania", certStatus: "Medium" },
                      { company: "Zambia Copper Export Corp", score: 74, country: "Zambia", certStatus: "High" },
                      { company: "Uganda Cotton & Textiles", score: 70, country: "Uganda", certStatus: "Medium" },
                      { company: "Tanzania Graphite Resources", score: 68, country: "Tanzania", certStatus: "Low" },
                      { company: "Senegal Seafood Exporters", score: 73, country: "Senegal", certStatus: "Medium" },
                      { company: "Rwanda Mountain Coffee", score: 82, country: "Rwanda", certStatus: "High" },
                    ].map((s) => {
                      const scoreColor = s.score >= 80 ? "text-emerald-500" : s.score >= 65 ? "text-blue-500" : "text-amber-500"
                      const certColor = s.certStatus === "High" ? "bg-emerald-500/10 text-emerald-600" : s.certStatus === "Medium" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"
                      return (
                        <div key={s.company} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs", scoreColor, "bg-current/10")}>
                            <span className={scoreColor}>{s.score}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{s.company}</p>
                            <p className="text-[10px] text-muted-foreground">{s.country}</p>
                          </div>
                          <Badge className={cn("text-[9px]", certColor)}>{s.certStatus} readiness</Badge>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-amber-500/5 border-amber-500/10">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                      <ShieldCheck className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Compliance Gap Analysis</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Top certifications needed for Korea market entry. 12 of 20 pilot companies need at least
                        1 additional Korea-required certification. Priority: Korean Import Permit (5 needed).
                      </p>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <ShieldCheck className="h-3 w-3 mr-1" /> Run Gap Analysis
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pilot Conversion sub-tab */}
            <TabsContent value="conversion" className="space-y-4 mt-4">
              {/* Conversion targets */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Pilot Target</p>
                    <p className="text-2xl font-bold">20 companies</p>
                    <p className="text-[10px] text-emerald-500">3-month free Sokogate trial</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Target Conversion</p>
                    <p className="text-2xl font-bold">50%</p>
                    <p className="text-[10px] text-blue-500">10 companies → paid</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Avg Trial Duration</p>
                    <p className="text-2xl font-bold">90 days</p>
                    <p className="text-[10px] text-amber-500">3-month pilot period</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Revenue Target</p>
                    <p className="text-2xl font-bold">$196.5K</p>
                    <p className="text-[10px] text-violet-500">Year 1 corridor revenue</p>
                  </CardContent>
                </Card>
              </div>

              {/* Conversion pipeline */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-primary" /> Trial Status Overview
                  </CardTitle>
                  <CardDescription>Current state of all 20 pilot participants</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                      { label: "Active Trials", value: 3, total: 20, color: "bg-emerald-500", textColor: "text-emerald-500" },
                      { label: "Invited / Pending", value: 17, total: 20, color: "bg-blue-500", textColor: "text-blue-500" },
                      { label: "Expiring in 30 Days", value: 0, total: 20, color: "bg-amber-500", textColor: "text-amber-500" },
                      { label: "Churned / Lost", value: 0, total: 20, color: "bg-red-500", textColor: "text-red-500" },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center">
                        <p className={cn("text-3xl font-bold", stat.textColor)}>{stat.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                        <Progress value={(stat.value / stat.total) * 100} className={cn("h-1 mt-1", stat.color)} />
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Conversion Actions</h4>
                    <div className="space-y-2">
                      {[
                        { action: "Invite to upgrade from pilot to paid", priority: "This week", companies: 17, type: "outreach" },
                        { action: "Schedule pilot check-in call with Cohort 1", priority: "This week", companies: 5, type: "call" },
                        { action: "Send trial extension offer to Cohort 1 participants", priority: "Month 2", companies: 5, type: "email" },
                        { action: "Begin Cohort 2 recruitment with paid conversion target", priority: "Month 2", companies: 5, type: "outreach" },
                        { action: "Run pilot-to-paid conversion sequence (email + WhatsApp)", priority: "Ongoing", companies: 20, type: "automation" },
                        { action: "Tag high-ERS participants for priority conversion (ERS 80+)", priority: "Month 1", companies: 4, type: "automation" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                          <div className={cn(
                            "p-1.5 rounded shrink-0",
                            item.type === "outreach" ? "bg-blue-500/10" :
                            item.type === "call" ? "bg-emerald-500/10" :
                            item.type === "email" ? "bg-amber-500/10" : "bg-violet-500/10"
                          )}>
                            {item.type === "outreach" ? <Users className="h-3.5 w-3.5 text-blue-500" /> :
                             item.type === "call" ? <Phone className="h-3.5 w-3.5 text-emerald-500" /> :
                             item.type === "email" ? <Mail className="h-3.5 w-3.5 text-amber-500" /> :
                             <CheckCircle2 className="h-3.5 w-3.5 text-violet-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{item.action}</p>
                            <p className="text-[10px] text-muted-foreground">{item.companies} companies affected</p>
                          </div>
                          <Badge variant="outline" className={cn("text-[9px]",
                            item.priority === "This week" ? "border-amber-500 text-amber-600" :
                            item.priority === "Month 1" ? "border-blue-500 text-blue-600" :
                            "border-muted-foreground text-muted-foreground"
                          )}>{item.priority}</Badge>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Auto-conversion sequence card */}
              <Card className="bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border-emerald-500/10">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Automated Pilot-to-Paid Conversion Sequence</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Triggered workflow that activates as each pilot approaches expiry:
                      </p>
                      <div className="space-y-2 text-sm">
                        {[
                          { day: "T-30", action: "Send 'Your trial is ending soon' email + WhatsApp with ROI summary of their platform usage", icon: Mail },
                          { day: "T-14", action: "Schedule conversion call with Mapato account manager. Offer early-bird discount (15% off first 3 months)", icon: Phone },
                          { day: "T-7", action: "Send case study of Korea-Africa transaction match made through platform + testimonial from similar exporter", icon: CheckCircle2 },
                          { day: "T-3", action: "Final reminder: trial expires. Link to paid subscription page with one-click upgrade", icon: AlertCircle },
                          { day: "T+1", action: "If not converted: send 'We'd love to have you back' re-engagement sequence with extended trial offer (30 more days)", icon: Clock },
                          { day: "T+30", action: "If still not converted: move to churned list, send quarterly re-engagement with new Korean buyer matches", icon: Users },
                        ].map((step) => (
                          <div key={step.day} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30">
                            <Badge variant="outline" className={cn("shrink-0 mt-0.5 text-[9px]",
                              step.day.startsWith("T-") ? "border-amber-500 text-amber-600" :
                              step.day.startsWith("T+") ? "border-red-500 text-red-600" :
                              "border-emerald-500 text-emerald-600"
                            )}>{step.day}</Badge>
                            <p className="text-xs text-muted-foreground">{step.action}</p>
                          </div>
                        ))}
                      </div>
                      <Button size="sm" className="mt-4 h-7 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Enable Auto-Conversion Workflow
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Strategy link */}
              <Card className="bg-gradient-to-br from-rose-500/5 to-amber-500/5 border-rose-500/10">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-rose-500/10 shrink-0">
                    <Flag className="h-5 w-5 text-rose-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Korean Corporate Procurement Strategy</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Full strategy document: target Korean procurement teams, 20-company pilot program, revenue projections.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a href="/KOREA-CORPORATE-STRATEGY.md" target="_blank">
                        <Button size="sm">
                          <ListChecks className="h-4 w-4 mr-1.5" /> View Full Strategy
                        </Button>
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* === PRODUCTS TAB === */}
        <TabsContent value="products" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-56"><SelectValue placeholder="All clients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={() => setProductDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Product
            </Button>
          </div>

          {filterByClient(products).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <PackageSearch className="h-12 w-12 mb-3 opacity-50" />
                <p>No products yet. Add a product to start building your catalog.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterByClient(products).map((prod) => (
                <Card key={prod.id} className="group relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{prod.name}</p>
                        <p className="text-xs text-muted-foreground">{getClientName(prod.clientId)}</p>
                      </div>
                      {prod.category && (
                        <Badge variant="outline" className="text-[10px] capitalize">{prod.category.replace(/-/g, " ")}</Badge>
                      )}
                    </div>
                    {prod.description && <p className="text-xs text-muted-foreground mb-2">{prod.description}</p>}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {prod.certifications?.split(",").filter(Boolean).map((cert, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-200/50">
                          {cert.trim()}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {prod.exportVolume && <span>Volume: {prod.exportVolume} {prod.unit || ""}</span>}
                      {prod.pricing && <span className="text-right font-medium text-foreground">{prod.pricing}</span>}
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500"
                      onClick={() => deleteProduct(prod.id)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* === COMPLIANCE TAB === */}
        <TabsContent value="compliance" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-56"><SelectValue placeholder="All clients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={() => setComplianceDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Record
            </Button>
          </div>

          {/* ERS Breakdown per client */}
          {selectedClient !== "all" && getErsBreakdown(selectedClient) && (() => {
            const client = clients.find((c) => c.id === selectedClient)
            const ers = getClientErsResult(selectedClient)
            if (!ers) return null
            return (
              <Card className="bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border-emerald-500/10">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-primary" /> ERS Breakdown — {client?.name}
                  </CardTitle>
                  <CardDescription>
                    Export Readiness Score: <span className={readinessBadgeColor(ers.readinessLevel) + " px-2 py-0.5 rounded font-medium"}>{ers.total}/100 · {readinessLabel(ers.readinessLevel)}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(Object.entries(ers.breakdown) as [string, { score: number; max: number; assessment: string }][]).map(([dim, data]) => {
                      const pct = (data.score / data.max) * 100
                      const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"
                      const dimLabels: Record<string, string> = {
                        documentation: "Documentation",
                        compliance: "Compliance",
                        exportHistory: "Export History",
                        capacityVerified: "Capacity",
                      }
                      return (
                        <div key={dim} className="p-3 rounded-lg border bg-card/50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">{dimLabels[dim] || dim}</span>
                            <span className="text-xs font-bold">{data.score}/{data.max}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight">{data.assessment}</p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {/* ERS overview for all clients */}
          {selectedClient === "all" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" /> ERS Scores Overview
                </CardTitle>
                <CardDescription>Select a client above to see their full ERS breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {clients.filter((c) => c.ersScore !== null).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No ERS scores yet. Add compliance records or products to generate scores.</p>
                ) : clients.filter((c) => c.ersScore !== null).map((c) => {
                  const level: ErsResult["readinessLevel"] = (c.ersScore || 0) >= 80 ? "export-ready" : (c.ersScore || 0) >= 50 ? "developing" : "needs-work"
                  return (
                    <div key={c.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.company}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${level === "export-ready" ? "bg-emerald-500" : level === "developing" ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${c.ersScore || 0}%` }}
                          />
                        </div>
                        <Badge className={cn("text-[9px]", readinessBadgeColor(level))}>{c.ersScore}</Badge>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {filterByClient(compliance).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShieldCheck className="h-12 w-12 mb-3 opacity-50" />
                <p>No compliance records. Track certifications needed for Korea market entry.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filterByClient(compliance).map((rec) => (
                <div key={rec.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors group">
                  <div className={cn("p-2 rounded-lg", rec.status === "obtained" ? "bg-emerald-500/10" : rec.status === "in-progress" ? "bg-blue-500/10" : "bg-muted")}>
                    <ShieldCheck className={cn("h-5 w-5", rec.status === "obtained" ? "text-emerald-500" : rec.status === "in-progress" ? "text-blue-500" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{rec.certificationType.replace(/-/g, " ")}</span>
                      <span className={cn("text-[10px] rounded-full px-2 py-0.5 border flex items-center gap-1", complianceStatusColor[rec.status])}>
                        {complianceStatusIcon[rec.status]}
                        <span className="capitalize">{rec.status.replace(/-/g, " ")}</span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getClientName(rec.clientId)}
                      {rec.product && <> · {rec.product.name}</>}
                      {rec.issuer && <> · Issuer: {rec.issuer}</>}
                      {rec.expiresAt && <> · Expires: {new Date(rec.expiresAt).toLocaleDateString()}</>}
                    </p>
                    {rec.notes && <p className="text-xs text-muted-foreground mt-1">{rec.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {rec.appliedAt && <span>Applied: {new Date(rec.appliedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* === TRADE FINANCE TAB === */}
        <TabsContent value="finance" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-56"><SelectValue placeholder="All clients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={() => setFinanceDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Application
            </Button>
          </div>

          {filterByClient(financeApps).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Banknote className="h-12 w-12 mb-3 opacity-50" />
                <p>No trade finance applications. Track AfDB AFAWA, Sokogate Pay escrow, and LC funding.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filterByClient(financeApps).map((app) => (
                <div key={app.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors group">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Banknote className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{programLabels[app.program] || app.program}</span>
                      <span className={cn("text-[10px] rounded-full px-2 py-0.5", financeStatusColor[app.status])}>
                        <span className="capitalize">{app.status.replace(/-/g, " ")}</span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getClientName(app.clientId)}
                      {app.amount && <> · {formatCurrency(app.amount)} {app.currency}</>}
                      {app.appliedAt && <> · Applied: {new Date(app.appliedAt).toLocaleDateString()}</>}
                      {app.approvedAt && <> · Approved: {new Date(app.approvedAt).toLocaleDateString()}</>}
                    </p>
                    {app.notes && <p className="text-xs text-muted-foreground mt-1">{app.notes}</p>}
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500"
                    onClick={() => deleteFinance(app.id)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {financeApps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Funding Summary</CardTitle>
                <CardDescription>Trade finance by program type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(
                      financeApps.reduce((acc, app) => {
                        const prog = programLabels[app.program] || app.program
                        acc[prog] = (acc[prog] || 0) + (app.amount || 0)
                        return acc
                      }, {} as Record<string, number>)
                    ).map(([name, value], i) => ({ name, value, color: labelColors[i % labelColors.length] }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={140} />
                      <RechartsTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(value: number) => [formatCurrency(value), undefined]} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {financeApps.map((_, i) => <Cell key={i} fill={labelColors[i % labelColors.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Product</DialogTitle><DialogDescription>Add a product to your catalog for B2B matching.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={productForm.clientId} onValueChange={(v) => setProductForm({ ...productForm, clientId: v })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Kenyan Arabica Coffee" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={productForm.category} onValueChange={(v) => setProductForm({ ...productForm, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agriculture">Agriculture</SelectItem>
                    <SelectItem value="manufactured-goods">Manufactured Goods</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} placeholder="kg, tons, units" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} placeholder="Single-origin specialty coffee beans, Grade AA" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Export Volume / Month</Label>
                <Input value={productForm.exportVolume} onChange={(e) => setProductForm({ ...productForm, exportVolume: e.target.value })} placeholder="2000" />
              </div>
              <div className="space-y-2">
                <Label>Pricing</Label>
                <Input value={productForm.pricing} onChange={(e) => setProductForm({ ...productForm, pricing: e.target.value })} placeholder="$8.50/kg FOB Mombasa" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Certifications (comma-separated)</Label>
              <Input value={productForm.certifications} onChange={(e) => setProductForm({ ...productForm, certifications: e.target.value })} placeholder="HACCP, Halal, Organic" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={createProduct} disabled={savingProduct || !productForm.name || !productForm.clientId}>
              {savingProduct ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Compliance Dialog */}
      <Dialog open={complianceDialogOpen} onOpenChange={setComplianceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Compliance Record</DialogTitle><DialogDescription>Track certification status for Korea market access.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={complianceForm.clientId} onValueChange={(v) => setComplianceForm({ ...complianceForm, clientId: v })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Certification Type</Label>
                <Select value={complianceForm.certificationType} onValueChange={(v) => setComplianceForm({ ...complianceForm, certificationType: v })}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="haccp">HACCP</SelectItem>
                    <SelectItem value="halal">Halal</SelectItem>
                    <SelectItem value="phytosanitary">Phytosanitary</SelectItem>
                    <SelectItem value="organic">Organic</SelectItem>
                    <SelectItem value="korean-import">Korean Import Permit</SelectItem>
                    <SelectItem value="fda">FDA Approval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={complianceForm.status} onValueChange={(v) => setComplianceForm({ ...complianceForm, status: v })}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not-started">Not Started</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="obtained">Obtained</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Issuer</Label>
              <Input value={complianceForm.issuer} onChange={(e) => setComplianceForm({ ...complianceForm, issuer: e.target.value })} placeholder="KEBS, Korea FDA, Halal Authority" />
            </div>
            <div className="space-y-2">
              <Label>Applied Date</Label>
              <Input type="date" value={complianceForm.appliedAt} onChange={(e) => setComplianceForm({ ...complianceForm, appliedAt: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={complianceForm.notes} onChange={(e) => setComplianceForm({ ...complianceForm, notes: e.target.value })} placeholder="Additional notes..." />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={createCompliance} disabled={savingCompliance || !complianceForm.clientId || !complianceForm.certificationType}>
              {savingCompliance ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Add Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Trade Finance Dialog */}
      <Dialog open={financeDialogOpen} onOpenChange={setFinanceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Trade Finance Application</DialogTitle><DialogDescription>Track AfDB AFAWA, Sokogate Pay escrow, or LC funding.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={financeForm.clientId} onValueChange={(v) => setFinanceForm({ ...financeForm, clientId: v })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Program</Label>
                <Select value={financeForm.program} onValueChange={(v) => setFinanceForm({ ...financeForm, program: v })}>
                  <SelectTrigger><SelectValue placeholder="Program" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="afdb-afawa">AfDB AFAWA Fund</SelectItem>
                    <SelectItem value="sokogate-pay-escrow">Sokogate Pay Escrow</SelectItem>
                    <SelectItem value="letter-of-credit">Letter of Credit</SelectItem>
                    <SelectItem value="export-credit">Export Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={financeForm.status} onValueChange={(v) => setFinanceForm({ ...financeForm, status: v })}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="under-review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="disbursed">Disbursed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input type="number" value={financeForm.amount} onChange={(e) => setFinanceForm({ ...financeForm, amount: e.target.value })} placeholder="50000" />
              </div>
              <div className="space-y-2">
                <Label>Applied Date</Label>
                <Input type="date" value={financeForm.appliedAt} onChange={(e) => setFinanceForm({ ...financeForm, appliedAt: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={financeForm.notes} onChange={(e) => setFinanceForm({ ...financeForm, notes: e.target.value })} placeholder="Purpose and details..." />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={createFinanceApp} disabled={savingFinance || !financeForm.clientId || !financeForm.program}>
              {savingFinance ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Create Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
