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
  Newspaper,
  FileText,
  Eye,
  TrendingUp,
  Target,
  CalendarDays,
  Search,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  ArrowUpDown,
} from "lucide-react"

type Article = {
  id: string
  title: string
  keyword: string | null
  description: string | null
  status: string
  publishDate: string | null
  wordCount: number | null
  url: string | null
  views: number
  leadsGenerated: number
  week: number | null
  month: number | null
}

const STATUS_CYCLE: Record<string, string> = {
  idea: "drafting",
  drafting: "scheduled",
  scheduled: "published",
  published: "idea",
}

const defaultForm = {
  title: "",
  keyword: "",
  description: "",
  status: "idea",
  week: "",
  month: "",
  wordCount: "",
}

export default function ContentPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadData = () => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((d) => { setArticles(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const openNew = () => {
    setForm(defaultForm)
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEdit = (article: Article) => {
    setForm({
      title: article.title,
      keyword: article.keyword || "",
      description: article.description || "",
      status: article.status,
      week: article.week?.toString() || "",
      month: article.month?.toString() || "",
      wordCount: article.wordCount?.toString() || "",
    })
    setEditingId(article.id)
    setDialogOpen(true)
  }

  const saveArticle = async () => {
    setSaving(true)
    try {
      const url = editingId ? `/api/content/${editingId}` : "/api/content"
      const method = editingId ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  const deleteArticle = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/content/${id}`, { method: "DELETE" })
      if (res.ok) loadData()
    } catch (e) {
      console.error("Delete failed", e)
    } finally {
      setDeletingId(null)
    }
  }

  const cycleStatus = async (article: Article) => {
    const nextStatus = STATUS_CYCLE[article.status] || "idea"
    setTogglingId(article.id)
    // Optimistic
    setArticles((prev) => prev.map((a) => a.id === article.id ? { ...a, status: nextStatus } : a))
    try {
      await fetch(`/api/content/${article.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
    } catch (e) {
      console.error("Status update failed", e)
      setArticles((prev) => prev.map((a) => a.id === article.id ? article : a))
    } finally {
      setTogglingId(null)
    }
  }

  const totalViews = articles.reduce((s, a) => s + a.views, 0)
  const totalLeads = articles.reduce((s, a) => s + a.leadsGenerated, 0)
  const publishedCount = articles.filter((a) => a.status === "published").length
  const leadConvRate = totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(2) : "0"

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="shimmer h-8 w-48 rounded mb-2" />
        <div className="shimmer h-4 w-64 rounded mb-8" />
        <div className="grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, i) => <div key={i} className="shimmer h-24 rounded" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-muted-foreground mt-1">90-day SEO content engine for inbound B2B leads</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info" className="text-sm px-3 py-1">
            <FileText className="h-3.5 w-3.5 mr-1" />
            {publishedCount} published
          </Badge>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Add Article
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Newspaper className="h-5 w-5 text-primary" /></div>
            <div>
              <div className="text-2xl font-bold">{articles.length}</div>
              <div className="text-xs text-muted-foreground">Total Articles</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Eye className="h-5 w-5 text-blue-500" /></div>
            <div>
              <div className="text-2xl font-bold">{totalViews}</div>
              <div className="text-xs text-muted-foreground">Total Views</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
            <div>
              <div className="text-2xl font-bold">{totalLeads}</div>
              <div className="text-xs text-muted-foreground">Leads Generated ({leadConvRate}%)</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Target className="h-5 w-5 text-amber-500" /></div>
            <div>
              <div className="text-2xl font-bold">{37 - articles.length}</div>
              <div className="text-xs text-muted-foreground">Remaining (of 37 target)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Keywords */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Keywords & Focus</CardTitle>
            <CardDescription>15 focus keywords driving B2B trading companies to you</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              "WhatsApp automation Kenya", "B2B lead generation Kenya", "WhatsApp Business API Kenya",
              "B2B automation ROI Kenya", "ultimotradingltd.co.ke", "lead qualification Kenya",
              "automated lead qualification", "sokogate.com", "bulk product sourcing Kenya",
              "wholesale sourcing Kenya", "product sourcing marketplace Kenya", "lead follow-up automation",
              "WhatsApp lead capture", "WhatsApp chatbot Kenya", "B2B trading companies Kenya",
            ].map((kw) => (
              <Badge key={kw} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">
                <Search className="h-3 w-3 mr-1" />
                {kw}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Articles List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Article Pipeline</CardTitle>
            <CardDescription>Track from idea → drafting → scheduled → published</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Add Article
          </Button>
        </CardHeader>
        <CardContent>
          {articles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No articles yet. Start creating content!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {articles.map((article) => (
                <div key={article.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/30 transition-colors border group">
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm shrink-0",
                    article.status === "published" ? "bg-emerald-500/10 text-emerald-500" :
                    article.status === "scheduled" ? "bg-blue-500/10 text-blue-500" :
                    article.status === "drafting" ? "bg-amber-500/10 text-amber-500" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {article.title.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{article.title}</span>
                      <button
                        onClick={() => cycleStatus(article)}
                        className={cn("text-xs rounded-full px-2 py-0.5 border capitalize inline-flex items-center gap-1", getStatusColor(article.status))}
                        title="Click to advance status (idea→drafting→scheduled→published)"
                      >
                        {togglingId === article.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ArrowUpDown className="h-2.5 w-2.5" />
                        )}
                        {article.status}
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {article.keyword && <span><Search className="h-3 w-3 inline mr-0.5" />{article.keyword}</span>}
                      {article.week && <span><CalendarDays className="h-3 w-3 inline mr-0.5" />Week {article.week}</span>}
                      {article.month && <span>Month {article.month}</span>}
                      {article.wordCount && <span>{article.wordCount} words</span>}
                    </div>
                  </div>
                  {article.status === "published" && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="text-center">
                        <div className="font-medium">{article.views}</div>
                        <div className="text-xs text-muted-foreground">Views</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-emerald-500">{article.leadsGenerated}</div>
                        <div className="text-xs text-muted-foreground">Leads</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(article)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => deleteArticle(article.id)}
                      disabled={deletingId === article.id}
                    >
                      {deletingId === article.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Article Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Article" : "Add New Article"}</DialogTitle>
            <DialogDescription>Add a new article to your content calendar.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="art-title">Title *</Label>
              <Input id="art-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="WhatsApp Automation for Kenyan SMEs" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="art-keyword">Target Keyword</Label>
                <Input id="art-keyword" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} placeholder="WhatsApp automation Kenya" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="art-status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="drafting">Drafting</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="art-desc">Description</Label>
              <Input id="art-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the article..." />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="art-week">Week</Label>
                <Input id="art-week" type="number" value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="art-month">Month</Label>
                <Input id="art-month" type="number" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="art-words">Word Count</Label>
                <Input id="art-words" type="number" value={form.wordCount} onChange={(e) => setForm({ ...form, wordCount: e.target.value })} placeholder="2000" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={saveArticle} disabled={saving || !form.title}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : editingId ? "Update Article" : "Add Article"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}