# Days 2-5: Technical Build Sequence

**What you build after they say yes.**

This document covers exactly what you build, in what order, with the actual workflow configurations, chatbot scripts, and integration settings. No theory — just executable steps.

---

## Day 2: FOUNDATION LAYER (4-5 hours)

### Goal: Set up the infrastructure that everything else plugs into.

---

#### Task 1: Set Up Zoho CRM (45 min)

Zoho is your single source of truth. Every lead, every interaction, every deal stage lives here.

**Step-by-Step:**
1. Go to zoho.com/crm → Sign up for the **Free edition** (3 users, enough for now)
2. Create these custom fields under **Leads** module:
   - `Lead Source` (Dropdown: Website, WhatsApp, Social, Referral, App Download, Other)
   - `Business Type` (Dropdown: Wholesaler, Importer, Exporter, Retailer, Agent)
   - `Monthly Volume (KES)` (Number field)
   - `Industry Focus` (Dropdown: FMCG, Electronics, Textiles, Agriculture, Building Materials, Other)
   - `Qualification Score` (Number 1-100)
   - `QMe Booking Status` (Dropdown: Not Sent, Sent, Booked, Completed, No-Show, Rescheduled)
   - `Onboarding Stage` (Dropdown: Not Started, Welcome Sent, Docs Collected, Account Setup, Training, Complete)

3. Create these **Lead Statuses** (customize the default list):
   ```
   New → Contacted → Qualified → Call Booked (QMe) → Meeting Done → 
   Onboarding → Active Customer → Lost → Nurturing
   ```

4. Create a **Pipeline (Deals)** with stages:
   ```
   Lead → Qualification → Meeting Scheduled → Proposal → Negotiation → 
   Onboarding → First Order → Active Account
   ```

**Why this order matters:** You can't automate what you can't track. The CRM gives every tool a place to send data.

---

#### Task 2: Set Up Make.com Account & Webhook (30 min)

Make.com is your automation brain. It connects Voiceflow → Zoho → WhatsApp → Email → QMe.

1. Go to make.com → Sign up (free tier: 1,000 ops/month to start, upgrade later)
2. Create your first **Scenario** named: `Lead Capture - Voiceflow to Zoho`
3. Add a **Webhook** module as the trigger:
   - Click Webhooks → Custom Webhook
   - Click "Add" → name it `voiceflow-lead-capture`
   - Copy the webhook URL (you'll paste this into Voiceflow tomorrow)
   - Click "Save" → the webhook is now listening

4. Create a **Data Structure** for incoming leads:
   ```json
   {
     "name": "string",
     "business_name": "string",
     "email": "string",
     "phone": "string",
     "business_type": "string",
     "monthly_volume": "number",
     "industry_focus": "string",
     "current_supplier": "string",
     "location": "string",
     "source": "string",
     "qualification_score": "number"
   }
   ```

---

#### Task 3: Set Up QMe Account & Booking Link (30 min)

QMe handles ALL scheduling — both for your client's prospects and for your own agency operations.

1. Sign up at QMe platform (go to their website/contact them for access)
2. Set up your **Service: "Sokogate Discovery Call"**
   - Duration: 30 minutes
   - Buffer time: 15 minutes between calls
   - Availability: Mon-Fri 9AM-5PM EAT
   - Location: WhatsApp/Phone Call
   
3. Customize the **Booking Page**:
   - Brand color: Match Sokogate's brand (use their green/white from the website)
   - Logo: Upload Sokogate logo
   - Confirmation message: *"Thanks [Name]! You'll receive a WhatsApp reminder 24 hours and 1 hour before your call. Click here to add to calendar."*
   - Reminder timing: 24 hours before + 1 hour before

4. Get your **QMe API Key** (for Make.com integration later)
   - Look in Settings → Integrations → API Keys
   - Save this securely

5. Generate your **Public Booking Link**: `qme.app/yourname/sokogate-discovery`
   - Test it: Open in incognito, book a test appointment, verify you receive the confirmation

---

#### Task 4: Set Up Wati.io (WhatsApp API) — 45 min

Wati.io handles WhatsApp automation. You'll use it for auto-replies, template messages, and follow-up sequences.

1. Go to wati.io → Sign up (starts at $49/month for the Growth plan)
2. Connect a **WhatsApp Business Account**:
   - If Ultimo Trading has an existing WhatsApp Business account: Connect it via API
   - If not: Create a new WhatsApp Business account using a dedicated phone number
   
3. **IMPORTANT:** Submit WhatsApp template messages for approval (Meta reviews these):
   
   **Template 1: Welcome & Qualification Summary**
   ```
   Hi {{1}},

   Thanks for reaching out to Sokogate! Here's what we discussed:

   Business: {{2}}
   Interest: {{3}}
   Volume: {{4}}

   A member of our team will follow up within 2 hours. In the meantime, 
   would you like to book a quick discovery call?

   {{5}}  ← QMe booking link
   ```

   **Template 2: Meeting Reminder**
   ```
   Hi {{1}},

   Quick reminder — your Sokogate discovery call is in 24 hours.

   📅 {{2}} ({{3}} duration)
   
   To reschedule: {{4}}  ← QMe reschedule link
   ```

   **Template 3: Follow-Up (Day 3)**
   ```
   Hi {{1}},

   Just checking in! We haven't heard back since your inquiry about {{2}}.

   Here's what other wholesalers in {{3}} are sourcing on Sokogate this week:
   [Link to product catalog]

   Ready to get started? Book a call here: {{4}}
   ```

4. Set up **Auto-Reply for Business Hours**:
   - Message: *"Hi there! Thanks for reaching out to Sokogate. I'm an AI assistant — I can help answer your questions right now. What brings you to Sokogate today?"*
   - Then route to Voiceflow chatbot (integration set up tomorrow)

5. Set up **Auto-Reply for After Hours**:
   - Message: *"Thanks for your message! Our team is offline right now, but I can help you right away. What type of products are you looking to source?"*
   - Then route to same Voiceflow chatbot

---

#### Task 5: Set Up Instantly.ai (Email Warmup) — 30 min

Email warmup takes 2 weeks — you MUST start this on Day 2 even if email sequences won't launch until Week 3.

1. Go to instantly.ai → Sign up ($30/month for starter)
2. Add 2 sending email addresses (use separate domains if possible, e.g., `leads@sokogate.co.ke` and `hello@sokogate.co.ke`)
3. Start **Automated Warmup**:
   - Warmup volume: Start at 5 emails/day, ramp to 20/day over 2 weeks
   - Reply rate target: Set to 5-8% (natural human range)
   - Campaign type: Use Instantly's recommended settings for "Cold Outreach"
   - Warmup duration: 14 days minimum before first campaign
4. Connect your **sending domain(s)** with proper SPF, DKIM, DMARC records
   - Instantly will give you DNS records to add to your domain provider
   - This ensures your emails land in inboxes, not spam

**Why this matters now:** If you wait until Week 3 to start warmup, your emails will land in spam and your outreach will fail. Starting Day 2 means by Day 16 your domains are warm and ready.

---

#### End of Day 2 — Checklist

- [ ] Zoho CRM set up with custom fields, lead statuses, and pipeline stages
- [ ] Make.com account created, webhook ready, data structure defined
- [ ] QMe account set up with "Sokogate Discovery Call" service + booking link
- [ ] Wati.io account set up, WhatsApp Business connected, templates submitted
- [ ] Instantly.ai set up with 2 sending emails, warmup started, DNS records added

**Time spent:** ~4 hours  
**Tool cost started:** ~$100/month (Wati.io $49 + Instantly $30 + QMe TBD + Make.com free)

---

## Day 3: CHATBOT BUILD (5-6 hours)

### Goal: Build the Voiceflow lead qualification chatbot and connect it to your stack.

---

#### Task 1: Build the Voiceflow Chatbot — Full Script (3 hours)

Go to voiceflow.com → Create new project → "Lead Qualification Bot"

**Block 1: Greeting**
```
🤖 Bot: Hi there! 👋 Welcome to Sokogate — your direct line to verified 
suppliers in China and global markets.

I'm here to help you source products for your business. This will only 
take 2 minutes.

Are you looking to:
[1] Source new products for your business
[2] Check pricing on specific items
[3] Learn how Sokogate works
[4] Something else
```

- If [1] or [2] → Continue to Block 2
- If [3] → Send link to "How Sokogate Works" page → Ask if they want to source → continue
- If [4] → "What can I help you with?" → Free text → AI response → route back

**Block 2: Business Info**
```
🤖 Bot: Great! Let me connect you with the right team.

First, what's your name and business name?

✏️ [Name & Business Name]
```

- Store as variables: `{user_name}`, `{business_name}`

**Block 3: Business Type**
```
🤖 Bot: Thanks, {{user_name}}! What type of business are you?

[1] Wholesaler / Distributor
[2] Importer / Exporter
[3] Retailer
[4] Agent / Broker
[5] Other
```

- Store as `{business_type}`
- If [5] → "Tell me more about your business" → free text → store

**Block 4: Volume Qualification (THE KEY FILTER)**
```
🤖 Bot: To help provide accurate pricing, what's your estimated monthly 
order volume?

[1] Under KES 100,000
[2] KES 100,000 - 500,000
[3] KES 500,000 - 2,000,000
[4] KES 2,000,000+
[5] Not sure yet
```

**SCORING LOGIC:**
- [1] → Score = 20 (low priority, nurture track)
- [2] → Score = 40 (medium, short nurture)
- [3] → Score = 70 (high, immediate sales handoff)
- [4] → Score = 100 (hot, immediate sales + account manager)
- [5] → Score = 10 (educational nurture)

- Store as `{monthly_volume}` and `{qualification_score}`

**Block 5: Industry Focus**
```
🤖 Bot: Which industry are you most interested in?

[1] FMCG / Consumer Goods
[2] Electronics & Gadgets
[3] Textiles & Fashion
[4] Agriculture & Food Processing
[5] Building & Construction Materials
[6] Automotive & Spare Parts
[7] General Merchandise
[8] Other (tell us)
```

- Store as `{industry_focus}`

**Block 6: Location**
```
🤖 Bot: And where is your business based?

[1] Nairobi
[2] Mombasa
[3] Kisumu
[4] Other Kenya
[5] Uganda
[6] Tanzania
[7] Rwanda
[8] Other African country
[9] Outside Africa
```

- Store as `{location}`

**Block 7: Current Supplier**
```
🤖 Bot: One last question — do you currently have a supplier for the 
products you're looking for?

[1] Yes, but I'm looking for better pricing
[2] Yes, but I'm having quality/reliability issues
[3] No, I'm looking for my first supplier
[4] I want to compare options
```

- Store as `{current_supplier}`

**Block 8A: Qualified Path (Score ≥ 70)**
```
🤖 Bot: Thanks, {{user_name}}! You're exactly the type of business 
Sokogate was built for.

Here's what happens next:
✅ Your information has been sent to our team
✅ A specialist will follow up within 2 hours
✅ You can also book a call directly right now

📅 [Book a Discovery Call] → Opens QMe booking link

In the meantime, here's a quick overview of how Sokogate works:
[Link to explainer video or PDF catalog]
```

- **CRITICAL:** Trigger webhook to Make.com NOW (see Task 2 below)
- Store lead in Zoho as "Qualified"

**Block 8B: Warm Path (Score 40-69)**
```
🤖 Bot: Thanks, {{user_name}}! We'd love to help you find the right products.

Here's what we'll do:
📍 We'll send you more information about sourcing on Sokogate
📍 In a few days, a team member will check in to see if you have questions
📍 In the meantime, here's a catalog of our most popular products

[View Product Catalog]

📅 Want to speak with someone now? [Book a Call] → QMe link
```

- Store in Zoho as "Nurturing" — enters WhatsApp/email nurture sequence
- No immediate sales handoff

**Block 8C: Cold Path (Score < 40)**
```
🤖 Bot: Thanks, {{user_name}}! Here are some resources to help you 
get started with Sokogate:

📚 [Guide: How to Start Importing from China]
📚 [Product Catalog]
📚 [FAQ: Minimum Order Quantities & Pricing]

When you're ready to take the next step, feel free to come back or 
book a call with our team: [QMe Link]

Thanks for your interest! 🙏
```

- Store in Zoho as "Nurturing" — enters monthly re-engagement drip only
- No WhatsApp follow-up (to avoid annoying low-fit leads)

---

#### Task 2: Connect Voiceflow → Make.com → Zoho (1.5 hours)

**In Voiceflow:**
1. At the end of **Block 8A** (Qualified Path), add an **API Request** step:
   - Method: POST
   - URL: [Your Make.com webhook URL from Day 2]
   - Headers: `Content-Type: application/json`
   - Body:
   ```json
   {
     "name": "{user_name}",
     "business_name": "{business_name}",
     "email": "{user_email}",
     "phone": "{user_phone}",
     "business_type": "{business_type}",
     "monthly_volume": "{monthly_volume_value}",
     "industry_focus": "{industry_focus}",
     "current_supplier": "{current_supplier}",
     "location": "{location}",
     "source": "website_chatbot",
     "qualification_score": "{score}"
   }
   ```

2. Do the same for **Block 8B** (Warm Path) and **Block 8C** (Cold Path), but mark them correctly.

**In Make.com:**
1. Open your `Lead Capture - Voiceflow to Zoho` scenario
2. Add a **Zoho CRM** module after the webhook:
   - Action: Create a Lead Record
   - Map all fields from the webhook data to Zoho fields
3. Add a **Router** module after Zoho:
   - **Route 1 (Score ≥ 70):** Add a filter: `qualification_score >= 70`
     - Add **WhatsApp** module: Send template "Welcome & Qualification Summary" via Wati.io
     - Add **QMe** module: Send booking link via WhatsApp
     - Add **Slack/Email** module: Notify sales team "🔥 HOT LEAD: [Name] - [Business] - [Volume]"
   - **Route 2 (Score 40-69):** Add a filter: `qualification_score >= 40 AND < 70`
     - Add **WhatsApp** module: Send nurture message with catalog link
     - Schedule first WhatsApp follow-up in 3 days (use Make.com scheduler)
   - **Route 3 (Score < 40):** Add a filter: `qualification_score < 40`
     - Add to Airtable nurture list (no immediate action)
4. Add an **Error Handler** to the entire scenario:
   - If any module fails → log to Google Sheet with error details
   - Send alert email to you: "⚠️ Lead capture workflow error"

**Test the full flow:**
- Go to your chatbot → submit a test lead → verify it appears in Zoho CRM
- Verify WhatsApp notification comes through
- Verify QMe booking link is sent
- Check the error log sheet is empty

---

#### Task 3: Deploy Chatbot to Website (1 hour)

1. In Voiceflow:
   - Go to **Publish** tab
   - Select **Web Widget** as the deployment method
   - Customize appearance:
     - Color: Match Sokogate brand (#00A859 green or similar)
     - Position: Bottom-right
     - Greeting text: "Need help sourcing products? Chat with us! 💬"
     - Open delay: 5 seconds after page load (not immediate — don't annoy visitors)

2. Copy the **embed code** (a `<script>` tag)

3. To deploy on ultimotradingltd.co.ke:
   - If you have CMS/website access: Paste the script tag just before `</body>` tag
   - If you don't have access: Send the code to their web admin with clear instructions:
     ```
     "Paste this code just before the closing </body> tag on every page 
     of ultimotradingltd.co.ke. It adds a chat widget that captures 
     and qualifies leads 24/7."
     ```

4. **Deploy the WhatsApp click-to-chat button** too:
   - Add this HTML on the website (usually in the header or floating):
   ```html
   <a href="https://wa.me/254758947124?text=Hi%20Sokogate!%20I'm%20interested%20in%20sourcing%20products" 
      target="_blank"
      style="position:fixed;bottom:80px;right:20px;z-index:9999;
             background:#25D366;color:white;padding:12px 20px;
             border-radius:50px;font-weight:bold;text-decoration:none;
             box-shadow:0 4px 12px rgba(0,0,0,0.15);
             display:flex;align-items:center;gap:8px;">
      💬 Chat on WhatsApp
   </a>
   ```

---

#### End of Day 3 — Checklist

- [ ] Voiceflow chatbot built with 8 blocks + 3 path branches
- [ ] Scoring logic implemented (qualification score 1-100)
- [ ] Make.com scenario built: Webhook → Zoho → Router → WhatsApp/QMe/Slack
- [ ] Chatbot deployed on website with embed code
- [ ] WhatsApp click-to-chat button added to website
- [ ] Full end-to-end test passed (chatbot → Zoho → WhatsApp → QMe)
- [ ] Error handling in place

**Time spent:** ~5.5 hours  
**Tool state:** Chatbot live, capturing leads, routing to CRM automatically

---

## Day 4: FOLLOW-UP SEQUENCES + QMe ONBOARDING (5 hours)

### Goal: Build the automated follow-up sequences and the QMe-driven onboarding flow.

---

#### Task 1: Build WhatsApp Follow-Up Sequences in Wati.io (2 hours)

Create these broadcast sequences. They should be triggered by Make.com based on lead score and time elapsed.

**Sequence A: Qualified Leads (Score ≥ 70) — Post Call-Booking Follow-Up**

| Timing | Message | Trigger |
|---|---|---|
| **T+2 hours** | *"Hi {{name}}, your Sokogate discovery call is confirmed for {{date}}. We'll send a reminder 24 hours before. Have any questions in the meantime? Reply here."* | Auto-sent when QMe booking is confirmed |
| **T-24 hours** | *"Quick reminder — your Sokogate call is tomorrow at {{time}}. It's a 30-minute session to understand your sourcing needs. See you then! 🚀"* | QMe reminder (handled by QMe) |
| **T+1 hour (post-call)** | *"Great speaking with you, {{name}}! Here's a summary of what we discussed and next steps: [link to summary]. Ready to move forward? Book your onboarding session here: {{QMe onboarding link}}"* | Manual trigger by sales after call OR set to auto-send 1 hour after call time |
| **T+24 hours (post-call)** | *"Hey {{name}} — just checking in! Have you had a chance to review the info we sent? Happy to answer any questions. Here's that onboarding link again: {{QMe link}}"* | Auto |

**Sequence B: Warm Leads (Score 40-69) — Nurture Sequence**

| Timing | Message |
|---|---|
| **T+0 (immediate)** | *"Thanks {{name}}! We've received your info. While you explore, here are the top 10 products Kenyan wholesalers are sourcing this month: [link]"* |
| **T+3 days** | *"Hi {{name}} — just checking in! Have you had a chance to look at the catalog? Many businesses in {{location}} are saving 30-50% on bulk orders through Sokogate. Want to see pricing for your industry?"* |
| **T+7 days** | *"Quick tip: Most businesses we work with start with a small test order to verify quality before scaling up. Here's how to place your first order: [link to guide]"* |
| **T+14 days** | *"Last check-in! If you're still exploring options, we'd love to help. Book a free 15-minute consultation: {{QMe link}}. If not right now, no worries — we'll check in next month."* |
| **T+30 days** | *"Monthly update: New products just landed from our China partners. [link to new arrivals]. Ready to take the next step?"* |
| **T+60 days** | Move to quarterly nurture — reduce frequency to avoid unsubscribes |

**Sequence C: Cold Leads (Score < 40) — Low-Touch Drip**

| Timing | Message |
|---|---|
| **T+0** | *"Thanks for your interest in Sokogate! Here's a free guide: '5 Steps to Start Importing from China' [link]. When you're ready to source, we're here."* |
| **T+30 days** | *"Hi {{name}} — just a monthly check-in! Sokogate has helped 200+ Kenyan businesses source directly from verified suppliers. Free to sign up: [app link]"* |
| **T+90 days** | Remove from active list (too cold) |

---

#### Task 2: Build Email Follow-Up Sequences in Instantly.ai (1.5 hours)

Create these email campaigns in Instantly.ai. These run parallel to WhatsApp.

**Campaign A: Warm Leads (Score 40-69) — Email Nurture**

| Email | Day | Subject Line | Content |
|---|---|---|---|
| **E1** | T+0 | *Your Sokogate sourcing inquiry* | Thanks + Summary + Catalog link |
| **E2** | T+3 | *How [Business X] saved 40% on imports* | Case study of similar business |
| **E3** | T+7 | *Top 10 trending products for Kenyan wholesalers* | Product catalog with trending items |
| **E4** | T+14 | *Your personalized sourcing consultation* | CTA to book QMe call |
| **E5** | T+30 | *New shipments arriving next week* | New arrivals + seasonal deals |

**Campaign B: Cold Leads (Score < 40) — Monthly Newsletter**

| Email | Day | Subject Line |
|---|---|---|
| **E1** | T+0 | *Welcome to Sokogate — start here* |
| **E2** | T+30 | *Monthly product update + market insights* |
| **E3** | T+60 | *Success story: From local shop to regional distributor* |

**Email deliverability settings in Instantly:**
- Sending limit: Start at 10 emails/day per address, ramp to 30/day over 7 days
- Auto-follow-up if no reply: 1 follow-up at Day 4
- Unsubscribe link: REQUIRED (legal compliance)
- Bounce handling: Auto-remove after 2 bounces

---

#### Task 3: Build QMe Onboarding Flow (1.5 hours)

This is where QMe becomes the backbone of client onboarding.

**Step 1: Create QMe Services for Onboarding**

Create these services in QMe:

| Service | Duration | Description | Used When |
|---|---|---|---|
| **New Client Onboarding** | 45 min | Full onboarding session — account setup, catalog walkthrough, first order placement | Lead converts to client |
| **Account Setup Support** | 30 min | Technical help with app registration, profile completion | During onboarding |
| **Monthly Business Review** | 30 min | Review performance, discuss new products, plan next orders | Ongoing monthly |
| **Supplier Matching Session** | 30 min | Match client with right suppliers based on their needs | Week 2 of onboarding |

**Step 2: Build the Onboarding Queue**

QMe's queue management ensures no client gets lost:

```
Lead converts (says "Yes, I want to onboard")
  → QMe sends WhatsApp: "Great! Let's get you set up. 
     Here's your onboarding checklist:"
     
     📋 Step 1: Book your onboarding session → [QMe link: New Client Onboarding]
     📋 Step 2: Upload your business documents
        (Make.com sends secure upload link)
     📋 Step 3: Complete your profile on Sokogate app
     📋 Step 4: Book supplier matching session → [QMe link]
     
     Complete Step 1 to get started! The whole process takes about 2 hours.
```

**Step 3: QMe Reminder Chain**

| Trigger | Action |
|---|---|
| Onboarding booked | Confirmation WhatsApp + calendar invite |
| 24 hours before | Reminder: "Your onboarding session is tomorrow at 10AM. Have your business registration number ready." |
| 1 hour before | Reminder: "See you in 1 hour! Join here: [link]" |
| No-show (15 min late) | Auto-reschedule: "We missed you! Here's a link to reschedule: [QMe link]" |
| After session completed | Satisfaction survey: "How was your onboarding experience? Rate 1-5" |
| 3 days after onboarding | Check-in: "How's it going? Any questions about placing your first order?" |
| 7 days after onboarding | NPS survey: "Would you recommend Sokogate to other businesses?" |
| No first order after 14 days | Escalation alert sent to sales team: "🚩 [Client] hasn't placed first order yet" |

**Step 4: Connect QMe to Make.com**

Create these Make.com scenarios:

**Scenario: QMe Booking → Zoho Update**
```
Trigger: QMe webhook (when booking is created)
  → Update Zoho CRM lead record: QMe Booking Status = "Booked"
  → Send WhatsApp confirmation to client
  → Alert sales team
```

**Scenario: QMe No-Show → Auto-Reschedule**
```
Trigger: QMe webhook (when no-show marked)
  → Update Zoho: QMe Booking Status = "No-Show"
  → Send WhatsApp: "We missed you! Reschedule here: [QMe link]"
  → If 2nd no-show: Alert sales team for manual outreach
```

**Scenario: QMe Onboarding Complete → Next Steps**
```
Trigger: QMe webhook (when onboarding service marked complete)
  → Update Zoho: Onboarding Stage = "Complete"
  → Trigger WhatsApp: Welcome message with next steps
  → Schedule Day 3 and Day 7 check-in automations
  → Add client to monthly business review rotation
```

---

#### End of Day 4 — Checklist

- [ ] WhatsApp Sequence A (qualified leads) built in Wati.io
- [ ] WhatsApp Sequence B (warm leads) built in Wati.io
- [ ] WhatsApp Sequence C (cold leads) built in Wati.io
- [ ] Email Campaign A (warm leads) built in Instantly.ai
- [ ] Email Campaign B (cold leads) built in Instantly.ai
- [ ] QMe onboarding services created (4 services)
- [ ] QMe queue + reminder chain configured
- [ ] Make.com → QMe integration scenarios built
- [ ] End-to-end test: Lead → chatbot → qualifies → QMe booking → onboarding flow

**Time spent:** ~5 hours  
**Tool state:** Full follow-up system running, onboarding automation ready

---

## Day 5: TEST, LAUNCH & REPORTING (4-5 hours)

### Goal: End-to-end test, fix all issues, go live, and set up reporting dashboard.

---

#### Task 1: End-to-End System Test (2 hours)

Run through every path a lead could take. Document every issue. Fix everything.

**Test Scenario 1: High-Value Lead (Score ≥ 70)**
```
1. Go to ultimotradingltd.co.ke
2. Click chat widget
3. Fill in: "John Kamau, Nairobi Wholesalers Ltd"
4. Select: Wholesaler / KES 2,000,000+ / FMCG / Nairobi / Looking for better pricing
5. Expected outcome:
   ✅ Chatbot says "High-value lead" message
   ✅ QMe booking link appears
   ✅ Lead appears in Zoho CRM as "Qualified" with score 100
   ✅ WhatsApp notification sent to sales team: "🔥 HOT LEAD: John Kamau"
   ✅ WhatsApp sent to lead with booking link
```

**Test Scenario 2: Medium-Value Lead (Score 40-69)**
```
1. Same flow
2. Select: Retailer / KES 100,000-500,000 / Electronics / Mombasa / First supplier
3. Expected outcome:
   ✅ Chatbot says "Warm lead" message
   ✅ Catalog link sent
   ✅ Lead appears in Zoho as "Nurturing" with score 40
   ✅ No sales alert (saves team time)
   ✅ WhatsApp Day 3 follow-up scheduled in Make.com
```

**Test Scenario 3: Low-Value Lead (Score < 40)**
```
1. Same flow
2. Select: "Not sure yet" for volume / "General Merchandise"
3. Expected outcome:
   ✅ Chatbot sends educational resources
   ✅ Lead appears in Zoho as "Nurturing" with score 10
   ✅ No WhatsApp sequence triggered (prevents spam)
   ✅ Added to monthly email newsletter only
```

**Test Scenario 4: WhatsApp Inbound**
```
1. Send WhatsApp message to the business number
2. Expected outcome:
   ✅ Auto-reply sent within 2 seconds
   ✅ Chatbot flow initiates (same questions as website)
   ✅ Same routing logic applies
```

**Test Scenario 5: QMe Booking & Onboarding**
```
1. Click QMe booking link (from chatbot or WhatsApp)
2. Book a "New Client Onboarding" session
3. Expected outcome:
   ✅ Confirmation message received
   ✅ Appointment appears in QMe dashboard
   ✅ Zoho updated: QMe Status = "Booked"
   ✅ Reminder received 24 hours before
```

**Test Scenario 6: QMe No-Show**
```
1. Book an appointment
2. Don't attend (or mark as no-show in QMe dashboard)
3. Expected outcome:
   ✅ Auto-reschedule message sent via WhatsApp
   ✅ Zoho updated: QMe Status = "No-Show"
   ✅ Reschedule link provided
```

**Fix all broken paths before proceeding.**

---

#### Task 2: Deploy & Go Live (1 hour)

1. **Turn on all systems:**
   - [ ] Chatbot set to "Live" in Voiceflow
   - [ ] Webhook active in Make.com
   - [ ] Wati.io auto-reply enabled
   - [ ] Instantly.ai campaigns set to "Active" (if warmup is complete; otherwise set to "Scheduled")
   - [ ] QMe booking links live
   - [ ] WhatsApp click-to-chat button live on website

2. **Verify live:**
   - [ ] Go to website in incognito — chatbot appears
   - [ ] Send a WhatsApp message — auto-reply fires
   - [ ] Submit a test lead — appears in Zoho within 30 seconds
   - [ ] Book a QMe appointment — confirmation received

3. **Inform client (Ultimo Trading):**
   - Send them a "System Live" message
   - Share the QMe booking link they can use personally
   - Share the Zoho CRM login so they can see leads coming in
   - Explain what's happening: "Your chatbot is now live, capturing and qualifying leads 24/7. You'll receive WhatsApp alerts for hot leads. No action needed from your team — I'm monitoring everything."

---

#### Task 3: Build Reporting Dashboard — Looker Studio (1.5 hours)

Go to lookerstudio.google.com → Create new report → Connect to Zoho CRM data.

**Dashboard Pages:**

**Page 1: Pipeline Overview**
- Total leads this week (big number)
- Leads by source (pie chart: Website, WhatsApp, Social, Referral)
- Lead score distribution (bar chart: 100-70, 69-40, <40)
- Conversion funnel (funnel chart: Lead → Contacted → Qualified → Booked → Onboarded)
- Response time (gauge: current average vs 2-minute target)

**Page 2: Qualification Performance**
- Qualification rate (% of leads that score ≥ 70)
- Average qualification score over time (line chart)
- Top industries represented (bar chart)
- Drop-off points in chatbot (where do people stop answering?)
- Bot completion rate (% of users who finish all questions)

**Page 3: Outreach & Engagement**
- WhatsApp messages sent vs replied (stacked bar)
- Email open rate (line chart over time)
- Email click-through rate
- QMe booking rate (% of leads who book after receiving link)
- QMe no-show rate

**Page 4: Revenue Impact**
- Leads → Onboarded → First Order conversion (funnel)
- Time from first touch to first order (average, trend line)
- Estimated pipeline value (based on volume data × avg order value)

**Automated Sharing:**
- Schedule report to email Ultimo Trading stakeholders every Monday at 9AM
- Set up alert: If leads drop by >30% week-over-week, send you a notification

---

#### End of Day 5 — Checklist

- [ ] All 6 test scenarios passed end-to-end
- [ ] All broken paths fixed
- [ ] Systems live in production
- [ ] Client notified with logins and explanation
- [ ] Looker Studio dashboard built with 4 pages
- [ ] Weekly automated report scheduled
- [ ] Alerts configured for anomalies

**Time spent:** ~4.5 hours  
**System state:** FULLY LIVE — capturing leads, qualifying them, following up via WhatsApp and email, booking via QMe, onboarding automatically, and reporting weekly.

---

## Summary: Day 2-5 Technical Stack

```
                  ┌──────────────────┐
                  │  Voiceflow Chatbot│  ← Lead qualification (5-7 questions)
                  │  (Website + DM)   │
                  └────────┬─────────┘
                           │ Webhook
                           ▼
                  ┌──────────────────┐
                  │   Make.com       │  ← Central automation layer
                  │  (Orchestrator)  │
                  └──┬────┬────┬─────┘
                     │    │    │
          ┌──────────┘    │    └──────────┐
          ▼               ▼               ▼
   ┌────────────┐  ┌───────────┐  ┌──────────┐
   │  Zoho CRM  │  │ Wati.io   │  │ QMe      │
   │ (Data)     │  │(WhatsApp) │  │(Booking) │
   └────────────┘  └───────────┘  └──────────┘
                         │
                         ▼
                  ┌───────────────┐
                  │ Instantly.ai  │
                  │ (Email)       │
                  └───────────────┘
                         │
                         ▼
                  ┌───────────────┐
                  │ Looker Studio │
                  │ (Reporting)   │
                  └───────────────┘
```

**Total setup time:** ~19-21 hours over 4 days  
**Total monthly tool cost:** ~$150-200/month  
**System capability:** 24/7 lead capture, qualification, multi-channel follow-up, automated onboarding, and scheduled reporting — all running without you touching it after Day 5.
