"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import { ShieldCheck, Globe, Settings2, Loader2 } from "lucide-react"

const SERVICES = [
  { id: "trade-finance", label: "Trade Finance" },
  { id: "compliance", label: "Compliance" },
  { id: "logistics", label: "Logistics" },
  { id: "marketplace", label: "Marketplace" },
  { id: "white-label", label: "White-label portal" },
  { id: "korea-corridor", label: "Korea corridor" },
  { id: "afcfta", label: "AfCFTA hub" },
]

export default function ClientSettingsPage() {
  const search = useSearchParams()
  const clientId = search.get("clientId") || ""
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [profile, setProfile] = useState<Record<string, any>>({
    services: [],
    complianceStatus: "pending",
    restrictions: {},
    licensedAt: "",
  })
  const [clientName, setClientName] = useState("")

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}/license-profile`)
        if (!res.ok) throw new Error("Failed to load")
        const data = await res.json()
        setClientName(data.name || data.company || "")
        setProfile(data.licenseProfile || profile)
      } catch (e) { setError("Unable to load client license profile.") } finally { setLoading(false) }
    })()
  }, [clientId])

  const toggleService = (id: string) => {
    setProfile((prev) => {
      const list: string[] = Array.isArray(prev.services) ? prev.services : []
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
      return { ...prev, services: next }
    })
  }

  const ServiceToggle = ({ id, label }: { id: string; label: string }) => {
    const enabled = (profile.services || []).includes(id)
    return (
      <div
        role="button"
        onClick={() => toggleService(id)}
        className={cn(
          "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors",
          enabled ? "border-emerald-500/30 bg-emerald-500/5" : "border-input bg-background"
        )}
      >
        <div>
          <p className="text-sm">{label}</p>
          <p className="text-[10px] text-muted-foreground">Service ID: {id}</p>
        </div>
        <span className={cn("text-[11px] font-medium px-2 py-1 rounded", enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>
    )
  }

  const save = async () => {
    if (!clientId) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/clients/${clientId}/license-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseProfile: profile }),
      })
      if (!res.ok) throw new Error("Save failed")
    } catch {
      setError("Failed to save. Please retry.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" /> Client Services & Licensing
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Client: {clientName || clientId}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-primary" /> Licensed Services
          </CardTitle>
          <CardDescription>Enable or restrict services for this client.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {SERVICES.map((service) => (
            <ServiceToggle key={service.id} id={service.id} label={service.label} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" /> Compliance Status
          </CardTitle>
          <CardDescription>Track licensing and restrictions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Compliance status</Label>
              <Select value={profile.complianceStatus || "pending"} onValueChange={(v) => setProfile({ ...profile, complianceStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending review</SelectItem>
                  <SelectItem value="licensed">Licensed</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>License date</Label>
              <Input value={profile.licensedAt || ""} onChange={(e) => setProfile({ ...profile, licensedAt: e.target.value })} placeholder="YYYY-MM-DD" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Restrictions (JSON)</Label>
            <Textarea value={typeof profile.restrictions === "string" ? profile.restrictions : JSON.stringify(profile.restrictions || {}, null, 2)} onChange={(e) => setProfile({ ...profile, restrictions: e.target.value })} rows={4} />
            <p className="text-[10px] text-muted-foreground">Free-form JSON. Use for product codes, country restrictions, or regulator notes.</p>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Button disabled={saving || !clientId} onClick={save} className="w-full">
        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save license profile"}
      </Button>
    </div>
  )
}
