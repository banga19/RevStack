# Financial Model Spreadsheet

## A Google Sheets-Ready Template

Copy these tables into Google Sheets. Each section is a separate tab.

---

## TAB 1: Revenue Projections (Month-by-Month)

### Assumptions

| Assumption | Value |
|---|---|
| Anchor client (Ultimo Trading) retainer | $2,500/mo |
| Enterprise tier retainer | $2,700/mo |
| Growth tier retainer | $1,150/mo |
| Starter tier retainer | $385/mo |
| Setup fee (one-time, per client) | $1,500 avg |
| Performance add-ons (% of clients) | 40% of clients at $500/mo avg |
| Referral revenue | $875/mo (5% of total, scaled) |
| Monthly churn rate | 5% (conservative for SMEs) |
| Month 1 clients | 1 (anchor) |
| New clients/month (ramp) | Month 1-2: 0, Month 3: 1, Month 4: 2, Month 5: 2, Month 6: 3 |

### Monthly Revenue Build

| Month | New Clients | Total Clients | Anchor | Enterprise | Growth | Starter | Setup Fees | Add-ons | Referrals | **Total MRR** | Cumulative Revenue |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 1 | $2,500 | $0 | $0 | $0 | $0 | $0 | $0 | **$2,500** | $2,500 |
| 2 | 0 | 1 | $2,500 | $0 | $0 | $0 | $0 | $0 | $0 | **$2,500** | $5,000 |
| 3 | 1 | 2 | $2,500 | $0 | $1,150 | $0 | $1,500 | $0 | $0 | **$5,150** | $10,150 |
| 4 | 2 | 4 | $2,500 | $0 | $1,150 | $770 | $3,000 | $385 | $0 | **$7,805** | $17,955 |
| 5 | 2 | 6 | $2,500 | $2,700 | $2,300 | $1,155 | $3,000 | $1,275 | $0 | **$12,930** | $30,885 |
| 6 | 3 | 9 | $2,500 | $5,400 | $3,450 | $1,540 | $4,500 | $2,150 | $500 | **$20,040** | $50,925 |
| 7 | 2 | 11 | $2,500 | $5,400 | $4,600 | $1,925 | $3,000 | $2,650 | $625 | **$20,700** | $71,625 |
| 8 | 2 | 13 | $2,500 | $8,100 | $4,600 | $1,925 | $3,000 | $3,050 | $700 | **$23,875** | $95,500 |
| 9 | 1 | 13 | $2,500 | $8,100 | $4,600 | $1,925 | $1,500 | $3,050 | $700 | **$22,375** | $117,875 |
| 10 | 1 | 13 | $2,500 | $8,100 | $4,600 | $1,925 | $1,500 | $3,050 | $700 | **$22,375** | $140,250 |
| 11 | 1 | 13 | $2,500 | $8,100 | $4,600 | $1,925 | $1,500 | $3,050 | $700 | **$22,375** | $162,625 |
| 12 | 0 | 12 | $2,500 | $8,100 | $4,600 | $1,925 | $0 | $3,050 | $700 | **$20,875** | $183,500 |

**Note:** Month 9-12 show churn taking effect (5% monthly = ~1 client loss every 2 months), offset by new client adds.

---

## TAB 2: Client Pipeline Funnel

### Monthly Lead Generation to Client Conversion

| Stage | Month 1 | Month 2 | Month 3 | Month 4 | Month 5 | Month 6 |
|---|---|---|---|---|---|---|
| **Outbound contacts** | 70 | 70 | 70 | 70 | 70 | 70 |
| Responses (15%) | 11 | 11 | 11 | 11 | 11 | 11 |
| Discovery calls booked (5%) | 4 | 4 | 4 | 4 | 4 | 4 |
| Audits completed (3%) | 2 | 2 | 2 | 2 | 2 | 2 |
| Proposals sent (2.5%) | 2 | 2 | 2 | 2 | 2 | 2 |
| Clients closed (1.5%) | 1 | 0 | 1 | 2 | 2 | 3 |

### Client Tier Progression

| Client # | Acquired Month | Starting Tier | Projected Tier by Month 6 | Notes |
|---|---|---|---|---|
| 1 (Anchor) | 1 | Anchor ($2,500) | Anchor ($2,500) | Ultimo Trading |
| 2 | 3 | Growth ($1,150) | Growth ($1,150) | Wholesale company |
| 3 | 4 | Starter ($385) | Growth ($1,150) | Upgrade at Month 4 |
| 4 | 4 | Starter ($385) | Starter ($385) | Small importer |
| 5 | 5 | Enterprise ($2,700) | Enterprise ($2,700) | Mid-size distributor |
| 6 | 5 | Growth ($1,150) | Growth ($1,150) | Logistics company |
| 7 | 6 | Enterprise ($2,700) | Enterprise ($2,700) | E-commerce platform |
| 8 | 6 | Growth ($1,150) | Growth ($1,150) | Wholesale company |
| 9 | 6 | Starter ($385) | Starter ($385) | New importer |

### Churn & Retention Model

| Month | Starting Clients | New Clients | Churned (5%) | Ending Clients |
|---|---|---|---|---|
| 1 | 0 | 1 | 0 | 1 |
| 2 | 1 | 0 | 0 | 1 |
| 3 | 1 | 1 | 0 | 2 |
| 4 | 2 | 2 | 0 | 4 |
| 5 | 4 | 2 | 0 | 6 |
| 6 | 6 | 3 | 0 | 9 |
| 7 | 9 | 2 | 0 | 11 |
| 8 | 11 | 2 | 0 | 13 |
| 9 | 13 | 1 | 1 | 13 |
| 10 | 13 | 1 | 1 | 13 |
| 11 | 13 | 1 | 1 | 13 |
| 12 | 13 | 0 | 1 | 12 |

---

## TAB 3: Fixed & Variable Costs

### Fixed Monthly Costs (Tools & Infrastructure)

| Tool | Purpose | Monthly Cost | Annual Cost |
|---|---|---|---|
| Zoho CRM (Free tier) | CRM | $0 | $0 |
| Make.com (Pro) | Automation orchestration | $9 | $108 |
| Voiceflow (Pro) | Chatbot builder | $30 | $360 |
| Wati.io (Growth) | WhatsApp API | $49 | $588 |
| Instantly.ai (Starter) | Email warmup & sending | $30 | $360 |
| QMe (Basic) | Booking & queue management | $30 (est.) | $360 (est.) |
| Airtable (Team) | Client data / docs | $10 | $120 |
| Typeform (Basic) | Lead capture forms | $25 | $300 |
| Apollo.io (Basic) | Lead database | $49 | $588 |
| Google Workspace | Email + docs | $12 | $144 |
| Domain + hosting | Agency website | $15 | $180 |
| Looker Studio | Reporting | $0 | $0 |
| **Total Fixed Tools** | | **$259** | **$3,108** |

### Variable Costs (Per Client)

| Item | Cost | Notes |
|---|---|---|
| WhatsApp template approval | $0 | Free (Meta review) |
| SMS (if added later) | $0.02/msg | Not in initial stack |
| Email sending (Instantly) | Included | In $30/mo plan |
| QMe additional services | $10/service/mo | If client needs advanced features |
| **Per active client (avg)** | **~$10/mo** | Negligible at scale |

### One-Time Setup Costs

| Item | Cost | When |
|---|---|---|
| Voiceflow chatbot build | $0 (your time) | Day 3 |
| Make.com workflows | $0 (your time) | Day 3-4 |
| QMe initial configuration | $0 (your time) | Day 2 |
| WhatsApp Business setup | $0 | Free |
| Instantly.ai domain warmup | $0 | Included in monthly |
| **Total setup** | **$0** | All your labor |

### Labor Cost (Your Time)

| Activity | Hours/Month | Value at $50/hr | Note |
|---|---|---|---|
| Client onboarding & build | 20 | $1,000 | First 2 months only |
| Ongoing maintenance | 10 | $500 | Monthly |
| Outreach & sales | 30 | $1,500 | Monthly |
| SEO content | 15 | $750 | Monthly |
| Client management | 15 | $750 | Monthly |
| Learning & optimization | 5 | $250 | Monthly |
| **Total labor hours** | **95** | **$4,750** | ~24 hrs/week |

---

## TAB 4: Cash Flow Statement (Month 1-12)

### Monthly Cash Flow

| Month | Revenue | Tool Costs | Labor (Imputed) | Other Costs | Net Cash Flow | Cumulative Cash |
|---|---|---|---|---|---|---|
| 1 | $2,500 | $259 | $0 (your labor) | $50 (misc) | **+$2,191** | $2,191 |
| 2 | $2,500 | $259 | $0 | $50 | **+$2,191** | $4,382 |
| 3 | $5,150 | $259 | $0 | $50 | **+$4,841** | $9,223 |
| 4 | $7,805 | $259 | $0 | $100 | **+$7,446** | $16,669 |
| 5 | $12,930 | $300 | $0 | $100 | **+$12,530** | $29,199 |
| 6 | $20,040 | $300 | $0 | $150 | **+$19,590** | $48,789 |
| 7 | $20,700 | $300 | $0 | $150 | **+$20,250** | $69,039 |
| 8 | $23,875 | $300 | $0 | $150 | **+$23,425** | $92,464 |
| 9 | $22,375 | $300 | $0 | $150 | **+$21,925** | $114,389 |
| 10 | $22,375 | $350 | $0 | $200 | **+$21,825** | $136,214 |
| 11 | $22,375 | $350 | $0 | $200 | **+$21,825** | $158,039 |
| 12 | $20,875 | $350 | $0 | $200 | **+$20,325** | $178,364 |

**Note:** "Labor" is shown as $0 because you're the owner — your pay is the profit. Tools scale slightly as you add more clients (more Make.com operations, more Wati.io sends).

---

## TAB 5: Break-Even Analysis

### Break-Even Calculation

| Metric | Value |
|---|---|
| Total setup investment (your time, not cash) | $0 (no cash outlay) |
| Monthly fixed costs (tools) | $259 |
| Average revenue per client (all tiers, weighted) | ~$1,470/mo |
| Gross margin per client (after $10 variable cost) | ~$1,460/mo |
| Clients needed to cover $259 tool costs | **1 client** (anchor covers this 9.6x over) |
| **Break-even clients (cash-positive from Day 1)** | **1 client** |
| **Break-even month** | **Month 1** |

### Profitability by Month

| Month | Revenue | Costs | Profit | Margin |
|---|---|---|---|---|
| 1 | $2,500 | $309 | $2,191 | 87.6% |
| 2 | $2,500 | $309 | $2,191 | 87.6% |
| 3 | $5,150 | $309 | $4,841 | 94.0% |
| 4 | $7,805 | $359 | $7,446 | 95.4% |
| 5 | $12,930 | $400 | $12,530 | 96.9% |
| 6 | $20,040 | $450 | $19,590 | 97.8% |
| 7 | $20,700 | $450 | $20,250 | 97.8% |
| 8 | $23,875 | $450 | $23,425 | 98.1% |
| 9 | $22,375 | $450 | $21,925 | 98.0% |
| 10 | $22,375 | $550 | $21,825 | 97.5% |
| 11 | $22,375 | $550 | $21,825 | 97.5% |
| 12 | $20,875 | $550 | $20,325 | 97.4% |

**Total Year 1 Profit: ~$178,364**

---

## TAB 6: Scenario Analysis

### Conservative Scenario (Slower Growth)

| Assumption | Base Case | Conservative |
|---|---|---|
| New clients/month (after anchor) | 1-3/mo | 0-2/mo |
| Churn rate | 5% | 10% |
| Setup fee | $1,500 | $1,000 |
| Anchor client stays | 12 months | 6 months (churns) |

**Conservative Monthly Revenue at Month 12: ~$12,500/mo**

| Month | Clients | Revenue |
|---|---|---|
| 1 | 1 | $2,500 |
| 3 | 2 | $4,150 |
| 6 | 5 | $10,540 |
| 9 | 7 | $12,200 |
| 12 | 6 | $12,500 |

### Optimistic Scenario (Fast Growth)

| Assumption | Base Case | Optimistic |
|---|---|---|
| New clients/month | 1-3/mo | 2-4/mo |
| Churn rate | 5% | 3% |
| Setup fee | $1,500 | $2,000 |
| Anchor upgrades to Enterprise in Month 4 | No | Yes |

**Optimistic Monthly Revenue at Month 12: ~$35,000/mo**

| Month | Clients | Revenue |
|---|---|---|
| 1 | 2 | $5,000 |
| 3 | 5 | $10,300 |
| 6 | 12 | $28,500 |
| 9 | 18 | $34,000 |
| 12 | 20 | $35,800 |

---

## TAB 7: Key Metrics Dashboard

### Monthly KPIs to Track

| Metric | Formula | Month 1 Target | Month 6 Target | Month 12 Target |
|---|---|---|---|---|
| **MRR** | Monthly recurring revenue | $2,500 | $20,040 | $22,375 |
| **NRR (Net Retention Rate)** | (Starting MRR + Upsells - Churn) / Starting MRR | 100% | 105%+ | 110%+ |
| **LTV (Avg Customer Lifetime Value)** | Avg monthly revenue × avg months retained | — | $8,820 | $14,700 |
| **CAC (Customer Acquisition Cost)** | Total sales cost / new clients | $0 (your time) | $0 (your time) | $0 (your time) |
| **CAC Payback** | CAC / monthly gross margin | Immediate | Immediate | Immediate |
| **Gross Margin** | (Revenue - tool costs) / Revenue | 87.6% | 97.8% | 97.4% |
| **Client Health Score** | % of clients with active automation, no issues | 100% | 90%+ | 90%+ |
| **Lead Response Time (all clients)** | Avg time from lead to first response | < 2 min | < 2 min | < 2 min |
| **Onboarding Time** | Avg days from sign to active use | < 5 days | < 3 days | < 3 days |

---

## TAB 8: Income Statement (Year 1 Projected)

| Line Item | Year 1 Total |
|---|---|
| **Revenue** | |
| Retainer fees | $159,500 |
| Setup/onboarding fees | $21,000 |
| Performance add-ons | $18,810 |
| Referral commissions | $3,225 |
| **Total Revenue** | **$202,535** |
| | |
| **Cost of Goods Sold** | |
| Tool subscriptions | $3,468 |
| Misc expenses | $1,500 |
| **Total COGS** | **$4,968** |
| | |
| **Gross Profit** | **$197,567** |
| **Gross Margin** | **97.5%** |
| | |
| **Operating Expenses** | |
| Marketing (ads, content promotion) | $1,200 |
| Professional development | $600 |
| Internet/phone | $1,200 |
| **Total OpEx** | **$3,000** |
| | |
| **Net Profit (Pre-Tax)** | **$194,567** |
| **Net Margin** | **96.1%** |
| | |
| **Your Effective Hourly Rate** | |
| Total hours worked | ~1,140 hours (95 hrs/mo × 12) |
| Net profit per hour | **$170.67/hr** |

---

## Google Sheets Setup Instructions

To recreate this in Google Sheets:

1. Go to sheets.new
2. Create 8 tabs at the bottom, rename them:
   - `Revenue Projections`
   - `Client Pipeline`
   - `Costs`
   - `Cash Flow`
   - `Break-Even`
   - `Scenarios`
   - `KPI Dashboard`
   - `P&L`

3. For the **Revenue Projections** tab, enter these formulas:
   - A1: `Month`
   - B1: `New Clients`
   - C1: `Total Clients`
   - D1: `Anchor`
   - E1: `Enterprise`
   - F1: `Growth`
   - G1: `Starter`
   - H1: `Setup Fees`
   - I1: `Add-ons`
   - J1: `Referrals`
   - K1: `Total MRR`
   - L1: `Cumulative Revenue`

   - Row 2 (Month 1): `A2=1, B2=1, C2=1, D2=2500, E2=0, F2=0, G2=0, H2=0, I2=0, J2=0, K2=SUM(D2:J2), L2=K2`
   - Row 3 (Month 2+): Copy down with your assumptions
   - For cumulative: `L3=K3+L2` and drag down

4. For **Cash Flow**:
   - Revenue column: Reference the Revenue Projections tab
   - Costs: Sum of all tool costs
   - Net: Revenue - Costs
   - Cumulative: `=D2` then `=D3+C3` dragged down

5. For **KPIs**:
   - MRR: `=SUMIF(range, criteria)` or direct reference
   - Use `=AVERAGE`, `=SUM`, `=COUNTIF` for tracking
