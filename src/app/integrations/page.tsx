"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Puzzle,
  MessageSquare,
  FileText,
  Zap,
  Bot,
  Mail,
  Building2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ExternalLink,
  Plug,
  Unplug,
  Settings,
  ChevronRight,
  AlertTriangle,
  Info,
  Sparkles,
  Shield,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Wifi,
  WifiOff,
} from "lucide-react"

// ── Types ───────────────────────────────────────────────────────────────────

interface EnvVar {
  key: string
  label: string
  required: boolean
  placeholder: string
  link?: string
}

interface Integration {
  id: string
  name: string
  description: string
  category: string
  icon: string
  color: string
  bgGradient: string
  docsUrl: string
  configured: boolean
  mode: "live" | "simulation" | "unavailable"
  summary: string
  envVars: EnvVar[]
  capabilities: string[]
  pricing: { tier: string; cost: number; url: string }
  health?: { connected: boolean; whatsappNumber?: string }
}

// ── Icon Map ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  MessageSquare, FileText, Zap, Bot, Mail, Building2,
}

// ── Category Info ───────────────────────────────────────────────────────────

const CATEGORIES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  communication: { label: "Communication", icon: MessageSquare, color: "text-green-500" },
  document: { label: "Document Processing", icon: FileText, color: "text-blue-500" },
  automation: { label: "Workflow Automation", icon: Zap, color: "text-purple-500" },
  ai: { label: "Conversational AI", icon: Bot, color: "text-amber-500" },
  email: { label: "Email Outreach", icon: Mail, color: "text-red-500" },
  crm: { label: "CRM & Sales", icon: Building2, color: "text-emerald-500" },
}

// ── Integration Card Component ──────────────────────────────────────────────

function IntegrationCard({
  integration,
  onConnect,
  connecting,
}: {
  integration: Integration
  onConnect: (id: string) => void
  connecting: boolean
}) {
  const Icon = ICON_MAP[integration.icon] || Puzzle
  const Category = CATEGORIES[integration.category]
  const [expanded, setExpanded] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {}
  }

  const statusColor = integration.configured
    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    : integration.mode === "simulation"
      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
      : "bg-red-500/10 text-red-600 border-red-500/20"

  const statusLabel = integration.configured
    ? "Connected"
    : integration.mode === "simulation"
      ? "Simulation"
      : "Disconnected"

  return (
    <Card className={cn(
      "border-border/50 hover:border-primary/20 transition-all group overflow-hidden",
      integration.configured && "border-emerald-500/20"
    )}>
      {/* Header */}
      <div className={cn("p-5 pb-4 bg-gradient-to-br", integration.bgGradient)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl border"
              style={{ background: `${integration.color}15`, borderColor: `${integration.color}30` }}
            >
              <Icon className="h-5 w-5" style={{ color: integration.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{integration.name}</h3>
                <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", statusColor)}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full inline-block mr-1",
                    integration.configured ? "bg-emerald-500" : integration.mode === "simulation" ? "bg-amber-500" : "bg-red-500"
                  )} />
                  {statusLabel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{integration.description}</p>
            </div>
          </div>
          <div className="shrink-0">
            <Button
              variant={integration.configured ? "outline" : "default"}
              size="sm"
              className={cn(
                "h-8 text-xs gap-1.5 transition-all",
                connecting && "opacity-70 pointer-events-none"
              )}
              onClick={() => onConnect(integration.id)}
              disabled={connecting}
            >
              {connecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : integration.configured ? (
                <>
                  <Settings className="h-3.5 w-3.5" /> Configure
                </>
              ) : (
                <>
                  <Plug className="h-3.5 w-3.5" /> Connect
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        {/* Quick Info */}
        <div className="px-5 py-3 flex items-center gap-4 text-xs text-muted-foreground border-b border-border/50">
          {Category && (
            <span className="flex items-center gap-1">
              <Category.icon className="h-3 w-3" />
              {Category.label}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {integration.mode === "live" ? "Live API" : "Local Simulation"}
          </span>
          <a
            href={integration.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary transition-colors ml-auto"
          >
            <ExternalLink className="h-3 w-3" /> Docs
          </a>
        </div>

        {/* Capabilities */}
        <div className="px-5 py-3 border-b border-border/50">
          <div className="flex flex-wrap gap-1.5">
            {integration.capabilities.slice(0, 4).map((cap) => (
              <Badge key={cap} variant="secondary" className="text-[9px] px-1.5 py-0 font-normal">
                {cap}
              </Badge>
            ))}
            {integration.capabilities.length > 4 && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                +{integration.capabilities.length - 4}
              </Badge>
            )}
          </div>
        </div>

        {/* Summary / Status Detail */}
        <div className="px-5 py-3 border-b border-border/50">
          <div className="flex items-start gap-2 text-xs">
            {integration.configured ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
            ) : (
              <Info className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
            )}
            <span className="text-muted-foreground">{integration.summary}</span>
          </div>
          {integration.health && !integration.health.connected && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-500">
              <WifiOff className="h-3 w-3" />
              Health check failed — API may be unreachable
            </div>
          )}
        </div>

        {/* Env Vars (expandable) */}
        {integration.envVars.length > 0 && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full px-5 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-between border-b border-border/50"
            >
              <span className="flex items-center gap-1.5">
                <Settings className="h-3 w-3" />
                Required Environment Variables
              </span>
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
            </button>

            {expanded && (
              <div className="px-5 py-3 space-y-2.5 bg-muted/20">
                {integration.envVars.map((env) => (
                  <div key={env.key}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                        <code className="bg-muted px-1 py-0.5 rounded text-[9px]">{env.key}</code>
                        {env.required && <span className="text-red-400">*</span>}
                      </label>
                      <div className="flex items-center gap-1">
                        {env.link && (
                          <a href={env.link} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline flex items-center gap-0.5">
                            <ExternalLink className="h-2.5 w-2.5" /> Get
                          </a>
                        )}
                        <button onClick={() => handleCopy(env.key)} className="text-[9px] text-muted-foreground hover:text-foreground">
                          {copiedKey === env.key ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                        </button>
                      </div>
                    </div>
                    <Input
                      placeholder={env.placeholder}
                      className="h-7 text-[11px] font-mono"
                      readOnly
                      value={integration.configured ? "••••••••" : ""}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer — Pricing + Action */}
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <a href={integration.pricing.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                {integration.pricing.tier} · ${integration.pricing.cost}/mo
              </a>
            </span>
          </div>
          {!integration.configured && (
            <a
              href={integration.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              Setup Guide <ArrowRight className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Connect Dialog / Sidebar ────────────────────────────────────────────────

function ConnectPanel({
  integration,
  onClose,
}: {
  integration: Integration | null
  onClose: () => void
}) {
  if (!integration) return null

  const Icon = ICON_MAP[integration.icon] || Puzzle

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn("p-6 pb-4 bg-gradient-to-br rounded-t-xl", integration.bgGradient)}>
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-xl border"
              style={{ background: `${integration.color}15`, borderColor: `${integration.color}30` }}
            >
              <Icon className="h-6 w-6" style={{ color: integration.color }} />
            </div>
            <div>
              <h2 className="text-lg font-bold">{integration.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{integration.description}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Connection Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <div className={cn(
              "p-2 rounded-full",
              integration.configured ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
            )}>
              {integration.configured ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {integration.configured ? "Connected & Active" : "Not Connected"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{integration.summary}</p>
            </div>
            <Badge variant="outline" className={cn(
              "text-[10px] capitalize",
              integration.configured && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
            )}>
              {integration.mode}
            </Badge>
          </div>

          {/* Step-by-step Connect Flow */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              How to Connect
            </h3>
            <div className="space-y-3">
              {integration.envVars.length > 0 ? (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
                    <div>
                      <p className="text-sm font-medium">Get your credentials</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Visit the {integration.name} dashboard to get your API credentials.
                      </p>
                      {integration.envVars[0]?.link && (
                        <a
                          href={integration.envVars[0].link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open {integration.name} Dashboard
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
                    <div>
                      <p className="text-sm font-medium">Set environment variables</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Add these variables to your <code className="bg-muted px-1 rounded text-[10px]">.env</code> file:
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {integration.envVars.map((env) => (
                          <div key={env.key} className="flex items-center gap-2">
                            <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] flex-1 truncate">
                              {env.key}={integration.configured ? "••••••••" : ""}
                            </code>
                            {env.required && <span className="text-[9px] text-red-400">required</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</div>
                    <div>
                      <p className="text-sm font-medium">Restart and verify</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Restart your dev server. The integration will automatically detect your credentials and switch to live mode.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">✓</div>
                    <div>
                      <p className="text-sm font-medium">No configuration needed</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {integration.name} runs locally and is always available without any external credentials.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Capabilities</h3>
            <div className="flex flex-wrap gap-1.5">
              {integration.capabilities.map((cap) => (
                <Badge key={cap} variant="secondary" className="text-[10px]">{cap}</Badge>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <div className="p-2 rounded-lg bg-muted">
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{integration.pricing.tier} Plan</p>
              <p className="text-xs text-muted-foreground">${integration.pricing.cost}/month for full access</p>
            </div>
            <a
              href={integration.pricing.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="h-7 text-xs">
                View Pricing
              </Button>
            </a>
          </div>

          {/* Docs Link */}
          <div className="text-center">
            <a
              href={integration.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Full {integration.name} Documentation
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [filter, setFilter] = useState<string>("all")

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/integrations/status")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setIntegrations(json.integrations || [])
    } catch (e) {
      setError("Failed to load integration status")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  const handleConnect = (id: string) => {
    setConnecting(id)
    const integration = integrations.find((i) => i.id === id)
    if (integration) {
      setSelectedIntegration(integration)
    }
    setTimeout(() => setConnecting(null), 300)
  }

  // ── Category Filter ──────────────────────────────────────
  const categories = Array.from(new Set(integrations.map((i) => i.category)))
  const filtered = filter === "all" ? integrations : integrations.filter((i) => i.category === filter)

  const configuredCount = integrations.filter((i) => i.configured).length

  // ── Loading State ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="shimmer h-10 w-10 rounded-xl" />
                  <div>
                    <div className="shimmer h-4 w-24 rounded mb-2" />
                    <div className="shimmer h-3 w-32 rounded" />
                  </div>
                </div>
                <div className="shimmer h-3 w-full rounded mb-2" />
                <div className="shimmer h-3 w-3/4 rounded mb-4" />
                <div className="flex gap-1.5 mb-3">
                  {[...Array(3)].map((_, j) => <div key={j} className="shimmer h-5 w-16 rounded" />)}
                </div>
                <div className="shimmer h-8 w-full rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error && integrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-16 w-16 text-amber-500/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Unable to Load Integrations</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={loadStatus}><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Puzzle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
              <p className="text-muted-foreground mt-1">
                Connect your tools and services to power your automation ecosystem
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1.5">
            <Plug className="h-3.5 w-3.5" />
            {configuredCount}/{integrations.length} connected
          </Badge>
          <Button variant="outline" size="sm" onClick={loadStatus}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Status Overview Banner ──────────────────────────── */}
      <Card className={cn(
        "border",
        configuredCount === integrations.length
          ? "border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-transparent"
          : configuredCount > 0
            ? "border-primary/20 bg-gradient-to-r from-primary/5 to-transparent"
            : "border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent"
      )}>
        <CardContent className="p-4 flex items-center gap-3">
          {configuredCount === integrations.length ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          ) : configuredCount > 0 ? (
            <Plug className="h-5 w-5 text-primary shrink-0" />
          ) : (
            <Unplug className="h-5 w-5 text-amber-500 shrink-0" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">
              {configuredCount === 0
                ? "No integrations connected"
                : configuredCount === integrations.length
                  ? "All integrations are connected!"
                  : `${configuredCount} of ${integrations.length} integrations connected`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {configuredCount === 0
                ? "Connect your tools to enable live automations. Unconnected services run in simulation mode."
                : configuredCount < integrations.length
                  ? `${integrations.length - configuredCount} integration(s) running in simulation mode. Configure them for full functionality.`
                  : "Your automation ecosystem is fully connected and operational."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Category Filters ────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        {categories.map((cat) => {
          const catInfo = CATEGORIES[cat]
          return (
            <Button
              key={cat}
              variant={filter === cat ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setFilter(cat)}
            >
              {catInfo && <catInfo.icon className="h-3 w-3" />}
              {catInfo?.label || cat}
            </Button>
          )
        })}
      </div>

      {/* ── Integration Grid ─────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConnect={handleConnect}
            connecting={connecting === integration.id}
          />
        ))}
      </div>

      {/* ── Empty State ─────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Puzzle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No integrations in this category</p>
        </div>
      )}

      {/* ── Connect Detail Panel ─────────────────────────────── */}
      <ConnectPanel
        integration={selectedIntegration}
        onClose={() => setSelectedIntegration(null)}
      />
    </div>
  )
}
