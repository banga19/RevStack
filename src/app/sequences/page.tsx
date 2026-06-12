"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn, getStatusColor, formatDate } from "@/lib/utils"
import {
  Send,
  Mail,
  MessageSquare,
  Phone,
  Linkedin,
  Plus,
  Loader2,
  Trash2,
  Play,
  Pause,
  Copy,
  Users,
  GripVertical,
  Clock,
  GitBranch,
  XCircle,
  Pencil,
  Settings2,
  Upload,
  Search,
  Activity,
  Building2,
  MailOpen,
  PhoneCall,
} from "lucide-react"

type SequenceStep = {
  id?: string
  stepNumber: number
  channel: string
  type: string
  subject?: string | null
  messageBody?: string | null
  callScript?: string | null
  delayHours: number
  condition?: any
  status: string
}

type Sequence = {
  id: string
  organizationId: string
  name: string
  description: string | null
  status: string
  triggerType: string
  metrics: any
  createdAt: string
  updatedAt: string
  steps: SequenceStep[]
}

type Prospect = {
  id: string
  organizationId: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  linkedin: string | null
  company: string | null
  title: string | null
  industry: string | null
  source: string | null
  enrichment: any
  createdAt: string
  updatedAt: string
  _count?: { activities: number; sequences: number }
}

type ProspectActivity = {
  id: string
  prospectId: string
  type: string
  channel: string
  details: any
  createdAt: string
}

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  linkedin: <Linkedin className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
}

const channelColors: Record<string, string> = {
  email: "bg-blue-500/10 text-blue-600 border-blue-200",
  whatsapp: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  sms: "bg-violet-500/10 text-violet-600 border-violet-200",
  linkedin: "bg-sky-500/10 text-sky-600 border-sky-200",
  call: "bg-amber-500/10 text-amber-600 border-amber-200",
}

const emptySequence: Sequence = {
  id: "",
  organizationId: "",
  name: "",
  description: null,
  status: "draft",
  triggerType: "manual",
  metrics: null,
  createdAt: "",
  updatedAt: "",
  steps: [
    {
      stepNumber: 1,
      channel: "email",
      type: "send_message",
      subject: "",
      messageBody: "",
      callScript: null,
      delayHours: 0,
      condition: null,
      status: "pending",
    },
  ],
}

const emptyProspect: Prospect = {
  id: "",
  organizationId: "",
  firstName: null,
  lastName: null,
  email: null,
  phone: null,
  whatsapp: null,
  linkedin: null,
  company: null,
  title: null,
  industry: null,
  source: null,
  enrichment: null,
  createdAt: "",
  updatedAt: "",
}

export default function SequencesPage() {
  const [activeTab, setActiveTab] = useState<"sequences" | "prospects">("sequences")
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [activities, setActivities] = useState<ProspectActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [seqDialogOpen, setSeqDialogOpen] = useState(false)
  const [prospectDialogOpen, setProspectDialogOpen] = useState(false)
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  const [seqForm, setSeqForm] = useState<Sequence>(emptySequence)
  const [prospectForm, setProspectForm] = useState<Prospect>(emptyProspect)

  const loadSequences = useCallback(() => {
    setLoading(true)
    fetch("/api/sequences")
      .then((r) => r.json())
      .then((d) => { setSequences(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const loadProspects = useCallback(() => {
    setLoading(true)
    fetch("/api/prospects")
      .then((r) => r.json())
      .then((d) => {
        setProspects(Array.isArray(d.prospects) ? d.prospects : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeTab === "sequences") loadSequences()
    else loadProspects()
  }, [activeTab, loadSequences, loadProspects])

  const openCreateSequence = () => {
    setSeqForm({ ...emptySequence, steps: [{ ...emptySequence.steps[0] }] })
    setSeqDialogOpen(true)
  }

  const openEditSequence = (seq: Sequence) => {
    setSeqForm({
      ...seq,
      steps: seq.steps && seq.steps.length > 0 ? seq.steps : [{ ...emptySequence.steps[0] }],
    })
    setSeqDialogOpen(true)
  }

  const saveSequence = async () => {
    if (!seqForm.name.trim()) return
    setSaving(true)
    try {
      const body = {
        name: seqForm.name,
        description: seqForm.description,
        triggerType: seqForm.triggerType,
        status: seqForm.status,
        steps: seqForm.steps.map((s, i) => ({
          stepNumber: s.stepNumber ?? i + 1,
          channel: s.channel,
          type: s.type,
          subject: s.subject,
          messageBody: s.messageBody,
          callScript: s.callScript,
          delayHours: s.delayHours,
        })),
      }
      const res = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSeqDialogOpen(false)
        loadSequences()
      }
    } catch (e) {
      console.error("Save sequence failed", e)
    } finally {
      setSaving(false)
    }
  }

  const updateSequenceStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/sequences/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) loadSequences()
    } catch (e) {
      console.error("Update status failed", e)
    }
  }

  const deleteSequence = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/sequences/${id}`, { method: "DELETE" })
      if (res.ok) loadSequences()
    } catch (e) {
      console.error("Delete failed", e)
    } finally {
      setDeletingId(null)
    }
  }

  const openCreateProspect = () => {
    setProspectForm(emptyProspect)
    setProspectDialogOpen(true)
  }

  const openProspectActivity = async (prospect: Prospect) => {
    setSelectedProspect(prospect)
    setActivityDialogOpen(true)
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/activity`)
      if (res.ok) {
        const d = await res.json()
        setActivities(d.activities || [])
      }
    } catch (e) {
      console.error("Load activities failed", e)
    }
  }

  const saveProspect = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prospectForm),
      })
      if (res.ok) {
        setProspectDialogOpen(false)
        setProspectForm(emptyProspect)
        loadProspects()
      }
    } catch (e) {
      console.error("Save prospect failed", e)
    } finally {
      setSaving(false)
    }
  }

  const deleteProspect = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/prospects/${id}`, { method: "DELETE" })
      if (res.ok) loadProspects()
    } catch (e) {
      console.error("Delete failed", e)
    } finally {
      setDeletingId(null)
    }
  }

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/prospects/import", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      setImportResult(data)
      if (data.imported > 0) loadProspects()
    } catch (e) {
      console.error("Import failed", e)
    } finally {
      setImporting(false)
      e.target.value = ""
    }
  }

  const addStep = () => {
    setSeqForm({
      ...seqForm,
      steps: [
        ...seqForm.steps,
        {
          stepNumber: seqForm.steps.length + 1,
          channel: "email",
          type: "send_message",
          subject: "",
          messageBody: "",
          callScript: null,
          delayHours: 0,
          condition: null,
          status: "pending",
        },
      ],
    })
  }

  const removeStep = (index: number) => {
    if (seqForm.steps.length <= 1) return
    setSeqForm({
      ...seqForm,
      steps: seqForm.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepNumber: i + 1 })),
    })
  }

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...seqForm.steps]
    ;(newSteps[index] as any)[field] = value
    setSeqForm({ ...seqForm, steps: newSteps })
  }

  const filteredSequences = statusFilter === "all" ? sequences : sequences.filter((s) => s.status === statusFilter)
  const totalSteps = sequences.reduce((sum, s) => sum + (s._count?.steps || s.steps?.length || 0), 0)
  const activeSeqCount = sequences.filter((s) => s.status === "active").length

  const renderSequences = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <div className="shimmer h-8 w-48 rounded mb-2" />
          <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="shimmer h-24 rounded" />)}</div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Send className="h-5 w-5 text-blue-500" /></div>
              <div>
                <div className="text-2xl font-bold">{sequences.length}</div>
                <div className="text-xs text-muted-foreground">Sequences</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><Play className="h-5 w-5 text-emerald-500" /></div>
              <div>
                <div className="text-2xl font-bold">{activeSeqCount}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><GitBranch className="h-5 w-5 text-primary" /></div>
              <div>
                <div className="text-2xl font-bold">{totalSteps}</div>
                <div className="text-xs text-muted-foreground">Total Steps</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10"><Users className="h-5 w-5 text-violet-500" /></div>
              <div>
                <div className="text-2xl font-bold">{prospects.length}</div>
                <div className="text-xs text-muted-foreground">Prospects</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters + Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {["all", "active", "paused", "draft", "archived"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className="capitalize"
              >
                {status}
              </Button>
            ))}
          </div>
          <Button onClick={openCreateSequence}><Plus className="h-4 w-4 mr-2" /> New Sequence</Button>
        </div>

        {/* List */}
        {filteredSequences.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Send className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No sequences yet. Create your first multi-channel outreach workflow.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSequences.map((seq) => (
              <Card key={seq.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 mt-1"><Send className="h-5 w-5 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{seq.name}</h3>
                        <Badge variant="outline" className={cn("text-[10px] capitalize", getStatusColor(seq.status))}>{seq.status}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{seq.triggerType}</Badge>
                      </div>
                      {seq.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{seq.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{seq._count?.steps || seq.steps?.length || 0} steps</span>
                        <span>Updated {formatDate(seq.updatedAt)}</span>
                      </div>
                      {seq.steps && seq.steps.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {seq.steps.slice(0, 5).map((step, i) => (
                            <div key={i} className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border", channelColors[step.channel] || "bg-muted")}>
                              {channelIcons[step.channel] || <Send className="h-3 w-3" />}
                              <span className="capitalize">{step.channel}</span>
                              {step.delayHours > 0 && <span className="text-muted-foreground ml-1">+{step.delayHours}h</span>}
                            </div>
                          ))}
                          {seq.steps.length > 5 && <div className="px-2 py-0.5 rounded text-[10px] bg-muted">+{seq.steps.length - 5} more</div>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {seq.status === "draft" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500" onClick={() => updateSequenceStatus(seq.id, "active")} title="Activate"><Play className="h-3.5 w-3.5" /></Button>
                      )}
                      {seq.status === "active" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-500" onClick={() => updateSequenceStatus(seq.id, "paused")} title="Pause"><Pause className="h-3.5 w-3.5" /></Button>
                      )}
                      {(seq.status === "paused" || seq.status === "draft") && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500" onClick={() => updateSequenceStatus(seq.id, "active")} title="Activate"><Play className="h-3.5 w-3.5" /></Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSeqForm({ ...seq, steps: seq.steps && seq.steps.length ? seq.steps : [{ ...emptySequence.steps[0] }] }); setSeqDialogOpen(true) }} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteSequence(seq.id)} disabled={deletingId === seq.id} title="Delete">
                        {deletingId === seq.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
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

  const renderProspects = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <div className="shimmer h-8 w-48 rounded mb-2" />
          <div className="grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, i) => <div key={i} className="shimmer h-24 rounded" />)}</div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-5 w-5 text-blue-500" /></div>
              <div>
                <div className="text-2xl font-bold">{prospects.length}</div>
                <div className="text-xs text-muted-foreground">Total Prospects</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><Activity className="h-5 w-5 text-emerald-500" /></div>
              <div>
                <div className="text-2xl font-bold">{prospects.filter((p) => (p._count?.activities || 0) > 0).length}</div>
                <div className="text-xs text-muted-foreground">With Activity</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10"><GitBranch className="h-5 w-5 text-violet-500" /></div>
              <div>
                <div className="text-2xl font-bold">{prospects.filter((p) => (p._count?.sequences || 0) > 0).length}</div>
                <div className="text-xs text-muted-foreground">In Sequences</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search prospects..." className="pl-8 h-9 w-64 text-sm" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => document.getElementById("csv-upload")?.click()} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Import CSV
            </Button>
            <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
            <Button size="sm" onClick={openCreateProspect}><Plus className="h-4 w-4 mr-2" /> Add Prospect</Button>
          </div>
        </div>

        {/* Import result */}
        {importResult && (
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium text-emerald-600">Imported {importResult.imported} prospects</span>
                {importResult.failed > 0 && <span className="text-red-500 ml-2">({importResult.failed} failed)</span>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setImportResult(null)}>Dismiss</Button>
            </CardContent>
          </Card>
        )}

        {/* Prospects grid */}
        <div className="space-y-3">
          {prospects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No prospects yet. Add your first prospect or import a CSV.</p>
              </CardContent>
            </Card>
          ) : (
            prospects.map((p) => (
              <Card key={p.id} className="group hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 mt-0.5"><Users className="h-5 w-5 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{p.firstName} {p.lastName}</span>
                        {p.title && <span className="text-xs text-muted-foreground">— {p.title}</span>}
                      </div>
                      {p.company && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Building2 className="h-3 w-3" />{p.company}</p>}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {p.email && <span className="flex items-center gap-1"><MailOpen className="h-3 w-3" />{p.email}</span>}
                        {p.phone && <span className="flex items-center gap-1"><PhoneCall className="h-3 w-3" />{p.phone}</span>}
                        <Badge variant="outline" className="text-[10px] capitalize">{p.source || "manual"}</Badge>
                        <span className="flex items-center gap-1"><Activity className="h-3 w-3" />{(p._count?.activities || 0)} events</span>
                        {(p._count?.sequences || 0) > 0 && <Badge variant="outline" className="text-[10px]">{p._count?.sequences} seq</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openProspectActivity(p)} title="Activity log">
                        <Activity className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setProspectForm(p); setProspectDialogOpen(true) }} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteProspect(p.id)} disabled={deletingId === p.id} title="Delete">
                        {deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Engage</h1>
          <p className="text-muted-foreground mt-1">Sequences, prospects, and multi-channel outreach</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="sequences" className="gap-2"><Send className="h-4 w-4" /> Sequences</TabsTrigger>
          <TabsTrigger value="prospects" className="gap-2"><Users className="h-4 w-4" /> Prospects</TabsTrigger>
        </TabsList>
        <TabsContent value="sequences" className="mt-4">{renderSequences()}</TabsContent>
        <TabsContent value="prospects" className="mt-4">{renderProspects()}</TabsContent>
      </Tabs>

      {/* Sequence Create/Edit Dialog */}
      <Dialog open={seqDialogOpen} onOpenChange={setSeqDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{seqForm.id ? "Edit Sequence" : "New Sequence"}</DialogTitle>
            <DialogDescription>Build a multi-step, multi-channel outreach workflow.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="seq-name">Name *</Label>
                <Input id="seq-name" value={seqForm.name} onChange={(e) => setSeqForm({ ...seqForm, name: e.target.value })} placeholder="Sequence name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seq-trigger">Trigger</Label>
                <Select value={seqForm.triggerType} onValueChange={(v) => setSeqForm({ ...seqForm, triggerType: v })}>
                  <SelectTrigger id="seq-trigger"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="lead-added">When lead added</SelectItem>
                    <SelectItem value="event-based">Event-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seq-desc">Description</Label>
              <Textarea id="seq-desc" value={seqForm.description || ""} onChange={(e) => setSeqForm({ ...seqForm, description: e.target.value })} placeholder="What is this sequence for?" rows={2} />
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}><Plus className="h-3.5 w-3.5 mr-1" /> Add Step</Button>
              </div>
              {seqForm.steps.map((step, index) => (
                <Card key={index} className="border-dashed">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono text-muted-foreground">Step {step.stepNumber}</span>
                      <Badge variant="outline" className={cn("text-[10px] capitalize", channelColors[step.channel])}>
                        {channelIcons[step.channel]} {step.channel}
                      </Badge>
                      {seqForm.steps.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 ml-auto text-red-500" onClick={() => removeStep(index)}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Channel</Label>
                        <Select value={step.channel} onValueChange={(v) => updateStep(index, "channel", v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="linkedin">LinkedIn</SelectItem>
                            <SelectItem value="call">Call</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Type</Label>
                        <Select value={step.type} onValueChange={(v) => updateStep(index, "type", v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="send_message">Send Message</SelectItem>
                            <SelectItem value="make_call">Make Call</SelectItem>
                            <SelectItem value="wait">Wait</SelectItem>
                            <SelectItem value="condition">Branch</SelectItem>
                            <SelectItem value="voicemail">Voicemail</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Delay (hours)</Label>
                        <Input type="number" min={0} value={step.delayHours} onChange={(e) => updateStep(index, "delayHours", parseInt(e.target.value) || 0)} className="h-8 text-xs" />
                      </div>
                    </div>
                    {(step.channel === "email" || step.channel === "whatsapp" || step.channel === "sms" || step.channel === "linkedin") && (
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Message Body</Label>
                        <Textarea value={step.messageBody || ""} onChange={(e) => updateStep(index, "messageBody", e.target.value)} placeholder="Use {{firstName}}, {{company}}, {{sender}}..." rows={3} className="text-xs" />
                      </div>
                    )}
                    {step.channel === "email" && (
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Subject Line</Label>
                        <Input value={step.subject || ""} onChange={(e) => updateStep(index, "subject", e.target.value)} placeholder="Email subject" className="text-xs" />
                      </div>
                    )}
                    {step.channel === "call" && (
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Call Script / Talking Points</Label>
                        <Textarea value={step.callScript || ""} onChange={(e) => updateStep(index, "callScript", e.target.value)} placeholder="Key talking points..." rows={3} className="text-xs" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={saveSequence} disabled={saving || !seqForm.name.trim()}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save Sequence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prospect Create/Edit Dialog */}
      <Dialog open={prospectDialogOpen} onOpenChange={setProspectDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{prospectForm.id ? "Edit Prospect" : "Add Prospect"}</DialogTitle>
            <DialogDescription>Add a new prospect to your outreach database.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={prospectForm.firstName || ""} onChange={(e) => setProspectForm({ ...prospectForm, firstName: e.target.value })} placeholder="First name" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={prospectForm.lastName || ""} onChange={(e) => setProspectForm({ ...prospectForm, lastName: e.target.value })} placeholder="Last name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={prospectForm.company || ""} onChange={(e) => setProspectForm({ ...prospectForm, company: e.target.value })} placeholder="Company name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={prospectForm.email || ""} onChange={(e) => setProspectForm({ ...prospectForm, email: e.target.value })} placeholder="email@company.com" type="email" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={prospectForm.phone || ""} onChange={(e) => setProspectForm({ ...prospectForm, phone: e.target.value })} placeholder="+1 555-0000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input value={prospectForm.whatsapp || ""} onChange={(e) => setProspectForm({ ...prospectForm, whatsapp: e.target.value })} placeholder="+1 555-0000" />
              </div>
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input value={prospectForm.linkedin || ""} onChange={(e) => setProspectForm({ ...prospectForm, linkedin: e.target.value })} placeholder="linkedin.com/in/..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title / Role</Label>
                <Input value={prospectForm.title || ""} onChange={(e) => setProspectForm({ ...prospectForm, title: e.target.value })} placeholder="Head of Procurement" />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input value={prospectForm.industry || ""} onChange={(e) => setProspectForm({ ...prospectForm, industry: e.target.value })} placeholder="Manufacturing" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={saveProspect} disabled={saving || (!prospectForm.firstName && !prospectForm.email && !prospectForm.company)}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save Prospect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prospect Activity Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity — {selectedProspect ? `${selectedProspect.firstName || ""} ${selectedProspect.lastName || ""}`.trim() || selectedProspect.company : "Prospect"}</DialogTitle>
            <DialogDescription>{selectedProspect?.email || selectedProspect?.phone || ""}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No activity recorded yet.</p>
            ) : (
              activities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/10">
                  <div className="p-1.5 rounded bg-primary/10"><Activity className="h-3.5 w-3.5 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium capitalize">{a.type.replace(/_/g, " ")}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{a.channel}</Badge>
                    </div>
                    {a.details && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{JSON.stringify(a.details)}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{formatDate(a.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
