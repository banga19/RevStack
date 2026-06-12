import { NextResponse } from "next/server"
import { watiIntegration } from "@/lib/wati-integration"
import { qmeIntegration } from "@/lib/qme-integration"
import { makeIntegration } from "@/lib/make-integration"
import { voiceflowIntegration } from "@/lib/voiceflow-integration"
import { instantlyIntegration } from "@/lib/instantly-integration"
import { zohoCrmIntegration } from "@/lib/zoho-crm-integration"
import { withAuth } from "@/lib/abac-middleware"

// ── Integration Definitions ─────────────────────────────────────────────────

export interface IntegrationInfo {
  id: string
  name: string
  description: string
  category: "communication" | "crm" | "automation" | "ai" | "document" | "email"
  icon: string
  color: string
  bgGradient: string
  docsUrl: string
  configured: boolean
  mode: "live" | "simulation" | "unavailable"
  summary: string
  envVars: Array<{
    key: string
    label: string
    required: boolean
    placeholder: string
    link?: string
  }>
  capabilities: string[]
  pricing: {
    tier: string
    cost: number
    url: string
  }
  health?: {
    connected: boolean
    whatsappNumber?: string
  }
}

export interface IntegrationsStatusResponse {
  integrations: IntegrationInfo[]
  total: number
  configured: number
}

// ── Integration Definitions ─────────────────────────────────────────────────

function getIntegrationDefinitions(): IntegrationInfo[] {
  const watiConfigured = watiIntegration.isConfigured()
  const qmeConfigured = true // QMe is always available locally
  const makeConfigured = !!(
    process.env.MAKE_LEAD_CAPTURE_WEBHOOK ||
    process.env.MAKE_FOLLOWUP_WEBHOOK ||
    process.env.MAKE_BOOKING_WEBHOOK ||
    process.env.MAKE_COMPLIANCE_WEBHOOK ||
    process.env.MAKE_REPORTING_WEBHOOK
  )
  const voiceflowConfigured = voiceflowIntegration.isConfigured()
  const instantlyConfigured = instantlyIntegration.isConfigured()
  const zohoConfigured = zohoCrmIntegration.isConfigured()

  return [
    {
      id: "wati",
      name: "WATI.io",
      description: "WhatsApp Business API for lead capture, automated follow-ups, broadcast campaigns, and shared team inbox.",
      category: "communication",
      icon: "MessageSquare",
      color: "#25D366",
      bgGradient: "from-green-500/10 via-green-500/5 to-transparent",
      docsUrl: "https://docs.wati.io/",
      configured: watiConfigured,
      mode: watiConfigured ? "live" : "simulation",
      summary: watiIntegration.summary ? watiIntegration.summary() : (watiConfigured ? "Live — connected to WhatsApp Business API" : "Simulation — set WATI credentials for live messaging"),
      envVars: [
        { key: "WATI_API_TOKEN", label: "API Token", required: true, placeholder: "Enter your WATI API token", link: "https://app.wati.io/settings/api-docs" },
        { key: "WATI_WHATSAPP_NUMBER_ID", label: "WhatsApp Number ID", required: true, placeholder: "Enter your WhatsApp Business number ID", link: "https://app.wati.io/settings" },
        { key: "WATI_API_URL", label: "API URL (optional)", required: false, placeholder: "https://live-mt-server.wati.io (default)", link: "https://app.wati.io/settings/api-docs" },
      ],
      capabilities: [
        "Send WhatsApp template messages",
        "Free-form WhatsApp messaging",
        "Auto-qualify leads via keyword scoring",
        "Create and manage broadcast campaigns",
        "Contact/lead management with tags",
        "Incoming message webhook handling",
      ],
      pricing: { tier: "Growth", cost: 49, url: "https://www.wati.io/pricing" },
    },
    {
      id: "qme",
      name: "QMe",
      description: "AI document processing and workflow automation for compliance documents, contract review, and knowledge base population.",
      category: "document",
      icon: "FileText",
      color: "#3B82F6",
      bgGradient: "from-blue-500/10 via-blue-500/5 to-transparent",
      docsUrl: "https://qme.app/docs",
      configured: qmeConfigured,
      mode: "live",
      summary: "Live — AI document processing engine is always available",
      envVars: [], // QMe doesn't need env vars — runs locally
      capabilities: [
        "Document intake and processing",
        "Entity extraction (names, dates, amounts)",
        "Sentiment analysis and classification",
        "Workflow automation triggers",
        "Knowledge base population via RAG",
        "Compliance document review",
      ],
      pricing: { tier: "Business", cost: 30, url: "https://qme.app/pricing" },
    },
    {
      id: "make",
      name: "Make.com",
      description: "Custom automation scenarios connecting CRM, email, WhatsApp, and analytics for multi-step workflows.",
      category: "automation",
      icon: "Zap",
      color: "#A855F7",
      bgGradient: "from-purple-500/10 via-purple-500/5 to-transparent",
      docsUrl: "https://www.make.com/en/api-documentation",
      configured: makeConfigured,
      mode: makeConfigured ? "live" : "simulation",
      summary: makeConfigured ? "Live — webhooks configured for automation scenarios" : "Simulation — configure webhook URLs for live automation",
      envVars: [
        { key: "MAKE_LEAD_CAPTURE_WEBHOOK", label: "Lead Capture Webhook", required: false, placeholder: "Webhook ID for lead capture scenario" },
        { key: "MAKE_FOLLOWUP_WEBHOOK", label: "Follow-up Webhook", required: false, placeholder: "Webhook ID for follow-up sequence" },
        { key: "MAKE_BOOKING_WEBHOOK", label: "Booking Webhook", required: false, placeholder: "Webhook ID for booking confirmation" },
        { key: "MAKE_COMPLIANCE_WEBHOOK", label: "Compliance Webhook", required: false, placeholder: "Webhook ID for compliance alerts" },
        { key: "MAKE_REPORTING_WEBHOOK", label: "Reporting Webhook", required: false, placeholder: "Webhook ID for daily reporting" },
      ],
      capabilities: [
        "Trigger lead capture automation",
        "Run multi-step follow-up sequences",
        "Send compliance renewal alerts",
        "Generate daily reporting summaries",
        "Booking confirmation and reminders",
        "Connect 1000+ apps in workflows",
      ],
      pricing: { tier: "Pro", cost: 9, url: "https://www.make.com/en/pricing" },
    },
    {
      id: "voiceflow",
      name: "Voiceflow",
      description: "Conversational AI chatbot builder for lead qualification, order intake, compliance checks, and customer support.",
      category: "ai",
      icon: "Bot",
      color: "#F59E0B",
      bgGradient: "from-amber-500/10 via-amber-500/5 to-transparent",
      docsUrl: "https://www.voiceflow.com/api",
      configured: voiceflowConfigured,
      mode: voiceflowConfigured ? "live" : "simulation",
      summary: voiceflowIntegration.summary(),
      envVars: [
        { key: "VOICEFLOW_API_KEY", label: "API Key", required: true, placeholder: "Enter your Voiceflow API key", link: "https://creator.voiceflow.com/account/api-keys" },
        { key: "VOICEFLOW_PROJECT_ID", label: "Project ID", required: true, placeholder: "Enter your Voiceflow project ID", link: "https://creator.voiceflow.com/projects" },
        { key: "VOICEFLOW_VERSION_ID", label: "Version ID (optional)", required: false, placeholder: "production (default)" },
      ],
      capabilities: [
        "Lead qualification dialogs",
        "Order intake conversations",
        "Compliance check automations",
        "Support ticket creation",
        "Onboarding welcome flows",
        "Knowledge base querying",
      ],
      pricing: { tier: "Pro", cost: 50, url: "https://www.voiceflow.com/pricing" },
    },
    {
      id: "instantly",
      name: "Instantly.ai",
      description: "AI-powered cold email outreach with auto-warmup, A/B testing, deliverability optimization, and multi-channel sequences.",
      category: "email",
      icon: "Mail",
      color: "#EF4444",
      bgGradient: "from-red-500/10 via-red-500/5 to-transparent",
      docsUrl: "https://docs.instantly.ai/",
      configured: instantlyConfigured,
      mode: instantlyConfigured ? "live" : "simulation",
      summary: instantlyIntegration.summary(),
      envVars: [
        { key: "INSTANTLY_API_KEY", label: "API Key", required: true, placeholder: "Enter your Instantly.ai API key", link: "https://app.instantly.ai/settings/api" },
        { key: "INSTANTLY_API_URL", label: "API URL (optional)", required: false, placeholder: "https://api.instantly.ai/v1 (default)" },
      ],
      capabilities: [
        "Create and manage email campaigns",
        "Add leads to campaigns",
        "Track open, reply, and bounce rates",
        "Multi-channel sequences",
        "Auto-warmup and deliverability",
        "A/B testing for subject lines",
      ],
      pricing: { tier: "Warmup", cost: 30, url: "https://instantly.ai/pricing" },
    },
    {
      id: "zoho",
      name: "Zoho CRM",
      description: "Lead, contact, and deal management with OAuth 2.0 authentication. Sync your pipeline and automate sales operations.",
      category: "crm",
      icon: "Building2",
      color: "#059669",
      bgGradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
      docsUrl: "https://www.zoho.com/crm/developer/docs/api/v7/",
      configured: zohoConfigured,
      mode: zohoConfigured ? "live" : "simulation",
      summary: zohoCrmIntegration.summary(),
      envVars: [
        { key: "ZOHO_CLIENT_ID", label: "Client ID", required: true, placeholder: "Enter your Zoho OAuth client ID", link: "https://api-console.zoho.com/" },
        { key: "ZOHO_CLIENT_SECRET", label: "Client Secret", required: true, placeholder: "Enter your Zoho client secret", link: "https://api-console.zoho.com/" },
        { key: "ZOHO_REFRESH_TOKEN", label: "Refresh Token", required: true, placeholder: "Enter your Zoho refresh token", link: "https://www.zoho.com/crm/developer/docs/api/v7/auth-request.html" },
        { key: "ZOHO_DOMAIN", label: "Domain (optional)", required: false, placeholder: "com (default), com.au, eu, jp, in", link: "https://www.zoho.com/crm/developer/docs/api/v7/" },
      ],
      capabilities: [
        "Sync leads to CRM contacts",
        "Create and update deals",
        "Manage pipeline stages",
        "Track lead sources",
        "Bidirectional data sync",
        "Custom field mapping",
      ],
      pricing: { tier: "Standard", cost: 14, url: "https://www.zoho.com/crm/pricing/" },
    },
  ]
}

// ── GET Handler ─────────────────────────────────────────────────────────────

export const GET = withAuth(async () => {
  const integrations = getIntegrationDefinitions()

  // Run health checks for configured integrations
  const enriched = await Promise.all(
    integrations.map(async (int) => {
      if (int.id === "wati" && int.configured) {
        const health = await watiIntegration.healthCheck().catch(() => ({ connected: false }))
        return { ...int, health }
      }
      return int
    })
  )

  const configured = enriched.filter((i) => i.configured).length

  return NextResponse.json({
    integrations: enriched,
    total: enriched.length,
    configured,
  })
})
