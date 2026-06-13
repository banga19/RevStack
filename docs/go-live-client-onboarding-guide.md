# RevStack / Mapato — Go-Live & Client Onboarding Guide

**Generated:** 2026-06-13  
**Project:** RevStack (Mapato) — AI-Powered Revenue Operations for B2B Trading Companies  
**Owner:** One-person AI automation agency targeting $22,500/month by month 6

---

## Table of Contents

1. Infrastructure & Plugin Cost Breakdown
2. Minimum Viable vs. Recommended Production Stack
3. One-Time Setup Costs
4. Break-even Analysis
5. Client Onboarding Strategy
6. Phase 1: Pre-Onboarding (Days 1–7)
7. Phase 2: Technical Setup (Days 8–14)
8. Phase 3: First Client Delivery (Days 15–30)
9. Phase 4: Scale & Retain (Month 2+)
10. Onboarding Checklist
11. Revenue Milestones

---

## 1. Infrastructure & Plugin Cost Breakdown

| Category | Service | Estimated Cost | Notes |
|----------|---------|---------------|-------|
| **Hosting** | Vercel Pro | $20/user/mo | Next.js 16 optimized, includes CDN |
| **Workers** | Fly.io Workers | $15-30/mo | BullMQ/Hermes background jobs |
| **Database** | PostgreSQL (Railway/Render) | $9-25/mo | Managed instance |
| **Cache** | Redis (Upstash) | $0-10/mo | Free tier to start |
| **Vector Store** | ChromaDB | $0-15/mo | Can host on same VM |
| **Auth** | Clerk | $0-25/mo | Free up to 10K MAU |
| **Monitoring** | Sentry | $0-26/mo | Free tier: 5K errors/mo |
| **Analytics** | PostHog | $0-0/mo | Free up to 1M events/mo |
| **Storage** | Cloudflare R2 | $5-20/mo | ~$0.015/GB + operations |
| **WhatsApp** | WATI.io | $49-99/mo | Business API access |
| **CRM** | Zoho CRM | $0-14/mo | Free for 3 users |
| **Email** | Instantly.ai | $30/mo | Cold email + warmup |
| **Chatbot** | Voiceflow | $0-30/mo | Free tier to start |
| **LLM (Primary)** | NVIDIA NIM | $0/mo | Free tier available |
| **LLM (Paid fallback)** | DeepSeek/OpenAI | $20-100/mo | ~$0.14/M tokens (variable) |
| **Payments** | Flutterwave | Pay-per-txn | No monthly fee |
| **Domain** | Namecheap/Cloudflare | $1/mo | ~$12/year |

---

## 2. Minimum Viable vs. Recommended Production Stack

### Minimum Viable (~$63-120/mo)
- Vercel Hobby ($0)
- Railway PostgreSQL ($9)
- Cloudflare R2 ($5)
- WATI starter ($49)
- Free tiers: Clerk auth, Sentry, PostHog, NVIDIA NIM, Upstash Redis

### Recommended Production (~$200-400/mo)
- Vercel Pro ($20)
- Fly.io Workers ($20)
- PostgreSQL ($15)
- Redis ($5)
- WATI ($99)
- Zoho CRM ($14)
- Instantly.ai ($30)
- Voiceflow ($30)
- DeepSeek/OpenAI ($50-100)
- Monitoring & Storage ($20)

### Enterprise Scale (~$500-800/mo)
- Multiple VM instances
- Read replicas for PostgreSQL
- Higher API tiers for LLMs
- Dedicated workers per integration
- Premium monitoring dashboards
- CDN + edge caching everywhere

---

## 3. One-Time Setup Costs

| Item | Cost |
|------|------|
| Domain registration | $12/year |
| SSL Certificate | $0 (included with hosting) |
| Initial seed data | $0 |
| Developer setup | $0 |
| **Total one-time** | **~$12-50** |

---

## 4. Break-even Analysis

- **Anchor Client Target:** $2,500/month by Day 30
- **Runner Cost Viability:** $200-400/month tech stack = 5-16% of revenue at that milestone
- **True Break-even:** ~$100/month MRR covers all infrastructure costs
- **Scaling Lever:** Each additional $1,000 MRR client adds ~$20-50 in marginal infrastructure cost (mostly variable API usage)

---

## 5. Client Onboarding Strategy

### Objective
Onboard B2B trading companies to RevStack AI platform within **15 days of contract signing**, with full pipeline automation live by **Day 30**.

### Target Client Profile
- **Industry:** B2B wholesale, import/export, trading
- **Location:** Kenya & East Africa (initially)
- **Size:** 5-50 employees, $50K-$500K annual revenue
- **Pain Points:**
  - Manual lead qualification
  - Slow follow-up cycles
  - No CRM visibility
  - Missed deals from poor handoff

### Value Proposition
> "Stop losing deals to slow response times. Our AI qualifies leads 24/7, automates follow-ups, and syncs every interaction to your CRM — so your team closes faster."

**Key modules to pitch:**
1. **Lead Qualification Bot** — Pre-qualify wholesale buyers via WhatsApp before human handoff
2. **Automated Follow-Up Sequences** — Multi-touch via WhatsApp + Email with smart timing based on opens, clicks, replies
3. **CRM Sync & Pipeline View** — All leads, conversations, and deal stages in one dashboard
4. **Monthly Performance Reports** — Auto-generated ROI and conversion metrics

---

## 6. Phase 1: Pre-Onboarding (Days 1–7)

### Day 1: Contract & Kickoff
- [ ] Send signed agreement via Flutterwave/Stripe payment link
- [ ] Collect client onboarding form (Zoho Typeform alternative)
- [ ] Schedule technical kickoff call (Google Meet)
- [ ] Assign dedicated onboarding specialist (you)

### Day 2-3: Discovery & Configuration
- [ ] Map client's current lead-to-onboarding workflow
- [ ] Identify existing tools (WhatsApp, email, CRM, spreadsheet)
- [ ] Configure WATI.io instance:
  - [ ] WhatsApp Business number verification
  - [ ] Template message approval
  - [ ] Opt-in keyword setup
- [ ] Set up Zoho CRM:
  - [ ] Create custom modules (Leads, Deals, Contacts)
  - [ ] Map fields to RevStack schema
  - [ ] Configure webhooks for real-time sync

### Day 4-5: Integration & Testing
- [ ] Connect client WATI → RevStack webhook
- [ ] Map WATI contact fields → Zoho CRM fields
- [ ] Test lead creation: simulate inbound WhatsApp message → verify CRM record
- [ ] Configure email follow-up sequence in Instantly.ai
- [ ] Set up Google Sheets questionnaire (if applicable)

### Day 6-7: Training & Handoff
- [ ] Record 15-min Loom video walkthrough for client
- [ ] Create shared Notion/Google Doc with:
  - [ ] Integration setup steps
  - [ ] Daily checklist
  - [ ] Escalation contacts
- [ ] Schedule go-live review call (Day 15)

---

## 7. Phase 2: Technical Setup (Days 8–14)

### Day 8-9: CRM Data Migration
- [ ] Export existing leads/deals from client's current tool
- [ ] Clean and deduplicate data (use Clay or manual review)
- [ ] Import into Zoho CRM via CSV/API
- [ ] Verify: all active leads mapped correctly

### Day 10-11: Automation Workflow Build
- [ ] Build lead qualification bot in Voiceflow:
  - [ ] 3-5 qualifying questions (company size, order volume, location, timeline)
  - [ ] Routing logic → hot/warm/cold lead scores
  - [ ] Human handoff trigger when score > threshold
- [ ] Create follow-up sequences in Make.com/WATI:
  - [ ] Day 0: Welcome + qualification
  - [ ] Day 1: Follow-up if no reply
  - [ ] Day 3: Case study / social proof
  - [ ] Day 7: Direct offer / call booking
  - [ ] Day 14: Re-engagement
- [ ] Set up retry logic for failed sends

### Day 12-13: Monitoring & Alerts
- [ ] Configure RevStack dashboard for client org
- [ ] Set up daily email summary (via Resend/nodemailer)
- [ ] Alert thresholds:
  - [ ] Queue lag > 5 minutes → Slack/email alert
  - [ ] WATI API errors > 3/hour → immediate alert
  - [ ] CRM sync failures → nightly report
- [ ] Test alerts end-to-end

### Day 14: Pre-Launch Checklist
- [ ] Load test RevStack with 100 simulated leads
- [ ] Verify all webhooks fire correctly
- [ ] QA check: follow-up timing, CRM field mapping, template rendering
- [ ] Final sign-off from client

---

## 8. Phase 3: First Client Delivery (Days 15–30)

### Days 15-20: Soft Launch
- [ ] Enable automation for 20% of inbound leads (pilot)
- [ ] Monitor daily: response times, qualification accuracy, CRM sync health
- [ ] Collect feedback from client's sales team
- [ ] Adjust qualification logic based on real responses

### Days 21-25: Full Go-Live
- [ ] Scale to 100% of leads
- [ ] Deliver Week 1 performance report:
  - [ ] Leads qualified vs. manual baseline
  - [ ] Response time improvement
  - [ ] CRM completeness score
- [ ] Weekly sync call with client

### Days 26-30: Month 1 Review & Upsell
- [ ] Present Month 1 ROI report:
  - [ ] Revenue attributed to automated follow-ups
  - [ ] Deals closed faster than prior month
  - [ ] Cost savings from reduced manual work
- [ ] Propose upsell:
  - [ ] Add Voiceflow chatbot to website
  - [ ] Add Korea B2B matching (Sokogate)
  - [ ] Increase WhatsApp template volume
- [ ] Secure Month 2 retainer commitment

---

## 9. Phase 4: Scale & Retain (Month 2+)

### Month 2: Prove Value
- [ ] Deliver Month 2 report vs. Month 1 baseline
- [ ] Optimize follow-up timing based on engagement data
- [ ] Add A/B testing for message templates
- [ ] Introduce predictive analytics (RevStack ERS scoring)

### Month 3: Expand
- [ ] Add secondary market (e.g., Uganda or Tanzania)
- [ ] Reference 2-3 case studies from existing client
- [ ] Start outbound to 50 similar B2B traders using Instantly.ai
- [ ] Offer referral program (10% discount for 6 months)

### Month 4-6: Scale Team & Product
- [ ] Hire part-time ops person to manage client onboarding
- [ ] Build self-service onboarding portal in RevStack
- [ ] Launch partner program for complementary agencies
- [ ] Target: $22,500/month with 3-4 active clients

---

## 10. Onboarding Checklist (Quick Reference)

```
□ Contract signed + payment confirmed
□ Client WhatsApp Business number verified
□ WATI instance configured + templates approved
□ Zoho CRM environment set up
□ Webhook URLs tested (WATI → RevStack → CRM)
□ Follow-up sequences live
□ CRM data migration complete
□ Monitoring/alerting active
□ Client team trained
□ Go-live review scheduled (Day 15)
□ Week 1 report delivered
□ Month 1 review + upsell conversation
```

---

## 11. Revenue Milestones

| Timeline | Target MRR | Client Mix | Key Milestone |
|----------|-----------|-----------|---------------|
| **Day 0** | $0 | — | Project kickoff |
| **Day 30** | $2,500 | 1 anchor (Ultimo Trading) | First retainer active |
| **Day 60** | $10,500 | 1 anchor + 3 retainers | Pipeline automated |
| **Day 90** | $22,500 | 1 anchor + 4 retainers + fees | Full scale |

---

## Appendix: Key Integrations Recap

| Tool | Purpose | Required Credentials | Cost |
|------|---------|---------------------|------|
| WATI.io | WhatsApp automation | API token, number ID | $49-99/mo |
| Zoho CRM | Pipeline & contact management | Client ID, secret, refresh token | Free-14/mo |
| Instantly.ai | Cold email outreach | API key | $30/mo |
| Voiceflow | AI chatbot | API key, project ID | $0-30/mo |
| Flutterwave | Subscription payments | Public/secret/encryption keys | Pay-per-txn |
| Cloudflare R2 | Document & recording storage | Account + R2 keys | $5+/mo |
| PostgreSQL | Primary database | Managed instance URL | $9+/mo |
| Redis | Queue + rate limit cache | Redis URL | $0-10/mo |
| Clerk | User authentication | Publishable + secret keys | $0-25/mo |
| Sentry | Error tracking | DSN | $0-26/mo |
| PostHog | Product analytics | API key | Free tier |
| DeepSeek / OpenAI / NVIDIA NIM | LLM inference | API keys | $0-100/mo |

---

*End of guide*
