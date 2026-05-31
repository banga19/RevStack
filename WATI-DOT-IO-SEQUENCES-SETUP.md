# Wati.io WhatsApp Sequence Setup

## Hot/Warm/Cold Templates, Timing, Branches & Meta Approval

---

# PART 1: META WHATSAPP TEMPLATE APPROVAL PROCESS

Before any sequence runs, your template messages must be approved by Meta. This takes 24-72 hours. **Start this on Day 2.**

### Step 1: Create a Meta Business Account
1. Go to business.facebook.com/overview
2. Click "Create Account" → Enter business name, name, email
3. Verify your business email

### Step 2: Set Up WhatsApp Business API via Wati.io
1. Log into **wati.io**
2. Go to **Settings → WhatsApp Business Account**
3. Click **"Create WhatsApp Business Account"**
4. You'll need:
   - A phone number that can receive SMS/voice calls (for verification)
   - This number CANNOT be registered with WhatsApp Consumer app
   - Recommend getting a dedicated SIM/eSIM for this
5. Wati guides you through the Meta verification flow

### Step 3: WhatsApp Business Account Setup within Meta

**What you'll set up inside the Meta Business Manager after clicking through from Wati:**

1. **WhatsApp Business Account**: Create it with your business name ("Sokogate" or your agency name)
2. **Profile Details**: 
   - Display Name: `Sokogate` (must match your business)
   - Description: `B2B wholesale sourcing platform connecting Kenyan businesses to global suppliers`
   - Email: `[your email]`
   - Category: `Shopping & Retail` or `Business & Finance`
   - Website: `https://ultimotradingltd.co.ke`
3. **Phone Number**: 
   - Enter the number
   - Verify via SMS code or phone call
   - ⚠️ The number CANNOT have an active WhatsApp consumer app — disable it first or use a new number

### Step 4: Create Template Messages in Wati.io

Inside Wati.io after your WABA (WhatsApp Business Account) is connected:

1. Go to **Templates** → **Create New Template**
2. Complete this for EACH template below

### Step 5: Template Submission Checklist

Each template needs:
| Field | What to Enter |
|---|---|
| **Name** | Lowercase, no spaces, underscores allowed (e.g., `sokogate_hot_lead_welcome`) |
| **Category** | `Marketing` (for nurture sequences) or `Utility` (for booking confirmations, reminders) |
| **Language** | `English (UK)` or `English (US)` |
| **Body Content** | The message text with `{{1}}`, `{{2}}` variables |
| **Header** | Optional — can be text, image, or video. Skip for simplicity |
| **Footer** | Optional — "Powered by Sokogate" or opt-out message |
| **Buttons** | Optional — "Call to action" or "Quick reply" buttons |

**Meta Approval Tips:**
- ❌ Don't use all-caps or clickbait
- ❌ Don't include pricing or discounts in Marketing templates
- ✅ Use clear, professional language
- ✅ Marketing templates: Include opt-out language like "Reply STOP to opt out"
- ✅ Utility templates: Must be transactional (booking confirmation, order update, appointment reminder)
- **Category matters:** Utility templates are approved faster (hours vs days)
- **If rejected:** Meta tells you why — fix the issue and resubmit

### Step 6: Rate Limits After Approval

| Period | Messages per Second | Messages per Day |
|---|---|---|
| First 24 hours | 15 msg/sec | 1,000 |
| After 24 hours | 80 msg/sec | 10,000+ |

**For your initial volume (10-50 leads/day), these limits are more than enough.**

---

# PART 2: TEMPLATE MESSAGES — EXACT CONTENT

## Template 1: Hot Lead Welcome (Category: Marketing)
**Template Name:** `sokogate_hot_lead_welcome`

**Body:**
```
Hi {{1}},

Thanks for reaching out to Sokogate! We've received your inquiry from {{2}} and a specialist will follow up within 2 hours.

In the meantime, book a discovery call directly:
{{3}}

Questions? Reply here.

Reply STOP to opt out.
```

**Variables:**
| Variable | Content |
|---|---|
| {{1}} | Customer name (e.g., "John") |
| {{2}} | Source channel (e.g., "our website") |
| {{3}} | QMe booking link (e.g., "https://qme.app/sokogate/discovery-call") |

**Buttons:** None (keep simple for faster approval)

---

## Template 2: Hot Lead Booking Confirmation (Category: Utility)
**Template Name:** `sokogate_booking_confirmed`

**Body:**
```
Hi {{1}},

Your Sokogate discovery call is confirmed!

📅 Date: {{2}}
⏰ Time: {{3}}
📍 Via: Phone / WhatsApp call

Add to calendar: {{4}}

Need to reschedule? {{5}}

Reply STOP to opt out.
```

**Variables:**
| Variable | Content |
|---|---|
| {{1}} | Customer name |
| {{2}} | Date (e.g., "Monday, 15 January") |
| {{3}} | Time (e.g., "10:00 AM EAT") |
| {{4}} | Calendar link (Google Calendar add URL) |
| {{5}} | QMe reschedule link |

---

## Template 3: Warm Lead Nurture Day 1 (Category: Marketing)
**Template Name:** `sokogate_warm_nurture_d1`

**Body:**
```
Hi {{1}},

Thanks for your interest in Sokogate! While you explore your options, here's a look at what other Kenyan wholesalers are sourcing this month:

📦 Top categories: FMCG, Electronics, Textiles, Building Materials

👉 View the full catalog: {{2}}

When you're ready to discuss pricing and MOQs, book a free consultation: {{3}}

Reply STOP to opt out.
```

**Variables:**
| Variable | Content |
|---|---|
| {{1}} | Customer name |
| {{2}} | Catalog link |
| {{3}} | QMe booking link |

---

## Template 4: Warm Lead Nurture Day 3 (Category: Marketing)
**Template Name:** `sokogate_warm_nurture_d3`

**Body:**
```
Hi {{1}} — just checking in!

Many businesses in {{2}} are saving 30-50% on bulk orders by sourcing directly through Sokogate. We connect you to verified factories in China — no middlemen.

Quick question: What products are you most interested in sourcing?

Reply to this message and I'll share pricing.

Reply STOP to opt out.
```

**Variables:**
| Variable | Content |
|---|---|
| {{1}} | Customer name |
| {{2}} | Location (e.g., "Nairobi", "Mombasa") |

---

## Template 5: Warm Lead Nurture Day 7 (Category: Marketing)
**Template Name:** `sokogate_warm_nurture_d7`

**Body:**
```
Hi {{1}} — quick tip 💡

Most businesses we work with start with a small test order to verify quality before scaling up.

Here's how to place your first order on Sokogate in 3 steps:
1. Sign up (takes 2 mins)
2. Browse products from verified suppliers
3. Place your first order

👉 Get started: {{2}}

Or book a 15-minute walkthrough: {{3}}

Reply STOP to opt out.
```

**Variables:**
| Variable | Content |
|---|---|
| {{1}} | Customer name |
| {{2}} | App download / signup link |
| {{3}} | QMe booking link |

---

## Template 6: Warm Lead Nurture Day 14 (Category: Marketing)
**Template Name:** `sokogate_warm_nurture_d14`

**Body:**
```
Hi {{1}} — last check-in from our team!

If you're still exploring sourcing options, we'd love to help you find the right supplier. No pressure — just a quick chat to understand your needs.

👉 Book a free 15-minute consultation: {{2}}

If now isn't the right time, no worries — we'll check in next month with new product arrivals.

Reply STOP to opt out.
```

**Variables:**
| Variable | Content |
|---|---|
| {{1}} | Customer name |
| {{2}} | QMe booking link |

---

## Template 7: No-Show Reschedule (Category: Utility)
**Template Name:** `sokogate_noshow_reschedule`

**Body:**
```
Hi {{1}},

We missed you at your Sokogate discovery call today.

No worries — life happens! Here's a link to reschedule for a time that works better:

🔗 {{2}}

If you're no longer interested, just reply "STOP" and we won't message again.

Reply STOP to opt out.
```

**Variables:**
| Variable | Content |
|---|---|
| {{1}} | Customer name |
| {{2}} | QMe reschedule link |

---

## Template 8: Re-engagement (Monthly) (Category: Marketing)
**Template Name:** `sokogate_monthly_reengagement`

**Body:**
```
Hi {{1}} — monthly update from Sokogate! 📣

New products just arrived from our partner factories in China:
📦 {{2}}
📦 {{3}}
📦 {{4}}

Plus: We've added new payment options including M-Pesa for deposits.

👉 Browse new arrivals: {{5}}

Reply STOP to opt out.
```

**Variables:**
| Variable | Content |
|---|---|
| {{1}} | Customer name |
| {{2}} | Product category 1 |
| {{3}} | Product category 2 |
| {{4}} | Product category 3 |
| {{5}} | New arrivals link |

---

## Template 9: Post-Onboarding Welcome (Category: Utility)
**Template Name:** `sokogate_onboarding_welcome`

**Body:**
```
Welcome to Sokogate, {{1}}! 🎉

Your account is set up and you're ready to start sourcing.

Here's your onboarding checklist:
✅ Account created
⬜ Browse products
⬜ Contact a supplier
⬜ Place your first order

Need help? Reply here or book a support session: {{2}}

Reply STOP to opt out.
```

**Variables:**
| Variable | Content |
|---|---|
| {{1}} | Customer name |
| {{2}} | QMe support booking link |

---

## Template 10: Post-Onboarding Day 3 Check-In (Category: Marketing)
**Template Name:** `sokogate_onboarding_d3`

**Body:**
```
Hi {{1}} — how's it going with Sokogate so far?

Have you had a chance to browse the catalog or contact any suppliers? If you need help finding the right products for your business, reply here or book a quick call: {{2}}

We're here to help you succeed! 🚀

Reply STOP to opt out.
```

**Variables:**
| Variable | Content |
|---|---|
| {{1}} | Customer name |
| {{2}} | QMe support booking link |

---

# PART 3: BROADCAST SEQUENCES — TIMING & BRANCHING

## Sequence A: Hot Lead Path (Automated, Immediate)

**Trigger:** Lead qualifies with score ≥ 70 → Make.com fires webhook to Wati.io

| Step | Timing | Template | Notes |
|---|---|---|---|
| 1 | Immediate (T+0) | `sokogate_hot_lead_welcome` | Welcome + booking link |
| 2 | When booked via QMe | `sokogate_booking_confirmed` | Confirmation + calendar |
| 3 | 24h before call | QMe handles this natively | Reminder |
| 4 | 1h before call | QMe handles this natively | Reminder |
| 5 | T+1h after call | Manual (sales team) OR auto if no-show | Follow-up based on call outcome |
| 6 | If no-show | `sokogate_noshow_reschedule` | Reschedule link |

**Branching after call:**
```
Call completed → Client interested → Move to onboarding sequence
Call completed → Client not ready → Move to Warm nurture (Day 1)
No-show → Reschedule sent → If 2nd no-show → Human outreach
```

---

## Sequence B: Warm Lead Nurture (5-Step, 14-Day Sequence)

**Trigger:** Lead qualifies with score 40-69 → Make.com schedules follow-ups

| Step | Timing | Template | Purpose |
|---|---|---|---|
| 1 | T+0 (immediate) | `sokogate_warm_nurture_d1` | Catalog + CTA to book |
| 2 | T+3 days | `sokogate_warm_nurture_d3` | Check-in + ask about products |
| 3 | T+7 days | `sokogate_warm_nurture_d7` | How-to guide + test order encouragement |
| 4 | T+14 days | `sokogate_warm_nurture_d14` | Final push + "we'll check in later" |
| 5 | T+30 days | `sokogate_monthly_reengagement` | Monthly update with new products |

**Branching logic:**
```
Any step → Lead replies with interest → Escalate to hot lead path
Any step → Lead replies "STOP" → Remove from all sequences
Any step → Lead books call → Move to QMe booking flow
After step 4 → No response → Monthly re-engagement only
```

**Branching Implementation in Make.com (Scenario 2):**
In the Wati.io dashboard, set up **Webhook Events** to forward incoming WhatsApp replies to Make.com. Create a new Make.com scenario:

```
Webhook (Wati incoming reply)
  → Parse message content
  → Router:
    - If contains "interested", "price", "order", "book", "yes" → Change lead tier to "hot" → trigger hot lead path
    - If contains "STOP", "stop", "unsubscribe" → Update Zoho: Opted Out = true
    - If contains booking confirmation → Update QMe status
    - Default → Log reply text to Zoho notes
```

**To set up this reply handling in Wati.io:**
1. Go to **Settings → Webhook**
2. Enter your Make.com webhook URL (Scenario 6 — create a new simple webhook scenario)
3. Select events: `message_received`
4. Wati will forward every incoming message to your Make.com scenario

---

## Sequence C: Cold Lead (Low-Touch, Monthly Only)

**Trigger:** Lead qualifies with score < 40

| Step | Timing | Template | Notes |
|---|---|---|---|
| 1 | T+0 | No WhatsApp (email only) | Prevents spam — email nurture only |
| 2 | T+30 days | `sokogate_monthly_reengagement` | First WhatsApp touch (with opt-out) |
| 3 | T+60 days | `sokogate_monthly_reengagement` | (if still active) |
| 4 | T+90 days | Remove from list | Too cold — don't over-message |

---

# PART 4: AUTO-REPLY SETUP (24/7 Inbound Handling)

In Wati.io's **Chatbot Builder**, create these auto-reply flows:

### Flow 1: Business Hours Auto-Reply (Mon-Fri 8AM-6PM EAT)

| Condition | Response |
|---|---|
| Any incoming message | `"Hi there! 👋 Welcome to Sokogate. I'm an AI assistant. I can help you right now or connect you to a human. What brings you here today?"` |
| User replies with product interest | Route to Voiceflow chatbot (via API call to Voiceflow) |
| User says "human", "agent", "person" | `"Let me connect you to a team member. One moment please."` → Send Slack alert to sales team |
| No reply for 5 minutes | Send follow-up: `"Still there? Feel free to type your question whenever you're ready."` |

### Flow 2: After-Hours Auto-Reply (6PM-8AM + Weekends)

| Condition | Response |
|---|---|
| Any incoming message | `"Thanks for messaging Sokogate! Our team is offline right now, but I can help you immediately. I'm an AI assistant. What products are you looking to source?"` |
| User replies | Route to Voiceflow chatbot (same as website flow) |
| When user qualifies as hot lead | Store for morning: `"Thanks! A team member will follow up at 9AM tomorrow. Here's a link to book a call: [QMe link]"` |

### Setting Up Auto-Reply in Wati.io:
1. Go to **Chatbot** → **Flows**
2. Click **Create Flow** → name it `Business Hours` or `After Hours`
3. Add **Trigger**: `Incoming Message`
4. Add **Condition**: Time-based (check current time)
5. Add **Action**: Send Message with the template text
6. Add **Action**: API Call to Voiceflow (for chatbot handoff)
7. Toggle the flow to **Active**

**Voiceflow API call (for auto-reply → chatbot handoff):**
```
POST https://general-runtime.voiceflow.com/state/user/{session_id}/interact
Headers: 
  Authorization: Bearer {VOICEFLOW_API_KEY}
  Content-Type: application/json
Body:
{
  "action": { "type": "text", "payload": "{user_message}" },
  "config": { "tts": false }
}
```

---

# PART 5: WATI.IO SETTINGS REFERENCE

### Account Setup Checklist

| Setting | Value |
|---|---|
| **Plan** | Growth ($49/mo) — needed for API access |
| **WhatsApp Business Account** | Connected via Meta |
| **Phone Number** | [Dedicated number — not your personal number] |
| **Display Name** | Sokogate |
| **Webhook URL** | `https://hook.make.com/your-webhook-url` (from Make.com) |
| **Webhook Events** | `message_received`, `message_sent`, `message_failed`, `template_approved`, `template_rejected` |
| **Chatbot** | Enabled with 2 flows (Business Hours + After Hours) |
| **Agent Assignment** | Round-robin (if multiple sales people) |
| **Auto-Reply** | Enabled (with chatbot flows) |

### Template Status Tracking

| Status | Meaning | Action Needed |
|---|---|---|
| **PENDING** | Submitted, awaiting Meta review | Wait 24-72 hours |
| **APPROVED** | Ready to use | Start sending |
| **REJECTED** | Didn't meet Meta policies | Edit and resubmit |
| **PAUSED** | Quality issues (low engagement) | Review template quality |

**Check template status:** Wati.io → Templates → Status column

### Common Rejection Reasons & Fixes

| Rejection Reason | Fix |
|---|---|
| "Misleading content" | Remove guarantees like "100% guaranteed savings" |
| "No opt-out mechanism" | Add "Reply STOP to opt out" at the end of ALL Marketing templates |
| "Capitalization" | Don't use ALL CAPS for emphasis |
| "Incorrect category" | If it's transactional, use UTILITY not MARKETING |
| "Variable misuse" | Ensure {{1}}, {{2}} match exactly what you'll send |

---

# PART 6: CONNECTING WATI.IO TO MAKE.COM

### Direction 1: Make.com → Send WhatsApp Message (via Wati API)

Create an **HTTP module** in Make.com:

| Setting | Value |
|---|---|
| **URL** | `https://api.wati.io/api/v1/sendTemplateMessage?whatsappNumber={{phone_number}}` |
| **Method** | POST |
| **Headers** | `Authorization: Bearer {{YOUR_WATI_API_TOKEN}}` |
| | `Content-Type: application/json` |
| **Body** | |
```json
{
  "template_name": "sokogate_hot_lead_welcome",
  "broadcast_name": "auto_hot_lead_{{timestamp}}",
  "parameters": [
    { "name": "name", "value": "{{customer_name}}" },
    { "name": "source", "value": "our website" },
    { "name": "booking_link", "value": "https://qme.app/sokogate/discovery-call" }
  ]
}
```

**To get your Wati API token:**
1. Wati.io → Settings → API Token
2. Copy the token
3. In Make.com, create a variable: `WATI_API_TOKEN` = [your token]

### Direction 2: Wati.io → Make.com (Receive Incoming Messages)

1. In Make.com, create a new scenario with **Webhook** trigger
2. Name it `Wati Inbound Messages`
3. Copy the webhook URL
4. In Wati.io → Settings → Webhook → Paste URL
5. Select events: `message_received`
6. Click Save

**Now every incoming WhatsApp message flows to Make.com**, where you can:
- Log it to Zoho CRM (update lead record with last contact)
- Trigger a follow-up action
- Route to Slack for human attention if needed
- Score the reply content for intent

---

# Summary: Day 2-4 Wati.io Setup Timeline

| Day | Task | Time Needed |
|---|---|---|
| **Day 2** | Create Meta Business Account + WhatsApp Business Account via Wati | 1 hour |
| **Day 2** | Submit 6 Marketing templates + 4 Utility templates for approval | 1 hour |
| **Day 3** | While templates are pending: Build auto-reply flows in Wati Chatbot Builder | 1.5 hours |
| **Day 3** | Set up webhook connection to Make.com | 30 min |
| **Day 4** | Check template approval status. Any rejected → fix and resubmit | 30 min |
| **Day 4** | Activate approved templates in broadcast sequences | 30 min |
| **Day 5** | Test end-to-end: Send test WhatsApp → Wati → Make → Zoho → Reply back | 1 hour |

**Total setup time:** ~5-6 hours spread over 3 days  
**Most of this is waiting for Meta template approval.** Start on Day 2 and the templates should be approved by Day 4-5.
