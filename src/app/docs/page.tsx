"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  FileText,
  BookOpen,
  FileSpreadsheet,
  Code,
  Megaphone,
  Palette,
  Download,
  Eye,
  ExternalLink,
  Search,
} from "lucide-react"

type Document = {
  id: string
  filename: string
  title: string
  description: string | null
  category: string
  pages: number | null
}

const categoryIcons: Record<string, React.ReactNode> = {
  plan: <BookOpen className="h-5 w-5" />,
  pitch: <Megaphone className="h-5 w-5" />,
  technical: <Code className="h-5 w-5" />,
  financial: <FileSpreadsheet className="h-5 w-5" />,
  marketing: <Palette className="h-5 w-5" />,
}

const categoryColors: Record<string, string> = {
  plan: "bg-blue-500/10 text-blue-600 border-blue-200",
  pitch: "bg-amber-500/10 text-amber-600 border-amber-200",
  technical: "bg-purple-500/10 text-purple-600 border-purple-200",
  financial: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  marketing: "bg-pink-500/10 text-pink-600 border-pink-200",
}

export default function DocsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((d) => {
        setDocuments(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const categories = Array.from(new Set(documents.map((d) => d.category)))

  const filtered = documents.filter((d) => {
    if (categoryFilter !== "all" && d.category !== categoryFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return d.title.toLowerCase().includes(q) || (d.description?.toLowerCase().includes(q) || false)
    }
    return true
  })

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="shimmer h-8 w-48 rounded mb-2" />
        <div className="shimmer h-4 w-72 rounded mb-8" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => <div key={i} className="shimmer h-32 rounded" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents Hub</h1>
          <p className="text-muted-foreground mt-1">
            All 11 strategy documents for your AI business
          </p>
        </div>
        <Badge variant="info" className="text-sm px-3 py-1">
          <FileText className="h-3.5 w-3.5 mr-1" />
          {documents.length} documents
        </Badge>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={categoryFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setCategoryFilter("all")}>All</Button>
          {categories.map((cat) => (
            <Button key={cat} variant={categoryFilter === cat ? "default" : "outline"} size="sm" onClick={() => setCategoryFilter(cat)} className="capitalize">
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((doc) => (
          <Card key={doc.id} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  "p-2.5 rounded-lg",
                  categoryColors[doc.category]?.split(" ")[0] || "bg-muted"
                )}>
                  {categoryIcons[doc.category] || <FileText className="h-5 w-5" />}
                </div>
                <Badge variant="outline" className={cn("capitalize", categoryColors[doc.category])}>
                  {doc.category}
                </Badge>
              </div>
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{doc.title}</h3>
              {doc.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{doc.description}</p>
              )}
              <div className="flex items-center justify-between mt-auto pt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  {doc.pages ? `~${doc.pages} pages` : "Document"}
                </span>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="h-4 w-4 mr-1" /> View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-1">No documents found</p>
          <p className="text-sm">Try adjusting your search or filter</p>
        </div>
      )}
    </div>
  )
}
