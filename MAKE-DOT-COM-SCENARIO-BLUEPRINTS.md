# Make.com Scenario Blueprints: Module-by-Module Setup

## 5 Scenarios to Build the Entire Automation Stack

Each scenario below is a complete Make.com setup. Open Make.com, create a new scenario, and add modules in the order listed.

---

# SCENARIO 1: Lead Capture — Voiceflow to Zoho (Primary)

**Purpose:** When Voiceflow chatbot qualifies a lead, receive the data via webhook, create the lead in Zoho CRM, and route to the next action based on tier.

**Trigger:** Custom Webhook (receives data from Voiceflow chatbot)

### Module 1: Custom Webhook (Trigger)

| Setting | Value |
|---|---|
| **Module** | Webhooks → Custom webhook |
| **Webhook name** | `voiceflow-lead-capture` |
| **IP Restriction** | Leave blank (accept from any IP) |
| **Data structure** | Create from sample (send a test from Voiceflow) |

**Expected incoming JSON structure:**
```json
{
  "user_name": "John Kamau",
  "business_name": "Nairobi Wholesalers Ltd",
  "phone": "+254712345678",
  "email": "john@example.com",
  "business_type": "wholesaler",
  "monthly_volume": "over_2m",
  "volume_value": 100,
  "industry_focus": "fmcg",
  "location": "nairobi",
  "current_supplier": "better_pricing",
  "qualification_score": 85,
  "lead_source": "website_chatbot",
  "lead_tier": "hot"
}
```

### Module 2: JSON Parse

| Setting | Value |
|---|---|
| **Module** | JSON → Parse JSON |
| **Data structure** | Use the webhook output directly. Click "Add data structure" → "Generator" → paste the sample JSON above |
| **Output** | Parsed fields accessible as individual variables |

### Module 3: Zoho CRM — Create a Record

| Setting | Value |
|---|---|
| **Module** | Zoho CRM → Create a Record |
| **Connection** | [Your Zoho CRM connection — created once, reusable] |
| **Module** | Leads |
| **Field Mapping:** | |
| Lead Owner | [Your name or sales person] |
| First Name | `{{1.user_name}}` (parse first name from full name, or map directly) |
| Last Name | `{{1.user_name}}` (if full name only; else split) |
| Company | `{{1.business_name}}` |
| Email | `{{1.email}}` |
| Phone | `{{1.phone}}` |
| Lead Status | `New` |
| Lead Source | `{{1.lead_source}}` |
| Description | `Business Type: {{1.business_type}} | Volume: {{1.monthly_volume}} | Industry: {{1.industry_focus}} | Location: {{1.location}} | Current Supplier: {{1.current_supplier}} | Score: {{1.qualification_score}}` |
| **Custom Fields (create these in Zoho first):** | |
| CF_Qualification_Score | `{{1.qualification_score}}` |
| CF_Lead_Tier | `{{1.lead_tier}}` |
| CF_Monthly_Volume | `{{1.volume_value}}` |

**Error Handling:** Right-click this module → Add error handler → "Ignore" (continue scenario even if Zoho is down)

### Module 4: Router (Branch by Tier)

| Setting | Value |
|---|---|
| **Module** | Flow Control → Router |
| **Route 1:** | Filter: `{{1.lead_tier}}` Equal to `hot` → Go to Path A |
| **Route 2:** | Filter: `{{1.lead_tier}}` Equal to `warm` → Go to Path B |
| **Route 3:** | Default (everything else) → Go to Path C |

---

**Path A: Hot Lead (Score ≥ 70)**

### Module 5A: Tools — Get Date/Time (for scheduling)

| Setting | Value |
|---|---|
| **Module** | Tools → Get date/time |
| **Output** | Current timestamp (used in messages) |

### Module 6A: Slack — Send a Message (Sales Alert)

| Setting | Value |
|---|---|
| **Module** | Slack → Send a Channel Message |
| **Channel** | `#hot-leads` (create this channel in your Slack workspace) |
| **Message Text** | |
```
🔥 HOT LEAD — {{1.business_name}}

Name: {{1.user_name}}
Phone: {{1.phone}} | Email: {{1.email}}
Volume: {{1.monthly_volume}} (Score: {{1.qualification_score}})
Industry: {{1.industry_focus}}
Location: {{1.location}}
Source: {{1.lead_source}}

Action: Call within 2 hours. Booking link ready: https://qme.app/sokogate/discovery-call
```

### Module 7A: HTTP — Send Booking Link via QMe API

| Setting | Value |
|---|---|
| **Module** | HTTP → Make a request |
| **URL** | `https://api.qme.app/v1/appointments/send-link` *(verify with QMe docs)* |
| **Method** | POST |
| **Headers** | `Authorization: Bearer {{QME_API_KEY}}`, `Content-Type: application/json` |
| **Body** | |
```json
{
  "phone": "{{1.phone}}",
  "name": "{{1.user_name}}",
  "service": "sokogate-discovery-call",
  "message": "Hi {{1.user_name}}, thanks for your interest in Sokogate! Book your discovery call here: "
}
```

### Module 8A: WhatsApp — Send Welcome Message (via Meta WhatsApp Cloud API)

| Setting | Value |
|---|---|
| **Module** | Meta WhatsApp Business Cloud → Send a Message |
| **Connection** | [WhatsApp Business connection — set up once] |
| **From Phone Number ID** | [Your WhatsApp Business number ID] |
| **To** | `{{1.phone}}` |
| **Type** | Template |
| **Template Name** | `sokogate_hot_lead_welcome` (must be pre-approved by Meta) |
| **Template Parameters** | `{{1.user_name}}`, `{{1.business_name}}` |
| **Follow-up:** | If template not approved → fall back to Text message |

**Alternative (if template not ready): Use HTTP module to Wati.io API instead**

| Setting | Value |
|---|---|
| **Module** | HTTP → Make a request (to Wati.io) |
| **URL** | `https://api.wati.io/api/v1/sendTemplateMessage?whatsappNumber={{1.phone}}` |
| **Method** | POST |
| **Headers** | `Authorization: Bearer {{WATI_API_TOKEN}}`, `Content-Type: application/json` |
| **Body** | |
```json
{
  "template_name": "sokogate_hot_lead_welcome",
  "broadcast_name": "hot_lead_auto",
  "parameters": [
    { "name": "name", "value": "{{1.user_name}}" },
    { "name": "business", "value": "{{1.business_name}}" },
    { "name": "booking_link", "value": "https://qme.app/sokogate/discovery-call" }
  ]
}
```

### Module 9A: Google Sheets — Log Lead (Audit Trail)

| Setting | Value |
|---|---|
| **Module** | Google Sheets → Add a Row |
| **Spreadsheet** | `Lead Capture Log` (create new) |
| **Sheet** | `All Leads` |
| **Columns** | Timestamp, Name, Business, Phone, Email, Volume, Score, Tier, Source, Zoho ID |

---

**Path B: Warm Lead (Score 40-69)**

### Module 5B: WhatsApp — Send Nurture Message

| Setting | Value |
|---|---|
| **Module** | Meta WhatsApp Business Cloud → Send a Message (or HTTP → Wati.io) |
| **To** | `{{1.phone}}` |
| **Type** | Template: `sokogate_warm_lead_nurture` |
| **Parameters** | `{{1.user_name}}`, catalog link |

### Module 6B: Google Sheets — Add to Nurture List

| Setting | Value |
|---|---|
| **Module** | Google Sheets → Add a Row |
| **Sheet** | `Nurture Leads` |
| **Columns** | Timestamp, Name, Business, Phone, Email, Volume, Score, Tier |

### Module 7B: Data Store — Schedule Follow-Up

| Setting | Value |
|---|---|
| **Module** | Data Store → Add/replace a record |
| **Data Store** | `scheduled_followups` (create new data store with these keys) |
| **Record structure** | |
```json
{
  "lead_id": "{{3.ID}}",
  "phone": "{{1.phone}}",
  "name": "{{1.user_name}}",
  "followup_day_3": "no",
  "followup_day_7": "no",
  "followup_day_14": "no",
  "next_action": "day_3_whatsapp",
  "scheduled_time": "{{addDays(now, 3)}}"
}
```

---

**Path C: Cold Lead (Score < 40)**

### Module 5C: Google Sheets — Add to Marketing List

| Setting | Value |
|---|---|
| **Module** | Google Sheets → Add a Row |
| **Sheet** | `Cold Leads — Email Only` |
| **Columns** | Timestamp, Name, Business, Email, Score, Source |

### Module 6C: No WhatsApp message (prevents spam)

| Setting | Value |
|---|---|
| **Module** | (Nothing) — end path here |
| **Action** | Lead is logged to email list only. Monthly email newsletter will pick them up. |

---

### Module 10: (All Paths Rejoin) Error Handler — Global

| Setting | Value |
|---|---|
| **Module** | Create a parallel error handling path on the Zoho CRM module |
| **Module** | Google Sheets → Add a Row (to a sheet called `Scenario Errors`) |
| **Columns** | Timestamp, Scenario Name, Module, Error Message, Raw Data |
| **Purpose** | Every time any module fails, log it here so you can review and fix |

### Module 11: (Error Path) Slack — Alert You

| Setting | Value |
|---|---|
| **Module** | Slack → Send a Channel Message |
| **Channel** | `#automation-errors` |
| **Message** | `⚠️ Lead Capture Error — {{error.message}}` |

---

**Final Scenario Structure (visual map):**

```
Webhook → JSON Parse → Zoho Create Lead → Router
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         ▼                     ▼                     ▼
                     [hot]                 [warm]                 [cold]
                         │                     │                     │
                    Slack Alert          WhatsApp Msg          Google Sheets
                         │                     │                     │
                    QMe API Call       Google Sheets               END
                         │                     │
                   WhatsApp Msg        Data Store Schedule
                         │                     │
                   Google Sheets        Google Sheets              END
                         │                     │
                       END                   END
```

**Total modules:** 11-14 depending on paths  
**Operations per lead:** ~5-8 (within Make.com free/Pro limits)

---

# SCENARIO 2: Scheduled Follow-Up Dispatcher

**Purpose:** Runs daily (e.g., at 8AM EAT) to check which leads need follow-up messages and sends them.

**Trigger:** Scheduler (every day at 8AM Nairobi time)

### Module 1: Schedule (Trigger)

| Setting | Value |
|---|---|
| **Module** | Schedule → Every day |
| **Time** | 05:00 UTC (8:00 AM EAT) |
| **Start** | Immediate |

### Module 2: Data Store — Get All Records

| Setting | Value |
|---|---|
| **Module** | Data Store → Get records |
| **Data Store** | `scheduled_followups` |
| **Filter** | None (get all records) |
| **Maximum** | 1000 |

### Module 3: Iterator

| Setting | Value |
|---|---|
| **Module** | Flow Control → Iterator |
| **Source** | `{{2.records}}` |
| **Purpose** | Process each lead one at a time |

### Module 4: Router (Check What's Due Today)

| Setting | Value |
|---|---|
| **Route 1:** Day 3 Follow-Up | Filter: `{{3.day_3_sent}}` Equal to `no` AND `{{3.record.addDays(created_at, 3)}}` Less than or equal to `now` |
| **Route 2:** Day 7 Follow-Up | Filter: `{{3.day_7_sent}}` Equal to `no` AND `{{3.record.addDays(created_at, 7)}}` Less than or equal to `now` |
| **Route 3:** Day 14 Follow-Up | Filter: `{{3.day_14_sent}}` Equal to `no` AND `{{3.record.addDays(created_at, 14)}}` Less than or equal to `now` |
| **Route 4:** Day 30 Follow-Up | Filter: `{{3.day_30_sent}}` Equal to `no` AND `{{3.record.addDays(created_at, 30)}}` Less than or equal to `now` |

### Module 5: WhatsApp — Send Follow-Up Message (per route)

| Setting | Value |
|---|---|
| **Module** | HTTP → Make a request (to Wati.io) |
| **URL** | `https://api.wati.io/api/v1/sendTemplateMessage?whatsappNumber={{3.phone}}` |
| **Method** | POST |
| **Headers** | `Authorization: Bearer {{WATI_API_TOKEN}}` |
| **Body** | (varies by day — see Wati.io sequences doc for exact template names and parameters) |

### Module 6: Data Store — Update Record

| Setting | Value |
|---|---|
| **Module** | Data Store → Update a Record |
| **Key** | `{{3.record.key}}` |
| **Updated fields** | Mark the corresponding day as "sent" (e.g., `day_3_sent: "yes"`) |

**Scenario Structure:**
```
Schedule (daily) → Data Store (get all) → Iterator
                                               │
                                          Router (4 paths)
                                               │
                              ┌────────┬───────┼───────┬────────┐
                              ▼        ▼       ▼       ▼        ▼
                           Day 3   Day 7   Day 14  Day 30   No action
                              │        │       │       │        │
                         WhatsApp  WhatsApp WhatsApp WhatsApp   END
                              │        │       │       │
                          Update    Update   Update  Update
                          DataStore DataStore DataStore DataStore
```

---

# SCENARIO 3: QMe Booking Webhook → Zoho Update

**Purpose:** When a lead books a call via QMe, update their Zoho record and trigger the next actions.

**Trigger:** Custom Webhook (QMe sends data when booking is created)

### Module 1: Custom Webhook

| Setting | Value |
|---|---|
| **Module** | Webhooks → Custom webhook |
| **Name** | `qme-booking-webhook` |

**Expected incoming data from QMe:**
```json
{
  "event": "booking.created",
  "booking_id": "BK-12345",
  "customer_name": "John Kamau",
  "customer_phone": "+254712345678",
  "customer_email": "john@example.com",
  "service_name": "Sokogate Discovery Call",
  "booking_time": "2024-01-15T10:00:00+03:00",
  "status": "confirmed"
}
```

### Module 2: Zoho CRM — Search Records

| Setting | Value |
|---|---|
| **Module** | Zoho CRM → Search Records |
| **Module** | Leads |
| **Search Criteria** | `Phone` Equal to `{{1.customer_phone}}` OR `Email` Equal to `{{1.customer_email}}` |
| **Limit** | 1 |

### Module 3: Zoho CRM — Update Record

| Setting | Value |
|---|---|
| **Module** | Zoho CRM → Update a Record |
| **Record ID** | `{{2.ID}}` (from search result) |
| **Updated Fields** | |
| Lead Status | `Contacted` |
| CF_QMe_Booking_Status | `Booked` |
| CF_QMe_Booking_ID | `{{1.booking_id}}` |
| CF_Next_Call_Date | `{{1.booking_time}}` |

### Module 4: Slack — Notify Sales (if hot lead)

| Setting | Value |
|---|---|
| **Module** | Slack → Send a Channel Message |
| **Channel** | `#lead-activity` |
| **Message** | `📅 Booking confirmed: {{1.customer_name}} — {{1.service_name}} at {{1.booking_time}}` |

---

# SCENARIO 4: QMe No-Show → Auto-Reschedule

**Purpose:** When QMe reports a no-show, automatically reschedule and update Zoho.

**Trigger:** Custom Webhook (QMe sends webhook for no-show events)

### Module 1: Custom Webhook

| Setting | Value |
|---|---|
| **Module** | Webhooks → Custom webhook |
| **Name** | `qme-noshow-webhook` |

**Expected data:**
```json
{
  "event": "booking.noshow",
  "booking_id": "BK-12345",
  "customer_phone": "+254712345678",
  "customer_name": "John Kamau"
}
```

### Module 2: Zoho CRM — Search + Update

| Setting | Value |
|---|---|
| **Module** | Zoho CRM → Update Records (via search) |
| **Search** | `CF_QMe_Booking_ID` Equal to `{{1.booking_id}}` |
| **Update** | `CF_QMe_Booking_Status` = `No-Show` |

### Module 3: WhatsApp — Send Reschedule Message

| Setting | Value |
|---|---|
| **Module** | HTTP → Make a request (to Wati.io) |
| **URL** | `https://api.wati.io/api/v1/sendTemplateMessage?whatsappNumber={{1.customer_phone}}` |
| **Method** | POST |
| **Body** | Template: `sokogate_noshow_reschedule` with booking link |

### Module 4: Data Store — Track No-Shows

| Setting | Value |
|---|---|
| **Module** | Data Store → Add/replace a record |
| **Data Store** | `noshow_tracking` |
| **Keys** | `phone: {{1.customer_phone}}`, `count: 1` |

### Module 5: Conditional — If 2nd No-Show, Alert Human

| Setting | Value |
|---|---|
| **Module** | Flow Control → Router |
| **Route 1:** If `count >= 2` | Slack Alert: "🚩 [Name] has no-showed twice. Manual outreach needed." |
| **Route 2:** Default | End |

---

# SCENARIO 5: Weekly Reporting — Data Aggregation

**Purpose:** Every Monday 9AM, pull data from Zoho + QMe + Google Sheets and compile into a summary that feeds Looker Studio.

**Trigger:** Schedule (Every Monday 9AM EAT)

### Module 1: Schedule

| Setting | Value |
|---|---|
| **Module** | Schedule → Every week |
| **Day** | Monday |
| **Time** | 06:00 UTC (9:00 AM EAT) |

### Module 2: Zoho CRM — Get Records (Leads created this week)

| Setting | Value |
|---|---|
| **Module** | Zoho CRM → Get Records |
| **Module** | Leads |
| **Filter** | Created Time: Last 7 days |
| **Max Results** | 200 |

### Module 3: Zoho CRM — Get Records (Deals created this week)

| Setting | Value |
|---|---|
| **Module** | Zoho CRM → Get Records |
| **Module** | Deals |
| **Filter** | Created Time: Last 7 days |

### Module 4: Google Sheets — Add Summary Row

| Setting | Value |
|---|---|
| **Module** | Google Sheets → Add a Row |
| **Sheet** | `Weekly Summary` |
| **Data** | |
| Week Starting | `{{formatDate(now, "YYYY-MM-DD")}}` |
| New Leads | `{{2.total_count}}` |
| Hot Leads | `[count where score >= 70]` |
| Warm Leads | `[count where score 40-69]` |
| Cold Leads | `[count where score < 40]` |
| Deals Created | `{{3.total_count}}` |
| Avg Score | `[average]` |

---

# Setting Up Make.com — First-Time Checklist

### Step 1: Create Account
1. Go to make.com
2. Sign up (Google account works)
3. Start on Free plan (1,000 ops/month)
4. Upgrade to Pro ($9/month) when you hit 800 ops/month (around Month 3)

### Step 2: Create Connections (One-Time)
For each external service, create a connection:
- **Zoho CRM**: OAuth — log into your Zoho account
- **Google Sheets**: OAuth — select your Google account
- **Slack**: OAuth — select your workspace and channel
- **Meta WhatsApp Cloud**: Requires Meta Developer App setup (30 min)
- **Wati.io**: API token from Wati dashboard
- **QMe**: API key from QMe dashboard

### Step 3: Create Webhook URLs
1. For Scenarios 1, 3, and 4: Add the Custom Webhook module
2. Click "Add" → Copy the URL
3. Save these URLs — you'll need them in Voiceflow and QMe settings

### Step 4: Test Each Scenario
1. Turn ON the scenario (it starts listening)
2. Click "Run once" on the webhook
3. Send a test from the external system (Voiceflow / QMe)
4. Watch the modules execute in real-time
5. Fix any errors

### Step 5: Schedule Scenarios
- Scenario 1, 3, 4: Always ON (webhook-triggered)
- Scenario 2: Scheduled daily at 8AM EAT
- Scenario 5: Scheduled weekly on Monday at 9AM EAT

---

# Error Handling: What to Do When Things Break

| Error | Cause | Fix |
|---|---|---|
| Webhook not receiving data | URL mismatch | Check Voiceflow API step URL matches Make.com webhook URL |
| Zoho module fails "Invalid data" | Field type mismatch | Check Zoho field types (text vs number vs date) |
| WhatsApp message not sent | Template not approved | Check Meta template status. Use fallback text message |
| QMe API returns 401 | Expired API key | Refresh QMe API token |
| Google Sheets "Row limit" | Free tier limit | Archive old rows monthly |
| Scenario doesn't run | Credit limit hit | Upgrade plan or reduce scenario frequency |

**Proactive monitoring:** Scenario 1 captures all errors in the Google Sheets `Scenario Errors` log. Check this log once per week. If you see repeated errors, investigate immediately — a broken automation means leads are being dropped.
