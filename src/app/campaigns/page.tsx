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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { cn, getStatusColor } from "@/lib/utils"
import {
  Send,
  MessageSquare,
  Mail,
  Plus,
  Loader2,
  Trash2,
  CheckCircle2,
  Clock,
  CalendarDays,
  ArrowUpDown,
  Copy,
  Play,
  Edit3,
  Sparkles,
  Target,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────

type CampaignStep = {
  id?: string
  stepNumber: number
  channel: string
  subject?: string
  messageBody: string
  delayDays: number
  status?: string
  sentAt?: string
  openedCount?: number
  replyCount?: number
}

type Campaign = {
  id: string
  clientName: string | null
  channel: string
  type: string
  status: string
  subject: string | null
  messageBody: string | null
  scheduleType: string | null
  targetCount: number | null
  templateId: string | null
  sentCount: number
  replyCount: number
  openedCount: number | null
  clickedCount: number | null
  bounceCount: number | null
  bookedCount: number
  convertedToClientName: string | null
  convertedAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  steps: CampaignStep[]
}

const defaultStep = (): CampaignStep => ({
  stepNumber: 1,
  channel: "whatsapp",
  subject: "",
  messageBody: "",
  delayDays: 0,
})

const emptyCampaign: {
  clientName: string
  channel: string
  type: string
  status: string
  subject: string
  messageBody: string
  scheduleType: string
  scheduledAt: string
  targetCount: number
  steps: CampaignStep[]
} = {
  clientName: "",
  channel: "whatsapp",
  type: "cold",
  status: "draft",
  subject: "",
  messageBody: "",
  scheduleType: "immediate",
  scheduledAt: "",
  targetCount: 0,
  steps: [defaultStep()],
}

// ── Template Snippets ──────────────────────────────────────────────────────

const QUICK_TEMPLATES = [
  {
    name: "Cold Intro",
    channel: "email",
    subject: "Introduction: {{company}} × Mapato Partnership",
    body: "Hi {{name}},\n\nI came across {{company}} and believe our B2B trade automation platform could help streamline your lead qualification and follow-up processes.\n\nWould you be open to a quick 15-min call this week?\n\nBest,\n{{sender}}",
  },
  {
    name: "Cold WhatsApp",
    channel: "whatsapp",
    body: "Hi {{name}}! 👋\n\nI help B2B trading companies automate lead qualification via WhatsApp. At ultimotradingltd.co.ke, we close 3x more deals using automated follow-ups.\n\nWould you like to see how it works?",
  },
  {
    name: "Warm Follow-up",
    channel: "email",
    subject: "Following up: {{company}}",
    body: "Hi {{name}},\n\nFollowing up on my previous message. We've just onboarded {{count}} new trading companies onto our platform this month.\n\nWould Tuesday or Thursday work for a quick chat?\n\nBest,\n{{sender}}",
  },
  {
    name: "Re-engagement",
    channel: "whatsapp",
    body: "Hi {{name}}! 👋\n\nIt's been a while! We've launched new features — including AI-powered lead scoring and Korea trade corridor matching.\n\nWould you like a quick demo? Reply YES and I'll send over a Calendly link! 🚀",
  },
  {
    name: "Korea Corridor Cold",
    channel: "email",
    subject: "Pre-vetted African Suppliers for Korean Procurement",
    body: "Dear {{name}},\n\nAs {{company}} looks to diversify supply chains, Sokogate connects you with 100+ pre-vetted African exporters — fully compliant with HACCP, Halal, and Korean import standards.\n\nWould you be open to a 20-min briefing?\n\nBest,\n{{sender}}",
  },
  {
    name: "Thank You / Follow-up",
    channel: "email",
    subject: "Thanks for your time, {{name}}",
    body: "Hi {{name}},\n\nThanks for taking the time to chat earlier. As discussed, here's a summary:\n\n- Lead qualification via WhatsApp & email\n- Automated follow-up sequences\n- Korea trade corridor matching\n\nLet me know if you'd like to start with a free trial.\n\nBest,\n{{sender}}",
  },
]

// ── Multi-Step Sequence Presets ────────────────────────────────────────────

const SEQUENCE_PRESETS = [
  {
    name: "Cold Outreach (3-Step)",
    description: "Day 0: WhatsApp intro → Day 1: Email value prop → Day 7: LinkedIn re-engagement",
    steps: [
      { channel: "whatsapp", delayDays: 0, subject: "", body: "Hi {{name}}! 👋 I help B2B trading companies automate lead qualification via WhatsApp. Would you be open to a quick chat?" },
      { channel: "email", delayDays: 1, subject: "B2B Trade Automation for {{company}}", body: "Hi {{name}},\n\nFollowing up on my WhatsApp message. We help companies like yours automate lead follow-up and close more deals.\n\nBest,\n{{sender}}" },
      { channel: "whatsapp", delayDays: 7, subject: "", body: "Hi {{name}}! 👋 Just checking in — did you get a chance to review the info I shared? We're offering a 14-day free trial if you'd like to give it a shot!" },
    ],
  },
  {
    name: "Warm Nurture (4-Step)",
    description: "Day 0: Welcome WhatsApp → Day 2: Email case study → Day 5: WhatsApp social proof → Day 10: Email offer",
    steps: [
      { channel: "whatsapp", delayDays: 0, subject: "", body: "Hi {{name}}! 🎉 Thanks for connecting! We help B2B traders automate their entire sales pipeline. Want a quick demo?" },
      { channel: "email", delayDays: 2, subject: "How {{ref}} closed 3x more deals", body: "Hi {{name}},\n\nSee how we helped {{ref}} automate their lead qualification and triple their conversion rate.\n\nBest,\n{{sender}}" },
      { channel: "whatsapp", delayDays: 5, subject: "", body: "Hi {{name}}! Quick update — we've just onboarded 20+ new trading companies this quarter. 🚀 Would you like to see how it works?" },
      { channel: "email", delayDays: 10, subject: "Special offer for {{company}}", body: "Hi {{name}},\n\nWe'd love to have {{company}} on board. Here's a special 14-day free trial — no credit card needed.\n\nBest,\n{{sender}}" },
    ],
  },
  {
    name: "Event Follow-up (2-Step)",
    description: "Day 0: WhatsApp thank you → Day 3: Email resources + next steps",
    steps: [
      { channel: "whatsapp", delayDays: 0, subject: "", body: "Hi {{name}}! Great meeting you at {{event}}! 🎉 Let's continue the conversation — what's the best way to reach you?" },
      { channel: "email", delayDays: 3, subject: "Great meeting you at {{event}}!", body: "Hi {{name}},\n\nIt was great connecting at {{event}}! Here are some resources I mentioned:\n\n- Case study: How we helped a B2B trader close 3x more deals\n- Free trial: 14 days, no credit card\n\nLet's schedule a call?\n\nBest,\n{{sender}}" },
    ],
  },
]

// ── Channel Icons ──────────────────────────────────────────────────────────

const channelIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
}

const channelColors: Record<string, string> = {
  whatsapp: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  email: "bg-blue-500/10 text-blue-600 border-blue-200",
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [editingCampaign, setEditingCampaign] = useState<boolean>(false)

  // Campaign form state
  const [form, setForm] = useState<typeof emptyCampaign>({ ...emptyCampaign })
  const [formSteps, setFormSteps] = useState<CampaignStep[]>([defaultStep()])
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [stepDialogOpen, setStepDialogOpen] = useState(false)
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("compose")
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [presetDialogOpen, setPresetDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)

  const loadData = () => {
    // Route through Hermes Central Brain — all page data flows via CommunicationLog
    fetch("/api/central-brain/revstack/data?page=campaigns")
      .then((r) => r.json())
      .then((d) => { setCampaigns(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  // ── Open new campaign dialog ─────────────────────────────────────────
  const openNew = () => {
    setForm({ ...emptyCampaign })
    setFormSteps([defaultStep()])
    setSelectedCampaign(null)
    setEditingCampaign(false)
    setActiveTab("compose")
    setDialogOpen(true)
  }

  // ── Open edit campaign dialog ────────────────────────────────────────
  const openEdit = (campaign: Campaign) => {
    setForm({
      clientName: campaign.clientName || "",
      channel: campaign.channel,
      type: campaign.type,
      status: campaign.status,
      subject: campaign.subject || "",
      messageBody: campaign.messageBody || "",
      scheduleType: campaign.scheduleType || "immediate",
      scheduledAt: campaign.startedAt || "",
      targetCount: campaign.targetCount || 0,
      steps: [],
    })
    setFormSteps(
      campaign.steps.length > 0
        ? campaign.steps.map((s) => ({
            stepNumber: s.stepNumber,
            channel: s.channel,
            subject: s.subject || "",
            messageBody: s.messageBody,
            delayDays: s.delayDays,
            status: s.status,
          }))
        : [{
            stepNumber: 1,
            channel: campaign.channel,
            subject: campaign.subject || "",
            messageBody: campaign.messageBody || "",
            delayDays: 0,
          }]
    )
    setSelectedCampaign(campaign)
    setEditingCampaign(true)
    setActiveTab("compose")
    setDialogOpen(true)
  }

  // ── Save campaign ────────────────────────────────────────────────────
  const saveCampaign = async () => {
    setSaving(true)
    try {
      const url = editingCampaign && selectedCampaign
        ? `/api/campaigns/${selectedCampaign.id}`
        : "/api/campaigns"
      const method = editingCampaign ? "PUT" : "POST"

      const body: Record<string, any> = {
        clientName: form.clientName,
        channel: form.channel,
        type: form.type,
        status: form.status,
        subject: form.subject,
        messageBody: form.messageBody,
        scheduleType: form.scheduleType,
        targetCount: form.targetCount,
        steps: formSteps.map((s) => ({
          channel: s.channel,
          subject: s.subject,
          messageBody: s.messageBody,
          delayDays: s.delayDays,
        })),
      }

      if (form.scheduleType === "scheduled" && form.scheduledAt) {
        body.scheduledAt = form.scheduledAt
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setDialogOpen(false)
        loadData()
      }
    } catch (e) {
      console.error("Save failed", e)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete campaign ──────────────────────────────────────────────────
  const deleteCampaign = async (id: string) => {
    try {
      await fetch(`/api/campaigns/${id}`, { method: "DELETE" })
      setDeleteConfirm(null)
      setSelectedCampaign(null)
      loadData()
    } catch (e) {
      console.error("Delete failed", e)
    }
  }

  // ── Duplicate campaign ───────────────────────────────────────────────
  const duplicateCampaign = async (campaign: Campaign) => {
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: campaign.clientName ? `${campaign.clientName} (Copy)` : "",
          channel: campaign.channel,
          type: campaign.type,
          status: "draft",
          subject: campaign.subject,
          messageBody: campaign.messageBody,
          scheduleType: "immediate",
          steps: campaign.steps.map((s) => ({
            channel: s.channel,
            subject: s.subject,
            messageBody: s.messageBody,
            delayDays: s.delayDays,
          })),
        }),
      })
      if (res.ok) loadData()
    } catch (e) {
      console.error("Duplicate failed", e)
    }
  }

  // ── Step management ──────────────────────────────────────────────────
  const addStep = () => {
    setFormSteps((prev) => [
      ...prev,
      {
        ...defaultStep(),
        stepNumber: prev.length + 1,
        delayDays: 1,
      },
    ])
  }

  const removeStep = (index: number) => {
    setFormSteps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, stepNumber: i + 1 }))
    )
  }

  const moveStep = (index: number, direction: "up" | "down") => {
    const newSteps = [...formSteps]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newSteps.length) return
    ;[newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]]
    setFormSteps(newSteps.map((s, i) => ({ ...s, stepNumber: i + 1 })))
  }

  const updateStep = (index: number, field: string, value: any) => {
    setFormSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  // ── Apply preset ─────────────────────────────────────────────────────
  const applyPreset = (preset: typeof SEQUENCE_PRESETS[0]) => {
    setFormSteps(
      preset.steps.map((s, i) => ({
        stepNumber: i + 1,
        channel: s.channel,
        subject: s.subject,
        messageBody: s.body,
        delayDays: s.delayDays,
      }))
    )
    setPresetDialogOpen(false)
  }

  // ── Apply template ───────────────────────────────────────────────────
  const applyTemplate = (tmpl: typeof QUICK_TEMPLATES[0]) => {
    if (formSteps.length === 1 && !formSteps[0].messageBody) {
      setForm({ ...form, channel: tmpl.channel, subject: tmpl.subject ?? "" })
      setFormSteps([{
        stepNumber: 1,
        channel: tmpl.channel,
        subject: tmpl.subject || "",
        messageBody: tmpl.body,
        delayDays: 0,
      }])
    } else {
      setFormSteps((prev) => [
        ...prev,
        {
          stepNumber: prev.length + 1,
          channel: tmpl.channel,
          subject: tmpl.subject || "",
          messageBody: tmpl.body,
          delayDays: 1,
        },
      ])
    }
    setTemplateDialogOpen(false)
  }

  // ── Stats ─────────────────────────────────────────────────────────────
  const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0)
  const totalReplies = campaigns.reduce((s, c) => s + c.replyCount, 0)
  const totalBooked = campaigns.reduce((s, c) => s + c.bookedCount, 0)
  const totalOpened = campaigns.reduce((s, c) => s + (c.openedCount || 0), 0)
  const activeCount = campaigns.filter((c) => c.status === "active").length
  const draftCount = campaigns.filter((c) => c.status === "draft").length
  const completedCount = campaigns.filter((c) => c.status === "completed").length

  const replyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : "0"
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0"
  const conversionRate = campaigns.length > 0
    ? ((campaigns.filter((c) => c.convertedAt).length / campaigns.length) * 100).toFixed(1)
    : "0"

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
          <h1 className="text-3xl font-bold tracking-tight">Campaign Builder</h1>
          <p className="text-muted-foreground mt-1">
            Compose, schedule, and track multi-channel outreach campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPresetDialogOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" /> Sequence Presets
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{draftCount}</div>
            <div className="text-xs text-muted-foreground">Drafts</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-500">{activeCount}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{completedCount}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{totalSent}</div>
            <div className="text-xs text-muted-foreground">Sent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <div className="text-xs text-muted-foreground">Conversion</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{totalSent}</span>
              <Badge variant="outline" className="text-xs">{replyRate}% reply rate</Badge>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span>{totalOpened} opened ({openRate}%)</span>
              <span>{totalReplies} replies</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{totalBooked}</span>
              <Badge variant="outline" className="text-xs">booked</Badge>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span>{campaigns.filter((c) => c.convertedAt).length} converted to clients</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {["whatsapp", "email", "linkedin"].map((ch) => {
                const count = campaigns.filter((c) => c.channel === ch).length
                return (
                  <div key={ch} className="flex items-center justify-between text-sm">
                    <span className="capitalize flex items-center gap-1.5">
                      {channelIcons[ch] || <Send className="h-3.5 w-3.5" />}
                      {ch}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List */}
      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
          <CardDescription>{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Send className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No campaigns yet. Create your first multi-channel outreach campaign.</p>
              <Button variant="outline" className="mt-4" onClick={openNew}>
                <Plus className="h-4 w-4 mr-2" /> Create Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((campaign) => {
                const hasSteps = campaign.steps.length > 1
                return (
                  <div
                    key={campaign.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer hover:bg-muted/30 group",
                      selectedCampaign?.id === campaign.id && "border-primary/30 bg-muted/20"
                    )}
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    <div className={cn(
                      "p-2 rounded-full shrink-0",
                      campaign.channel === "whatsapp" ? "bg-emerald-500/10" :
                      campaign.channel === "email" ? "bg-blue-500/10" :
                      "bg-blue-700/10"
                    )}>
                      {channelIcons[campaign.channel] || <Send className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{campaign.clientName || "Untitled Campaign"}</span>
                        <Badge variant="outline" className={cn("text-[10px] capitalize", getStatusColor(campaign.status))}>
                          {campaign.status}
                        </Badge>
                        {hasSteps && (
                          <Badge variant="outline" className="text-[10px] bg-primary/5">
                            {campaign.steps.length} steps
                          </Badge>
                        )}
                        {campaign.convertedAt && (
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-0.5" /> Converted
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="capitalize">{campaign.type}</span>
                        <span>·</span>
                        <span className="capitalize">{campaign.scheduleType || "immediate"}</span>
                        {campaign.sentCount > 0 && (
                          <>
                            <span>·</span>
                            <span>{campaign.sentCount} sent, {campaign.replyCount} replies</span>
                          </>
                        )}
                      </div>
                      {/* Show steps preview if multi-step */}
                      {hasSteps && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {campaign.steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded border",
                                channelColors[step.channel] || "bg-muted text-muted-foreground"
                              )}>
                                {step.channel === "whatsapp" ? "WA" : "EM"}
                              </span>
                              {step.delayDays > 0 && (
                                <span className="text-[10px] text-muted-foreground">+{step.delayDays}d</span>
                              )}
                              {i < campaign.steps.length - 1 && (
                                <ArrowUpDown className="h-3 w-3 text-muted-foreground/50 rotate-90" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      <div className="text-center">
                        <div className="font-medium">{campaign.sentCount}</div>
                        <div className="text-[10px]">Sent</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{campaign.replyCount}</div>
                        <div className="text-[10px]">Replies</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(campaign)}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateCampaign(campaign)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => setDeleteConfirm(campaign.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Campaign Detail / Tracking */}
      {selectedCampaign && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedCampaign.clientName || "Campaign"} — Tracking</CardTitle>
                <CardDescription>
                  {selectedCampaign.steps.length > 1
                    ? `${selectedCampaign.steps.length}-step ${selectedCampaign.type} campaign`
                    : `${selectedCampaign.type} ${selectedCampaign.channel} campaign`}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => openEdit(selectedCampaign)}>
                <Edit3 className="h-4 w-4 mr-2" /> Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Step Progress */}
            {selectedCampaign.steps.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Campaign Steps</span>
                </div>
                <div className="space-y-2">
                  {selectedCampaign.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        step.status === "sent" ? "bg-emerald-500/10 text-emerald-500" :
                        step.status === "scheduled" ? "bg-blue-500/10 text-blue-500" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {step.status === "sent" ? <CheckCircle2 className="h-4 w-4" /> : step.stepNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border font-medium",
                            channelColors[step.channel]
                          )}>
                            {step.channel === "whatsapp" ? "WhatsApp" : "Email"}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {step.subject || step.messageBody.substring(0, 50)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {step.delayDays > 0 && <span>Delay: {step.delayDays} day{step.delayDays !== 1 ? "s" : ""} · </span>}
                          Status: <span className="capitalize">{step.status}</span>
                          {step.sentAt && <span> · Sent: {new Date(step.sentAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {step.openedCount ? <span>{step.openedCount} opened</span> : null}
                        {step.replyCount ? <span>{step.replyCount} replies</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground">Sent</div>
                <div className="text-xl font-bold">{selectedCampaign.sentCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground">Opened</div>
                <div className="text-xl font-bold">{selectedCampaign.openedCount || 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground">Replies</div>
                <div className="text-xl font-bold">{selectedCampaign.replyCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground">Booked</div>
                <div className="text-xl font-bold">{selectedCampaign.bookedCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Create/Edit Campaign Dialog ──────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? "Edit Campaign" : "New Campaign"}</DialogTitle>
            <DialogDescription>
              Compose a multi-channel outreach campaign with scheduled message steps.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="compose">
                <Edit3 className="h-4 w-4 mr-2" /> Compose
              </TabsTrigger>
              <TabsTrigger value="steps">
                <Send className="h-4 w-4 mr-2" /> Steps ({formSteps.length})
              </TabsTrigger>
              <TabsTrigger value="schedule">
                <CalendarDays className="h-4 w-4 mr-2" /> Schedule
              </TabsTrigger>
            </TabsList>

            {/* Compose Tab */}
            <TabsContent value="compose" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="camp-name">Campaign Name / Target</Label>
                  <Input
                    id="camp-name"
                    value={form.clientName}
                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                    placeholder="e.g. Korea Corridor Batch 2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="camp-target">Target Count</Label>
                  <Input
                    id="camp-target"
                    type="number"
                    value={form.targetCount}
                    onChange={(e) => setForm({ ...form, targetCount: Number(e.target.value) })}
                    placeholder="Number of leads/clients"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="camp-channel">Primary Channel</Label>
                  <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="camp-type">Campaign Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cold">Cold Outreach</SelectItem>
                      <SelectItem value="warm">Warm Follow-up</SelectItem>
                      <SelectItem value="re-engagement">Re-engagement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick templates */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">Quick Templates</Label>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setTemplateDialogOpen(true)}>
                    <Sparkles className="h-3 w-3 mr-1" /> Browse All
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_TEMPLATES.slice(0, 4).map((tmpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyTemplate(tmpl)}
                      className="text-left p-2 rounded-lg border border-dashed hover:border-primary/30 hover:bg-muted/30 transition-all text-xs"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{tmpl.channel}</Badge>
                        <span className="font-medium truncate">{tmpl.name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        {tmpl.body.substring(0, 60)}...
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Steps Tab */}
            <TabsContent value="steps" className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Add message steps across WhatsApp, email, or LinkedIn. Each step can be scheduled with a delay.
                </p>
                <Button variant="outline" size="sm" onClick={() => setPresetDialogOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-2" /> Presets
                </Button>
              </div>

              {formSteps.map((step, index) => (
                <div key={index} className="p-4 rounded-lg border bg-card space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {step.stepNumber}
                      </div>
                      <span className="text-sm font-medium">Step {step.stepNumber}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === 0}
                        onClick={() => moveStep(index, "up")}
                      >
                        <ArrowUpDown className="h-3.5 w-3.5 rotate-90" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === formSteps.length - 1}
                        onClick={() => moveStep(index, "down")}
                      >
                        <ArrowUpDown className="h-3.5 w-3.5 -rotate-90" />
                      </Button>
                      {formSteps.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600"
                          onClick={() => removeStep(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Channel</Label>
                      <Select value={step.channel} onValueChange={(v) => updateStep(index, "channel", v)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {step.channel === "email" && (
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs">Subject</Label>
                        <Input
                          value={step.subject || ""}
                          onChange={(e) => updateStep(index, "subject", e.target.value)}
                          placeholder="Email subject line"
                          className="h-9 text-xs"
                        />
                      </div>
                    )}
                    {step.channel !== "email" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Delay (days)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={step.delayDays}
                          onChange={(e) => updateStep(index, "delayDays", Number(e.target.value))}
                          className="h-9 text-xs"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5" hidden={step.channel !== "email"}>
                      <Label className="text-xs">Delay (days)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={step.delayDays}
                        onChange={(e) => updateStep(index, "delayDays", Number(e.target.value))}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Message</Label>
                    <Textarea
                      value={step.messageBody}
                      onChange={(e) => updateStep(index, "messageBody", e.target.value)}
                      placeholder={`Write your ${step.channel} message...`}
                      className="min-h-[80px] text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Use {"{{name}}"}, {"{{company}}"}, {"{{sender}}"} as placeholders
                    </p>
                  </div>

                  {/* Connector line between steps */}
                  {index < formSteps.length - 1 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formSteps[index + 1].delayDays > 0
                          ? `Wait ${formSteps[index + 1].delayDays} day${formSteps[index + 1].delayDays !== 1 ? "s" : ""} then send Step ${index + 2}`
                          : "Send Step " + (index + 2) + " immediately after"}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              <Button variant="outline" className="w-full border-dashed" onClick={addStep}>
                <Plus className="h-4 w-4 mr-2" /> Add Step
              </Button>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Schedule Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, scheduleType: "immediate" })}
                      className={cn(
                        "p-4 rounded-lg border text-left transition-all",
                        form.scheduleType === "immediate"
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/50 hover:border-muted-foreground/30"
                      )}
                    >
                      <Play className="h-5 w-5 mb-2 text-emerald-500" />
                      <div className="text-sm font-medium">Send Immediately</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Start sending right after saving
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, scheduleType: "scheduled" })}
                      className={cn(
                        "p-4 rounded-lg border text-left transition-all",
                        form.scheduleType === "scheduled"
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/50 hover:border-muted-foreground/30"
                      )}
                    >
                      <CalendarDays className="h-5 w-5 mb-2 text-primary" />
                      <div className="text-sm font-medium">Schedule for Later</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Set a specific date & time
                      </div>
                    </button>
                  </div>
                </div>

                {form.scheduleType === "scheduled" && (
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-at">Schedule Date & Time</Label>
                    <Input
                      id="scheduled-at"
                      type="datetime-local"
                      value={form.scheduledAt}
                      onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="camp-status">Status after saving</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft — keep editing</SelectItem>
                      <SelectItem value="active">Active — start sending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Summary */}
                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <div className="text-sm font-medium">Campaign Summary</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Target: <span className="font-medium text-foreground">{form.clientName || "Not set"}</span></div>
                    <div>Targets: <span className="font-medium text-foreground">{form.targetCount}</span></div>
                    <div>Primary channel: <span className="font-medium text-foreground capitalize">{form.channel}</span></div>
                    <div>Type: <span className="font-medium text-foreground capitalize">{form.type}</span></div>
                    <div>Schedule: <span className="font-medium text-foreground capitalize">{form.scheduleType}</span></div>
                    <div>Steps: <span className="font-medium text-foreground">{formSteps.length}</span></div>
                    <div className="col-span-2">
                      Status: <span className="capitalize">{form.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={saveCampaign} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : editingCampaign ? "Update Campaign" : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Templates Dialog ──────────────────────────────────────────── */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Message Templates</DialogTitle>
            <DialogDescription>Quick-start templates for your campaign messages.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {QUICK_TEMPLATES.map((tmpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyTemplate(tmpl)}
                className="text-left p-4 rounded-lg border hover:border-primary/30 hover:bg-muted/30 transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="capitalize text-xs">{tmpl.channel}</Badge>
                  <span className="font-medium text-sm">{tmpl.name}</span>
                </div>
                {tmpl.subject && (
                  <p className="text-xs text-muted-foreground mb-1">Subject: {tmpl.subject}</p>
                )}
                <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">{tmpl.body}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Presets Dialog ────────────────────────────────────────────── */}
      <Dialog open={presetDialogOpen} onOpenChange={setPresetDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sequence Presets</DialogTitle>
            <DialogDescription>Pre-built multi-step sequences for common outreach scenarios.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {SEQUENCE_PRESETS.map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyPreset(preset)}
                className="text-left p-4 rounded-lg border hover:border-primary/30 hover:bg-muted/30 transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">{preset.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{preset.description}</p>
                <div className="flex items-center gap-2">
                  {preset.steps.map((step, j) => (
                    <div key={j} className="flex items-center gap-1">
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border font-medium",
                        channelColors[step.channel]
                      )}>
                        {step.channel === "whatsapp" ? "WA" : "EM"}
                      </span>
                      {step.delayDays > 0 && (
                        <span className="text-[10px] text-muted-foreground">+{step.delayDays}d</span>
                      )}
                      {j < preset.steps.length - 1 && (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground/50 rotate-90" />
                      )}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────────── */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteCampaign(deleteConfirm)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
