"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { cn, formatCurrency } from "@/lib/utils"
import { Loader2, Globe, ShieldCheck, FileSearch, Calculator, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Sparkles, TrendingDown, BarChart3, Clock, DollarSign, Info } from "lucide-react"

type TariffData = { hsCode: string; description: string; baseRate: number; afcftaRate: number; phaseYears: number; currentDuty: number; afcftaDuty: number; savings: number }
type OriginRule = { key: string; label: string; description: string; weight: number; compliant: boolean; details: string }
type AfcftaResponse = { tariffs?: TariffData[]; rules?: OriginRule[]; complianceScore?: number; qualifiesForPreferential?: boolean; certificateRequired?: string; productValue?: number }

const AFRICAN_COUNTRIES = [
  { value: "kenya", label: "Kenya", flag: "🇰🇪" }, { value: "tanzania", label: "Tanzania", flag: "🇹🇿" },
  { value: "uganda", label: "Uganda", flag: "🇺🇬" }, { value: "rwanda", label: "Rwanda", flag: "🇷🇼" },
  { value: "ghana", label: "Ghana", flag: "🇬🇭" }, { value: "nigeria", label: "Nigeria", flag: "🇳🇬" },
  { value: "senegal", label: "Senegal", flag: "🇸🇳" }, { value: "south-africa", label: "South Africa", flag: "🇿🇦" },
  { value: "ethiopia", label: "Ethiopia", flag: "🇪🇹" }, { value: "egypt", label: "Egypt", flag: "🇪🇬" },
]

const HS_CODES = [
  { value: "09", label: "Coffee, tea, spices" }, { value: "08", label: "Edible fruit, nuts" },
  { value: "07", label: "Edible vegetables" }, { value: "10", label: "Cereals" },
  { value: "12", label: "Oil seeds" }, { value: "15", label: "Fats and oils" },
  { value: "25", label: "Salt, earth, stone" }, { value: "26", label: "Ores, slag, ash" },
  { value: "27", label: "Mineral fuels" }, { value: "41", label: "Raw hides, skins" },
  { value: "52", label: "Cotton" }, { value: "71", label: "Precious stones" },
  { value: "72", label: "Iron and steel" }, { value: "84", label: "Machinery" },
  { value: "85", label: "Electrical machinery" }, { value: "90", label: "Optical, medical" },
]

export default function AfcftaPage() {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("calculator")
  const [tariffData, setTariffData] = useState<TariffData[]>([])
  const [originData, setOriginData] = useState<{ rules: OriginRule[]; complianceScore: number; qualifies: boolean; certificateRequired: string } | null>(null)
  const [complianceData, setComplianceData] = useState<any>(null)
  const [productValue, setProductValue] = useState(10000)
  const [originForm, setOriginForm] = useState({ origin: "kenya", destination: "ghana" })
  const [hsCode, setHsCode] = useState("09")

  const loadTariffs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/afcfta?endpoint=tariffs&hsCode=${hsCode}&value=${productValue}`)
      if (res.ok) { const d = await res.json(); setTariffData(d.tariffs || []) }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [hsCode, productValue])

  const loadOriginRules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/afcfta?endpoint=rules-of-origin&origin=${originForm.origin}&destination=${originForm.destination}`)
      if (res.ok) { const d = await res.json(); setOriginData({ rules: d.rules, complianceScore: d.complianceScore, qualifies: d.qualifiesForPreferential, certificateRequired: d.certificateRequired }) }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [originForm])

  const loadCompliance = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/afcfta?endpoint=compliance`)
      if (res.ok) { const d = await res.json(); setComplianceData(d) }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadTariffs() }, [loadTariffs])

  // Auto-load compliance when tab switches
  useEffect(() => {
    if (activeTab === "compliance" && !complianceData) {
      loadCompliance()
    }
  }, [activeTab, complianceData, loadCompliance])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3"><Globe className="h-7 w-7 text-primary" /> AfCFTA Readiness Hub</h1>
          <p className="text-muted-foreground mt-1">African Continental Free Trade Area — tariff calculator, rules of origin, and compliance tracker</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="calculator"><Calculator className="h-4 w-4 mr-1.5" /> Tariff Calculator</TabsTrigger>
          <TabsTrigger value="origin"><FileSearch className="h-4 w-4 mr-1.5" /> Rules of Origin</TabsTrigger>
          <TabsTrigger value="compliance"><ShieldCheck className="h-4 w-4 mr-1.5" /> Compliance</TabsTrigger>
        </TabsList>

        {/* Tariff Calculator */}
        <TabsContent value="calculator" className="space-y-4 mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /> HS Code Tariff Lookup</CardTitle><CardDescription>Compare current MFN rates vs AfCFTA preferential rates</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>HS Code Chapter</Label>
                  <Select value={hsCode} onValueChange={setHsCode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{HS_CODES.map((h) => <SelectItem key={h.value} value={h.value}>{h.value} — {h.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Product Value (USD)</Label>
                  <Input type="number" value={productValue} onChange={(e) => setProductValue(Number(e.target.value))} />
                </div>
              </div>
              <Button size="sm" onClick={loadTariffs} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />} Calculate</Button>
            </CardContent>
          </Card>

          {tariffData.length > 0 && (
            <>
              {/* Savings Summary */}
              <Card className="bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border-emerald-500/10">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="h-6 w-6 text-emerald-500" />
                    <div>
                      <p className="text-sm font-medium">Potential Tariff Savings</p>
                      <p className="text-2xl font-bold text-emerald-500">
                        {formatCurrency(tariffData.reduce((s, t) => s + t.savings, 0))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        On {formatCurrency(productValue)} product value under AfCFTA preferential rates
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Results Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          <th className="py-3 px-4 text-left font-medium text-muted-foreground">HS Code</th>
                          <th className="py-3 px-4 text-left font-medium text-muted-foreground">Description</th>
                          <th className="py-3 px-4 text-right font-medium text-muted-foreground">Current MFN</th>
                          <th className="py-3 px-4 text-right font-medium text-muted-foreground">AfCFTA Rate</th>
                          <th className="py-3 px-4 text-right font-medium text-muted-foreground">Current Duty</th>
                          <th className="py-3 px-4 text-right font-medium text-muted-foreground">AfCFTA Duty</th>
                          <th className="py-3 px-4 text-right font-medium text-muted-foreground">Savings</th>
                          <th className="py-3 px-4 text-center font-medium text-muted-foreground">Phase</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tariffData.map((t) => (
                          <tr key={t.hsCode} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-medium">{t.hsCode}</td>
                            <td className="py-3 px-4 text-muted-foreground text-xs">{t.description}</td>
                            <td className="py-3 px-4 text-right">{t.baseRate}%</td>
                            <td className="py-3 px-4 text-right text-emerald-500 font-medium">{t.afcftaRate}%</td>
                            <td className="py-3 px-4 text-right">{formatCurrency(t.currentDuty)}</td>
                            <td className="py-3 px-4 text-right text-emerald-500">{formatCurrency(t.afcftaDuty)}</td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-500">{formatCurrency(t.savings)}</td>
                            <td className="py-3 px-4 text-center"><Badge variant="outline" className="text-[9px]">{t.phaseYears}y phase</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {tariffData.length === 0 && !loading && (
            <Card><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Calculator className="h-12 w-12 mb-3 opacity-50" /><p>Select an HS code and product value, then click Calculate.</p></CardContent></Card>
          )}
        </TabsContent>

        {/* Rules of Origin */}
        <TabsContent value="origin" className="space-y-4 mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileSearch className="h-5 w-5 text-primary" /> Rules of Origin Checker</CardTitle><CardDescription>Check if your product qualifies for AfCFTA preferential tariff treatment</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country of Origin</Label>
                  <Select value={originForm.origin} onValueChange={(v) => setOriginForm({ ...originForm, origin: v })}>
                    <SelectTrigger><SelectValue placeholder="Select origin" /></SelectTrigger>
                    <SelectContent>{AFRICAN_COUNTRIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.flag} {c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destination Country</Label>
                  <Select value={originForm.destination} onValueChange={(v) => setOriginForm({ ...originForm, destination: v })}>
                    <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                    <SelectContent>{AFRICAN_COUNTRIES.filter((c) => c.value !== originForm.origin).map((c) => <SelectItem key={c.value} value={c.value}>{c.flag} {c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="sm" onClick={loadOriginRules} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />} Check Origin</Button>
            </CardContent>
          </Card>

          {originData && (
            <>
              <Card className={cn("bg-gradient-to-br", originData.qualifies ? "from-emerald-500/5 to-blue-500/5 border-emerald-500/10" : "from-amber-500/5 to-orange-500/5 border-amber-500/10")}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    {originData.qualifies ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <AlertTriangle className="h-6 w-6 text-amber-500" />}
                    <div>
                      <p className="text-sm font-medium">{originData.qualifies ? "Qualifies for AfCFTA Preferential Treatment" : "May Not Qualify for Preferential Treatment"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={originData.complianceScore} className={cn("h-2 w-32", originData.complianceScore >= 80 ? "[&>div]:bg-emerald-500" : originData.complianceScore >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500")} />
                        <span className="text-xs font-medium">{originData.complianceScore}% compliance</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{originData.certificateRequired}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                {originData.rules.map((rule) => (
                  <div key={rule.key} className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                    {rule.compliant ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{rule.label}</span>
                        <Badge variant="outline" className={cn("text-[9px]", rule.compliant ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")}>{rule.weight}% weight</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                      <p className="text-xs text-muted-foreground mt-1"><Info className="h-3 w-3 inline mr-1" />{rule.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!originData && !loading && (
            <Card><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground"><FileSearch className="h-12 w-12 mb-3 opacity-50" /><p>Select origin and destination countries, then click Check Origin.</p></CardContent></Card>
          )}
        </TabsContent>

        {/* Compliance Dashboard */}
        <TabsContent value="compliance" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Certification Compliance Tracker</CardTitle><CardDescription>Track certification progress across all clients</CardDescription></div>
              <Button size="sm" variant="outline" onClick={loadCompliance}><RefreshCw className="h-4 w-4 mr-2" /> Load</Button>
            </CardHeader>
            <CardContent>
              {complianceData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-emerald-500">{complianceData.obtainedCount}</div><div className="text-[10px] text-muted-foreground">Obtained</div></CardContent></Card>
                    <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-blue-500">{complianceData.inProgressCount}</div><div className="text-[10px] text-muted-foreground">In Progress</div></CardContent></Card>
                    <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-muted-foreground">{complianceData.notStartedCount}</div><div className="text-[10px] text-muted-foreground">Not Started</div></CardContent></Card>
                    <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-500">{complianceData.expiredCount || 0}</div><div className="text-[10px] text-muted-foreground">Expired</div></CardContent></Card>
                  </div>

                  {complianceData.byType?.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Certification Types</h4>
                      {complianceData.byType.map((ct: any) => {
                        const pct = ct.total > 0 ? Math.round((ct.obtained / ct.total) * 100) : 0
                        return (
                          <div key={ct.type} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-xs font-medium capitalize">{ct.type.replace(/-/g, " ")}</span>
                              <span className="text-xs text-muted-foreground">{ct.obtained}/{ct.total} obtained</span>
                            </div>
                            <Progress value={pct} className="h-2" />
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {complianceData.expiringSoon?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5"><Clock className="h-4 w-4 text-amber-500" /> Expiring Soon ({complianceData.expiringSoon.length})</h4>
                      <div className="space-y-1">
                        {complianceData.expiringSoon.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3 p-2 rounded bg-amber-500/5 text-xs">
                            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                            <span className="font-medium">{item.clientName}</span>
                            <span className="text-muted-foreground capitalize">{item.certificationType.replace(/-/g, " ")}</span>
                            <Badge variant="outline" className="text-[9px] text-red-500 border-red-500/30 ml-auto">{item.daysRemaining}d left</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground"><ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>Click Load to fetch compliance data.</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
