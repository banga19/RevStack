"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils"
import {
  Users,
  Phone,
  Mail,
  Building2,
  DollarSign,
  CalendarDays,
  ChevronRight,
  Plus,
  Filter,
  MoreHorizontal,
  ArrowUpRight,
  Star,
  MessageSquare,
} from "lucide-react"

type Client = {
  id: string
  name: string
  company: string
  email: string
  phone: string | null
  status: string
  tier: string | null
  monthlyRetainer: number | null
  setupFee: number | null
  source: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export default function PipelinePage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => {
        setClients(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const stages = ["lead", "qualified", "proposal", "active", "onboarding", "done"]

  const statusLabels: Record<string, string> = {
    lead: "Lead",
    qualified: "Qualified",
    proposal: "Proposal",
    active: "Active",
    onboarding: "Onboarding",
    done: "Completed",
  }

  const statusIcons: Record<string, string> = {
    lead: "bg-blue-500",
    qualified: "bg-indigo-500",
    proposal: "bg-purple-500",
    active: "bg-emerald-500",
    onboarding: "bg-cyan-500",
    done: "bg-gray-500",
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="shimmer h-8 w-48 rounded mb-2" />
        <div className="shimmer h-4 w-72 rounded mb-8" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="shimmer h-48 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline CRM</h1>
          <p className="text-muted-foreground mt-1">
            {clients.length} client{clients.length !== 1 ? "s" : ""} in your pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("kanban")}
          >
            Kanban
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            List
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
        {stages.map((stage) => {
          const count = clients.filter((c) => c.status === stage).length
          const stageRevenue = clients
            .filter((c) => c.status === stage)
            .reduce((sum, c) => sum + (c.monthlyRetainer || 0), 0)
          return (
            <Card key={stage} className="relative overflow-hidden">
              <div className={cn("absolute top-0 left-0 w-full h-1", statusIcons[stage])} />
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground capitalize">{statusLabels[stage]}</div>
                {stageRevenue > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">{formatCurrency(stageRevenue)}/mo</div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Pipeline Total */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Pipeline Value (Annual)</p>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(clients.reduce((sum, c) => sum + (c.monthlyRetainer || 0) * 12, 0))}
            </p>
          </div>
          <div className="p-3 rounded-full bg-primary/10">
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      {viewMode === "kanban" ? (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {stages.map((stage) => {
            const stageClients = clients.filter((c) => c.status === stage)
            return (
              <div key={stage}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={cn("w-2.5 h-2.5 rounded-full", statusIcons[stage])} />
                  <span className="text-sm font-medium capitalize">{statusLabels[stage]}</span>
                  <span className="text-xs text-muted-foreground">({stageClients.length})</span>
                </div>
                <div className="space-y-2">
                  {stageClients.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                      No clients
                    </div>
                  ) : (
                    stageClients.map((client) => (
                      <Card key={client.id} className="hover:shadow-md transition-all duration-200 cursor-pointer">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                                {client.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{client.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{client.company}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 capitalize">
                              {client.tier || "tbd"}
                            </Badge>
                          </div>
                          {client.monthlyRetainer && (
                            <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(client.monthlyRetainer)}/mo
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{client.email}</span>
                          </div>
                          {client.source && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                                {client.source.replace("-", " ")}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {clients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No clients yet. Start your outreach!</p>
                </div>
              ) : (
                clients.map((client) => (
                  <div key={client.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                      {client.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <p className="text-sm font-medium">{client.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{client.company}</p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-sm truncate">{client.email}</p>
                        {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
                      </div>
                      <div className="hidden md:block">
                        <div className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize", getStatusColor(client.status))}>
                          {client.status}
                        </div>
                        {client.tier && (
                          <p className="text-xs text-muted-foreground mt-1 capitalize">{client.tier}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {client.monthlyRetainer && (
                          <p className="text-sm font-semibold">{formatCurrency(client.monthlyRetainer)}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
                        )}
                        <p className="text-xs text-muted-foreground">{client.source?.replace("-", " ") || "—"}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
