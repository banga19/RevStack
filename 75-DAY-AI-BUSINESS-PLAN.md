# One-Person AI Business: 75-Day Scale Plan to $22,500/month

## Target Client: Ultimo Trading Ltd (ultimotradingltd.co.ke)
## Platform: Sokogate (B2B Wholesale E-Commerce)
## Stack: No-Code + WhatsApp + Email + QMe + SEO

---

# Executive Summary

**The Opportunity:** Ultimo Trading Ltd runs **Sokogate**, a B2B e-commerce platform connecting African wholesalers, importers, and exporters to global markets. Their pipeline — lead qualification, follow-ups, and client onboarding — is currently manual, causing leakage and slow growth.

**The Solution:** A one-person AI-powered automation agency that plugs into Ultimo Trading as the **anchor client**, automates their entire lead-to-onboarding workflow, then replicates the model across similar B2B trading/SME companies in Kenya and East Africa.

**The Target:** $22,500/month recurring revenue (≈KES 2.9M/month) by month 6.

**Revenue Mix:**
| Revenue Stream | Monthly Target | % of Total |
|---|---|---|
| Anchor Retainer (Ultimo Trading) | $2,500 | 11% |
| Client Retainers (3-4 other B2B clients) | $8,000 | 36% |
| Setup & Onboarding Fees (one-time, spread) | $4,000 | 18% |
| Performance Upsells (lead gen add-ons) | $5,000 | 22% |
| Affiliate/Referral commissions | $3,000 | 13% |

---

# The Service Package

## What You Sell to Ultimo Trading (Anchor Offer)

### Package: "Sokogate Growth Engine" — $2,500/month retainer

| Module | What It Does | Tools Used |
|---|---|---|
| **Lead Qualification Bot** | Website + WhatsApp bot that pre-qualifies wholesale buyers (company size, order volume, location) before human handoff | Voiceflow / Landbot + WhatsApp API + QMe |
| **Automated Follow-Up Sequence** | Multi-touch follow-up via WhatsApp + Email with smart timing based on lead behavior (opens, clicks, replies) | Make.com + Wati.io (WhatsApp) + Instantly.ai (Email) |
| **Client Onboarding Funnel** | Self-serve onboarding flow: form → document collection → account setup → welcome sequence | Typeform + Airtable + QMe booking |
| **CRM Sync & Pipeline View** | All leads, conversations, and deal stages visible in one CRM dashboard | Zoho CRM + Make.com pipelines |
| **Monthly Performance Report** | Auto-generated report showing conversion metrics, pipeline velocity, roi | Google Data Studio / Looker Studio |

## What You Offer Other Clients (Scaled Package)

Tiered retainer model:
| Tier | Price (KES) | Price (USD) | What's Included |
|---|---|---|---|
| **Starter** | 50,000/mo | ~$385/mo | WhatsApp auto-responder + basic lead capture + 1 workflow |
| **Growth** | 150,000/mo | ~$1,150/mo | Full lead qual + multi-channel follow-up + onboarding automation + CRM sync |
| **Enterprise** | 350,000/mo | ~$2,700/mo | Everything above + dedicated AI agent + priority support + monthly strategy |

---

# The 75-Day Execution Plan

## Phase 1: Foundation (Days 1-15)

### Week 1: Intelligence & Offer Design

**Day 1-3: Deep Dive into Ultimo Trading**
- [ ] Audit Sokogate's current lead flow: How do leads enter? What happens after? Where do they drop off?
- [ ] Map the customer journey from first touch to onboarding to first order
- [ ] Interview the sales/ops team (or founder) — what's the #1 pipeline pain?
- [ ] Quantify current conversion rates and cycle times

**Day 4-6: Build the Tech Stack**
- [ ] Set up **Zoho CRM** (free tier for 3 users) — this is your single source of truth
- [ ] Connect **Make.com** account — this is your orchestration layer
- [ ] Register for **Wati.io** or **Respond.io** (WhatsApp Business API via BSP)
- [ ] Set up **Instantly.ai** for email warmup (start warming 2-3 sending domains NOW)
- [ ] Explore **QMe** integration — use it for appointment booking, queue management, and client scheduling within the onboarding flow
- [ ] Set up **Voiceflow** or **Landbot** for chatbot builder
- [ ] Configure **Airtable** as the lightweight database for onboarding docs/data

**Day 7-10: Build the Core Automation (Ultimo Pilot)**

**Workflow 1: Lead Capture & Qualification**
```
Website visitor / WhatsApp inquiry
  → Landbot/Voiceflow chatbot asks 5 qualifying questions:
      1. Business name & registration number
      2. Expected monthly order volume (KES)
      3. Products/industries of interest
      4. Location (country, city)
      5. Current supplier arrangement
  → Qualified (volume > 500K KES) → Push to Zoho CRM + notify sales
  → Unqualified → Push to nurture sequence (email drip)
  → All data stored in Airtable
```

**Workflow 2: QMe Appointment Booking**
```
Qualified lead
  → QMe sends automated booking link via WhatsApp
  → Lead selects time slot (integration with Google Calendar)
  → QMe sends reminder 24hrs and 1hr before
  → Post-call follow-up with onboarding steps
  → QMe tracks no-show rate → auto-reschedule flow
```

**Day 11-13: Follow-Up & Nurture Sequences**

**WhatsApp Follow-Up Sequence (Wati.io/Respond.io):**
```
T+0hrs: Thank you + qualification summary + next steps
T+24hrs: Case study of similar business (value prop)
T+72hrs: "Haven't heard back — here's a direct link to book a call" (via QMe)
T+7days: Limited-time onboarding offer
T+14days: Final follow-up before moving to monthly nurture
```

**Email Follow-Up Sequence (Instantly.ai):**
```
Email 1 (T+0): Welcome + qualification confirmation
Email 2 (T+2d): "How [similar company] grew 40% using Sokogate"
Email 3 (T+5d): Product catalog teaser + success stories
Email 4 (T+10d): Direct CTA — "Let's set up your account in 15 minutes" (QMe link)
Email 5 (T+21d): "Still interested? Here's what you missed"
```

**Day 14-15: Test & Launch Pilot**
- [ ] End-to-end test of the full flow
- [ ] Fix broken automations
- [ ] Soft-launch with 10 real leads
- [ ] Measure: response rates, completion rates, conversion time

---

## Phase 2: Anchor Client Revenue (Days 16-30)

### Week 3-4: Go Live with Ultimo Trading

**Day 16-18: Production Rollout**
- [ ] Connect actual WhatsApp Business number (Ultimo's official line)
- [ ] Embed chatbot on Sokogate website
- [ ] Activate QMe booking flows on live site
- [ ] Train client team on CRM dashboard

**Day 19-21: First 7-Day Optimization Sprint**
- [ ] Review first 50+ lead interactions
- [ ] Tweak chatbot questions based on real responses
- [ ] Adjust follow-up timing based on open/reply rates
- [ ] Add "human handoff" triggers at the right moment

**Day 22-25: Set Up Reporting & SEO Foundation**
- [ ] Build **Looker Studio** dashboard (leads, conversion %, pipeline velocity, onboarding completion %)
- [ ] Start SEO content engine:
  - Publish 2 blog posts targeting:
    - "B2B wholesale sourcing Africa"
    - "Sokogate how it works"
    - "Import/export automation Kenya"
    - "Wholesale supply chain digitization"
  - Target long-tail keywords where Ultimo Trading ranks 5-20

**Day 26-30: Close Month 1**
- [ ] Deliver first monthly report to Ultimo Trading
- [ ] Collect first retainer payment ($2,500)
- [ ] Document all workflows as SOPs (for replication)
- [ ] Request first testimonial/case study
- [ ] Ask for 3 referral introductions to similar companies

### Goal by Day 30: $2,500 MRR secured

---

## Phase 3: Client Acquisition Engine (Days 31-55)

### Week 5-7: Build Outreach Systems & Close Clients

**Day 31-35: Build the Outreach Machine**

**WhatsApp Outreach (to similar B2B trading/SME companies):**
- [ ] Build target list of 100 B2B trading companies in Kenya (importers, exporters, wholesalers)
- [ ] Use QMe to schedule and manage outreach sequences
- [ ] Create WhatsApp template messages approved by Meta:
  - Template 1: "Hi [Name], I'm automating lead follow-up for companies like ultimotradingltd.co.ke and seeing 3x response rates..."
  - Template 2: Case study share
  - Template 3: "Free 30-min automation audit" (QMe booking link)
- [ ] Sequence: Template 1 → Template 2 (3d later) → Template 3 (5d later) → Call

**Email Outreach:**
- [ ] Import 500+ contacts from Apollo.io (target: logistics managers, ops directors, founders of trading companies)
- [ ] Cold email campaign via Instantly.ai:
  - 3-email sequence, 30 emails/day per warming domain
  - Subject lines focused on pain: "Cutting lead response time from 24hrs to 2mins"
  - CTA: "Free audit — I'll show you what you're losing in pipeline leakage"

**LinkedIn (organic):**
- [ ] Daily: 10 connection requests to trading company decision-makers
- [ ] Weekly: 2 posts about automation wins, ROI metrics, tips

**Day 36-40: Close First 2 Clients (Growth Tier)**
- [ ] Free audit calls → identify 3 quick wins → propose Growth retainer
- [ ] Offer 50% off first month for 3-month commitment
- [ ] Use Ultimo Trading's results as social proof
- [ ] Target: Wholesale distributors, logistics companies, import/export agencies

**Day 41-45: Build & Onboard Client 2 & 3**
- [ ] Replicate core automations (templated per client vertical)
- [ ] 5-day onboarding sprint per client
- [ ] Integrate QMe for their booking/scheduling needs
- [ ] Hand over dashboard and train team

**Day 46-50: SEO & Content Scale**
- [ ] Publish 4 more SEO-optimized articles on your own agency site
- [ ] Target keywords:
  - "WhatsApp automation Kenya"
  - "B2B lead qualification automation"
  - "No-code CRM setup Kenya"
  - "QMe booking system integration"
  - "Sales automation for trading companies"
- [ ] Build backlinks: guest post on Kenyan business blogs, contribute to industry forums

**Day 51-55: Review & Optimize**
- [ ] Analyze outreach conversion data (which channels work best?)
- [ ] Drop low-performing channels, double down on winners
- [ ] Create referral incentive for existing clients
- [ ] Close month 2 with all clients live

### Goal by Day 55: $5,000+ MRR (anchor + 2-3 clients)

---

## Phase 4: Scale & Compound (Days 56-75)

### Week 8-10: Systematize, Compound, Hit $22,500/mo

**Day 56-62: Build Your Agency Stack (Your Own Automation)**
- [ ] Automate your own lead follow-up using the same system you sell
- [ ] Build an AI-powered proposal generator (Typeform → Make.com → Google Docs → PDF)
- [ ] Create an onboarding checklist that fires automatically when a new client signs
- [ ] Set up client satisfaction NPS survey automation (monthly pulse check)

**Day 63-68: Upsell Existing Clients**
- [ ] Every client gets a quarterly business review with upsell opportunities:
  - More advanced workflows (inventory automation, invoice reconciliation)
  - Performance-based add-ons (pay per qualified lead generated)
  - QMe advanced features (queue management for physical locations)
  - Multi-channel expansion (SMS, Telegram, Instagram DM)

**Day 69-72: Final Client Acquisition Push**
- [ ] Run a LinkedIn ad campaign targeting "Operations Director" and "Supply Chain Manager" in Nairobi
- [ ] Convert 2 more Enterprise tier clients
- [ ] Partner with 2 complementary agencies (web dev, digital marketing) for referrals

**Day 73-75: Systematize for Passive Growth**
- [ ] All client workflows documented & templated → can be deployed in 3 days
- [ ] SEO traffic building organically → inbound leads start arriving
- [ ] Set up recurring referral system
- [ ] Create a simple landing page: "B2B Automation for Kenyan Trading Companies — Book a Free Audit" (QMe link)

### Goal by Day 75: $22,500/month MRR

---

# The Revenue Math to $22,500/mo

| Client Type | Monthly Retainer | Number of Clients | Monthly Revenue |
|---|---|---|---|
| Anchor (Ultimo Trading) | $2,500 | 1 | $2,500 |
| Enterprise Tier | $2,700 | 3 | $8,100 |
| Growth Tier | $1,150 | 4 | $4,600 |
| Starter Tier | $385 | 5 | $1,925 |
| Setup Fees (one-time, amortized) | $1,000 avg | 2/mo | $2,000 |
| Performance Add-ons | $500 avg | 5 clients | $2,500 |
| Referral Commissions | — | — | $875 |
| **Total** | | | **$22,500** |

---

# Tool Stack Summary

| Category | Tool | Role | Cost |
|---|---|---|---|
| **CRM** | Zoho CRM | Single source of truth for all leads, deals, contacts | Free-$14/mo |
| **Automation** | Make.com | Workflow orchestration (connects all tools) | $9-$16/mo |
| **Chatbot** | Voiceflow / Landbot | Lead qualification chatbot | Free-$30/mo |
| **WhatsApp** | Wati.io or Respond.io | WhatsApp Business API automation | $49-$99/mo |
| **Email** | Instantly.ai | Cold email warmup + sending | $30/mo |
| **Booking** | **QMe** | Appointment scheduling, queuing, client onboarding | TBD (regional pricing) |
| **Database** | Airtable | Lightweight client data, onboarding docs | $10/mo |
| **Forms** | Typeform | Lead capture forms, onboarding forms | $25/mo |
| **Analytics** | Looker Studio | Client reporting dashboards | Free |
| **Lead Data** | Apollo.io | B2B lead database for outreach | $49/mo |
| **SEO** | Your own site + blog | Inbound lead generation | $10/mo hosting |
| **Website** | Carrd or Framer | Simple agency landing page | $19/mo |
| **Calendar** | Google Calendar | Availability syncing with QMe | Free |
| **Total Monthly Tools Cost** | | | **~$250-$350/mo** |

---

# How QMe Fits Into Every Workflow

QMe is not an afterthought — it's integrated as the **scheduling, queuing, and onboarding backbone** across all client automations.

### In the Lead Qualification Flow:
```
Lead qualified by chatbot
  → QMe sends WhatsApp booking link
  → Lead books discovery call
  → QMe handles reminders, rescheduling, no-show management
  → Post-call: QMe triggers onboarding sequence
```

### In the Client Onboarding Flow:
```
Client signs agreement
  → QMe assigns onboarding slot
  → Client receives step-by-step checklist via WhatsApp
  → QMe queues document uploads, account setup tasks
  → Real-time status visible to both parties
```

### In Ongoing Operations:
```
Client needs support / account review
  → QMe queue management for support tickets
  → Monthly business review scheduled via QMe
  → Automated satisfaction survey after each interaction
  → QMe analytics show service efficiency metrics
```

### In Your Own Agency Operations:
```
Prospect books "Free Automation Audit" via QMe link
  → QMe queues all prospect interactions
  → No double-booking, no missed follow-ups
  → Automated reminders mean you never lose a prospect to silence
```

---

# SEO Strategy for Inbound Lead Flow

### Keyword Clusters to Target

**Primary (High Intent):**
- "B2B lead automation Kenya"
- "WhatsApp CRM for trading companies"
- "Sokogate automation"
- "QMe integration Kenya"
- "Automated client onboarding Kenya"

**Secondary (Informational):**
- "How to automate B2B sales in Kenya"
- "Best no-code automation tools for SMEs"
- "WhatsApp Business API setup Kenya"
- "Reduce lead response time Africa"

**Long Tail:**
- "Automate follow up emails for wholesale business Kenya"
- "B2B lead qualification chatbot WhatsApp Kenya"
- "No code CRM for import export companies Nairobi"

### Content Cadence
- 2 blog posts/week (first 30 days)
- 3 blog posts/week (days 31-75)
- Repurpose into LinkedIn posts
- 1 case study per client onboarded
- Guest post on 2 Kenyan business blogs

### Technical SEO
- Set up Google Search Console for your agency site
- Optimize for Core Web Vitals (lightweight site on Carrd/Framer)
- Build 5-10 backlinks from Kenyan business directories and forums

---

# Risk Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Ultimo Trading churns | Losing $2,500/mo anchor | Never be >40% reliant on one client. Have 3+ in pipeline at all times |
| WhatsApp number gets banned | Lead gen channel down | Use official API through BSP. Never spam. Keep complaint rate <0.05% |
| No-code tools change APIs | Workflows break | Keep SOPs documented. Monitor tool changelogs weekly. Test automations weekly |
| Slow client acquisition | Revenue target missed | Start outreach on Day 1. Offer 50% off first month. Leverage referrals hard |
| Time shortage (one person) | Burnout | Automate everything including your own business. Use QMe to manage your time |

---

# One-Person Operating Cadence

| Time | Activity |
|---|---|
| **Morning (2hrs)** | Check dashboards, fix broken automations, respond to client alerts |
| **Mid-day (3hrs)** | Outreach: LinkedIn connections, WhatsApp sequences, email campaigns |
| **Afternoon (2hrs)** | Client onboarding, audit calls, QMe-scheduled meetings |
| **Evening (1hr)** | SEO content writing, tool exploration, learning |

Total: **8 hours/day, 6 days/week** (take 1 day completely off)

---

# Key Metrics to Track Daily

| Metric | Target by Day 75 |
|---|---|
| MRR | $22,500 |
| Active Clients | 13+ |
| Lead Response Time (clients) | <2 minutes |
| Lead-to-Onboarding Conversion | >25% |
| Client Onboarding Time | <5 days |
| SEO Traffic (monthly) | 500+ visitors |
| Outreach Reply Rate | >15% |
| Client NPS Score | >8/10 |
| Monthly Tool Cost | <$350 |

---

# First Actions to Take Today

1. **Audit Sokogate's current lead flow** — talk to Ultimo Trading, understand their process
2. **Set up the tech stack** — Zoho CRM, Make.com, Wati.io, Instantly.ai, QMe
3. **Build the lead qualification chatbot** — 5 questions, test with 10 real contacts
4. **Start email warmup** — Instantly.ai needs 2 weeks before you can send at scale
5. **Create your agency's QMe booking link** — this is your primary CTA everywhere
6. **Publish first SEO article** — target "B2B wholesale automation Kenya" or similar
7. **Send first WhatsApp outreach** — to 20 trading companies, test the messaging

---

> **The Compound Effect:** Every client you onboard generates recurring revenue + referrals + case studies that feed your SEO. By Day 75, the system runs itself — inbound leads come in via SEO, you convert them with automated follow-up, QMe handles scheduling, and your clients get results that keep them paying. The $22,500/mo is not a stretch goal — it's the compounding math of the system you're building.
