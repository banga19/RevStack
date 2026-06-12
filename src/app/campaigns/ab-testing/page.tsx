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
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { FlaskConical, Plus, Loader2, XCircle, CheckCircle2, Trophy, BarChart3, MessageSquare, Mail, Activity, Play, Square, Sparkles, Users, Target } from "lucide-react"

type AbVariant = { id: string; name: string; subject?: string; messageBody: string; channel: string; targetPercentage: number }
type AbTest = { id: string; name: string; description: string | null; campaignId: string | null; status: string; variants: AbVariant[]; winnerVariantId: string | null; createdAt: string }
type AbTestStats = { id: string; name: string; status: string; sentCount: number; replyCount: number; openedCount: number; steps: { id: string; messageBody: string; channel: string; stepNumber: number; status: string; openedCount: number; replyCount: number }[] }

export default function AbTestingPage() {
  const [experiments, setExperiments] = useState<AbTest[]>([])
  const [experimentStats, setExperimentStats] = useState<AbTestStats[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", channel: "whatsapp", variants: [{ name: "Variant A", channel: "whatsapp", subject: "", messageBody: "" }, { name: "Variant B", channel: "whatsapp", subject: "", messageBody: "" }], targetCount: 50 })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [expRes, statsRes] = await Promise.all([fetch("/api/campaigns/ab-test"), fetch("/api/campaigns")])
      if (expRes.ok) { const d = await expRes.json(); setExperiments(Array.isArray(d) ? d : []) }
      if (statsRes.ok) { const d = await statsRes.json(); setExperimentStats(Array.isArray(d) ? d : []) }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleAction = async (id: string, action: string) => {
    try { const res = await fetch("/api/campaigns/ab-test", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) }); if (res.ok) loadData() } catch (e) { console.error(e) }
  }

  const createExperiment = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/campaigns/ab-test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      if (res.ok) { setDialogOpen(false); loadData() }
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  const computeWinner = (exp: AbTest) => {
    const stats = experimentStats.find((s) => s.id === exp.id)
    if (!stats || stats.steps.length === 0) return null
    let bestIdx = 0, bestScore = -1
    stats.steps.forEach((s, i) => { const score = (s.replyCount || 0) * 3 + (s.openedCount || 0); if (score > bestScore) { bestScore = score; bestIdx = i } })
    return { index: bestIdx, name: `Variant ${String.fromCharCode(65 + bestIdx)}`, score: bestScore, variant: exp.variants[bestIdx] }
  }

  if (loading) return <div className="space-y-4 animate-fade-in"><div className="shimmer h-8 w-56 rounded mb-2" /><div className="shimmer h-4 w-72 rounded mb-8" /><div className="grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, i) => <div key={i} className="shimmer h-24 rounded" />)}</div></div>

  const runningExps = experiments.filter((e) => e.status === "running").length
  const completedExps = experiments.filter((e) => e.status === "completed").length
  const draftExps = experiments.filter((e) => e.status === "draft").length
  const totalVariants = experiments.reduce((s, e) => s + e.variants.length, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3"><FlaskConical className="h-7 w-7 text-primary" /> A/B Testing — Campaign Optimizer</h1>
          <p className="text-muted-foreground mt-1">Create experiments with message variants, track performance, and let the data pick the winner</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Experiment</Button>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{experiments.length}</div><div className="text-xs text-muted-foreground">Experiments</div></CardContent></Card>
        <Card className="border-blue-500/20"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-blue-500">{draftExps}</div><div className="text-xs text-muted-foreground">Drafts</div></CardContent></Card>
        <Card className="border-emerald-500/20"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-emerald-500">{runningExps}</div><div className="text-xs text-muted-foreground">Running</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{completedExps}</div><div className="text-xs text-muted-foreground">Completed</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{totalVariants}</div><div className="text-xs text-muted-foreground">Variants</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Experiments</CardTitle><CardDescription>Create A/B tests to find the highest-converting message variants</CardDescription></CardHeader>
        <CardContent>
          {experiments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No experiments yet.</p>
              <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Create Experiment</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {experiments.map((exp) => {
                const winner = computeWinner(exp)
                const stats = experimentStats.find((s) => s.id === exp.id)
                const winnerExists = exp.status === "completed" && winner
                return (
                  <div key={exp.id} className="p-4 rounded-lg border hover:bg-muted/30 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FlaskConical className={cn("h-5 w-5", exp.status === "running" ? "text-emerald-500 animate-pulse" : exp.status === "completed" ? "text-primary" : "text-muted-foreground")} />
                        <span className="font-medium">{exp.name}</span>
                        <Badge variant="outline" className={cn("text-[10px] capitalize", exp.status === "running" && "bg-emerald-500/10 text-emerald-600", exp.status === "completed" && "bg-primary/10 text-primary")}>{exp.status}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {exp.status === "draft" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAction(exp.id, "start")}><Play className="h-3 w-3 mr-1" /> Start</Button>}
                        {exp.status === "running" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAction(exp.id, "complete")}><Square className="h-3 w-3 mr-1" /> Complete</Button>}
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {exp.variants.map((v, i) => {
                        const stepStats = stats?.steps[i]
                        const isWinner = winnerExists && winner!.index === i
                        const replyCount = stepStats?.replyCount || 0
                        const openCount = stepStats?.openedCount || 0
                        const engagementScore = replyCount * 3 + openCount
                        const maxScore = winner ? winner.score : 1
                        const barWidth = maxScore > 0 ? (engagementScore / maxScore) * 100 : 0
                        return (
                          <div key={i} className={cn("p-3 rounded-lg border relative", isWinner ? "border-emerald-500/40 bg-emerald-500/5" : "bg-card/50", exp.status === "running" && "border-dashed")}>
                            {isWinner && <div className="absolute -top-2 -right-2"><Badge className="bg-emerald-500 text-white text-[9px] px-1.5"><Trophy className="h-3 w-3 mr-0.5" /> Winner</Badge></div>}
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{String.fromCharCode(65 + i)}</div>
                                <span className="text-xs font-medium">{v.name}</span>
                                <Badge variant="outline" className="text-[9px] capitalize">{v.channel === "whatsapp" ? <MessageSquare className="h-2.5 w-2.5 mr-0.5" /> : <Mail className="h-2.5 w-2.5 mr-0.5" />}{v.channel}</Badge>
                              </div>
                              <span className="text-[10px] text-muted-foreground">{v.targetPercentage}%</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{v.messageBody}</p>
                            {stats && (<div className="space-y-1"><div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>Engagement Score</span><span className="font-medium">{engagementScore}</span></div><Progress value={barWidth} className={cn("h-1.5", isWinner && "[&>div]:bg-emerald-500")} /><div className="flex gap-3 text-[10px] text-muted-foreground"><span>{openCount} opened</span><span>{replyCount} replies</span></div></div>)}
                          </div>
                        )
                      })}
                    </div>
                    {exp.status === "running" && stats && <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Activity className="h-3 w-3 text-emerald-500" /><span>Collecting data — {stats.sentCount} sent</span></div>}
                    {winnerExists && (
                      <div className="mt-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                        <Trophy className="h-5 w-5 text-emerald-500 shrink-0" />
                        <div><p className="text-xs font-medium text-emerald-600">Winner: {winner!.name}</p><p className="text-[10px] text-muted-foreground">Engagement score: {winner!.score} — {winner!.variant.channel} variant</p></div>
                        <Button size="sm" variant="outline" className="h-7 text-xs ml-auto shrink-0"><Sparkles className="h-3 w-3 mr-1" /> Deploy Winner</Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New A/B Test Experiment</DialogTitle><DialogDescription>Create message variants to test which performs best.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Experiment Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Welcome Message Tone Test" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Primary Channel</Label><Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="email">Email</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Target Audience Size</Label><Input type="number" value={form.targetCount} onChange={(e) => setForm({ ...form, targetCount: Number(e.target.value) })} placeholder="50" /></div>
            </div>
            {form.variants.map((v, i) => (
              <div key={i} className="p-4 rounded-lg border bg-card/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{String.fromCharCode(65 + i)}</div><span className="text-sm font-medium">{v.name}</span></div>
                  <Select value={v.channel} onValueChange={(val) => { const nv = [...form.variants]; nv[i] = { ...nv[i], channel: val }; setForm({ ...form, variants: nv }) }}>
                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="email">Email</SelectItem></SelectContent>
                  </Select>
                </div>
                {v.channel === "email" && <Input value={v.subject || ""} onChange={(e) => { const nv = [...form.variants]; nv[i] = { ...nv[i], subject: e.target.value }; setForm({ ...form, variants: nv }) }} placeholder="Email subject" className="text-xs" />}
                <Textarea value={v.messageBody} onChange={(e) => { const nv = [...form.variants]; nv[i] = { ...nv[i], messageBody: e.target.value }; setForm({ ...form, variants: nv }) }} placeholder={`${v.name} message...`} className="min-h-[80px] text-sm" />
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => { const nl = String.fromCharCode(65 + form.variants.length); setForm({ ...form, variants: [...form.variants, { name: `Variant ${nl}`, channel: form.channel, subject: "", messageBody: "" }] }) }} disabled={form.variants.length >= 4}><Plus className="h-4 w-4 mr-2" /> Add Variant</Button>
            <p className="text-[10px] text-muted-foreground">Max 4 variants. Each gets equal audience share.</p>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={createExperiment} disabled={saving || !form.name || form.variants.length < 2 || form.variants.some((v) => !v.messageBody)}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : "Create Experiment"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
