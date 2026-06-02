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
import { cn, getStatusColor } from "@/lib/utils"
import {
  Send,
  MessageSquare,
  Mail,
  Linkedin,
  Target,
  TrendingUp,
  Plus,
  Loader2,
  Trash2,
  CheckCircle2,
  UserPlus,
} from "lucide-react"

type Campaign = {
  id: string
  clientId: string | null
  clientName: string | null
  channel: string
  type: string
  status: string
  templateId: string | null
  sentCount: number
  replyCount: number
  bookedCount: number
  convertedToClientName: string | null
  convertedAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export default function OutreachPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [channelFilter, setChannelFilter] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [campaignForm, setCampaignForm] = useState({
    clientName: "",
    channel: "email",
    type: "cold",
    status: "draft",
  })
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [convertingCampaignId, setConvertingCampaignId] = useState<string | null>(null)
  const [convertClientName, setConvertClientName] = useState("")
  const [converting, setConverting] = useState(false)

  const loadData = () => {
    fetch("/api/outreach")
      .then((r) => r.json())
      .then((d) => { setCampaigns(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const createCampaign = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignForm),
      })
      if (res.ok) {
        setDialogOpen(false)
        setCampaignForm({ clientName: "", channel: "email", type: "cold", status: "draft" })
        loadData()
      }
    } catch (e) {
      console.error("Create campaign failed", e)
    } finally {
      setSaving(false)
    }
  }

  const deleteCampaign = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/outreach/${id}`, { method: "DELETE" })
      if (res.ok) loadData()
    } catch (e) {
      console.error("Delete campaign failed", e)
    } finally {
      setDeletingId(null)
    }
  }

  const openConvertDialog = (campaign: Campaign) => {
    setConvertingCampaignId(campaign.id)
    setConvertClientName(campaign.clientName || "")
    setConvertDialogOpen(true)
  }

  const markConverted = async () => {
    if (!convertingCampaignId) return
    setConverting(true)
    try {
      const res = await fetch(`/api/outreach/${convertingCampaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markConverted: true, convertedToClientName: convertClientName }),
      })
      if (res.ok) {
        setConvertDialogOpen(false)
        loadData()
      }
    } catch (e) {
      console.error("Convert failed", e)
    } finally {
      setConverting(false)
    }
  }

  const filtered = channelFilter === "all" ? campaigns : campaigns.filter((c) => c.channel === channelFilter)
  const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0)
  const totalReplies = campaigns.reduce((s, c) => s + c.replyCount, 0)
  const totalBooked = campaigns.reduce((s, c) => s + c.bookedCount, 0)
  const totalConverted = campaigns.filter((c) => c.convertedAt).length
  const replyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : "0"
  const bookRate = totalSent > 0 ? ((totalBooked / totalSent) * 100).toFixed(1) : "0"
  const convertRate = totalReplies > 0 ? ((totalConverted / totalReplies) * 100).toFixed(1) : "0"

  const channelIcons: Record<string, React.ReactNode> = {
    whatsapp: <MessageSquare className="h-4 w-4" />,
    email: <Mail className="h-4 w-4" />,
    linkedin: <Linkedin className="h-4 w-4" />,
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Outreach Campaigns</h1>
          <p className="text-muted-foreground mt-1">WhatsApp, email, and LinkedIn outreach tracking</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Send className="h-5 w-5 text-blue-500" /></div>
            <div>
              <div className="text-2xl font-bold">{totalSent}</div>
              <div className="text-xs text-muted-foreground">Messages Sent</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><MessageSquare className="h-5 w-5 text-emerald-500" /></div>
            <div>
              <div className="text-2xl font-bold">{totalReplies}</div>
              <div className="text-xs text-muted-foreground">Replies ({replyRate}%)</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Target className="h-5 w-5 text-primary" /></div>
            <div>
              <div className="text-2xl font-bold">{totalBooked}</div>
              <div className="text-xs text-muted-foreground">Booked ({bookRate}%)</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10"><TrendingUp className="h-5 w-5 text-violet-500" /></div>
            <div>
              <div className="text-2xl font-bold">{totalConverted}</div>
              <div className="text-xs text-muted-foreground">Converted ({convertRate}%)</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Send className="h-5 w-5 text-amber-500" /></div>
            <div>
              <div className="text-2xl font-bold">{campaigns.length}</div>
              <div className="text-xs text-muted-foreground">Campaigns</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Message Templates</CardTitle>
          <CardDescription>Ready-to-use templates for outreach</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            { name: "WhatsApp Lead Capture Flow", channel: "whatsapp", type: "warm", content: "Hi {{name}}, welcome! We saw you're interested in trading products. We can help qualify leads and manage follow-ups automatically via WhatsApp — just like we do at ultimotradingltd.co.ke." },
            { name: "Cold Outreach - Wholesale Sourcing", channel: "email", type: "cold", content: "Hi {{name}},\n\nI noticed {{company}} is in the wholesale space. Access bulk product sourcing via sokogate.com, and automate lead qualification & follow-up via email & WhatsApp — proven at ultimotradingltd.co.ke." },
            { name: "Warm Follow-up - LinkedIn", channel: "linkedin", type: "warm", content: "Hi {{name}}, following up on our connection. We help B2B trading companies source products via sokogate.com and automate lead follow-up via WhatsApp & email (ultimotradingltd.co.ke reference)." },
            { name: "WhatsApp Nurture - Lead Qual", channel: "whatsapp", type: "warm", content: "Hi {{name}}, it's Alex from AI Business Automation. Have you explored sokogate.com for bulk sourcing? We also handle lead qualification & follow-up via WhatsApp — reference: ultimotradingltd.co.ke." },
            // Korean corridor outreach templates
            { name: "🇰🇷 Korea Procurement - Cold Email", channel: "email", type: "cold", content: "Subject: Supply Chain Diversification: Pre-vetted African Suppliers\n\nDear {{name}},\n\nAs Korean manufacturers seek to diversify supply chains beyond China, Sokogate connects you with 100+ pre-vetted African exporters — fully compliant with HACCP, Halal, and Korean import standards.\n\nWe automate the compliance tracking, qualification, and onboarding process end-to-end. Would you be open to a 20-min briefing on African sourcing opportunities?\n\nBest,\n{{sender}}" },
            { name: "🇰🇷 Korea Procurement - Warm Follow-up", channel: "email", type: "warm", content: "Subject: Following up: African commodity sourcing for {{company}}\n\nHi {{name}},\n\nFollowing up on my previous message about Korea-Africa supply chain opportunities. We now have 20 pre-vetted African exporters ready for Korean buyers — covering coffee, tea, minerals, textiles, and processed goods.\n\nAll suppliers carry Export Readiness Scores (ERS) and compliance certifications tracked in real-time. Happy to share a curated list matching {{company}}'s procurement categories.\n\nWarmly,\n{{sender}}" },
            { name: "🇰🇷 Korea - LinkedIn Procurement Connect", channel: "linkedin", type: "cold", content: "Hi {{name}}, I'm reaching out because {{company}}'s supply chain needs align with what we're building at Sokogate — a corridor connecting Korean procurement teams with pre-vetted African suppliers. We handle compliance tracking (HACCP, Korean FDA), ERS scoring, and automated supplier matching. Open to connecting?" },
            { name: "🇰🇷 Korea - WhatsApp Pilot Invite", channel: "whatsapp", type: "warm", content: "Hi {{name}}, Alex from Sokogate here. We're launching our Korea-Africa pilot program — 20 African exporters with 3-month free access to our platform. Pre-vetted suppliers in coffee, tea, minerals, and manufactured goods. Would you like an intro to exporters matching {{company}}'s needs?" },
            { name: "🇰🇷 Korea - Pilot Conversion Sequence", channel: "email", type: "warm", content: "Subject: Your Sokogate Korea Pilot — Next Steps\n\nHi {{name}},\n\nYour 3-month Sokogate platform trial is off to a great start. You've been matched with {{count}} pre-vetted African suppliers in your procurement categories.\n\nTo unlock full access — including real-time compliance tracking, ERS dashboards, and trade finance applications — upgrade to our full Korea Corridor plan.\n\nLet's schedule a quick call to walk through the next steps?\n\nBest,\n{{sender}}" },
            // Pilot participant WhatsApp sequences
            { name: "📱 Pilot Onboarding - WhatsApp Welcome", channel: "whatsapp", type: "warm", content: "Hi {{name}}, welcome to the Sokogate Korea Corridor Pilot! 🎉 You now have 3 months of free access to our platform — connect with pre-vetted Korean buyers, track your certifications, and manage your export readiness score. Let's get started! Your account manager will reach out within 24 hours." },
            { name: "📱 Pilot Check-in - Month 1", channel: "whatsapp", type: "warm", content: "Hi {{name}}, it's been a month since you joined the Sokogate pilot! 🇰🇷 How's it going? We've matched your products with {{count}} potential Korean buyers. Want us to schedule an intro call? Reply 'YES' and we'll set it up." },
            { name: "📱 Pilot Check-in - Month 2", channel: "whatsapp", type: "warm", content: "Hi {{name}} — quick update on your Sokogate pilot! Your ERS score is {{ers}}/100. Here's how to improve it before we approach Korean buyers:\n\n1️⃣ Get that {{cert}} certification in progress\n2️⃣ Update your product catalog with current pricing\n3️⃣ Share your export volume data\n\nNeed help with any of these? Just reply!" },
            { name: "📱 Trial Extension Offer", channel: "whatsapp", type: "warm", content: "Hi {{name}}! Your 3-month Sokogate pilot is ending in {{days}} days. We'd love to keep you on the platform. 🙌 \n\n🌟 Upgrade to paid and get:\n→ Unlimited Korean buyer introductions\n→ Real-time compliance tracking\n→ Trade finance applications\n→ Priority support\n\nReply 'UPGRADE' for a special pilot-to-paid discount! 🎉" },
            { name: "📱 Pilot Conversion - Paid Welcome", channel: "whatsapp", type: "warm", content: "🎉 Welcome to Sokogate Paid — you're now a full Korea Corridor partner! {{name}}\n\nHere's what's unlocked:\n✅ Unlimited Korean buyer introductions\n✅ Real-time compliance & ERS dashboard\n✅ Trade finance (LC, Escrow, AfDB)\n✅ Dedicated account manager\n\nLet's schedule your onboarding call. Reply 'CALL' and we'll find a time this week!" },
            { name: "📱 Re-engagement - Churned Pilot", channel: "whatsapp", type: "re-engagement", content: "Hi {{name}}, it's been a while! We've onboarded {{count}} new Korean buyers looking for products like yours. 🇰🇷\n\nWe'd love to have you back on Sokogate. Reply 'INTERESTED' and we'll extend a special 30-day free trial — no commitment needed.\n\nYour account and ERS profile are still saved!" },
          ].map((template, i) => (
            <Card key={i} className="border-dashed">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="capitalize">{template.channel}</Badge>
                  <Badge variant="outline" className="capitalize">{template.type}</Badge>
                </div>
                <p className="text-sm font-medium mb-1">{template.name}</p>
                <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3">{template.content}</p>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>Your outreach campaigns across channels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button variant={channelFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setChannelFilter("all")}>All</Button>
            <Button variant={channelFilter === "whatsapp" ? "default" : "outline"} size="sm" onClick={() => setChannelFilter("whatsapp")}>
              <MessageSquare className="h-3.5 w-3.5 mr-1" /> WhatsApp
            </Button>
            <Button variant={channelFilter === "email" ? "default" : "outline"} size="sm" onClick={() => setChannelFilter("email")}>
              <Mail className="h-3.5 w-3.5 mr-1" /> Email
            </Button>
            <Button variant={channelFilter === "linkedin" ? "default" : "outline"} size="sm" onClick={() => setChannelFilter("linkedin")}>
              <Linkedin className="h-3.5 w-3.5 mr-1" /> LinkedIn
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Send className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No campaigns yet. Create your first outreach campaign.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((campaign) => {
                const convRate = campaign.sentCount > 0 ? ((campaign.replyCount / campaign.sentCount) * 100).toFixed(0) : "0"
                return (
                  <div key={campaign.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/30 transition-colors border group">
                    <div className={cn(
                      "p-2 rounded-full shrink-0",
                      campaign.channel === "whatsapp" ? "bg-emerald-500/10" : campaign.channel === "email" ? "bg-blue-500/10" : "bg-blue-700/10"
                    )}>
                      {channelIcons[campaign.channel] || <Send className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{campaign.type} Campaign</span>
                        <div className={cn("text-xs rounded-full px-2 py-0.5 border capitalize", getStatusColor(campaign.status))}>{campaign.status}</div>
                        {campaign.convertedAt && (
                          <span className="text-xs rounded-full px-2 py-0.5 border bg-emerald-500/10 text-emerald-600 border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Converted
                          </span>
                        )}
                      </div>
                      {campaign.clientName && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Target: {campaign.clientName}
                          {campaign.convertedToClientName && !campaign.convertedAt && (
                            <> → <span className="text-emerald-500">{campaign.convertedToClientName}</span></>
                          )}
                        </p>
                      )}
                      {campaign.convertedAt && campaign.convertedToClientName && (
                        <p className="text-xs text-emerald-500 mt-0.5">
                          Converted to: {campaign.convertedToClientName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-medium">{campaign.sentCount}</div>
                        <div className="text-xs text-muted-foreground">Sent</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{campaign.replyCount}</div>
                        <div className="text-xs text-muted-foreground">Replies</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{campaign.bookedCount}</div>
                        <div className="text-xs text-muted-foreground">Booked</div>
                      </div>
                      <div className={cn("px-2 py-1 rounded text-xs font-medium", Number(convRate) > 10 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
                        {convRate}%
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {!campaign.convertedAt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                          onClick={() => openConvertDialog(campaign)}
                          title="Mark as converted to client"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => deleteCampaign(campaign.id)}
                        disabled={deletingId === campaign.id}
                      >
                        {deletingId === campaign.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Converted</DialogTitle>
            <DialogDescription>This outreach lead has converted to a client. Confirm the client name.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="convert-name">Client Name</Label>
              <Input
                id="convert-name"
                value={convertClientName}
                onChange={(e) => setConvertClientName(e.target.value)}
                placeholder="Company name"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={markConverted} disabled={converting || !convertClientName}>
              {converting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Mark Converted</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Campaign Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
            <DialogDescription>Create a new outreach campaign across any channel.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="camp-client">Target Client</Label>
              <Input id="camp-client" value={campaignForm.clientName} onChange={(e) => setCampaignForm({ ...campaignForm, clientName: e.target.value })} placeholder="Company name or prospect" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="camp-channel">Channel</Label>
                <Select value={campaignForm.channel} onValueChange={(v) => setCampaignForm({ ...campaignForm, channel: v })}>
                  <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="camp-type">Type</Label>
                <Select value={campaignForm.type} onValueChange={(v) => setCampaignForm({ ...campaignForm, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">Cold Outreach</SelectItem>
                    <SelectItem value="warm">Warm Follow-up</SelectItem>
                    <SelectItem value="re-engagement">Re-engagement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="camp-status">Status</Label>
              <Select value={campaignForm.status} onValueChange={(v) => setCampaignForm({ ...campaignForm, status: v })}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={createCampaign} disabled={saving || !campaignForm.clientName}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
