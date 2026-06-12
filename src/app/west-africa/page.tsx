"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, formatCurrency } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"
import { Globe, Ship, TrendingUp, Sparkles, ExternalLink, ShieldCheck, Calculator, FileSearch, Loader2 } from "lucide-react"

export default function WestAfricaPage() {
  const { t, lang } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [tariffHs, setTariffHs] = useState("27")
  const [productValue, setProductValue] = useState(10000)
  const [tariffResults, setTariffResults] = useState<any | null>(null)
  const [originOrigin, setOriginOrigin] = useState("gh")
  const [originDest, setOriginDest] = useState("ng")
  const [originResults, setOriginResults] = useState<any | null>(null)
  const [complianceLoaded, setComplianceLoaded] = useState(false)

  const loadTariffs = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/afcfta?endpoint=tariffs&hsCode=${tariffHs}&value=${productValue}`)
      if (res.ok) setTariffResults(await res.json())
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const loadOrigin = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/afcfta?endpoint=rules-of-origin&origin=${originOrigin}&destination=${originDest}`)
      if (res.ok) setOriginResults(await res.json())
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const loadCompliance = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/afcfta?endpoint=compliance`)
      if (res.ok) setComplianceLoaded(true)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { loadCompliance() }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Globe className="h-7 w-7 text-primary" />
            West Africa Expansion Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Nigeria, Ghana, Senegal — trade corridors, compliance, tariffs, and market access
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1.5 text-xs">
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          Phase 6 expansion
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="overview"><Ship className="h-4 w-4 mr-1.5" /> Corridors</TabsTrigger>
          <TabsTrigger value="tariffs"><Calculator className="h-4 w-4 mr-1.5" /> Tariffs</TabsTrigger>
          <TabsTrigger value="origin"><FileSearch className="h-4 w-4 mr-1.5" /> Origin</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Ship className="h-4 w-4 text-primary" /> ECOWAS Corridors</CardTitle>
                <CardDescription>Nigeria ↔ Ghana ↔ Senegal</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">3 core corridors for intra-West-Africa trade under AfCFTA.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Compliance</CardTitle>
                <CardDescription>SONCAP & ECOWAS standards</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Track HACCP, Halal, ISO 9001, and SONCAP certs by country.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" /> Tariff Savings</CardTitle>
                <CardDescription>AfCFTA preferential rates</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Use the tariff calculator to estimate duty savings vs MFN.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tariffs" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /> AfCFTA Tariff Calculator (West Africa)</CardTitle>
              <CardDescription>Estimate duty savings for NG/GH/SN trade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>HS Code Chapter</Label>
                  <Select value={tariffHs} onValueChange={setTariffHs}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="27">Mineral fuels, oils</SelectItem>
                      <SelectItem value="72">Iron and steel</SelectItem>
                      <SelectItem value="84">Machinery</SelectItem>
                      <SelectItem value="85">Electrical machinery</SelectItem>
                      <SelectItem value="94">Furniture, bedding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Product Value (USD)</Label>
                  <Input type="number" value={productValue} onChange={(e) => setProductValue(Number(e.target.value))} />
                </div>
              </div>
              <Button size="sm" onClick={loadTariffs} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />} Calculate</Button>
            </CardContent>
          </Card>

          {tariffResults?.tariffs?.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-emerald-500/20">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground">Current Duty</p>
                  <p className="text-xl font-bold">{formatCurrency(tariffResults.totalCurrentDuty)}</p>
                </CardContent>
              </Card>
              <Card className="border-blue-500/20">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground">AfCFTA Duty</p>
                  <p className="text-xl font-bold text-blue-500">{formatCurrency(tariffResults.totalAfcftaDuty)}</p>
                </CardContent>
              </Card>
              <Card className="border-emerald-500/20">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground">Savings</p>
                  <p className="text-xl font-bold text-emerald-500">{formatCurrency(tariffResults.totalSavings)}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="origin" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileSearch className="h-5 w-5 text-primary" /> Rules of Origin (West Africa)</CardTitle>
              <CardDescription>Check preferential treatment for intra-West-Africa trade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Origin</Label>
                  <Select value={originOrigin} onValueChange={setOriginOrigin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gh">Ghana</SelectItem>
                      <SelectItem value="ng">Nigeria</SelectItem>
                      <SelectItem value="sn">Senegal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destination</Label>
                  <Select value={originDest} onValueChange={setOriginDest}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ng">Nigeria</SelectItem>
                      <SelectItem value="gh">Ghana</SelectItem>
                      <SelectItem value="sn">Senegal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="sm" onClick={loadOrigin} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />} Check Origin</Button>
            </CardContent>
          </Card>

          {originResults && (
            <Card className={cn("border", originResults.qualifiesForPreferential ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5")}>
              <CardContent className="p-5 flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium">{t("compare.targetM")}</p>
                  <p className="text-xs text-muted-foreground">Compliance: {originResults.complianceScore}%</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
