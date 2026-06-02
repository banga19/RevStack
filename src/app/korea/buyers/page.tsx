"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn, formatCurrency } from "@/lib/utils"
import {
  Globe,
  ShieldCheck,
  TrendingUp,
  Users,
  Target,
  Flag,
  Search,
  BarChart3,
  CheckCircle2,
  Ship,
  PackageSearch,
  Building2,
  Mail,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

type PilotParticipant = {
  id: string
  cohortId: string
  companyName: string
  contactName: string | null
  contactEmail: string | null
  country: string | null
  commodity: string | null
  trialStartedAt: string | null
  trialEndsAt: string | null
  status: string
  notes: string | null
  cohort?: { name: string; type: string }
}

const koreanBuyerInfo = {
  title: "한국 조달팀을 위한 아프리카 공급망",
  subtitle: "검증된 아프리카 수출업체와 연결되어 공급망을 다각화하세요",
  description: "Sokogate 플랫폼은 한국 기업의 조달 요구에 맞는 사전 검증된 아프리카 수출업체를 연결합니다. 모든 공급업체는 수출 준비 점수(ERS)와 규정 준수 인증을 완료했습니다.",
}

const suppliers = [
  { company: "Kenya Coffee Exporters Ltd", country: "Kenya", commodity: "Specialty Arabica coffee, Grade AA", ers: 78, certs: ["HACCP", "Organic"], volume: "2,000 kg/month", price: "$8.50/kg FOB Mombasa", match: 94 },
  { company: "Tanzania Tea Growers Co-op", country: "Tanzania", commodity: "Premium black tea, orthodox & CTC", ers: 72, certs: ["Halal"], volume: "5,000 kg/month", price: "$3.20/kg FOB", match: 88 },
  { company: "Ghana Cocoa Processing Co.", country: "Ghana", commodity: "Cocoa butter, cocoa powder, cocoa liquor", ers: 80, certs: ["UTZ", "Rainforest Alliance"], volume: "10,000 tons/year", price: "$4.50/kg FOB", match: 92 },
  { company: "Zambia Copper Export Corp", country: "Zambia", commodity: "Electrolytic copper cathode, Grade A", ers: 74, certs: ["ISO 9001"], volume: "1,000 tons/month", price: "LME + $50/ton", match: 85 },
  { company: "Uganda Cotton & Textiles Ltd", country: "Uganda", commodity: "Organic cotton fabric, finished garments", ers: 70, certs: ["GOTS", "Organic"], volume: "50,000 meters/month", price: "$4.50/meter FOB", match: 91 },
  { company: "South Africa Premium Wines", country: "South Africa", commodity: "Premium wines, brandy, fruit juices", ers: 85, certs: ["Organic", "Fair Trade"], volume: "500,000 liters/year", price: "$8.00/bottle FOB", match: 83 },
  { company: "Egyptian Cotton Exports", country: "Egypt", commodity: "Extra-long staple cotton, cotton yarn", ers: 76, certs: ["GOTS"], volume: "10,000 bales/year", price: "$1.80/lb FOB", match: 80 },
  { company: "Senegal Seafood Exporters", country: "Senegal", commodity: "Frozen fish, octopus, shrimp, tuna", ers: 73, certs: ["HACCP", "EU Certified"], volume: "2,000 tons/year", price: "$6.50/kg FOB", match: 77 },
]

export default function KoreaBuyersPage() {
  const [participants, setParticipants] = useState<PilotParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCommodity, setSelectedCommodity] = useState<string>("all")

  // Registration form state
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    jobTitle: "",
    commodityInterest: "",
    monthlyVolume: "",
    additionalRequests: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.companyName || !formData.contactName || !formData.email) return
    setSubmitting(true)
    setSubmitError("")
    try {
      const res = await fetch("/api/korea/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setSubmitted(true)
        setFormData({ companyName: "", contactName: "", email: "", phone: "", jobTitle: "", commodityInterest: "", monthlyVolume: "", additionalRequests: "" })
      } else {
        const err = await res.json()
        setSubmitError(err.error || "Submission failed")
      }
    } catch {
      setSubmitError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const loadData = async () => {
    try {
      const res = await fetch("/api/korea/participants")
      setParticipants(await res.json())
    } catch (e) {
      console.error("Load failed", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch = searchQuery === "" ||
      s.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.commodity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.country.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCommodity = selectedCommodity === "all" || s.commodity.toLowerCase().includes(selectedCommodity)
    return matchesSearch && matchesCommodity
  })

  const avgErs = Math.round(suppliers.reduce((s, su) => s + su.ers, 0) / suppliers.length)

  const commodityOptions = ["coffee", "tea", "cocoa", "cotton", "textiles", "minerals", "copper", "seafood", "wine"]

  const ersDistribution = [
    { range: "80-100", count: suppliers.filter((s) => s.ers >= 80).length, color: "hsl(var(--chart-1))" },
    { range: "70-79", count: suppliers.filter((s) => s.ers >= 70 && s.ers < 80).length, color: "hsl(var(--chart-2))" },
    { range: "60-69", count: suppliers.filter((s) => s.ers >= 60 && s.ers < 70).length, color: "hsl(var(--chart-3))" },
  ]

  if (loading) {
    return <div className="space-y-4 animate-fade-in p-8">
      <div className="shimmer h-10 w-96 rounded mb-2" />
      <div className="shimmer h-5 w-64 rounded mb-8" />
      <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="shimmer h-32 rounded" />)}</div>
    </div>
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero */}
      <div className="bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-blue-500/10 rounded-xl border border-rose-500/20 p-8 md:p-12">
        <div className="max-w-3xl">
          <Badge className="mb-4 bg-rose-500/10 text-rose-500 border-rose-500/20 px-3 py-1">
            <Flag className="h-3.5 w-3.5 mr-1" /> 한국-아프리카 무역 회랑 (Korea-Africa Trade Corridor)
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{koreanBuyerInfo.title}</h1>
          <p className="text-lg text-muted-foreground mb-2">{koreanBuyerInfo.subtitle}</p>
          <p className="text-sm text-muted-foreground mb-6">{koreanBuyerInfo.description}</p>
          <div className="flex flex-wrap gap-3">
            <a href="/korea">
              <Button size="lg" className="bg-rose-500 hover:bg-rose-600">
                <Search className="h-4 w-4 mr-2" /> 공급업체 검색 (Browse Suppliers)
              </Button>
            </a>
            <a href="mailto:korea@sokogate.com">
              <Button size="lg" variant="outline">
                <Mail className="h-4 w-4 mr-2" /> 영업팀에 문의 (Contact Sales)
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-rose-500/10"><Flag className="h-5 w-5 text-rose-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">사전 검증된 공급업체 (Pre-vetted Suppliers)</p>
              <p className="text-2xl font-bold">{suppliers.length}+</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-emerald-500/10"><ShieldCheck className="h-5 w-5 text-emerald-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">평균 ERS 점수 (Avg ERS Score)</p>
              <p className="text-2xl font-bold">{avgErs}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-amber-500/10"><Globe className="h-5 w-5 text-amber-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">커버 국가 (Countries Covered)</p>
              <p className="text-2xl font-bold">13</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-blue-500/10"><PackageSearch className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">상품 카테고리 (Commodity Categories)</p>
              <p className="text-2xl font-bold">{commodityOptions.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="공급업체, 상품, 국가 검색 (Search suppliers, commodities, countries)..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCommodity === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCommodity("all")}
              >All</Button>
              {commodityOptions.map((opt) => (
                <Button
                  key={opt}
                  variant={selectedCommodity === opt ? "default" : "outline"}
                  size="sm"
                  className="capitalize"
                  onClick={() => setSelectedCommodity(opt)}
                >{opt}</Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ERS Distribution + Supplier count */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> ERS 점수 분포 (Score Distribution)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ersDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <RechartsTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {ersDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-emerald-500" /> 80-100 수출 준비 완료</span>
              <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-amber-500" /> 70-79 개발 중</span>
              <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-blue-500" /> 60-69 기초 단계</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> 맞춤 공급업체 (Matched Suppliers)
            </CardTitle>
            <CardDescription>귀사의 조달 요구에 맞는 공급업체 ({filteredSuppliers.length}개)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredSuppliers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">검색 결과가 없습니다. 다른 검색어를 시도해 보세요.</p>
              </div>
            ) : filteredSuppliers.map((s, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors group">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-rose-500/10 shrink-0">
                  <div className="text-center">
                    <p className="text-lg font-bold leading-none text-emerald-500">{s.match}%</p>
                    <p className="text-[8px] text-muted-foreground mt-0.5">match</p>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{s.company}</p>
                    <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-200">{s.country}</Badge>
                    <Badge className={cn("text-[9px]", s.ers >= 80 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
                      ERS {s.ers}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1.5">{s.commodity}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Ship className="h-3 w-3" /> {s.volume}</span>
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {s.price}</span>
                    <div className="flex gap-1">
                      {s.certs.map((cert) => (
                        <span key={cert} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-200/50">
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" className="h-7 text-xs"><Mail className="h-3 w-3 mr-1" /> 연락하기</Button>
                  <Button size="sm" className="h-7 text-xs"><ChevronRight className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Why Korea-Africa section */}
      <Card className="bg-gradient-to-br from-blue-500/5 to-rose-500/5 border-blue-500/10">
        <CardContent className="p-6 md:p-8">
          <div className="max-w-3xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> 한국 기업이 아프리카 공급망을 선택해야 하는 이유
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { title: "China+1 전략", desc: "한국 대기업들이 중국 의존도를 줄이기 위해 적극적으로 공급망을 다각화하고 있습니다. 아프리카가 차세대 소싱 허브로 부상하고 있습니다." },
                { title: "30B+ 달러 시장", desc: "한국은 매년 300억 달러 이상의 농산물, 광물, 원자재를 수입합니다. 아프리카는 경쟁력 있는 가격과 높은 품질을 제공합니다." },
                { title: "사전 검증된 공급업체", desc: "모든 Sokogate 공급업체는 엄격한 ERS 평가와 규정 준수 인증을 완료했습니다. HACCP, Halal, 유기농 인증 완료." },
                { title: "원스톱 플랫폼", desc: "Sokogate와 Mapato가 공급업체 발견, 규정 준수 추적, 무역 금융 신청, 물류 관리를 하나의 대시보드에서 제공합니다." },
              ].map((item) => (
                <div key={item.title} className="p-4 rounded-lg bg-background/60 border">
                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All suppliers pilot table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">전체 공급업체 목록 (All Suppliers)</CardTitle>
          <CardDescription>20개의 사전 검증된 아프리카 수출업체 — 무료 3개월 시험판 이용 가능</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Company</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Country</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Commodity</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground text-xs">ERS</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground text-xs">Certifications</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Volume</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-xs">{s.company}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{s.country}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground max-w-[200px] truncate">{s.commodity}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge className={cn("text-[9px]", s.ers >= 80 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
                        {s.ers}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1 justify-center">
                        {s.certs.map((cert) => (
                          <span key={cert} className="text-[8px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-600">{cert}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-xs">{s.volume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Registration form */}
      <Card className="border-rose-500/20">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-rose-500" /> 조달 문의 등록 (Procurement Inquiry Registration)
            </CardTitle>
            <CardDescription>
              관심 있는 상품과 조달 요구 사항을 알려주시면 맞춤형 공급업체 매칭을 제공해 드립니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">문의가 접수되었습니다 (Inquiry Submitted)</h3>
                <p className="text-sm text-muted-foreground">
                  감사합니다. 영업일 기준 2일 이내에 검토 후 연락드리겠습니다.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setSubmitted(false)}
                >
                  새 문의 제출 (Submit New Inquiry)
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">회사명 (Company Name) *</label>
                    <Input
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="Hyundai Auto Parts Co."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">담당자 이름 (Contact Name) *</label>
                    <Input
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      placeholder="Kim Min-joon"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">이메일 (Email) *</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="kmj@hyundai.co.kr"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">전화번호 (Phone)</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+82-10-1234-5678"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">직책 (Job Title)</label>
                    <Input
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      placeholder="Procurement Director / 구매 담당"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">관심 상품 (Commodities of Interest)</label>
                    <Select
                      value={formData.commodityInterest}
                      onValueChange={(v) => setFormData({ ...formData, commodityInterest: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select commodities" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coffee">Coffee / 커피</SelectItem>
                        <SelectItem value="tea">Tea / 차</SelectItem>
                        <SelectItem value="cocoa">Cocoa / 코코아</SelectItem>
                        <SelectItem value="cotton">Cotton / 면화</SelectItem>
                        <SelectItem value="minerals">Minerals & Metals / 광물</SelectItem>
                        <SelectItem value="seafood">Seafood / 해산물</SelectItem>
                        <SelectItem value="textiles">Textiles / 섬유</SelectItem>
                        <SelectItem value="oil">Palm Oil / 팜유</SelectItem>
                        <SelectItem value="other">Other / 기타</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">예상 월 구매량 (Estimated Monthly Volume)</label>
                    <Input
                      value={formData.monthlyVolume}
                      onChange={(e) => setFormData({ ...formData, monthlyVolume: e.target.value })}
                      placeholder="e.g., 10,000 kg/month, 50 tons/month"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">추가 요청 사항 (Additional Requests)</label>
                    <Input
                      value={formData.additionalRequests}
                      onChange={(e) => setFormData({ ...formData, additionalRequests: e.target.value })}
                      placeholder="Certifications needed, quality requirements, delivery timeline..."
                    />
                  </div>
                </div>

                {submitError && (
                  <p className="text-sm text-red-500 mt-3">{submitError}</p>
                )}

                <div className="flex gap-3 mt-6">
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-rose-500 hover:bg-rose-600"
                    disabled={submitting || !formData.companyName || !formData.contactName || !formData.email}
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 제출 중...</>
                    ) : (
                      <><Mail className="h-4 w-4 mr-2" /> 문의 제출 (Submit Inquiry)</>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={() => setFormData({ companyName: "", contactName: "", email: "", phone: "", jobTitle: "", commodityInterest: "", monthlyVolume: "", additionalRequests: "" })}
                  >
                    초기화 (Reset)
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3">
                  * 표시는 필수 입력 항목입니다. 제출하시면 Sokogate 팀이 영업일 기준 2일 이내에 연락드립니다.
                </p>
              </>
            )}
          </CardContent>
        </form>
      </Card>

      {/* CTA */}
      <Card className="bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border-emerald-500/10">
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">아프리카 조달을 시작할 준비가 되셨나요?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            지금 바로 저희 팀에 연락하여 맞춤형 공급업체 매칭과 30일 무료 체험을 시작하세요.
          </p>
          <div className="flex gap-3 justify-center">
            <a href="mailto:korea@sokogate.com">
              <Button size="lg" className="bg-rose-500 hover:bg-rose-600">
                <Mail className="h-4 w-4 mr-2" /> 문의하기 (Inquire Now)
              </Button>
            </a>
            <a href="/korea">
              <Button size="lg" variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" /> 대시보드 보기 (View Dashboard)
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
