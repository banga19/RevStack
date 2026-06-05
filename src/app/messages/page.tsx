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
import { Plus, MessageSquare, Send, Mail } from "lucide-react"

type Message = {
  id: string
  channel: string
  to: string
  body: string
  status: string
  leadId: string | null
  clientId: string | null
  createdAt: string
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [channelFilter, setChannelFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ channel: "whatsapp", to: "", body: "" })

  const fetchMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (channelFilter !== "all") params.set("channel", channelFilter)
      const res = await fetch(`/api/messages?${params}`)
      setMessages(await res.json())
    } catch (e) {
      console.error("Failed to fetch", e)
    } finally {
      setLoading(false)
    }
  }, [channelFilter])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  const sendMessage = async () => {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setDialogOpen(false)
      setForm({ channel: "whatsapp", to: "", body: "" })
      fetchMessages()
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground mt-1">Cross-channel communication log</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Send className="h-4 w-4 mr-2" /> Compose Message</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Send Message</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="To (phone/email)" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
              <Textarea placeholder="Message body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} />
              <Button className="w-full" onClick={sendMessage} disabled={!form.to || !form.body}>
                <Send className="h-4 w-4 mr-2" /> Send
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Channel filter */}
      <div className="flex gap-1 flex-wrap">
        {["all", "whatsapp", "email"].map((tab) => (
          <button
            key={tab}
            onClick={() => setChannelFilter(tab)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize",
              channelFilter === tab
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {tab === "all" ? "All" : tab}
          </button>
        ))}
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No messages yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Send your first message.</p>
            <Button onClick={() => setDialogOpen(true)}><Send className="h-4 w-4 mr-2" /> Compose Message</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card key={msg.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg mt-0.5 shrink-0",
                    msg.channel === "whatsapp" ? "bg-emerald-500/10" : "bg-blue-500/10"
                  )}>
                    {msg.channel === "whatsapp" ? (
                      <MessageSquare className={cn("h-4 w-4", msg.channel === "whatsapp" ? "text-emerald-500" : "text-blue-500")} />
                    ) : (
                      <Mail className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        msg.channel === "whatsapp" ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600"
                      )}>
                        {msg.channel}
                      </Badge>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        msg.status === "sent" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      )}>
                        {msg.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">To: {msg.to}</p>
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
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
