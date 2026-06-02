"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  Flag,
  Mail,
  Building2,
  Phone,
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react"

type Inquiry = {
  id: string
  companyName: string
  contactName: string
  email: string
  phone: string | null
  jobTitle: string | null
  commodityInterest: string | null
  monthlyVolume: string | null
  additionalRequests: string | null
  status: string
  notes: string | null
  createdAt: string
}

const statusColors: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600 border-blue-200",
  contacted: "bg-amber-500/10 text-amber-600 border-amber-200",
  qualified: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  converted: "bg-violet-500/10 text-violet-600 border-violet-200",
}

const statusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted / Client",
}

const commodityLabels: Record<string, string> = {
  coffee: "Coffee / 커피",
  tea: "Tea / 차",
  cocoa: "Cocoa / 코코아",
  cotton: "Cotton / 면화",
  minerals: "Minerals & Metals / 광물",
  seafood: "Seafood / 해산물",
  textiles: "Textiles / 섬유",
  oil: "Palm Oil / 팜유",
  other: "Other / 기타",
}

export default function KoreaInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedInquiries, setExpandedInquiries] = useState<Set<string>>(new Set())

  // Update status
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const res = await fetch("/api/korea/inquiries?limit=100")
      setInquiries(await res.json())
    } catch (e) {
      console.error("Load failed", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/korea/inquiries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) loadData()
    } catch (e) {
      console.error("Update failed", e)
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = inquiries.filter((inq) => {
    const matchesSearch = searchQuery === "" ||
      inq.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || inq.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const toggleExpand = (id: string) => {
    const next = new Set(expandedInquiries)
    next.has(id) ? next.delete(id) : next.add(id)
    setExpandedInquiries(next)
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="shimmer h-8 w-56 rounded mb-2" />
        <div className="shimmer h-4 w-72 rounded mb-8" />
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="shimmer h-16 rounded" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buyer Inquiries</h1>
          <p className="text-muted-foreground mt-1">
            Korean procurement inquiries — manage leads from /korea/buyers registration
          </p>
        </div>
        <Badge className="text-sm px-3 py-1 bg-rose-500/10 text-rose-500 border-rose-500/20">
          <Flag className="h-3.5 w-3.5 mr-1" />
          {inquiries.length} total · {inquiries.filter((i) => i.status === "new").length} new
        </Badge>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Mail className="h-5 w-5 text-blue-500" /></div>
            <div>
              <div className="text-2xl font-bold">{inquiries.length}</div>
              <div className="text-xs text-muted-foreground">Total inquiries</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="h-5 w-5 text-amber-500" /></div>
            <div>
              <div className="text-2xl font-bold">{inquiries.filter((i) => i.status === "new").length}</div>
              <div className="text-xs text-muted-foreground">New (unread)</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><Building2 className="h-5 w-5 text-emerald-500" /></div>
            <div>
              <div className="text-2xl font-bold">{inquiries.filter((i) => i.status === "qualified").length}</div>
              <div className="text-xs text-muted-foreground">Qualified leads</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10"><CheckCircle2 className="h-5 w-5 text-violet-500" /></div>
            <div>
              <div className="text-2xl font-bold">{inquiries.filter((i) => i.status === "converted").length}</div>
              <div className="text-xs text-muted-foreground">Converted</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company, contact, or email..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inquiries list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Mail className="h-12 w-12 mb-3 opacity-50" />
            <p>No inquiries yet. Inquiries from the /korea/buyers registration form will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((inq) => (
            <Card key={inq.id}>
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpand(inq.id)}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 font-bold text-sm shrink-0">
                  {inq.companyName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{inq.companyName}</p>
                    {inq.status === "new" && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{inq.contactName} · {inq.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={cn("text-[10px]", statusColors[inq.status] || "bg-muted text-muted-foreground")}>
                    {statusLabels[inq.status] || inq.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{new Date(inq.createdAt).toLocaleDateString()}</span>
                  {expandedInquiries.has(inq.id) ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {expandedInquiries.has(inq.id) && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-muted/30 rounded-lg p-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Job Title</p>
                      <p className="text-xs">{inq.jobTitle || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Phone</p>
                      <p className="text-xs">{inq.phone || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Commodity Interest</p>
                      <p className="text-xs">{commodityLabels[inq.commodityInterest || ""] || inq.commodityInterest || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Monthly Volume</p>
                      <p className="text-xs">{inq.monthlyVolume || "—"}</p>
                    </div>
                  </div>

                  {inq.additionalRequests && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Additional Requests</p>
                      <p className="text-xs">{inq.additionalRequests}</p>
                    </div>
                  )}

                  {/* Status management */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <span className="text-[10px] text-muted-foreground uppercase shrink-0">Update status:</span>
                    {["new", "contacted", "qualified", "converted"].map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={inq.status === status ? "default" : "outline"}
                        className={cn(
                          "h-7 text-[10px]",
                          inq.status === status && status === "new" && "bg-blue-500",
                          inq.status === status && status === "contacted" && "bg-amber-500",
                          inq.status === status && status === "qualified" && "bg-emerald-500",
                          inq.status === status && status === "converted" && "bg-violet-500",
                        )}
                        onClick={(e) => { e.stopPropagation(); updateStatus(inq.id, status) }}
                        disabled={updatingId === inq.id || inq.status === status}
                      >
                        {updatingId === inq.id ? <Loader2 className="h-3 w-3 animate-spin" /> : statusLabels[status]}
                      </Button>
                    ))}
                    <a href={`mailto:${inq.email}`} className="ml-auto">
                      <Button size="sm" variant="outline" className="h-7 text-[10px]">
                        <Mail className="h-3 w-3 mr-1" /> Reply
                      </Button>
                    </a>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
