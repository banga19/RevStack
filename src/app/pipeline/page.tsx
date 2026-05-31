"use client"

import { useState, useEffect, useCallback } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { cn, formatCurrency, getStatusColor, formatDate } from "@/lib/utils"
import {
  Users,
  Mail,
  DollarSign,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  PhoneCall,
  FileText,
  CheckCircle2,
  Activity,
  ChevronDown,
  ChevronUp,
  GripVertical,
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

type PipelineAction = {
  id: string
  clientId: string
  type: string
  note: string | null
  status: string
  dueDate: string | null
  completedAt: string | null
  createdAt: string
}

const defaultClient = {
  name: "", company: "", email: "", phone: "", status: "lead",
  tier: "growth", monthlyRetainer: "", setupFee: "", source: "cold-outreach", notes: "",
}

const actionTypeLabels: Record<string, string> = {
  "email-sent": "Email Sent",
  "call-held": "Call Held",
  "proposal-sent": "Proposal Sent",
  "demo-done": "Demo Done",
  "follow-up": "Follow-up",
  meeting: "Meeting",
}

const actionTypeIcons: Record<string, React.ReactNode> = {
  "email-sent": <Mail className="h-3.5 w-3.5" />,
  "call-held": <PhoneCall className="h-3.5 w-3.5" />,
  "proposal-sent": <FileText className="h-3.5 w-3.5" />,
  "demo-done": <CheckCircle2 className="h-3.5 w-3.5" />,
  "follow-up": <Activity className="h-3.5 w-3.5" />,
  meeting: <Users className="h-3.5 w-3.5" />,
}

const getActionTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    "email-sent": "bg-blue-500/10 text-blue-600",
    "call-held": "bg-green-500/10 text-green-600",
    "proposal-sent": "bg-purple-500/10 text-purple-600",
    "demo-done": "bg-emerald-500/10 text-emerald-600",
    "follow-up": "bg-amber-500/10 text-amber-600",
    meeting: "bg-cyan-500/10 text-cyan-600",
  }
  return colors[type] || "bg-gray-500/10 text-gray-600"
}

type ClientActionsProps = {
  client: Client
  actionsMap: Record<string, PipelineAction[]>
  expandedActions: Set<string>
  actionsLoading: Record<string, boolean>
  completingAction: string | null
  onToggleActions: (clientId: string) => void
  onOpenActionDialog: (clientId: string) => void
  onCompleteAction: (action: PipelineAction) => void
  onDeleteAction: (action: PipelineAction) => void
}

function ClientActions({
  client,
  actionsMap,
  expandedActions,
  actionsLoading,
  completingAction,
  onToggleActions,
  onOpenActionDialog,
  onCompleteAction,
  onDeleteAction,
}: ClientActionsProps) {
  const isExpanded = expandedActions.has(client.id)
  const actions = actionsMap[client.id] || []
  const pendingCount = actions.filter((a) => a.status !== "completed").length

  return (
    <div className="mt-2 pt-2 border-t border-border/50">
      <button
        onClick={(e) => { e.stopPropagation(); onToggleActions(client.id) }}
        className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <Activity className="h-3 w-3" />
          <span>Actions</span>
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-medium">
              {pendingCount}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          {actionsLoading[client.id] ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
          ) : actions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">No actions yet.</p>
          ) : (
            actions.map((action) => (
              <div
                key={action.id}
                className={cn(
                  "flex items-center gap-2 p-1.5 rounded text-xs",
                  action.status === "completed" ? "bg-muted/20" : "bg-muted/5"
                )}
              >
                <button
                  onClick={() => onCompleteAction(action)}
                  disabled={completingAction === action.id}
                  className="shrink-0 hover:scale-110 transition-transform"
                >
                  {completingAction === action.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : action.status === "completed" ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />
                  )}
                </button>
                <div className={cn("p-1 rounded shrink-0", getActionTypeColor(action.type))}>
                  {actionTypeIcons[action.type] || <Activity className="h-3 w-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={cn(action.status === "completed" && "line-through text-muted-foreground")}>
                    {actionTypeLabels[action.type] || action.type}
                  </span>
                  {action.note && <span className="text-muted-foreground ml-1">— {action.note}</span>}
                  {action.dueDate && action.status !== "completed" && (
                    <span className="text-amber-500 ml-1">Due {formatDate(action.dueDate)}</span>
                  )}
                </div>
                <button
                  onClick={() => onDeleteAction(action)}
                  className="shrink-0 opacity-0 hover:opacity-100 transition-opacity text-red-400 hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs w-full justify-start gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => onOpenActionDialog(client.id)}
          >
            <Plus className="h-3 w-3" /> Add Action
          </Button>
        </div>
      )}
    </div>
  )
}

export default function PipelinePage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const [saving, setSaving] = useState(false)

  // Client form state
  const [form, setForm] = useState(defaultClient)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Actions state
  const [actionsMap, setActionsMap] = useState<Record<string, PipelineAction[]>>({})
  const [actionsLoading, setActionsLoading] = useState<Record<string, boolean>>({})
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set())
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionClientId, setActionClientId] = useState<string | null>(null)
  const [actionForm, setActionForm] = useState({ type: "follow-up", note: "", dueDate: "" })
  const [actionSaving, setActionSaving] = useState(false)
  const [completingAction, setCompletingAction] = useState<string | null>(null)

  const loadClients = () => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => { setClients(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadClients() }, [])

  const loadActions = async (clientId: string) => {
    setActionsLoading((prev) => ({ ...prev, [clientId]: true }))
    try {
      const res = await fetch(`/api/pipeline-actions?clientId=${clientId}`)
      const data = await res.json()
      setActionsMap((prev) => ({ ...prev, [clientId]: data }))
    } catch (e) {
      console.error("Load actions failed", e)
    } finally {
      setActionsLoading((prev) => ({ ...prev, [clientId]: false }))
    }
  }

  const toggleActions = (clientId: string) => {
    const next = new Set(expandedActions)
    if (next.has(clientId)) {
      next.delete(clientId)
    } else {
      next.add(clientId)
      if (!actionsMap[clientId]) loadActions(clientId)
    }
    setExpandedActions(next)
  }

  const openActionDialog = (clientId: string) => {
    setActionClientId(clientId)
    setActionForm({ type: "follow-up", note: "", dueDate: "" })
    setActionDialogOpen(true)
  }

  const createAction = async () => {
    if (!actionClientId) return
    setActionSaving(true)
    try {
      const res = await fetch("/api/pipeline-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...actionForm, clientId: actionClientId }),
      })
      if (res.ok) {
        setActionDialogOpen(false)
        loadActions(actionClientId)
      }
    } catch (e) {
      console.error("Create action failed", e)
    } finally {
      setActionSaving(false)
    }
  }

  const completeAction = async (action: PipelineAction) => {
    setCompletingAction(action.id)
    try {
      const res = await fetch(`/api/pipeline-actions/${action.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action.status === "completed" ? "pending" : "completed",
          completedAt: action.status === "completed" ? null : new Date().toISOString(),
        }),
      })
      if (res.ok) loadActions(action.clientId)
    } catch (e) {
      console.error("Complete action failed", e)
    } finally {
      setCompletingAction(null)
    }
  }

  const deleteAction = async (action: PipelineAction) => {
    try {
      const res = await fetch(`/api/pipeline-actions/${action.id}`, { method: "DELETE" })
      if (res.ok) loadActions(action.clientId)
    } catch (e) {
      console.error("Delete action failed", e)
    }
  }

  const openNew = () => {
    setForm(defaultClient)
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEdit = (client: Client) => {
    setForm({
      name: client.name, company: client.company, email: client.email,
      phone: client.phone || "", status: client.status, tier: client.tier || "growth",
      monthlyRetainer: client.monthlyRetainer?.toString() || "",
      setupFee: client.setupFee?.toString() || "",
      source: client.source || "cold-outreach", notes: client.notes || "",
    })
    setEditingId(client.id)
    setDialogOpen(true)
  }

  const saveClient = async () => {
    setSaving(true)
    try {
      const url = editingId ? `/api/clients/${editingId}` : "/api/clients"
      const method = editingId ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setDialogOpen(false)
        loadClients()
      }
    } catch (e) {
      console.error("Save failed", e)
    } finally {
      setSaving(false)
    }
  }

  const deleteClient = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" })
      if (res.ok) {
        setDeleteConfirm(null)
        loadClients()
      }
    } catch (e) {
      console.error("Delete failed", e)
    }
  }

  const stages = ["lead", "qualified", "proposal", "active", "onboarding", "done"]
  const statusLabels: Record<string, string> = { lead: "Lead", qualified: "Qualified", proposal: "Proposal", active: "Active", onboarding: "Onboarding", done: "Completed" }
  const statusIcons: Record<string, string> = { lead: "bg-blue-500", qualified: "bg-indigo-500", proposal: "bg-purple-500", active: "bg-emerald-500", onboarding: "bg-cyan-500", done: "bg-gray-500" }

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { draggableId, destination, source } = result
    if (!destination || destination.droppableId === source.droppableId) return

    const newStatus = destination.droppableId
    // Optimistic update
    setClients((prev) =>
      prev.map((c) => (c.id === draggableId ? { ...c, status: newStatus } : c))
    )
    try {
      await fetch(`/api/clients/${draggableId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch (e) {
      console.error("Drag update failed", e)
      // Revert
      setClients((prev) =>
        prev.map((c) =>
          c.id === draggableId ? { ...c, status: source.droppableId } : c
        )
      )
    }
  }, [])

  if (loading) {
    return <div className="space-y-4 animate-fade-in">
      <div className="shimmer h-8 w-48 rounded mb-2" /><div className="shimmer h-4 w-72 rounded mb-8" />
      <div className="grid grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="shimmer h-48 rounded" />)}</div>
    </div>
  }

  const sharedActionsProps = {
    actionsMap,
    expandedActions,
    actionsLoading,
    completingAction,
    onToggleActions: toggleActions,
    onOpenActionDialog: openActionDialog,
    onCompleteAction: completeAction,
    onDeleteAction: deleteAction,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline CRM</h1>
          <p className="text-muted-foreground mt-1">{clients.length} client{clients.length !== 1 ? "s" : ""} in your pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "kanban" ? "default" : "outline"} size="sm" onClick={() => setViewMode("kanban")}>Kanban</Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>List</Button>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Client</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
        {stages.map((stage) => {
          const count = clients.filter((c) => c.status === stage).length
          const rev = clients.filter((c) => c.status === stage).reduce((s, c) => s + (c.monthlyRetainer || 0), 0)
          return <Card key={stage} className="relative overflow-hidden">
            <div className={cn("absolute top-0 left-0 w-full h-1", statusIcons[stage])} />
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs text-muted-foreground capitalize">{statusLabels[stage]}</div>
              {rev > 0 && <div className="text-xs text-muted-foreground mt-1">{formatCurrency(rev)}/mo</div>}
            </CardContent>
          </Card>
        })}
      </div>

      {/* Pipeline Value */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Pipeline Value (Annual)</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(clients.reduce((s, c) => s + (c.monthlyRetainer || 0) * 12, 0))}</p>
          </div>
          <div className="p-3 rounded-full bg-primary/10"><DollarSign className="h-8 w-8 text-primary" /></div>
        </CardContent>
      </Card>

      {/* Kanban View */}
      {viewMode === "kanban" ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {stages.map((stage) => {
              const stageClients = clients.filter((c) => c.status === stage)
              return (
                <div key={stage} className="flex flex-col">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className={cn("w-2.5 h-2.5 rounded-full", statusIcons[stage])} />
                    <span className="text-sm font-medium capitalize">{statusLabels[stage]}</span>
                    <span className="text-xs text-muted-foreground">({stageClients.length})</span>
                  </div>
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "space-y-2 min-h-[120px] rounded-lg p-1 transition-colors",
                          snapshot.isDraggingOver && "bg-primary/5 ring-1 ring-primary/20"
                        )}
                      >
                        {stageClients.length === 0 && !snapshot.isDraggingOver ? (
                          <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                            No clients
                          </div>
                        ) : stageClients.map((client, index) => (
                          <Draggable key={client.id} draggableId={client.id} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(
                                  "group transition-all duration-200",
                                  snapshot.isDragging && "shadow-xl rotate-2 scale-105 z-50",
                                  snapshot.isDragging ? "bg-card" : "hover:shadow-md"
                                )}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0 cursor-grab active:cursor-grabbing"
                                      >
                                        <GripVertical className="h-3.5 w-3.5" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{client.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{client.company}</p>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 capitalize">{client.tier || "tbd"}</Badge>
                                  </div>
                                  {client.monthlyRetainer && <div className="flex items-center gap-1 text-sm font-semibold text-primary"><DollarSign className="h-3 w-3" />{formatCurrency(client.monthlyRetainer)}/mo</div>}
                                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground"><Mail className="h-3 w-3" /><span className="truncate">{client.email}</span></div>

                                  <ClientActions client={client} {...sharedActionsProps} />

                                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openEdit(client)}><Edit3 className="h-3 w-3 mr-1" /> Edit</Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => setDeleteConfirm(client.id)}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {clients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No clients yet.</p></div>
              ) : clients.map((client) => (
                <div key={client.id} className="group">
                  <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">{client.name.charAt(0)}</div>
                    <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div><p className="text-sm font-medium">{client.name}</p><p className="text-xs text-muted-foreground truncate">{client.company}</p></div>
                      <div className="hidden md:block"><p className="text-sm truncate">{client.email}</p></div>
                      <div className="hidden md:block">
                        <div className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize", getStatusColor(client.status))}>{client.status}</div>
                      </div>
                      <div className="text-right">
                        {client.monthlyRetainer && <p className="text-sm font-semibold">{formatCurrency(client.monthlyRetainer)}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(client)}><Edit3 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeleteConfirm(client.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {/* Actions in list view */}
                  <div className="px-4 pb-3">
                    <ClientActions client={client} {...sharedActionsProps} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Client" : "Add New Client"}</DialogTitle>
            <DialogDescription>Fill in the client details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Ltd" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@acme.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254..." />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => <SelectItem key={s} value={s} className="capitalize">{statusLabels[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier">Tier</Label>
                <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v })}>
                  <SelectTrigger><SelectValue placeholder="Tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="targeted-outreach">Targeted Outreach</SelectItem>
                    <SelectItem value="cold-outreach">Cold Outreach</SelectItem>
                    <SelectItem value="seo">SEO</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="retainer">Monthly Retainer ($)</Label>
                <Input id="retainer" type="number" value={form.monthlyRetainer} onChange={(e) => setForm({ ...form, monthlyRetainer: e.target.value })} placeholder="2500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setupFee">Setup Fee ($)</Label>
                <Input id="setupFee" type="number" value={form.setupFee} onChange={(e) => setForm({ ...form, setupFee: e.target.value })} placeholder="3000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={saveClient} disabled={saving || !form.name || !form.company || !form.email}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : editingId ? "Update Client" : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Action</DialogTitle>
            <DialogDescription>Log a new action for this client.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action-type">Action Type</Label>
              <Select value={actionForm.type} onValueChange={(v) => setActionForm({ ...actionForm, type: v })}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(actionTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-note">Note</Label>
              <Input id="action-note" value={actionForm.note} onChange={(e) => setActionForm({ ...actionForm, note: e.target.value })} placeholder="e.g. Discussed scope and pricing" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-due">Due Date</Label>
              <Input id="action-due" type="date" value={actionForm.dueDate} onChange={(e) => setActionForm({ ...actionForm, dueDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={createAction} disabled={actionSaving}>
              {actionSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</> : "Add Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteClient(deleteConfirm)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
