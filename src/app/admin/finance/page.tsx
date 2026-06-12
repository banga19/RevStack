"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { cn, formatCurrency } from "@/lib/utils"
import { useAbac } from "@/lib/use-abac"
import { useRouter } from "next/navigation"
import { Loader2, Banknote, Landmark, FileCheck, Clock, CheckCircle2, XCircle, RefreshCw, Plus, TrendingUp, Globe, ShieldCheck, ArrowUpRight, DollarSign, Users, CalendarDays, AlertTriangle, Building2, ShieldAlert } from "lucide-react"

type FinanceApp = {
  id: string; clientId: string; clientName?: string; program: string; amount: number | null; currency: string
  status: string; notes: string | null; appliedAt: string | null; approvedAt: string | null; disbursedAt: string | null
}

const programLabels: Record<string, { name: string; icon: React.ReactNode; color: string; description: string }> = {
  "afdb-afawa": { name: "AfDB AFAWA Fund", icon: <Landmark className="h-5 w-5" />, color: "text-blue-500 bg-blue-500/10", description: "African Development Bank — Affirmative Finance Action for Women in Africa" },
  "sokogate-pay-escrow": { name: "Sokogate Pay Escrow", icon: <ShieldCheck className="h-5 w-5" />, color: "text-emerald-500 bg-emerald-500/10", description: "Secure payment escrow for cross-border trade transactions" },
  "letter-of-credit": { name: "Letter of Credit", icon: <FileCheck className="h-5 w-5" />, color: "text-violet-500 bg-violet-500/10", description: "Bank-guaranteed payment instrument for international trade" },
  "export-credit": { name: "Export Credit", icon: <TrendingUp className="h-5 w-5" />, color: "text-amber-500 bg-amber-500/10", description: "Pre-export and post-shipment financing facilities" },
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground", submitted: "bg-blue-500/10 text-blue-600",
  "under-review": "bg-amber-500/10 text-amber-600", approved: "bg-emerald-500/10 text-emerald-600",
  disbursed: "bg-violet-500/10 text-violet-600", rejected: "bg-red-500/10 text-red-600",
}

const statusFlow = ["draft", "submitted", "under-review", "approved", "disbursed"]

export default function TradeFinancePage() {
  const { isAdmin, isLoading: abacLoading } = useAbac()
  const router = useRouter()
  const [apps, setApps] = useState<FinanceApp[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ clientId: "", program: "afdb-afawa", amount: "", currency: "USD", status: "draft", notes: "" })

  const loadApps = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/clients/trade-finance")
      if (res.ok) { const d = await res.json(); setApps(Array.isArray(d) ? d : []) }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (abacLoading) return
    if (!isAdmin) { router.push("/dashboard"); return }
    loadApps()
  }, [abacLoading, isAdmin, loadApps, router])

  const createApp = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/clients/trade-finance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: form.amount ? parseFloat(form.amount) : null }),
      })
      if (res.ok) { setDialogOpen(false); loadApps() }
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/clients/trade-finance/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          appliedAt: newStatus === "submitted" ? new Date().toISOString() : undefined,
          approvedAt: newStatus === "approved" ? new Date().toISOString() : undefined,
          disbursedAt: newStatus === "disbursed" ? new Date().toISOString() : undefined,
        }),
      })
      loadApps()
    } catch (e) { console.error(e) }
  }

  const deleteApp = async (id: string) => {
    try { await fetch(`/api/clients/trade-finance/${id}`, { method: "DELETE" }); loadApps() } catch (e) { console.error(e) }
  }

  const getApp = (prog: string) => apps.filter((a) => a.program === prog)
  const totalByProgram = (prog: string) => getApp(prog).reduce((s, a) => s + (a.amount || 0), 0)
  const approvedByProgram = (prog: string) => getApp(prog).filter((a) => a.status === "approved" || a.status === "disbursed").length

  if (abacLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You do not have admin privileges.</p>
        <Button className="mt-6" onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
      </div>
    )
  }

  if (loading) return <div className="space-y-4 animate-fade-in"><div className="shimmer h-8 w-56 rounded mb-2" /><div className="shimmer h-4 w-72 rounded mb-8" /><div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="shimmer h-24 rounded" />)}</div></div>

  const totalFunding = apps.reduce((s, a) => s + (a.amount || 0), 0)
  const approvedFunding = apps.filter((a) => a.status === "approved" || a.status === "disbursed").reduce((s, a) => s + (a.amount || 0), 0)
  const pendingApps = apps.filter((a) => a.status === "draft" || a.status === "submitted" || a.status === "under-review")
  const completedApps = apps.filter((a) => a.status === "approved" || a.status === "disbursed")

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3"><Banknote className="h-7 w-7 text-primary" /> Trade Finance Bridge</h1>
          <p className="text-muted-foreground mt-1">AfDB AFAWA applications, Sokogate Pay escrow, Letters of Credit, and export credit facilities</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Application</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{formatCurrency(totalFunding)}</div><div className="text-xs text-muted-foreground">Total Funding</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-emerald-500">{formatCurrency(approvedFunding)}</div><div className="text-xs text-muted-foreground">Approved / Disbursed</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-amber-500">{pendingApps.length}</div><div className="text-xs text-muted-foreground">Pending</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-blue-500">{completedApps.length}</div><div className="text-xs text-muted-foreground">Completed</div></CardContent></Card>
      </div>

      {/* Program Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(programLabels).map(([key, prog]) => {
          const progApps = getApp(key)
          const total = totalByProgram(key)
          const approved = approvedByProgram(key)
          return (
            <Card key={key} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setActiveTab(key)}>
              <CardContent className="p-4">
                <div className={cn("p-2 rounded-lg inline-flex mb-2", prog.color)}>{prog.icon}</div>
                <p className="text-xs font-medium mb-1">{prog.name}</p>
                <p className="text-lg font-bold">{formatCurrency(total)}</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span>{progApps.length} applications</span>
                  <span>·</span>
                  <span className="text-emerald-500">{approved} approved</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Applications by Program */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-xl">
          <TabsTrigger value="overview"><Globe className="h-4 w-4 mr-1.5" /> Overview</TabsTrigger>
          <TabsTrigger value="afdb-afawa">AfDB AFAWA</TabsTrigger>
          <TabsTrigger value="sokogate-pay-escrow">Escrow</TabsTrigger>
          <TabsTrigger value="letter-of-credit">L/C</TabsTrigger>
          <TabsTrigger value="export-credit">Export Credit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" /> All Trade Finance Applications</CardTitle><CardDescription>{apps.length} total application{apps.length !== 1 ? "s" : ""}</CardDescription></CardHeader>
            <CardContent>
              {apps.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Banknote className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No trade finance applications yet.</p></div>
              ) : (
                <div className="space-y-2">
                  {apps.map((app) => {
                    const prog = programLabels[app.program]
                    const currentIdx = statusFlow.indexOf(app.status)
                    return (
                      <div key={app.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className={cn("p-2 rounded-lg shrink-0", prog?.color || "bg-muted")}>{prog?.icon || <Banknote className="h-5 w-5" />}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{prog?.name || app.program}</span>
                            <span className={cn("text-[10px] rounded-full px-2 py-0.5", statusColors[app.status])}><span className="capitalize">{app.status.replace(/-/g, " ")}</span></span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {app.amount && <>{formatCurrency(app.amount)} {app.currency}</>}
                            {app.appliedAt && <> · Applied: {new Date(app.appliedAt).toLocaleDateString()}</>}
                            {app.approvedAt && <> · Approved: {new Date(app.approvedAt).toLocaleDateString()}</>}
                          </p>
                          {app.notes && <p className="text-[10px] text-muted-foreground mt-1">{app.notes}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          {currentIdx < statusFlow.length - 1 && currentIdx >= 0 && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => updateStatus(app.id, statusFlow[currentIdx + 1])}>
                              <ArrowUpRight className="h-3 w-3 mr-1" /> {statusFlow[currentIdx + 1].replace(/-/g, " ")}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-500" onClick={() => deleteApp(app.id)}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Funding Progress */}
          {apps.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Funding Overview by Program</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(programLabels).map(([key, prog]) => {
                  const total = totalByProgram(key)
                  const approved = approvedByProgram(key)
                  const maxTotal = Math.max(...Object.keys(programLabels).map((k) => totalByProgram(k)), 1)
                  const barWidth = maxTotal > 0 ? (total / maxTotal) * 100 : 0
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1 rounded", prog.color)}>{prog.icon}</div>
                          <span className="text-xs font-medium">{prog.name}</span>
                        </div>
                        <span className="text-xs font-medium">{formatCurrency(total)}</span>
                      </div>
                      <Progress value={barWidth} className="h-2" />
                      <p className="text-[10px] text-muted-foreground">{approved} approved · {getApp(key).length} applications</p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {Object.keys(programLabels).map((key) => (
          <TabsContent key={key} value={key} className="space-y-4 mt-4">
            <Card className={cn("bg-gradient-to-br", key === "afdb-afawa" ? "from-blue-500/5 to-indigo-500/5" : key === "sokogate-pay-escrow" ? "from-emerald-500/5 to-teal-500/5" : key === "letter-of-credit" ? "from-violet-500/5 to-purple-500/5" : "from-amber-500/5 to-orange-500/5")}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", programLabels[key].color)}>{programLabels[key].icon}</div>
                  <div>
                    <h3 className="font-semibold">{programLabels[key].name}</h3>
                    <p className="text-sm text-muted-foreground">{programLabels[key].description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {getApp(key).length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Banknote className="h-12 w-12 mb-3 opacity-50" /><p>No {programLabels[key].name} applications yet.</p></CardContent></Card>
            ) : (
              <div className="space-y-2">
                {getApp(key).map((app) => (
                  <div key={app.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatCurrency(app.amount || 0)} {app.currency}</span>
                        <span className={cn("text-[10px] rounded-full px-2 py-0.5", statusColors[app.status])}>{app.status.replace(/-/g, " ")}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <CalendarDays className="h-3 w-3" />
                        <span>{app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "Not yet applied"}</span>
                        {app.approvedAt && <><CheckCircle2 className="h-3 w-3 text-emerald-500" /><span>Approved {new Date(app.approvedAt).toLocaleDateString()}</span></>}
                      </div>
                      {app.notes && <p className="text-[10px] text-muted-foreground mt-1">{app.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* New Application Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Trade Finance Application</DialogTitle><DialogDescription>Apply for AfDB AFAWA funding, Sokogate Pay escrow, Letters of Credit, or export credit.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Program</Label><Select value={form.program} onValueChange={(v) => setForm({ ...form, program: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="afdb-afawa">AfDB AFAWA Fund</SelectItem><SelectItem value="sokogate-pay-escrow">Sokogate Pay Escrow</SelectItem><SelectItem value="letter-of-credit">Letter of Credit</SelectItem><SelectItem value="export-credit">Export Credit</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount (USD)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="50000" /></div>
              <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="submitted">Submitted</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Purpose and details..." /></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={createApp} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Create Application"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
