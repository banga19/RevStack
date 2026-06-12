"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { cn, formatCurrency } from "@/lib/utils"
import { Loader2, Globe, Ship, TrendingUp, Sparkles, ExternalLink } from "lucide-react"

type Corridor = {
  id: string
  name: string
  focus: string
  targetClients: number
  countries: string[]
}

export default function CorridorsPage() {
  const [corridors, setCorridors] = useState<Corridor[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [selectedCorridor, setSelectedCorridor] = useState<string | null>(null)
  const [clientId, setClientId] = useState("")
  const [notes, setNotes] = useState("")
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadCorridors = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/corridors")
      if (res.ok) {
        const data = await res.json()
        setCorridors(data.corridors || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCorridors()
  }, [])

  const handleEnroll = async () => {
    if (!selectedCorridor) return
    setEnrolling(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/corridors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corridorId: selectedCorridor,
          clientId: clientId || undefined,
          notes: notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to enroll in corridor")
        return
      }
      setResult(data)
    } catch (e) {
      setError("Failed to enroll in corridor")
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="shimmer h-8 w-56 rounded mb-2" />
        <div className="shimmer h-4 w-72 rounded mb-8" />
        <div className="grid gap-4 md:grid-cols-2">{[...Array(2)].map((_, i) => <div key={i} className="shimmer h-40 rounded" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Globe className="h-7 w-7 text-primary" />
            Trade Corridors
          </h1>
          <p className="text-muted-foreground mt-1">
            East Africa & continental trade routes — select a corridor to enroll your business
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1.5 text-xs">
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          {corridors.length} corridors available
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {corridors.map((corridor) => (
          <Card
            key={corridor.id}
            className={cn(
              "transition-all",
              selectedCorridor === corridor.id ? "border-primary ring-1 ring-primary/20" : "hover:border-primary/30"
            )}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Ship className="h-4 w-4 text-primary" />
                {corridor.name}
              </CardTitle>
              <CardDescription>{corridor.focus}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Target: {corridor.targetClients} clients
                </span>
                <span>•</span>
                <span>{corridor.countries.length} countries</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {corridor.countries.map((country) => (
                  <Badge key={country} variant="outline" className="text-[10px] capitalize">
                    {country.replace("-", " ")}
                  </Badge>
                ))}
              </div>
              <Button
                size="sm"
                variant={selectedCorridor === corridor.id ? "default" : "outline"}
                className="w-full"
                onClick={() => setSelectedCorridor(corridor.id)}
              >
                {selectedCorridor === corridor.id ? "Selected" : "Select Corridor"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedCorridor && (
        <Card className="border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ExternalLink className="h-4 w-4 text-primary" />
              Enroll in {corridors.find((c) => c.id === selectedCorridor)?.name}
            </CardTitle>
            <CardDescription>
              Connect your business to this trade corridor. Our team will follow up with compliance and onboarding details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID (optional)</Label>
                <Input
                  id="clientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Leave blank to use your default client"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special requirements or questions"
                />
              </div>
            </div>
            {error && (
              <div className="text-xs text-red-500 bg-red-500/10 p-2.5 rounded-lg">{error}</div>
            )}
            {result && (
              <div className="text-xs text-emerald-600 bg-emerald-500/10 p-2.5 rounded-lg">
                Enrolled successfully! Corridor: {result.corridor?.name}
              </div>
            )}
            <Button className="w-full" onClick={handleEnroll} disabled={enrolling}>
              {enrolling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Enroll Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
