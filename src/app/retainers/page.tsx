"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn, formatCurrency } from "@/lib/utils"
import { Plus, RefreshCw, DollarSign, PauseCircle, PlayCircle, XCircle } from "lucide-react"

type Retainer = {
  id: string
  clientId: string
  name: string
  amountUsd: number
  billingCycle: string
  status: string
  startDate: string
  nextBillingDate: string | null
  notes: string | null
  client: { name: string; company: string } | null
}

type Client = {
  id: string
  name: string
  company: string
}

export default function RetainersPage() {
  const [retainers, setRetainers] = useState<Retainer[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ clientId: "", name: "", amountUsd: "", billingCycle: "monthly", startDate: "", notes: "" })

  const fetchData = useCallback(async () => {
    try {
      const [retainersRes, clientsRes] = await Promise.all([
        fetch("/api/retainers"),
        fetch("/api/clients"),
      ])
      setRetainers(await retainersRes.json())
      setClients(await clientsRes.json())
    } catch (e) {
      console.error("Failed to fetch data", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const createRetainer = async () => {
    const res = await fetch("/api/retainers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setDialogOpen(false)
      setForm({ clientId: "", name: "", amountUsd: "", billingCycle: "monthly", startDate: "", notes: "" })
      fetchData()
    }
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/retainers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  const mrr = retainers
    .filter((r) => r.status === "active")
    .reduce((sum, r) => {
      if (r.billingCycle === "monthly") return sum + r.amountUsd
      if (r.billingCycle === "quarterly") return sum + r.amountUsd / 3
      if (r.billingCycle === "annual") return sum + r.amountUsd / 12
      return sum
    }, 0)

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="shimmer h-8 w-48 rounded mb-6" />
        {[1, 2].map((i) => (
          <Card key={i}><CardContent className="p-6"><div className="shimmer h-16 w-full rounded" /></CardContent></Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retainers</h1>
          <p className="text-muted-foreground mt-1">Manage recurring revenue agreements</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Retainer</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Create Retainer Agreement</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.company})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Retainer name (e.g. AI Lead Qualification)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Amount (USD)" type="number" value={form.amountUsd} onChange={(e) => setForm({ ...form, amountUsd: e.target.value })} />
              <Select value={form.billingCycle} onValueChange={(v) => setForm({ ...form, billingCycle: v })}>
                <SelectTrigger><SelectValue placeholder="Billing cycle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Start date (e.g. 2025-01-15)" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <Button className="w-full" onClick={createRetainer} disabled={!form.clientId || !form.name || !form.amountUsd || !form.startDate}>
                Create Retainer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* MRR Card */}
      <Card className="bg-gradient-to-br from-primary/5 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Monthly Recurring Revenue (MRR)</p>
            <p className="text-3xl font-bold">{formatCurrency(mrr)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Retainers List */}
      {retainers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No retainers yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first retainer agreement.</p>
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Retainer</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {retainers.map((retainer) => (
            <Card key={retainer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{retainer.name}</h3>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        retainer.status === "active" && "bg-emerald-500/10 text-emerald-600 border-emerald-200",
                        retainer.status === "paused" && "bg-amber-500/10 text-amber-600 border-amber-200",
                        retainer.status === "cancelled" && "bg-red-500/10 text-red-600 border-red-200",
                      )}>
                        {retainer.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {retainer.client ? `${retainer.client.name} — ${retainer.client.company}` : "Unknown client"}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="font-mono font-bold text-lg">{formatCurrency(retainer.amountUsd)}</span>
                      <span className="text-muted-foreground capitalize">/{retainer.billingCycle}</span>
                      {retainer.nextBillingDate && (
                        <span className="text-muted-foreground">· Next: {retainer.nextBillingDate}</span>
                      )}
                    </div>
                    {retainer.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{retainer.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {retainer.status === "active" && (
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(retainer.id, "paused")} title="Pause">
                        <PauseCircle className="h-4 w-4 text-amber-500" />
                      </Button>
                    )}
                    {retainer.status === "paused" && (
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(retainer.id, "active")} title="Resume">
                        <PlayCircle className="h-4 w-4 text-emerald-500" />
                      </Button>
                    )}
                    {(retainer.status === "active" || retainer.status === "paused") && (
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(retainer.id, "cancelled")} title="Cancel">
                        <XCircle className="h-4 w-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
