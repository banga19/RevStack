"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn, formatDate } from "@/lib/utils"
import { Plus, Send, Calendar, MessageSquare, Clock } from "lucide-react"

type Followup = {
  id: string
  leadId: string | null
  clientId: string | null
  channel: string
  messageBody: string
  status: string
  scheduledAt: string
  sentAt: string | null
  createdAt: string
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800",
  sent: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800",
  replied: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800",
  skipped: "bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-800",
}

export default function FollowupsPage() {
  const [followups, setFollowups] = useState<Followup[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ channel: "whatsapp", messageBody: "", scheduledAt: "", leadId: "", clientId: "" })

  const fetchFollowups = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/followups?${params}`)
      setFollowups(await res.json())
    } catch (e) {
      console.error("Failed to fetch", e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchFollowups() }, [fetchFollowups])

  const createFollowup = async () => {
    const res = await fetch("/api/followups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setDialogOpen(false)
      setForm({ channel: "whatsapp", messageBody: "", scheduledAt: "", leadId: "", clientId: "" })
      fetchFollowups()
    }
  }

  const sendNow = async (id: string) => {
    await fetch(`/api/followups/${id}/send`, { method: "POST" })
    fetchFollowups()
  }

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
          <h1 className="text-3xl font-bold tracking-tight">Follow-ups</h1>
          <p className="text-muted-foreground mt-1">Scheduled outreach messages</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Schedule Follow-up</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Schedule Follow-up</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Message body"
                value={form.messageBody}
                onChange={(e) => setForm({ ...form, messageBody: e.target.value })}
                rows={4}
              />
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Leave scheduled time empty to send immediately</p>
              <Button className="w-full" onClick={createFollowup} disabled={!form.messageBody}>
                Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap">
        {["all", "pending", "sent", "replied", "skipped"].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              statusFilter === tab
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {followups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No follow-ups scheduled</h3>
            <p className="text-sm text-muted-foreground mb-4">Schedule your first outreach message.</p>
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Schedule Follow-up</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {followups.map((f) => (
            <Card key={f.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={cn("text-xs", f.channel === "whatsapp" ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600")}>
                        {f.channel}
                      </Badge>
                      <Badge variant="outline" className={cn("text-xs", statusColors[f.status])}>
                        {f.status}
                      </Badge>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{f.messageBody}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(f.scheduledAt)}
                      </span>
                      {f.sentAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Sent {formatDate(f.sentAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  {f.status === "pending" && (
                    <Button size="sm" variant="outline" onClick={() => sendNow(f.id)}>
                      <Send className="h-3.5 w-3.5 mr-1" /> Send Now
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
