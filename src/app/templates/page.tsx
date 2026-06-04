"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TEMPLATES, CATEGORIES, AutomationTemplate, getTemplateById } from "@/lib/templates"
import {
  Sparkles, Send, UserPlus, Shield, Globe, BarChart3, MessageSquare,
  Clock, ChevronRight, CheckCircle2, Loader2, ArrowLeft, Rocket,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ICON_MAP: Record<string, React.ElementType> = {
  MessageSquare, Send, UserPlus, Shield, Globe, BarChart3,
}

function TemplateCard({ template, onDeploy }: { template: AutomationTemplate; onDeploy: (t: AutomationTemplate) => void }) {
  const Icon = ICON_MAP[template.icon] || Sparkles

  return (
    <Card className="group hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer relative overflow-hidden"
      onClick={() => onDeploy(template)}>
      {template.popular && (
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
            <Sparkles className="h-3 w-3 mr-1" /> Popular
          </Badge>
        </div>
      )}
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shrink-0 group-hover:from-primary/30 group-hover:to-primary/10 transition-all">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">{template.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {template.estimatedTime}
              </span>
              <Badge variant="outline" className="text-xs capitalize">
                {template.difficulty === "beginner" ? "Easy" : template.difficulty === "intermediate" ? "Intermediate" : "Advanced"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {template.actions.length} actions
              </Badge>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -mr-1" />
        </div>
      </CardContent>
    </Card>
  )
}

function DeployModal({
  template,
  onClose,
  onDeployed,
}: {
  template: AutomationTemplate
  onClose: () => void
  onDeployed: () => void
}) {
  const [step, setStep] = useState<"review" | "deploying" | "done">("review")
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ actionsExecuted: number; actionsTotal: number } | null>(null)

  const handleDeploy = async () => {
    setStep("deploying")
    setError(null)
    try {
      const res = await fetch("/api/templates/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id, clientId: null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Deploy failed")
      setResult({ actionsExecuted: data.actionsExecuted, actionsTotal: data.actionsTotal })
      setStep("done")
      setTimeout(onDeployed, 2000)
    } catch (e) {
      setError((e as Error).message)
      setStep("review")
    }
  }

  if (step === "deploying") {
    return (
      <Card className="w-full max-w-lg mx-auto border-primary/30 shadow-2xl">
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Deploying {template.name}</h3>
          <p className="text-muted-foreground">Setting up automation workflows...</p>
        </CardContent>
      </Card>
    )
  }

  if (step === "done" && result) {
    return (
      <Card className="w-full max-w-lg mx-auto border-emerald-500/20 shadow-2xl">
        <CardContent className="p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </div>
          </div>
          <h3 className="text-xl font-bold mb-2">Template Deployed!</h3>
          <p className="text-muted-foreground mb-1">
            {result.actionsExecuted} of {result.actionsTotal} actions completed
          </p>
          <p className="text-sm text-muted-foreground">You can now manage these from your dashboard.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-lg mx-auto border-primary/30 shadow-2xl">
      <CardContent className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-xl font-bold">Deploy Template</h3>
        </div>

        <div className="space-y-4 mb-6">
          <h4 className="text-lg font-semibold">{template.name}</h4>
          <p className="text-sm text-muted-foreground">{template.longDescription}</p>

          <div className="space-y-2">
            <p className="text-sm font-medium">This will create:</p>
            {template.actions.map((action, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="p-1.5 rounded-full bg-primary/10 mt-0.5">
                  <Rocket className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Setup steps:</p>
            {template.steps.map((step) => (
              <div key={step.order} className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                  {step.order}
                </span>
                <div>
                  <p className="font-medium">{step.title}</p>
                  <p className="text-muted-foreground text-xs">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive mb-4">
            {error}
          </div>
        )}

        <Button onClick={handleDeploy} className="w-full">
          <Rocket className="h-4 w-4 mr-2" /> Deploy {template.name}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [showDeploy, setShowDeploy] = useState<AutomationTemplate | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const filteredTemplates = activeCategory === "all"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === activeCategory)

  const popularTemplates = TEMPLATES.filter((t) => t.popular)

  if (showDeploy) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <DeployModal
          template={showDeploy}
          onClose={() => setShowDeploy(null)}
          onDeployed={() => { setShowDeploy(null); setRefreshKey(k => k + 1) }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in" key={refreshKey}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automation Templates</h1>
          <p className="text-muted-foreground mt-1">
            Pre-built workflows to accelerate your B2B trade automation
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          {TEMPLATES.length} templates available
        </Badge>
      </div>

      {/* Popular Templates */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Popular Templates
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {popularTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} onDeploy={setShowDeploy} />
          ))}
        </div>
      </section>

      {/* All Templates by Category */}
      <section>
        <h2 className="text-xl font-semibold mb-4">All Templates</h2>
        <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="mb-6 flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>{cat.label}</TabsTrigger>
            ))}
          </TabsList>

          {["all", ...CATEGORIES.map(c => c.id)].map((catId) => (
            <TabsContent key={catId} value={catId} className="mt-0">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} onDeploy={setShowDeploy} />
                ))}
              </div>
              {filteredTemplates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No templates in this category yet.
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </div>
  )
}
