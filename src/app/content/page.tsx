"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { cn, getStatusColor, formatDate } from "@/lib/utils"
import {
  Newspaper,
  FileText,
  Eye,
  TrendingUp,
  Target,
  CalendarDays,
  ArrowUpRight,
  Edit3,
  Search,
  BarChart3,
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

export default function ContentPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((d) => {
        setArticles(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

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
          <p className="text-muted-foreground mt-1">
            90-day SEO content engine for inbound B2B leads
          </p>
        </div>
        <Badge variant="info" className="text-sm px-3 py-1">
          <FileText className="h-3.5 w-3.5 mr-1" />
          {publishedCount} published
        </Badge>
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

      {/* Content Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Keywords & Focus</CardTitle>
          <CardDescription>15 focus keywords driving B2B trading companies to you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              "WhatsApp automation Kenya", "B2B lead generation Kenya", "WhatsApp Business API Kenya",
              "B2B automation ROI Kenya", "QMe client onboarding", "no-code CRM Kenya",
              "automated lead qualification", "B2B trading companies Kenya", "import export automation",
              "wholesale sourcing Kenya", "Sokogate automation", "lead follow-up automation",
              "small business automation Kenya", "WhatsApp chatbot Kenya", "Kenya B2B marketplace",
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
        <CardHeader>
          <CardTitle>Article Pipeline</CardTitle>
          <CardDescription>Track from idea → drafting → scheduled → published</CardDescription>
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
                <div key={article.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/30 transition-colors border">
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
                      <div className={cn("text-xs rounded-full px-2 py-0.5 border capitalize", getStatusColor(article.status))}>{article.status}</div>
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
