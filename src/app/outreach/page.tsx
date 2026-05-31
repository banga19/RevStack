"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn, formatDate, getStatusColor } from "@/lib/utils"
import {
  Send,
  MessageSquare,
  Mail,
  Linkedin,
  Target,
  TrendingUp,
  BarChart3,
  Play,
  Pause,
  RefreshCw,
  ArrowUpRight,
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
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export default function OutreachPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [channelFilter, setChannelFilter] = useState<string>("all")

  useEffect(() => {
    fetch("/api/outreach")
      .then((r) => r.json())
      .then((d) => {
        setCampaigns(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = channelFilter === "all" ? campaigns : campaigns.filter((c) => c.channel === channelFilter)
  const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0)
  const totalReplies = campaigns.reduce((s, c) => s + c.replyCount, 0)
  const totalBooked = campaigns.reduce((s, c) => s + c.bookedCount, 0)
  const replyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : "0"
  const bookRate = totalSent > 0 ? ((totalBooked / totalSent) * 100).toFixed(1) : "0"

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
          <p className="text-muted-foreground mt-1">
            WhatsApp, email, and LinkedIn outreach tracking
          </p>
        </div>
        <Button>
          <Send className="h-4 w-4 mr-2" /> New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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
            <div className="p-2 rounded-lg bg-amber-500/10"><TrendingUp className="h-5 w-5 text-amber-500" /></div>
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
            { name: "Cold Outreach - Wholesale", channel: "email", type: "cold", content: "Hi {{name}},\n\nI noticed {{company}} is in the wholesale space. At Ultimo Trading, we automated their lead qualification and saw significant improvements. Would you be open to a 15-min chat about how this could work for you?" },
            { name: "WhatsApp Nurture Day 3", channel: "whatsapp", type: "warm", content: "Hi {{name}}, it's Alex from AI Business Automation. Just checking if you had a chance to review the case study I shared. Happy to answer any questions!" },
            { name: "Warm Follow-up - LinkedIn", channel: "linkedin", type: "warm", content: "Hi {{name}}, following up on our connection. We're helping B2B trading companies automate their lead follow-up and save 20+ hours/week." },
            { name: "Email Re-engagement", channel: "email", type: "re-engagement", content: "Hi {{name}},\n\nIt's been a few weeks. We've since onboarded 2 more trading companies. Thought I'd check in. Happy to share updated ROI data." },
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

      {/* Active Campaigns */}
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
                  <div key={campaign.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/30 transition-colors border">
                    <div className={cn(
                      "p-2 rounded-full",
                      campaign.channel === "whatsapp" ? "bg-emerald-500/10" : campaign.channel === "email" ? "bg-blue-500/10" : "bg-blue-700/10"
                    )}>
                      {channelIcons[campaign.channel] || <Send className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{campaign.type} Campaign</span>
                        <div className={cn("text-xs rounded-full px-2 py-0.5 border capitalize", getStatusColor(campaign.status))}>{campaign.status}</div>
                      </div>
                      {campaign.clientName && (
                        <p className="text-xs text-muted-foreground mt-0.5">Target: {campaign.clientName}</p>
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
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
