# Pipeline Audit Report: [Ultimo Trading / Sokogate]

**Prepared by:** [Your Name]
**Date:** [Date]
**Status:** Draft for client presentation

---

## Slide 1: Current State Map

### Lead Flow Diagram (As-Is)

```
SOCIAL MEDIA ──→ User comments/questions ──→ ❌ No response, no capture
    (IG/FB/TikTok)

WEBSITE ──→ Visitor lands on ultimotradingltd.co.ke ──→ ❌ No chatbot, no lead capture
                                                     ──→ Email bangali@... (manual only)
                                                     ──→ ❌ No follow-up if no reply

GOOGLE PLAY ──→ Downloads Sokogate app ──→ Manual registration ──→ ❌ No guided onboarding

REFERRALS ──→ Word of mouth ──→ Phone call/WhatsApp ──→ Manual handling

WHATSAPP INQUIRIES ──→ Direct message to phone number ──→ Manual reply (if seen)
```

### Bottlenecks Identified

| # | Bottleneck | Impact |
|---|---|---|
| 1 | No lead capture on website | Every visitor leaves without being identified |
| 2 | No WhatsApp click-to-chat | Mobile visitors can't reach you in 1 tap |
| 3 | No automated qualification | Sales team spends time on unqualified leads |
| 4 | No follow-up system | 80% of leads that don't convert immediately are lost forever |
| 5 | Manual onboarding no-shows | No reminders, no rescheduling → drop-off |
| 6 | No CRM/tracking | No data to improve the pipeline |
| 7 | Social engagement not captured | Comments/DMs are leads that go untouched |

---

## Slide 2: The Leakage Numbers

### Volume Analysis

| Metric | Current Value | Industry Benchmark | Gap |
|---|---|---|---|
| Monthly website visitors | [Fill in] | — | — |
| Monthly app downloads | [Fill in] | — | — |
| Monthly inbound inquiries (all sources) | [Fill in] | — | — |
| Social media followers | [Fill in] | — | — |
| Monthly social comments/DMs | [Fill in] | — | — |

### Conversion Funnel (Current)

```
Inquiries captured:         [X]/month  (100%)
  ↓
Qualified as serious buyer: [X]        ([Y]% qualification rate)
  ↓
Discovery call booked:      [X]        ([Y]% call booking rate)
  ↓
Onboarding started:         [X]        ([Y]% onboarding start rate)
  ↓
First order placed:         [X]        ([Y]% conversion rate)
```

### Revenue Impact

| Item | Value |
|---|---|
| Average first order value | KES [X] |
| Average customer lifetime value (CLV) | KES [X] |
| Current leads/month | [X] |
| Current conversion rate | [X]% |
| Current monthly revenue from new leads | KES [X] |
| **Estimated lost revenue from uncaptured/dropped leads** | **KES [X]/month** |

### Response Time Analysis

| Channel | Current Response Time | Best Practice | Lost Leads/Month |
|---|---|---|---|
| Website inquiries | N/A (no capture) | < 5 seconds | [Fill in] |
| Email | [X] hours | < 1 hour | [Fill in] |
| WhatsApp | [X] hours/minutes | < 2 minutes | [Fill in] |
| Social DMs | [X] hours/days | < 15 minutes | [Fill in] |

> **Key Stat:** Companies that respond to leads within 5 minutes convert at **9x** the rate of those that respond after 30 minutes. (Source: Harvard Business Review)

---

## Slide 3: The Automated Future (To-Be)

### Proposed Lead Flow Diagram

```
WEBSITE ──→ Voiceflow Chatbot (24/7) ──→ 5 qualification questions
    │                                        │
    ├── Qualified (volume > 500K KES) ────→ Zoho CRM → WhatsApp alert to sales
    │                                           → QMe booking link sent automatically
    │                                           → Automated welcome WhatsApp
    │
    ├── Warm (interested, low volume) ────→ Zoho CRM → Email nurture sequence
    │                                           → WhatsApp follow-up Day 3
    │                                           → Monthly newsletter
    │
    └── Cold (browsing) ────────────────→ Airtable → Monthly re-engagement drip

SOCIAL MEDIA ──→ Automated DM response ──→ Same chatbot flow as website
    (IG/FB/TikTok)      

WHATSAPP ──→ 24/7 auto-reply with qualification flow → Human handoff when ready
    (Click-to-Chat button on website + ads)

GOOGLE PLAY ──→ Download → Automated onboarding sequence via WhatsApp
    │               Day 1: Welcome + quick setup guide
    │               Day 3: "Need help placing your first order?"
    │               Day 7: Check-in + offer onboarding call (QMe link)
    │               Day 14: Success story from similar business
    └──→ First order placed 🎉
```

### Automation Benefits

| Area | Before | After | Improvement |
|---|---|---|---|
| Lead response time | [X] hours | < 2 seconds | — |
| Lead capture coverage | Website only | Website + WhatsApp + Social + App | 3-4x more leads captured |
| Qualification time per lead | 15-20 min manual | 2 min automated | 90% time saved |
| Follow-up consistency | Sporadic | 14-day cadence, automated | 100% consistent |
| Onboarding completion rate | [X]% | Target: 85%+ | [X]% improvement |
| Sales team capacity | [X] leads/day managed | 5x more leads managed | 5x capacity |

---

## Slide 4: The ROI Math

### Investment

| Item | Cost (KES) | Cost (USD) |
|---|---|---|
| **One-Time Setup** | | |
| Chatbot build & deployment (Voiceflow) | [Setup fee] | [Setup fee] |
| WhatsApp API integration (Wati.io) | [Setup fee] | [Setup fee] |
| QMe booking system integration | [Setup fee] | [Setup fee] |
| CRM setup & workflow build (Zoho + Make.com) | [Setup fee] | [Setup fee] |
| Email warmup + sequence setup (Instantly.ai) | [Setup fee] | [Setup fee] |
| Onboarding automation build | [Setup fee] | [Setup fee] |
| **Total Setup** | **KES [X]** | **$[X]** |
| | | |
| **Monthly Retainer** | | |
| Automation monitoring & maintenance | [Monthly fee] | [Monthly fee] |
| Performance optimization | Included | Included |
| Monthly reporting | Included | Included |
| **Total Monthly** | **KES [X]** | **$[X]** |

### Return

| Metric | Current | Projected (Month 3) | Increase |
|---|---|---|---|
| Leads captured/month | [X] | [X × 3] | 3x |
| Lead-to-opportunity conversion | [X]% | [X × 2]% | 2x |
| Opportunities/month | [X] | [X × 6] | 6x |
| Average order value | KES [X] | KES [X] (same) | — |
| Revenue from new leads/month | KES [X] | KES [X × 6] | 6x |

### ROI Calculation (Conservative)

```
Monthly automation investment:            KES [Retainer + tool costs]
Projected additional monthly revenue:     KES [Revenue increase - current]

First month ROI:                          [X]x (setup cost recouped)
Annualized ROI (12 months):               [X]x
```

### Break-Even Timeline

```
Setup cost:                 KES [X]
Additional monthly revenue: KES [X]    
Break-even month:           Month [X]
Net profit by Month 6:      KES [X]
Net profit by Month 12:     KES [X]
```

---

## Slide 5: Implementation Roadmap & Next Steps

### Phase 1: Quick Wins (Week 1-2)

| Action | Timeline | Impact |
|---|---|---|
| Add WhatsApp click-to-chat button to website | Day 1-2 | Instant reduction in friction |
| Deploy Voiceflow chatbot on website | Day 3-7 | 24/7 lead capture starts immediately |
| Set up QMe booking link for discovery calls | Day 1 | Book calls without back-and-forth |
| Activate Instagram DM auto-reply | Day 4-5 | Capture social media leads |
| **Go-live: Basic capture system** | **Day 7** | **Immediate lead capture begins** |

### Phase 2: Follow-Up Engine (Week 3-4)

| Action | Timeline | Impact |
|---|---|---|
| Build WhatsApp follow-up sequences | Day 8-12 | Automated nurture for unconverted leads |
| Build email follow-up sequences (Instantly.ai) | Day 10-14 | Second channel for lead nurturing |
| Integrate Zoho CRM + set up pipeline stages | Day 12-16 | Full visibility into all leads |
| Connect Make.com to orchestrate all flows | Day 14-18 | End-to-end automation |
| **Go-live: Full follow-up system** | **Day 21** | **No lead ever goes cold** |

### Phase 3: Onboarding Automation (Week 5-6)

| Action | Timeline | Impact |
|---|---|---|
| Build QMe onboarding queue flow | Day 22-25 | Self-serve onboarding |
| Automated welcome sequence (WhatsApp + Email) | Day 24-28 | Consistent first impression |
| Day 3, 7, 14 check-in automations | Day 26-30 | Higher onboarding completion |
| Document collection automation | Day 28-32 | No more chasing paperwork |
| **Go-live: Full onboarding automation** | **Day 35** | **Onboarding runs itself** |

### Phase 4: Optimization & Scale (Week 7-8+)

| Action | Timeline | Impact |
|---|---|---|
| Performance dashboard (Looker Studio) | Day 36-40 | Data-driven decisions |
| A/B test chatbot questions & sequences | Day 40+ | Continuous improvement |
| Monthly business review cadence via QMe | Day 45+ | Strategic alignment |
| Referral system automation | Day 50+ | Inbound referrals at scale |

---

### Commitment Required from Ultimo Trading

To execute this plan, I need:

- [ ] Access to website backend (to add chatbot + WhatsApp button)
- [ ] Access to WhatsApp Business account (or assistance setting one up)
- [ ] Social media account access (Instagram/Facebook for DM auto-reply)
- [ ] 2-3 hours of your sales team's time for workflow design sessions
- [ ] Designated point of contact for questions during build phase
- [ ] Sign-off on chatbot script and sequence content

---

### Next Step

**Book a 30-minute follow-up call** to review this report and decide on Phase 1.

→ [Insert QMe booking link here]

---

*This report was prepared based on the discovery call conducted on [Date]. All projections are conservative estimates based on industry benchmarks and your current data. Actual results may vary based on execution quality and market conditions.*
