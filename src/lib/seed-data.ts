export const planTasks = [
  // Foundation Phase (Days 1-15)
  { day: 1, title: "Recon & Initial Outreach to Ultimo Trading", description: "Visit ultimotradingltd.co.ke, do pre-pitch recon, send outreach for lead qualification services", phase: "foundation", category: "outreach", priority: "critical" },
  { day: 2, title: "Set up core infrastructure", description: "Zoho CRM, Make.com, QMe, Wati.io, Instantly.ai accounts", phase: "foundation", category: "admin", priority: "high" },
  { day: 3, title: "Build Voiceflow lead qualification chatbot", description: "8-block flow with scoring and 3 exit paths for Ultimo lead capture", phase: "foundation", category: "build", priority: "high" },
  { day: 4, title: "Build Make.com workflows", description: "5 scenarios: capture, follow-up, booking, no-show, reporting for Ultimo", phase: "foundation", category: "build", priority: "high" },
  { day: 5, title: "End-to-end system test & go-live", description: "6 tests, fix bugs, deploy QMe + Wati + Instantly sequences", phase: "foundation", category: "build", priority: "critical" },
  { day: 6, title: "Build Looker Studio dashboard", description: "Lead flow, conversion, pipeline KPIs", phase: "foundation", category: "build", priority: "medium" },
  { day: 7, title: "First SEO article published", description: "WhatsApp automation for Kenyan SMEs", phase: "foundation", category: "content", priority: "high" },
  { day: 8, title: "Discovery call with Ultimo Trading", description: "Present pipeline audit, share 5-slide report on lead qualification automation", phase: "foundation", category: "outreach", priority: "critical" },
  { day: 9, title: "Proposal submission to Ultimo", description: "$2,500/mo retainer proposal + setup fee for lead qualification & WhatsApp follow-up", phase: "foundation", category: "outreach", priority: "critical" },
  { day: 10, title: "Follow-up sequence to 20 cold prospects", description: "Wholesale, import/export companies in Nairobi via Sokogate connections", phase: "foundation", category: "outreach", priority: "high" },
  { day: 11, title: "Create Canva one-pager & proposal deck", description: "Problem/solution/ROI template featuring Ultimo case study", phase: "foundation", category: "admin", priority: "medium" },
  { day: 12, title: "Publish 2nd SEO article", description: "B2B lead generation Kenya", phase: "foundation", category: "content", priority: "medium" },
  { day: 13, title: "Optimize Voiceflow chatbot from data", description: "Refine scoring thresholds based on conversations", phase: "foundation", category: "build", priority: "medium" },
  { day: 14, title: "LinkedIn profile & content optimization", description: "Position as AI automation specialist", phase: "foundation", category: "admin", priority: "low" },
  { day: 15, title: "Review & adjust foundation phase", description: "Metrics review, refine targeting", phase: "foundation", category: "admin", priority: "high" },

  // Anchor Phase (Days 16-30)
  { day: 16, title: "Close Ultimo Trading deal", description: "Contract signing, setup fee collection, kickoff for lead qual automation", phase: "anchor", category: "outreach", priority: "critical" },
  { day: 17, title: "Ultimo onboarding Day 1", description: "System setup, team training, QMe queue configuration for lead capture", phase: "anchor", category: "build", priority: "critical" },
  { day: 18, title: "Ultimo onboarding Day 2", description: "Make.com workflow customisation for lead qualification & WhatsApp follow-up", phase: "anchor", category: "build", priority: "critical" },
  { day: 19, title: "Ultimo go-live & monitoring", description: "System handoff, performance baseline measurement on lead capture rates", phase: "anchor", category: "build", priority: "high" },
  { day: 20, title: "SEO article #3: WhatsApp Business API guide", description: "", phase: "anchor", category: "content", priority: "medium" },
  { day: 21, title: "Cold outreach batch #2 (20 prospects)", description: "Logistics & distribution companies via Sokogate sourcing network", phase: "anchor", category: "outreach", priority: "high" },
  { day: 22, title: "Build case study from Ultimo results", description: "Before/after metrics on lead qualification & response times via WhatsApp", phase: "anchor", category: "content", priority: "high" },
  { day: 23, title: "SEO article #4: B2B automation ROI Kenya", description: "", phase: "anchor", category: "content", priority: "medium" },
  { day: 24, title: "Follow-up on cold batch #2 responses", description: "Book discovery calls", phase: "anchor", category: "outreach", priority: "high" },
  { day: 25, title: "SEO article #5: How QMe improves client onboarding", description: "", phase: "anchor", category: "content", priority: "medium" },
  { day: 26, title: "Cold outreach batch #3 (20 prospects)", description: "E-commerce & retail companies through Sokogate platform", phase: "anchor", category: "outreach", priority: "high" },
  { day: 27, title: "Refine outreach messaging from response data", description: "A/B test subject lines, WhatsApp templates for Ultimo-style campaigns", phase: "anchor", category: "admin", priority: "medium" },
  { day: 28, title: "SEO article #6: No-code CRM setup Kenya", description: "", phase: "anchor", category: "content", priority: "low" },
  { day: 29, title: "Follow-up on batch #3 & close deals", description: "", phase: "anchor", category: "outreach", priority: "high" },
  { day: 30, title: "Month 1 review: financials, pipeline, content", description: "$2,500 target check (Ultimo retainer), adjust plan", phase: "anchor", category: "admin", priority: "critical" },

  // Growth Phase (Days 31-55)
  { day: 31, title: "SEO article #7: Automated lead qualification guide", description: "Targeting trading companies like Ultimo Trading", phase: "growth", category: "content", priority: "medium" },
  { day: 35, title: "Cold outreach batch #4 (30 prospects)", description: "Expanded geographic targeting via Sokogate supplier network", phase: "growth", category: "outreach", priority: "high" },
  { day: 40, title: "SEO article #10: Scaling B2B sales with AI chatbots", description: "", phase: "growth", category: "content", priority: "medium" },
  { day: 45, title: "Cold outreach batch #5 (30 prospects)", description: "Referral-introduced warm outreach from Ultimo & Sokogate network", phase: "growth", category: "outreach", priority: "high" },
  { day: 50, title: "Begin referral system automation", description: "QMe referral queue + Make.com referral workflow", phase: "growth", category: "build", priority: "medium" },
  { day: 55, title: "Mid-point strategy review", description: "Track to $10k+ MRR target", phase: "growth", category: "admin", priority: "high" },

  // Scale Phase (Days 56-75)
  { day: 60, title: "Hire freelance content writer", description: "Scale SEO output to 2x", phase: "scale", category: "admin", priority: "medium" },
  { day: 65, title: "Launch referral partner program", description: "5% commission on referrals", phase: "scale", category: "outreach", priority: "high" },
  { day: 70, title: "SEO content bank reaches 25+ articles", description: "Compound traffic growth", phase: "scale", category: "content", priority: "medium" },
  { day: 75, title: "Final review & scale planning", description: "$22,500 MRR assessment, Year 2 strategy", phase: "scale", category: "admin", priority: "critical" },
]

export const clients = [
  {
    name: "Sokogate",
    company: "sokogate.com",
    email: "partners@sokogate.com",
    phone: "+254 XXX XXX XXX",
    status: "active",
    tier: "enterprise",
    monthlyRetainer: 0,
    setupFee: 0,
    source: "targeted-outreach",
    notes: "Bulk product sourcing marketplace connecting Kenyan wholesalers to global suppliers. Platform partner for sourcing products via sokogate.com."
  },
  {
    name: "Ultimo Trading Ltd",
    company: "ultimotradingltd.co.ke",
    email: "bangali@ultimotradingltd.co.ke",
    phone: "+254 XXX XXX XXX",
    status: "active",
    tier: "enterprise",
    monthlyRetainer: 2500,
    setupFee: 3000,
    source: "targeted-outreach",
    notes: "Anchor client. Running full lead qualification, capture, and follow-up automation via email & WhatsApp. Voiceflow chatbot + Make.com workflows + Wati.io sequences."
  },
  {
    name: "Prospect 1",
    company: "East African Wholesalers",
    email: "info@eastafricanwholesalers.co.ke",
    status: "lead",
    tier: "growth",
    monthlyRetainer: 1150,
    source: "cold-outreach",
    notes: "Import/export company using Sokogate for sourcing. Initial contact made, awaiting discovery call."
  },
  {
    name: "Prospect 2",
    company: "Nairobi Logistics Hub",
    email: "hello@nbi-logistics.co.ke",
    status: "qualified",
    tier: "growth",
    monthlyRetainer: 1150,
    source: "cold-outreach",
    notes: "Logistics company interested in WhatsApp automation for shipment notifications & lead follow-up."
  },
  {
    name: "Prospect 3",
    company: "Kenya Trade Network",
    email: "info@ktn.co.ke",
    status: "lead",
    tier: "starter",
    monthlyRetainer: 385,
    source: "seo",
    notes: "Found through website. Small import/export consultancy using Sokogate sourcing."
  },
  {
    name: "TechRetail Kenya",
    company: "TechRetail Kenya Ltd",
    email: "partners@techretail.co.ke",
    status: "onboarding",
    tier: "growth",
    monthlyRetainer: 1150,
    setupFee: 1500,
    source: "referral",
    notes: "Referral from Ultimo via Sokogate network. Electronics distributor needing lead qualification automation."
  },
]

export const revenueEntries = [
  { date: new Date("2026-01-15"), clientName: "Ultimo Trading Ltd", amount: 3000, type: "setup-fee", category: "enterprise", note: "Setup fee - lead qualification chatbot + WhatsApp workflows + onboarding" },
  { date: new Date("2026-02-01"), clientName: "Ultimo Trading Ltd", amount: 2500, type: "retainer", category: "enterprise", note: "Month 1 retainer - lead capture & follow-up automation" },
  { date: new Date("2026-03-01"), clientName: "Ultimo Trading Ltd", amount: 2500, type: "retainer", category: "enterprise", note: "Month 2 retainer - lead qualification & WhatsApp outreach" },
  { date: new Date("2026-03-15"), clientName: "TechRetail Kenya Ltd", amount: 1500, type: "setup-fee", category: "growth", note: "Setup fee" },
  { date: new Date("2026-04-01"), clientName: "Ultimo Trading Ltd", amount: 2500, type: "retainer", category: "enterprise", note: "Month 3 retainer - lead qualification & email/WhatsApp follow-up" },
  { date: new Date("2026-04-01"), clientName: "TechRetail Kenya Ltd", amount: 1150, type: "retainer", category: "growth", note: "Month 1 retainer" },
]

export const campaignTemplates = [
  { name: "WhatsApp Lead Capture Flow", channel: "whatsapp", type: "warm", content: "Hi {{name}}, welcome! We saw you're interested in trading products. We can help qualify leads and manage follow-ups automatically. At ultimotradingltd.co.ke, we handle lead capture via WhatsApp using automated sequences." },
  { name: "Cold Outreach - Wholesale Sourcing", channel: "email", type: "cold", content: "Hi {{name}},\nI noticed {{company}} is in the wholesale space. With sokogate.com, businesses access bulk product sourcing from global suppliers. And at ultimotradingltd.co.ke, we handle lead qualification and follow-up via email & WhatsApp automation. Open to a 15-min chat?" },
  { name: "Warm Follow-up - LinkedIn", channel: "linkedin", type: "warm", content: "Hi {{name}}, following up on our connection. We help B2B trading companies source products via sokogate.com and automate lead follow-up using WhatsApp & email (like we do at ultimotradingltd.co.ke). Keen to share a case study?" },
  { name: "WhatsApp Nurture - Lead Qual", channel: "whatsapp", type: "warm", content: "Hi {{name}}, it's Alex from AI Business Automation. Just checking if you had a chance to explore sokogate.com for product sourcing. We can also set up automated lead qualification & follow-up via WhatsApp — just like our Ultimo Trading system." },
  { name: "Email Re-engagement", channel: "email", type: "re-engagement", content: "Subject: Still interested in lead automation?\n\nHi {{name}},\nIt's been a few weeks. We've since onboarded 2 more trading companies via the Sokogate network. ultimotradingltd.co.ke is our reference for lead qualification via email & WhatsApp. Happy to share updated ROI data." },
]

export const contentArticles = [
  { title: "WhatsApp Automation for Kenyan SMEs: The Complete 2026 Guide", keyword: "WhatsApp automation Kenya", status: "published", week: 1, month: 1, wordCount: 2200, views: 340, leadsGenerated: 2 },
  { title: "B2B Lead Generation in Kenya: How to Automate Your Pipeline", keyword: "B2B lead generation Kenya", status: "published", week: 2, month: 1, wordCount: 1800, views: 280, leadsGenerated: 1 },
  { title: "WhatsApp Business API vs Wati.io vs Twilio: Kenya Guide", keyword: "WhatsApp Business API Kenya", status: "scheduled", week: 3, month: 1, wordCount: 2500, views: 0, leadsGenerated: 0 },
  { title: "The ROI of B2B Automation for Kenyan Trading Companies", keyword: "B2B automation ROI Kenya", status: "scheduled", week: 4, month: 1, wordCount: 2000, views: 0, leadsGenerated: 0 },
  { title: "Sokogate: How Bulk Product Sourcing Works for Kenyan Wholesalers", keyword: "bulk product sourcing Kenya", status: "scheduled", week: 5, month: 2, wordCount: 1800, views: 0, leadsGenerated: 0 },
  { title: "Lead Qualification via WhatsApp: Ultimo Trading Case Study", keyword: "WhatsApp lead qualification", status: "idea", week: 6, month: 2 },
  { title: "Automated Lead Qualification: A Practical Guide", keyword: "automated lead qualification", status: "idea", week: 7, month: 2 },
]

export const documents = [
  { filename: "75-DAY-AI-BUSINESS-PLAN.md", title: "75-Day AI Business Plan", description: "Master strategy to $22,500/mo with phases, revenue math, tool costs", category: "plan", pages: 15 },
  { filename: "DAY-1-PLAYBOOK.md", title: "Day 1 Playbook", description: "Pitch script, 30-min call structure, data checklist", category: "pitch", pages: 12 },
  { filename: "PIPELINE-AUDIT-REPORT-TEMPLATE.md", title: "Pipeline Audit Report Template", description: "5-slide fill-in-the-blank report for client presentations", category: "pitch", pages: 10 },
  { filename: "DAYS-2-5-TECHNICAL-BUILD.md", title: "Days 2-5 Technical Build", description: "Full build sequence for Voiceflow, Make, QMe, Wati, Instantly", category: "technical", pages: 20 },
  { filename: "FALLBACK-PITCH-ALTERNATIVE-TARGETS.md", title: "Fallback Pitch & Alternative Targets", description: "4 sectors, objection scripts, follow-up sequence", category: "pitch", pages: 14 },
  { filename: "FINANCIAL-MODEL-SPREADSHEET.md", title: "Financial Model Spreadsheet", description: "8-tab Google Sheets model with formulas and scenarios", category: "financial", pages: 12 },
  { filename: "VOICEFLOW-CHATBOT-NODE-MAP.md", title: "Voiceflow Chatbot Node Map", description: "Every block, button, variable, JSON export for lead qualification bot", category: "technical", pages: 18 },
  { filename: "CANVA-TEMPLATE-BRIEFS.md", title: "Canva Template Briefs", description: "One-pager, proposal deck, and case study specs featuring Ultimo & Sokogate", category: "marketing", pages: 8 },
  { filename: "MAKE-DOT-COM-SCENARIO-BLUEPRINTS.md", title: "Make.com Scenario Blueprints", description: "5 scenarios module-by-module with error handling for lead qualification", category: "technical", pages: 16 },
  { filename: "WATI-DOT-IO-SEQUENCES-SETUP.md", title: "Wati.io Sequences Setup", description: "10 templates, Meta approval, branching logic, auto-reply flows for WhatsApp lead capture", category: "technical", pages: 14 },
  { filename: "SEO-CONTENT-CALENDAR-90-DAY.md", title: "SEO Content Calendar 90-Day", description: "32 articles with outlines, keyword mapping, promotion plan targeting sourcing & lead gen", category: "marketing", pages: 16 },
]

export const financialSnapshots = [
  { month: 1, year: 2026, revenue: 3000, costs: 312, profit: 2688, clients: 1, pipelineValue: 5000 },
  { month: 2, year: 2026, revenue: 2500, costs: 312, profit: 2188, clients: 1, pipelineValue: 7300 },
  { month: 3, year: 2026, revenue: 4000, costs: 412, profit: 3588, clients: 2, pipelineValue: 9600 },
  { month: 4, year: 2026, revenue: 3650, costs: 412, profit: 3238, clients: 2, pipelineValue: 12000 },
  { month: 5, year: 2026, revenue: 5950, costs: 512, profit: 5438, clients: 3, pipelineValue: 15000 },
  { month: 6, year: 2026, revenue: 7100, costs: 512, profit: 6588, clients: 4, pipelineValue: 18500 },
]
