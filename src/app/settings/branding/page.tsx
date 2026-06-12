"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Palette,
  Image,
  Type,
  Square,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Upload,
  Link2,
  Undo2,
  Save,
  Sparkles,
  X,
  Globe,
  Smartphone,
  Monitor,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────

interface BrandingState {
  primaryColor: string
  accentColor: string
  logoUrl: string
  faviconUrl: string
  fontFamily: string
  borderRadius: string
}

interface BrandingData {
  branding: BrandingState
  orgName: string
}

const DEFAULT_BRANDING: BrandingState = {
  primaryColor: "#6366f1",
  accentColor: "#8b5cf6",
  logoUrl: "",
  faviconUrl: "",
  fontFamily: "Inter",
  borderRadius: "12",
}

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter", font: "Inter, sans-serif" },
  { value: "system-ui", label: "System UI", font: "system-ui, sans-serif" },
  { value: "Georgia", label: "Georgia", font: "Georgia, serif" },
  { value: "monospace", label: "Monospace", font: "'Courier New', monospace" },
  { value: "Poppins", label: "Poppins", font: "Poppins, sans-serif" },
]

const BORDER_RADIUS_OPTIONS = [
  { value: "4", label: "Sharp", preview: "4px" },
  { value: "8", label: "Rounded", preview: "8px" },
  { value: "12", label: "Standard", preview: "12px" },
  { value: "16", label: "Extra", preview: "16px" },
  { value: "24", label: "Pill", preview: "24px" },
]

// ── Preset themes ──────────────────────────────────────────────────────────

const PRESET_THEMES: { name: string; branding: Partial<BrandingState> }[] = [
  {
    name: "Default Indigo",
    branding: { primaryColor: "#6366f1", accentColor: "#8b5cf6", borderRadius: "12" },
  },
  {
    name: "Emerald Trade",
    branding: { primaryColor: "#059669", accentColor: "#10b981", borderRadius: "8" },
  },
  {
    name: "Ocean Blue",
    branding: { primaryColor: "#2563eb", accentColor: "#3b82f6", borderRadius: "12" },
  },
  {
    name: "Sunset Amber",
    branding: { primaryColor: "#d97706", accentColor: "#f59e0b", borderRadius: "16" },
  },
  {
    name: "Rose",
    branding: { primaryColor: "#e11d48", accentColor: "#f43f5e", borderRadius: "8" },
  },
  {
    name: "Slate",
    branding: { primaryColor: "#475569", accentColor: "#64748b", borderRadius: "4" },
  },
]

// ── Loading Skeleton ───────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-8 w-48 shimmer rounded mb-6" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="shimmer h-4 w-32 rounded" />
            <div className="shimmer h-10 w-full rounded" />
            <div className="shimmer h-4 w-32 rounded" />
            <div className="shimmer h-10 w-full rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="shimmer h-4 w-32 rounded mb-4" />
            <div className="shimmer h-64 w-full rounded" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function BrandingSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [orgName, setOrgName] = useState("My Workspace")
  const [branding, setBranding] = useState<BrandingState>(DEFAULT_BRANDING)
  const [original, setOriginal] = useState<BrandingState>(DEFAULT_BRANDING)
  const [uploading, setUploading] = useState(false)
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop")
  const [activeTab, setActiveTab] = useState("colors")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const blobUrlRef = useRef<string | null>(null)

  // Load current branding
  const loadBranding = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/organizations/branding")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: BrandingData = await res.json()
      const b = data.branding || DEFAULT_BRANDING
      const merged: BrandingState = {
        primaryColor: b.primaryColor || DEFAULT_BRANDING.primaryColor,
        accentColor: b.accentColor || DEFAULT_BRANDING.accentColor,
        logoUrl: b.logoUrl || "",
        faviconUrl: b.faviconUrl || "",
        fontFamily: b.fontFamily || DEFAULT_BRANDING.fontFamily,
        borderRadius: b.borderRadius || DEFAULT_BRANDING.borderRadius,
      }
      setBranding(merged)
      setOriginal(JSON.parse(JSON.stringify(merged)))
      setOrgName(data.orgName || "My Workspace")
    } catch (e) {
      setError("Failed to load branding")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadBranding() }, [loadBranding])

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(branding) !== JSON.stringify(original)
  const previewRadius = `${branding.borderRadius}px`

  // Cleanup blob URLs on unmount or when logoUrl changes
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [])

  // Upload logo via documents API
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PNG, JPG, SVG, or WebP image")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be under 2MB")
      return
    }

    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", `Logo - ${orgName}`)
      formData.append("category", "branding")

      const res = await fetch("/api/documents", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")

      const data = await res.json()

      // Revoke any previous blob URL before creating a new one
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
      }

      // Use the R2 storage URL if available, otherwise create a local preview URL
      let logoUrl: string
      if (data.r2Key && data.document.storageUrl) {
        logoUrl = data.document.storageUrl
        blobUrlRef.current = null
      } else {
        logoUrl = URL.createObjectURL(file)
        blobUrlRef.current = logoUrl
      }

      setBranding((prev) => ({ ...prev, logoUrl }))
    } catch (e) {
      setError("Failed to upload logo. Check R2 configuration or use a URL instead.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Save branding
  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const body: Record<string, string> = {}
      if (branding.primaryColor !== original.primaryColor) body.primaryColor = branding.primaryColor
      if (branding.accentColor !== original.accentColor) body.accentColor = branding.accentColor
      if (branding.logoUrl !== original.logoUrl) body.logoUrl = branding.logoUrl
      if (branding.faviconUrl !== original.faviconUrl) body.faviconUrl = branding.faviconUrl
      if (branding.fontFamily !== original.fontFamily) body.fontFamily = branding.fontFamily
      if (branding.borderRadius !== original.borderRadius) body.borderRadius = branding.borderRadius

      if (Object.keys(body).length === 0) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
        return
      }

      const res = await fetch("/api/organizations/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save")
      }

      setOriginal(JSON.parse(JSON.stringify(branding)))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: any) {
      setError(e.message || "Failed to save branding")
    } finally {
      setSaving(false)
    }
  }

  // Reset all to defaults
  const handleReset = () => {
    setBranding(DEFAULT_BRANDING)
  }

  // Apply a preset theme
  const applyPreset = (preset: (typeof PRESET_THEMES)[0]) => {
    setBranding((prev) => ({ ...prev, ...preset.branding }))
  }

  // ── Loading State ──────────────────────────────────────────
  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <Palette className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Branding</h1>
            <p className="text-muted-foreground mt-1">Customize colors, logo, and appearance for your workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={!hasChanges}>
            <Undo2 className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
          <Button variant="outline" size="sm" onClick={loadBranding}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* ── Status Messages ─────────────────────────────────── */}
      {error && (
        <Card className="border-red-500/30 bg-gradient-to-r from-red-500/5 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button variant="ghost" size="sm" className="ml-auto shrink-0" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Branding saved successfully!</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Settings Panel ─────────────────────────────────── */}
        <div className="space-y-6">
          {/* Preset Themes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                Preset Themes
              </CardTitle>
              <CardDescription>Quick-start with a pre-built color theme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_THEMES.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                    title={preset.name}
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-border/50 group-hover:border-primary/30 transition-colors flex items-center justify-center overflow-hidden">
                      <svg viewBox="0 0 24 24" className="w-full h-full">
                        <rect x="0" y="0" width="12" height="24" fill={preset.branding.primaryColor || "#6366f1"} />
                        <rect x="12" y="0" width="12" height="24" fill={preset.branding.accentColor || "#8b5cf6"} />
                      </svg>
                    </div>
                    <span className="text-[9px] text-muted-foreground text-center leading-tight">{preset.name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="colors"><Palette className="h-3.5 w-3.5 mr-1.5" /> Colors</TabsTrigger>
              <TabsTrigger value="logo"><Image className="h-3.5 w-3.5 mr-1.5" /> Logo</TabsTrigger>
              <TabsTrigger value="style"><Type className="h-3.5 w-3.5 mr-1.5" /> Style</TabsTrigger>
            </TabsList>

            {/* Colors Tab */}
            <TabsContent value="colors" className="space-y-4 mt-4">
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: branding.primaryColor }} />
                      Primary Color
                    </Label>
                    <div className="flex gap-3">
                      <div className="relative shrink-0">
                        <input
                          type="color"
                          value={branding.primaryColor}
                          onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-12 h-12 rounded-lg border border-border/50 cursor-pointer bg-transparent p-0.5"
                        />
                      </div>
                      <Input
                        value={branding.primaryColor}
                        onChange={(e) => {
                          let val = e.target.value
                          if (val.startsWith("#") && /^#[0-9a-fA-F]{0,6}$/.test(val)) {
                            setBranding((prev) => ({ ...prev, primaryColor: val }))
                          } else if (!val.startsWith("#") && /^[0-9a-fA-F]{0,6}$/.test(val)) {
                            setBranding((prev) => ({ ...prev, primaryColor: `#${val}` }))
                          }
                        }}
                        placeholder="#6366f1"
                        className="font-mono flex-1"
                        maxLength={7}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Used for primary buttons, links, and active states</p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: branding.accentColor }} />
                      Accent Color
                    </Label>
                    <div className="flex gap-3">
                      <div className="relative shrink-0">
                        <input
                          type="color"
                          value={branding.accentColor}
                          onChange={(e) => setBranding((prev) => ({ ...prev, accentColor: e.target.value }))}
                          className="w-12 h-12 rounded-lg border border-border/50 cursor-pointer bg-transparent p-0.5"
                        />
                      </div>
                      <Input
                        value={branding.accentColor}
                        onChange={(e) => {
                          let val = e.target.value
                          if (val.startsWith("#") && /^#[0-9a-fA-F]{0,6}$/.test(val)) {
                            setBranding((prev) => ({ ...prev, accentColor: val }))
                          } else if (!val.startsWith("#") && /^[0-9a-fA-F]{0,6}$/.test(val)) {
                            setBranding((prev) => ({ ...prev, accentColor: `#${val}` }))
                          }
                        }}
                        placeholder="#8b5cf6"
                        className="font-mono flex-1"
                        maxLength={7}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Used for secondary elements, badges, and highlights</p>
                  </div>

                  {/* Color contrast preview */}
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Contrast Preview</p>
                    <div className="flex gap-2">
                      <div className="flex-1 p-3 rounded-lg text-center text-xs text-white font-medium"
                        style={{ backgroundColor: branding.primaryColor }}>
                        Primary BG
                      </div>
                      <div className="flex-1 p-3 rounded-lg text-center text-xs text-white font-medium"
                        style={{ backgroundColor: branding.accentColor }}>
                        Accent BG
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Logo Tab */}
            <TabsContent value="logo" className="space-y-4 mt-4">
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label>Logo Image</Label>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center overflow-hidden bg-muted/20 shrink-0"
                        style={{ borderRadius: previewRadius }}
                      >
                        {branding.logoUrl ? (
                          <img
                            src={branding.logoUrl}
                            alt="Logo preview"
                            className="w-full h-full object-contain p-2"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = ""
                              setBranding((prev) => ({ ...prev, logoUrl: "" }))
                            }}
                          />
                        ) : (
                          <Image className="h-8 w-8 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="w-full"
                        >
                          {uploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Upload className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          {uploading ? "Uploading..." : "Upload Image"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBranding((prev) => ({ ...prev, logoUrl: "" }))}
                          disabled={!branding.logoUrl}
                          className="w-full"
                        >
                          <X className="h-3.5 w-3.5 mr-1.5" /> Remove
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG, SVG, or WebP. Max 2MB. Recommended: 200x200px.</p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Logo URL (alternative)
                    </Label>
                    <Input
                      value={branding.logoUrl}
                      onChange={(e) => setBranding((prev) => ({ ...prev, logoUrl: e.target.value }))}
                      placeholder="https://example.com/logo.png"
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">If your logo is already hosted, paste the URL directly</p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      Favicon URL
                    </Label>
                    <Input
                      value={branding.faviconUrl}
                      onChange={(e) => setBranding((prev) => ({ ...prev, faviconUrl: e.target.value }))}
                      placeholder="https://example.com/favicon.ico"
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">Browser tab icon. Recommended: 32x32px ICO or SVG.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Style Tab */}
            <TabsContent value="style" className="space-y-4 mt-4">
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Type className="h-3.5 w-3.5 text-muted-foreground" />
                      Font Family
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {FONT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setBranding((prev) => ({ ...prev, fontFamily: opt.value }))}
                          className={cn(
                            "p-3 rounded-lg border text-left transition-all",
                            branding.fontFamily === opt.value
                              ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                              : "border-border/50 hover:border-primary/20 hover:bg-muted/20"
                          )}
                          style={{ fontFamily: opt.font }}
                        >
                          <span className="text-xs font-medium">{opt.label}</span>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Aa Bb Cc 123</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Square className="h-3.5 w-3.5 text-muted-foreground" />
                      Border Radius
                    </Label>
                    <div className="flex gap-2">
                      {BORDER_RADIUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setBranding((prev) => ({ ...prev, borderRadius: opt.value }))}
                          className={cn(
                            "flex-1 p-3 rounded-lg border text-center transition-all text-xs",
                            branding.borderRadius === opt.value
                              ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                              : "border-border/50 hover:border-primary/20 hover:bg-muted/20"
                          )}
                        >
                          <div className="flex justify-center mb-1.5">
                            <div
                              className="w-6 h-6 bg-muted-foreground/30"
                              style={{ borderRadius: opt.preview }}
                            />
                          </div>
                          <span className="font-medium">{opt.label}</span>
                          <p className="text-[9px] text-muted-foreground">{opt.preview}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Preview of styled elements */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Element Preview</p>
                    <div className="p-4 rounded-lg border border-border/50 space-y-3"
                      style={{ borderRadius: previewRadius }}>
                      <div className="flex gap-2">
                        <button
                          className="px-4 py-2 text-sm text-white font-medium"
                          style={{ backgroundColor: branding.primaryColor, borderRadius: previewRadius }}
                        >
                          Primary Button
                        </button>
                        <button
                          className="px-4 py-2 text-sm font-medium border"
                          style={{ borderColor: branding.accentColor, color: branding.accentColor, borderRadius: previewRadius }}
                        >
                          Outline Button
                        </button>
                      </div>
                      <div
                        className="p-3 text-sm border"
                        style={{ borderLeft: `3px solid ${branding.accentColor}`, borderRadius: previewRadius }}
                      >
                        <p style={{ fontFamily: branding.fontFamily }}>Sample card with accent left border</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Live Preview Panel ─────────────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Eye className="h-4 w-4 text-primary" />
                  Live Preview
                </CardTitle>
                <CardDescription>See your branding in action</CardDescription>
              </div>
              <div className="flex bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={cn("p-1.5 rounded-md transition-all", previewDevice === "desktop" ? "bg-background shadow-sm" : "text-muted-foreground")}
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={cn("p-1.5 rounded-md transition-all", previewDevice === "mobile" ? "bg-background shadow-sm" : "text-muted-foreground")}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "relative overflow-hidden rounded-xl border border-border/50 bg-white dark:bg-zinc-950",
                previewDevice === "mobile" ? "max-w-[360px] mx-auto" : "w-full"
              )}>
                {/* ── Fake Browser Chrome ──────────────────────── */}
                {previewDevice === "desktop" && (
                  <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/30 bg-muted/20">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    <div className="ml-3 flex-1 max-w-[200px] h-4 rounded bg-muted/50 flex items-center px-2">
                      <span className="text-[8px] text-muted-foreground truncate">{orgName.toLowerCase().replace(/\s+/g, "-")}.app</span>
                    </div>
                  </div>
                )}

                {/* ── Preview Content ─────────────────────────── */}
                <div className="p-0">
                  {/* Navbar */}
                  <div
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{ backgroundColor: branding.primaryColor }}
                  >
                    <div className="flex items-center gap-2">
                      {branding.logoUrl ? (
                        <img src={branding.logoUrl} alt="Logo" className="h-6 w-6 object-contain rounded" />
                      ) : (
                        <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: branding.accentColor }}>
                          M
                        </div>
                      )}
                      <span className="text-sm font-semibold text-white">{orgName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-white/20" />
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                      >
                        <div className="w-3 h-3 rounded-full bg-white/40" />
                      </div>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-4 space-y-3">
                    {/* Hero */}
                    <div className="space-y-1 mb-3">
                      <h2 className="text-base font-bold" style={{ fontFamily: branding.fontFamily }}>
                        Welcome back, {orgName}
                      </h2>
                      <p className="text-[11px] text-muted-foreground" style={{ fontFamily: branding.fontFamily }}>
                        Here&apos;s your workspace overview
                      </p>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Leads", value: "24" },
                        { label: "Clients", value: "8" },
                        { label: "MRR", value: "$2.4K" },
                      ].map((stat, i) => (
                        <div
                          key={i}
                          className="p-2.5 border border-border/30 text-center"
                          style={{ borderRadius: previewRadius }}
                        >
                          <div className="text-xs font-bold">{stat.value}</div>
                          <div className="text-[9px] text-muted-foreground">{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Card */}
                    <div
                      className="p-3 border border-border/30 space-y-2"
                      style={{ borderRadius: previewRadius }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium" style={{ fontFamily: branding.fontFamily }}>
                          Recent Activity
                        </span>
                        <Badge
                          className="text-[8px] px-1.5 py-0"
                          style={{ backgroundColor: branding.accentColor, color: "#fff" }}
                        >
                          New
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        {["Lead scored 85", "Follow-up sent", "Client onboarded"].map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: i === 0 ? branding.primaryColor : branding.accentColor }} />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2">
                      <button
                        className="flex-1 py-2 text-xs text-white font-medium text-center"
                        style={{ backgroundColor: branding.primaryColor, borderRadius: previewRadius }}
                      >
                        Primary Action
                      </button>
                      <button
                        className="flex-1 py-2 text-xs font-medium text-center border"
                        style={{ borderColor: branding.accentColor, color: branding.accentColor, borderRadius: previewRadius }}
                      >
                        Secondary
                      </button>
                    </div>

                    {/* Accent Section */}
                    <div
                      className="p-3"
                      style={{
                        backgroundColor: `${branding.accentColor}10`,
                        borderLeft: `3px solid ${branding.accentColor}`,
                        borderRadius: previewRadius,
                      }}
                    >
                      <p className="text-[10px] font-medium" style={{ color: branding.accentColor, fontFamily: branding.fontFamily }}>
                        Accent Highlight Section
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5" style={{ fontFamily: branding.fontFamily }}>
                        This area uses your accent color for emphasis
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2 border-t border-border/30 bg-muted/10">
                    <p className="text-[8px] text-muted-foreground text-center">
                      {orgName} — Powered by Mapato
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick tips */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] text-muted-foreground space-y-1.5">
              <p>• Choose colors with good contrast for accessibility (WCAG AA recommended)</p>
              <p>• Use a transparent PNG or SVG for the best logo appearance</p>
              <p>• Changes take effect immediately across your workspace portal</p>
              <p>• Only workspace admins can modify branding settings</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
