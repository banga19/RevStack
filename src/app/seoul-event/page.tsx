"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CheckCircle2, Sparkles, Globe, Handshake } from "lucide-react"

const COMMISSION_RULES = [
  { label: "Standard — 10% of closed deal", value: "standard" },
  { label: "Tiered (0-3 months: 8%, 4-6 months: 10%, 7-12 months: 12%)", value: "tiered" },
  { label: "Accelerator — one-time signing bonus $500 + 5%", value: "accelerator" },
  { label: "Referral only — no active resale", value: "referral-only" },
]

export default function SeoulEventPage() {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({ name: "", email: "", company: "", country: "Kenya", dealRange: "10k-50k", commissionRule: COMMISSION_RULES[0].value })
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/partners/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: formData.company, email: formData.email, companyName: formData.company, country: formData.country, dealRange: formData.dealRange, commissionRule: formData.commissionRule }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        const err = await res.json()
        setError(err.error || "Submission failed")
      }
    } catch {
      setError("Network error.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Lead Captured</h1>
            <p className="text-sm text-muted-foreground">This partner lead has been logged into the partner registry. Use the Admin panel to assign onboarding and commission rules.</p>
            <Button className="mt-4" variant="outline" onClick={() => setSubmitted(false)}>Record another</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-xl border border-primary/20 p-8 md:p-12">
        <div className="max-w-3xl">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-3 py-1"><Sparkles className="h-3.5 w-3.5 mr-1" /> Seoul Event Flow</Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Korea–Africa Trade Event Pipeline</h1>
          <p className="text-lg text-muted-foreground mb-2">Capture leads directly from Seoul-based trade events and route them through the partner funnel with commission and closing analytics.</p>
          <div className="grid md:grid-cols-3 gap-3 text-xs text-muted-foreground mt-4">
            <div className="p-3 rounded-lg bg-background/60 border"><Globe className="h-4 w-4 mb-1 text-primary" /> Country profile for African exporters</div>
            <div className="p-3 rounded-lg bg-background/60 border"><Handshake className="h-4 w-4 mb-1 text-primary" /> Closed deal / referral range</div>
            <div className="p-3 rounded-lg bg-background/60 border"><Sparkles className="h-4 w-4 mb-1 text-primary" /> Commission rule preset assigned automatically</div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seoul partnership lead</CardTitle>
          <CardDescription>Creates a partner profile + commission ledger entry in one step.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Work Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Company</Label>
                <Input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={formData.country} onValueChange={(v) => setFormData({ ...formData, country: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kenya">Kenya</SelectItem>
                    <SelectItem value="Tanzania">Tanzania</SelectItem>
                    <SelectItem value="Uganda">Uganda</SelectItem>
                    <SelectItem value="Rwanda">Rwanda</SelectItem>
                    <SelectItem value="Nigeria">Nigeria</SelectItem>
                    <SelectItem value="Ghana">Ghana</SelectItem>
                    <SelectItem value="Senegal">Senegal</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expected deal range</Label>
                <Select value={formData.dealRange} onValueChange={(v) => setFormData({ ...formData, dealRange: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<10k">&lt; $10K</SelectItem>
                    <SelectItem value="10k-50k">$10K-$50K</SelectItem>
                    <SelectItem value="50k-200k">$50K-$200K</SelectItem>
                    <SelectItem value="200k+">$200K+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Commission rule preset</Label>
                <Select value={formData.commissionRule} onValueChange={(v) => setFormData({ ...formData, commissionRule: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMMISSION_RULES.map((rule) => <SelectItem key={rule.value} value={rule.value}>{rule.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Create partner lead"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
