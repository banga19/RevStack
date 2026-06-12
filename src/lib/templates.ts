/**
 * Automation Template Library
 *
 * Pre-built templates that users can deploy to quickly set up
 * common automation workflows for B2B trading companies.
 */

export type TemplateCategory = "lead-generation" | "follow-up" | "onboarding" | "compliance" | "trade-corridor" | "reporting"

export interface TemplateAction {
  type: "create_pipeline_action" | "create_outreach_campaign" | "create_compliance_record" | "create_ers_snapshot" | "send_whatsapp" | "configure_sequence"
  label: string
  description: string
}

export interface AutomationTemplate {
  id: string
  name: string
  description: string
  longDescription: string
  category: TemplateCategory
  icon: string
  estimatedTime: string
  difficulty: "beginner" | "intermediate" | "advanced"
  popular: boolean
  actions: TemplateAction[]
  steps: { order: number; title: string; description: string }[]
  // Sample configuration that gets deployed
  defaultConfig: Record<string, any>
}

export const TEMPLATES: AutomationTemplate[] = [
  {
    id: "lead-qualification",
    name: "Lead Qualification Bot",
    description: "Auto-qualify inbound leads via WhatsApp and web forms",
    longDescription: "Set up an automated lead qualification pipeline that captures inbound inquiries, scores them by intent, and routes hot leads to your team instantly. Includes WhatsApp auto-reply templates and CRM sync.",
    category: "lead-generation",
    icon: "MessageSquare",
    estimatedTime: "15 min",
    difficulty: "beginner",
    popular: true,
    actions: [
      { type: "create_outreach_campaign", label: "WhatsApp lead capture", description: "Create WhatsApp auto-reply sequence for new leads" },
      { type: "create_pipeline_action", label: "Lead scoring setup", description: "Add lead scoring to pipeline with follow-up reminders" },
    ],
    steps: [
      { order: 1, title: "Connect WhatsApp", description: "Link your WATI.io account and WhatsApp Business number" },
      { order: 2, title: "Enable lead capture", description: "Auto-reply to inbound messages with qualification questions" },
      { order: 3, title: "Set scoring rules", description: "Configure keyword-based lead scoring (hot/warm/cold)" },
      { order: 4, title: "Route hot leads", description: "High-scored leads forwarded to team with instant notification" },
    ],
    defaultConfig: {
      autoReplyEnabled: true,
      scoringThreshold: 70,
      forwardToEmail: true,
      createPipelineTask: true,
    },
  },
  {
    id: "followup-sequence",
    name: "Multi-Channel Follow-Up",
    description: "Automated WhatsApp + email follow-up sequences for leads",
    longDescription: "Create a multi-touch follow-up sequence that reaches leads via WhatsApp and email at optimal intervals. Tracks opens, replies, and conversions across both channels.",
    category: "follow-up",
    icon: "Send",
    estimatedTime: "20 min",
    difficulty: "beginner",
    popular: true,
    actions: [
      { type: "create_outreach_campaign", label: "24h follow-up", description: "First follow-up 24 hours after initial contact" },
      { type: "create_outreach_campaign", label: "3-day follow-up", description: "Second follow-up with case study or social proof" },
      { type: "create_outreach_campaign", label: "7-day re-engagement", description: "Final re-engagement with offer or new information" },
    ],
    steps: [
      { order: 1, title: "Choose sequence type", description: "Select cold, warm, or re-engagement sequence template" },
      { order: 2, title: "Customize messages", description: "Edit WhatsApp and email templates for each touchpoint" },
      { order: 3, title: "Set timing", description: "Configure delay between each follow-up step" },
      { order: 4, title: "Launch sequence", description: "Activate the sequence — it will run automatically" },
    ],
    defaultConfig: {
      maxFollowUps: 3,
      daysBetween: [1, 3, 7],
      channels: ["whatsapp", "email"],
      stopOnReply: true,
    },
  },
  {
    id: "onboarding-automation",
    name: "Client Onboarding Flow",
    description: "Streamline new client onboarding with automated steps",
    longDescription: "Automate the entire client onboarding process — from welcome email and document collection to account setup and first check-in. Reduces manual onboarding work by 80%.",
    category: "onboarding",
    icon: "UserPlus",
    estimatedTime: "25 min",
    difficulty: "intermediate",
    popular: true,
    actions: [
      { type: "create_pipeline_action", label: "Welcome sequence", description: "Send welcome email + WhatsApp with next steps" },
      { type: "create_pipeline_action", label: "Document collection", description: "Request compliance docs and business information" },
      { type: "create_outreach_campaign", label: "3-day check-in", description: "Follow up after 3 days to ensure smooth onboarding" },
    ],
    steps: [
      { order: 1, title: "Welcome message", description: "Automated welcome with account credentials and next steps" },
      { order: 2, title: "Document collection", description: "Request certifications, licenses, and business docs" },
      { order: 3, title: "Account setup", description: "Configure pipeline, outreach, and reporting for the client" },
      { order: 4, title: "First check-in", description: "Automated check-in after 3 days to ensure smooth start" },
    ],
    defaultConfig: {
      sendWelcomeEmail: true,
      sendWhatsAppWelcome: true,
      requestDocuments: true,
      checkInDays: 3,
    },
  },
  {
    id: "compliance-tracking",
    name: "Compliance & Certification Tracker",
    description: "Track certifications and get alerts before they expire",
    longDescription: "Set up automated compliance tracking for export certifications (HACCP, Halal, Organic, FDA, etc.). Get alerts 30 days before expiry and track renewal progress.",
    category: "compliance",
    icon: "Shield",
    estimatedTime: "15 min",
    difficulty: "beginner",
    popular: false,
    actions: [
      { type: "create_compliance_record", label: "Certification tracking", description: "Track HACCP, Halal, Organic, and other certifications" },
      { type: "create_pipeline_action", label: "Expiry reminders", description: "Get notified 30 days before any certification expires" },
    ],
    steps: [
      { order: 1, title: "Add certifications", description: "Enter your current certifications and expiry dates" },
      { order: 2, title: "Set alert timing", description: "Configure how far in advance to get renewal reminders" },
      { order: 3, title: "Track progress", description: "Monitor certification status from the compliance dashboard" },
    ],
    defaultConfig: {
      alertDaysBefore: 30,
      trackCertifications: ["haccp", "halal", "organic", "fda", "phytosanitary"],
      autoGenerateTasks: true,
    },
  },
  {
    id: "pipeline-audit",
    name: "Pipeline Audit & Leak Analysis",
    description: "Audit your sales pipeline, find leaks, and build an automation roadmap",
    longDescription: "Map your current lead flow state, identify bottlenecks and revenue leakage, then design an automated future state. Includes a quantified ROI model and phased implementation plan — based on the full pipeline audit framework.",
    category: "reporting",
    icon: "BarChart3",
    estimatedTime: "30 min",
    difficulty: "intermediate",
    popular: false,
    actions: [
      { type: "create_pipeline_action", label: "Current state map", description: "Document the as-is lead flow with identified bottlenecks" },
      { type: "create_pipeline_action", label: "Leakage analysis", description: "Quantify revenue loss from missed follow-ups and slow responses" },
      { type: "create_outreach_campaign", label: "Automated future state", description: "Create an automated follow-up sequence based on audit findings" },
    ],
    steps: [
      { order: 1, title: "Map current state", description: "Document your existing lead flow across all channels" },
      { order: 2, title: "Identify bottlenecks", description: "Find where leads are falling through the cracks" },
      { order: 3, title: "Calculate leakage", description: "Quantify lost revenue in missed follow-up opportunities" },
      { order: 4, title: "Design automation", description: "Build the automated future state with measurable KPIs" },
    ],
    defaultConfig: {
      channels: ["whatsapp", "email", "website", "referral"],
      responseTimeTarget: "< 2 min",
      captureRate: 95,
    },
  },
  {
    id: "content-seo",
    name: "SEO Content Calendar",
    description: "90-day content plan to drive inbound B2B leads",
    longDescription: "Launch a structured SEO content campaign targeting B2B trading companies. Includes keyword mapping, article outlines, publishing schedule, and promotion plan — built from the full 90-day SEO strategy.",
    category: "lead-generation",
    icon: "Newspaper",
    estimatedTime: "20 min",
    difficulty: "intermediate",
    popular: false,
    actions: [
      { type: "create_pipeline_action", label: "Keyword map", description: "Define primary and secondary keywords with search intent" },
      { type: "create_outreach_campaign", label: "Content promotion", description: "Set up outreach to promote published articles" },
    ],
    steps: [
      { order: 1, title: "Define keywords", description: "Map primary and secondary keywords by search intent" },
      { order: 2, title: "Create content plan", description: "Outline 12 weekly articles across 3 months" },
      { order: 3, title: "Set up promotion", description: "Configure LinkedIn and email promotion for each article" },
      { order: 4, title: "Track performance", description: "Monitor views, leads generated, and keyword rankings" },
    ],
    defaultConfig: {
      articlesPerWeek: 1,
      months: 3,
      promotionChannels: ["linkedin", "email", "whatsapp"],
      targetKeywords: ["B2B lead automation", "WhatsApp CRM", "trade automation"],
    },
  },
  {
    id: "email-deliverability",
    name: "Email Deliverability Setup",
    description: "Configure SPF, DKIM, DMARC for transactional emails",
    longDescription: "Set up proper email authentication to ensure your transactional emails (welcome, follow-ups, invoices) land in inboxes not spam. Configures SPF, DKIM, DMARC DNS records and connects an SMTP provider.",
    category: "onboarding",
    icon: "Mail",
    estimatedTime: "15 min",
    difficulty: "beginner",
    popular: false,
    actions: [
      { type: "create_pipeline_action", label: "DNS configuration", description: "Document SPF, DKIM, DMARC records to add to DNS" },
      { type: "create_pipeline_action", label: "Provider setup", description: "Configure SendGrid or Resend SMTP credentials" },
    ],
    steps: [
      { order: 1, title: "Choose provider", description: "Select SendGrid, Resend, or Amazon SES" },
      { order: 2, title: "Add DNS records", description: "Publish SPF, DKIM, and DMARC records to your domain" },
      { order: 3, title: "Configure SMTP", description: "Update .env with provider credentials" },
      { order: 4, title: "Verify deliverability", description: "Send test emails and verify inbox placement" },
    ],
    defaultConfig: {
      provider: "sendgrid",
      spfRecord: true,
      dkimRecord: true,
      dmarcRecord: true,
    },
  },
  {
    id: "korea-corridor",
    name: "Korea Trade Corridor Setup",
    description: "Match with Korean buyers and manage the export pipeline",
    longDescription: "Set up a Korea-Africa trade corridor pipeline. Get matched with Korean procurement teams, track compliance requirements, and manage the export readiness process end-to-end.",
    category: "trade-corridor",
    icon: "Globe",
    estimatedTime: "30 min",
    difficulty: "advanced",
    popular: false,
    actions: [
      { type: "create_ers_snapshot", label: "ERS assessment", description: "Run Export Readiness Score assessment for Korea market" },
      { type: "create_pipeline_action", label: "Buyer matching", description: "Match with Korean procurement teams by product category" },
      { type: "create_compliance_record", label: "Korea compliance check", description: "Track Korean import certification requirements" },
    ],
    steps: [
      { order: 1, title: "ERS Assessment", description: "Complete Export Readiness Score evaluation" },
      { order: 2, title: "Compliance Gap Analysis", description: "Identify certifications needed for Korean market access" },
      { order: 3, title: "Buyer Matching", description: "Get matched with active Korean procurement teams" },
      { order: 4, title: "Pilot Transaction", description: "Start with a sample shipment to build trade history" },
    ],
    defaultConfig: {
      targetBuyers: 5,
      requiredCertifications: ["haccp", "halal", "phytosanitary", "korean-import"],
      pilotShipmentSize: "sample",
    },
  },
  {
    id: "weekly-reporting",
    name: "Automated Weekly Reports",
    description: "Generate and send weekly performance reports automatically",
    longDescription: "Automate your weekly reporting — pipeline metrics, revenue updates, lead conversion rates, and outreach performance. Reports are generated and shared with stakeholders via email and WhatsApp.",
    category: "reporting",
    icon: "BarChart3",
    estimatedTime: "10 min",
    difficulty: "beginner",
    popular: false,
    actions: [
      { type: "create_outreach_campaign", label: "Weekly summary", description: "Send automated weekly metrics to stakeholders" },
      { type: "create_pipeline_action", label: "Report review task", description: "Create a recurring task to review weekly numbers" },
    ],
    steps: [
      { order: 1, title: "Select metrics", description: "Choose which KPIs to include in the report" },
      { order: 2, title: "Set recipients", description: "Who should receive the automated reports" },
      { order: 3, title: "Schedule delivery", description: "Choose day and time for weekly report delivery" },
    ],
    defaultConfig: {
      dayOfWeek: "Monday",
      timeOfDay: "09:00",
      recipients: ["team"],
      metrics: ["revenue", "clients", "pipeline", "outreach"],
    },
  },
  {
    id: "lead-scoring-ai",
    name: "AI Lead Scoring Engine",
    description: "Automatically score and prioritize leads by buying intent",
    longDescription: "Deploy an AI-powered lead scoring system that analyzes inbound inquiries across WhatsApp, web forms, and email — assigning qualification scores (0-100), routing hot leads instantly, and nurturing cold ones on autopilot.",
    category: "lead-generation",
    icon: "BrainCircuit",
    estimatedTime: "15 min",
    difficulty: "intermediate",
    popular: false,
    actions: [
      { type: "create_pipeline_action", label: "Scoring rules", description: "Configure keyword and intent-based scoring rules for your industry" },
      { type: "create_outreach_campaign", label: "Hot lead routing", description: "Create auto-alert campaign for high-scored leads" },
      { type: "create_ers_snapshot", label: "Lead quality baseline", description: "Take a snapshot of current lead quality baseline" },
    ],
    steps: [
      { order: 1, title: "Define scoring criteria", description: "Set rules for what makes a hot lead (budget, intent, timeline)" },
      { order: 2, title: "Configure routing", description: "Hot leads → instant team alert. Warm → nurture sequence. Cold → monthly drip." },
      { order: 3, title: "Set SLA targets", description: "Define response time targets for each lead tier" },
      { order: 4, title: "Monitor & optimize", description: "Review scoring accuracy weekly and adjust rules" },
    ],
    defaultConfig: {
      hotThreshold: 70,
      warmThreshold: 40,
      slaHotMinutes: 2,
      slaWarmHours: 24,
      enableAutoReply: true,
    },
  },
  {
    id: "compliance-automation",
    name: "Compliance & Certification Automation",
    description: "Track export certifications with automatic expiry alerts",
    longDescription: "Set up automated compliance tracking for all your export certifications (HACCP, Halal, Organic, FDA, Korean Import, Phytosanitary). Get alerts 60, 30, and 7 days before any certification expires. Generate compliance reports for buyers automatically.",
    category: "compliance",
    icon: "ShieldCheck",
    estimatedTime: "20 min",
    difficulty: "beginner",
    popular: false,
    actions: [
      { type: "create_compliance_record", label: "Certification tracking", description: "Track HACCP, Halal, Organic, FDA, Korean Import certifications" },
      { type: "create_pipeline_action", label: "60-30-7 alert chain", description: "Set up alerts at 60, 30, and 7 days before expiry" },
      { type: "create_outreach_campaign", label: "Buyer compliance report", description: "Auto-generate compliance summary for buyer due diligence" },
    ],
    steps: [
      { order: 1, title: "Add certifications", description: "Enter your current certifications and expiry dates" },
      { order: 2, title: "Set alert timing", description: "Configure 60-30-7 day expiry alert chain" },
      { order: 3, title: "Connect buyers", description: "Link compliance reports to buyer due diligence requests" },
      { order: 4, title: "Auto-renew reminders", description: "Set up renewal process reminders 60 days before expiry" },
    ],
    defaultConfig: {
      alertDays: [60, 30, 7],
      trackCertifications: ["haccp", "halal", "organic", "fda", "phytosanitary", "korean-import"],
      autoGenerateBuyerReport: true,
      renewalLeadDays: 60,
    },
  },
  {
    id: "multi-corridor-matching",
    name: "Multi-Corridor Trade Matching",
    description: "Match with buyers across China, Korea, and Africa trade corridors",
    longDescription: "Set up automated trade corridor matching that connects your products with verified buyers across China→Africa, Korea→Africa, and Africa→Africa trade corridors. Includes product-to-buyer matching, compliance requirement comparison, and pilot transaction setup.",
    category: "trade-corridor",
    icon: "Network",
    estimatedTime: "30 min",
    difficulty: "advanced",
    popular: false,
    actions: [
      { type: "create_ers_snapshot", label: "Cross-corridor ERS", description: "Run Export Readiness Score assessment for all target corridors" },
      { type: "create_compliance_record", label: "Corridor compliance gap", description: "Compare certification requirements across target markets" },
      { type: "create_pipeline_action", label: "Buyer matching queue", description: "Set up automated matching with verified buyers per corridor" },
    ],
    steps: [
      { order: 1, title: "Select corridors", description: "Choose which trade corridors to target (China, Korea, Africa-Africa)" },
      { order: 2, title: "ERS per market", description: "Run Export Readiness Score for each target corridor" },
      { order: 3, title: "Compliance mapping", description: "Map certification requirements for each target market" },
      { order: 4, title: "Activate matching", description: "Enable automated buyer matching based on product-market fit" },
    ],
    defaultConfig: {
      corridors: ["china-africa", "korea-africa", "africa-africa"],
      targetBuyersPerCorridor: 10,
      maxActiveMatches: 5,
      minimumErsScore: 50,
    },
  },
]

export function getTemplatesByCategory(category: TemplateCategory): AutomationTemplate[] {
  return TEMPLATES.filter((t) => t.category === category)
}

export function getTemplateById(id: string): AutomationTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

export function getPopularTemplates(): AutomationTemplate[] {
  return TEMPLATES.filter((t) => t.popular)
}

export const CATEGORIES: { id: TemplateCategory; label: string; description: string }[] = [
  { id: "lead-generation", label: "Lead Generation", description: "Capture and qualify leads automatically" },
  { id: "follow-up", label: "Follow-Up Sequences", description: "Multi-channel nurturing workflows" },
  { id: "onboarding", label: "Client Onboarding", description: "Streamline new client setup" },
  { id: "compliance", label: "Compliance Tracking", description: "Certification and compliance management" },
  { id: "trade-corridor", label: "Trade Corridor", description: "Cross-border trade automation" },
  { id: "reporting", label: "Reporting", description: "Automated metrics and insights" },
]
