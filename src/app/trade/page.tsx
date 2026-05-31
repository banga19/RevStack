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

export default function TradePage() {
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [compliance, setCompliance] = useState<ComplianceRecord[]>([])
  const [financeApps, setFinanceApps] = useState<TradeFinanceApp[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
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

  const loadData = async () => {
    try {
      const [clientsRes, productsRes, complianceRes, financeRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/clients/products"),
        fetch("/api/clients/compliance"),
        fetch("/api/clients/trade-finance"),
      ])
      setClients(await clientsRes.json())
      setProducts(await productsRes.json())
      setCompliance(await complianceRes.json())
      setFinanceApps(await financeRes.json())
    } catch (e) {
      console.error("Load trade data failed", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

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

  const corridorData = [
    { name: "China→Africa", value: clients.filter((c) => c.corridor === "china-africa").length, color: "hsl(var(--chart-1))" },
    { name: "Korea→Africa", value: clients.filter((c) => c.corridor === "korea-africa").length, color: "hsl(var(--chart-2))" },
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade & Export Readiness</h1>
          <p className="text-muted-foreground mt-1">
            Products · Compliance · ERS scoring · Trade finance · Corridor analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info" className="text-sm px-3 py-1">
            <Globe className="h-3.5 w-3.5 mr-1" />
            Avg ERS: {avgErs.toFixed(0)}
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
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="overview"><Layers className="h-4 w-4 mr-1.5" /> Overview</TabsTrigger>
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
                      <RechartsTooltip
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {corridorData.map((entry, i) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
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
                      <RechartsTooltip
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      />
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

          {/* Compliance Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Compliance by Certification Type</CardTitle>
              <CardDescription>Track progress toward Korea market readiness</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceByType.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No compliance records yet.</p>
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

          {/* Funding Summary */}
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
                      <RechartsTooltip
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        formatter={(value: number) => [formatCurrency(value), undefined]}
                      />
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
