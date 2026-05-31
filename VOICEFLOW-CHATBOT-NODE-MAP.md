# Voiceflow Chatbot: Complete Node Map & JSON Structure

## Copy-Paste Ready for Voiceflow Builder

This document contains every node, variable, button, API call, and routing path for the Sokogate B2B lead qualification chatbot. You can recreate this in Voiceflow block by block.

---

## PART 1: VOICEFLOW SETUP

### Project Settings

| Setting | Value |
|---|---|
| **Project Name** | Sokogate Lead Qualification |
| **Language** | English (Kenya/UK) |
| **Canvas Type** | Classic (not AI Agent) |
| **NLU Model** | Voiceflow NLU |
| **Default Voice** | None (text-only for now) |
| **Platform** | Web Widget + WhatsApp (via API) |

### Variables to Create

Create these variables in the Voiceflow Variables panel BEFORE building any blocks:

| Variable Name | Type | Default Value | Purpose |
|---|---|---|---|
| `user_name` | Text | "" | Customer's name |
| `business_name` | Text | "" | Company name |
| `phone` | Text | "" | Phone number (captured later) |
| `email` | Text | "" | Email address |
| `business_type` | Text | "" | Wholesaler, Importer, etc. |
| `monthly_volume` | Text | "" | Volume tier selected |
| `volume_value` | Number | 0 | Numeric volume for scoring |
| `industry_focus` | Text | "" | Selected industry |
| `location` | Text | "" | City/country |
| `current_supplier` | Text | "" | Current situation |
| `qualification_score` | Number | 0 | Computed score (0-100) |
| `lead_source` | Text | "website_chatbot" | Source channel |
| `bot_response` | Text | "" | Used for API responses |
| `capture_email` | Text | "" | Email input from user |
| `capture_phone` | Text | "" | Phone input from user |
| `booking_link` | Text | "https://qme.app/..." | QMe link for qualified leads |

---

## PART 2: COMPLETE NODE MAP

Below is every node in the flow, organized by block number. Build them in this order.

---

### BLOCK 1: Greeting Node

**Node Type:** Text + Buttons

**Bot Says:**
```
Hi there! 👋 Welcome to Sokogate — your direct line to verified suppliers 
in China and global markets.

I'm here to help you source products for your business. This will only 
take 2 minutes.

What brings you here today?
```

**Buttons (4 choices):**
| Button Label | Path | Intent |
|---|---|---|
| Source new products | → Block 2 | `intent_source` |
| Check pricing on items | → Block 2 | `intent_pricing` |
| Learn how Sokogate works | → Block 1b (Info) | `intent_learn` |
| Something else | → Block 1c (Free text) | `intent_other` |

---

### BLOCK 1b: Info Path (Conditional)

**Node Type:** Text + Buttons

**Bot Says:**
```
Sokogate connects Kenyan wholesalers, importers, and exporters directly 
to verified suppliers and manufacturers — mainly in China.

✅ Direct from factory — no middlemen
✅ Bulk pricing — save 30-50%
✅ Fast logistics to Kenya
✅ Quality verified suppliers

Ready to find products for your business?
```

**Buttons:**
| Button Label | Path |
|---|---|
| Yes, let's start! | → Block 2 |
| Not right now, thanks | → Block End (Exit) |

---

### BLOCK 1c: Other Intent (Free Text)

**Node Type:** Text + Text Input

**Bot Says:**
```
What can I help you with? Tell me a bit about what you're looking for.
```

**Input Capture:**
- Store response in variable: `bot_response`
- Send to LLM / AI Knowledge Base for intent classification

**Logic (Conditional after response):**
| If response contains... | Route to... |
|---|---|
| "source", "buy", "import", "order", "products", "supplier" | → Block 2 |
| "price", "cost", "pricing", "quote" | → Block 2 |
| "how", "what is", "explain", "learn" | → Block 1b |
| Anything else | → Block 1b |

---

### BLOCK 2: Name & Business Capture

**Node Type:** Text + Text Input (Name) + Text Input (Business)

**Bot Says:**
```
Great, let's get started! First, what's your name and the name of 
your business?
```

**Capture 1: Name**
- Prompt: "Your name:"
- Store in: `user_name`

**Capture 2: Business Name**
- Prompt: "Business name:"
- Store in: `business_name`

**Transition:** After both captured → Block 3

---

### BLOCK 3: Business Type

**Node Type:** Text + Buttons

**Bot Says:**
```
Thanks, {{user_name}} from {{business_name}}!

What type of business are you?
```

**Buttons (5 choices):**
| Button Label | Value | Path |
|---|---|---|
| Wholesaler / Distributor | `wholesaler` | → Block 4 |
| Importer / Exporter | `importer` | → Block 4 |
| Retailer | `retailer` | → Block 4 |
| Agent / Broker | `agent` | → Block 4 |
| Other | `other` | → Block 3b |

**Set Variable:**
- `business_type` = [selected value]

---

### BLOCK 3b: Other Business Type

**Node Type:** Text + Text Input

**Bot Says:**
```
Tell me more about your business — what do you do?
```

**Input Capture:**
- Store in: `business_type` (overwrite with free text)

**Transition:** → Block 4

---

### BLOCK 4: Monthly Volume (THE QUALIFICATION GATE)

**Node Type:** Text + Buttons

**Bot Says:**
```
To help provide accurate pricing, what's your estimated monthly 
order volume?
```

**Buttons (5 choices):**
| Button Label | Stored Value | Score Value | Path |
|---|---|---|---|
| Under KES 100,000 | `under_100k` | 10 | → Block 5 |
| KES 100,000 - 500,000 | `100k_to_500k` | 30 | → Block 5 |
| KES 500,000 - 2,000,000 | `500k_to_2m` | 60 | → Block 5 |
| KES 2,000,000+ | `over_2m` | 100 | → Block 5 |
| Not sure yet | `not_sure` | 5 | → Block 5 |

**Set Variables:**
- `monthly_volume` = [selected value]
- `volume_value` = [score value] (numeric: 10, 30, 60, 100, or 5)

---

### BLOCK 5: Industry Focus

**Node Type:** Text + Buttons

**Bot Says:**
```
Which industry are you most interested in sourcing from?
```

**Buttons (8 choices):**
| Button Label | Value | Path |
|---|---|---|
| FMCG / Consumer Goods | `fmcg` | → Block 6 |
| Electronics & Gadgets | `electronics` | → Block 6 |
| Textiles & Fashion | `textiles` | → Block 6 |
| Agriculture & Food Processing | `agriculture` | → Block 6 |
| Building & Construction Materials | `construction` | → Block 6 |
| Automotive & Spare Parts | `automotive` | → Block 6 |
| General Merchandise | `general` | → Block 6 |
| Other (tell us) | `other` | → Block 5b |

**Set Variable:**
- `industry_focus` = [selected value]

---

### BLOCK 5b: Other Industry

**Node Type:** Text + Text Input

**Bot Says:**
```
What industry or products are you looking for?
```

**Input Capture:**
- Store in: `industry_focus`

**Transition:** → Block 6

---

### BLOCK 6: Location

**Node Type:** Text + Buttons

**Bot Says:**
```
Where is your business based?
```

**Buttons (9 choices):**
| Button Label | Value | Path |
|---|---|---|
| Nairobi | `nairobi` | → Block 7 |
| Mombasa | `mombasa` | → Block 7 |
| Kisumu | `kisumu` | → Block 7 |
| Other Kenya | `other_kenya` | → Block 7 |
| Uganda | `uganda` | → Block 7 |
| Tanzania | `tanzania` | → Block 7 |
| Rwanda | `rwanda` | → Block 7 |
| Other African country | `other_africa` | → Block 7 |
| Outside Africa | `outside_africa` | → Block 7 |

**Set Variable:**
- `location` = [selected value]

---

### BLOCK 7: Current Supplier Situation

**Node Type:** Text + Buttons

**Bot Says:**
```
One last question — do you currently have a supplier for the 
products you're looking for?
```

**Buttons (4 choices):**
| Button Label | Value | Path |
|---|---|---|
| Yes, but looking for better pricing | `better_pricing` | → SCORING ENGINE |
| Yes, but quality/reliability issues | `quality_issues` | → SCORING ENGINE |
| No, looking for first supplier | `first_supplier` | → SCORING ENGINE |
| I want to compare options | `compare` | → SCORING ENGINE |

**Set Variable:**
- `current_supplier` = [selected value]

---

### BLOCK 8: SCORING ENGINE (Compute Score)

**Node Type:** Code / Math block

This block calculates the final qualification score and determines which path the lead takes.

**Computation Logic:**

```
qualification_score = volume_value

// Boost score based on business type
IF business_type == "wholesaler" OR business_type == "importer" THEN
    qualification_score = qualification_score + 15
ELSE IF business_type == "distributor" THEN
    qualification_score = qualification_score + 10
ELSE IF business_type == "retailer" THEN
    qualification_score = qualification_score + 5
END IF

// Boost based on current supplier situation (urgency)
IF current_supplier == "quality_issues" THEN
    qualification_score = qualification_score + 10    // High urgency — needs solution
ELSE IF current_supplier == "better_pricing" THEN
    qualification_score = qualification_score + 5     // Medium urgency
ELSE IF current_supplier == "first_supplier" THEN
    qualification_score = qualification_score + 3     // Lower urgency, needs education
ELSE IF current_supplier == "compare" THEN
    qualification_score = qualification_score + 2     // Browsing
END IF

// Cap at 100
IF qualification_score > 100 THEN
    qualification_score = 100
END IF
```

**Route Logic (after computing):**

| Condition | Route to... |
|---|---|
| `qualification_score >= 70` | Block 9A: Hot Lead Path |
| `qualification_score >= 40 AND < 70` | Block 9B: Warm Lead Path |
| `qualification_score < 40` | Block 9C: Cold Lead Path |

---

### BLOCK 9A: Hot Lead Path (Score ≥ 70)

**Node Type:** Text + Buttons + API Call

**Bot Says:**
```
Thanks, {{user_name}} from {{business_name}}! You're exactly the 
type of business Sokogate was built for. 🎯

Here's what happens next:
✅ Your information has been sent to our team
✅ A specialist will follow up via WhatsApp within 2 hours
✅ You can also book a call directly right now
```

**Buttons:**
| Button Label | Action |
|---|---|
| 📅 Book My Discovery Call | → Opens QMe booking URL in new tab |
| 📱 Continue on WhatsApp | → Triggers WhatsApp redirect link |
| 👀 Show me the catalog | Sends catalog link, then → Block End |

**API Call (Webhook to Make.com):**

**This fires immediately when the user hits this block.** Set the API call to run in the background (don't wait for response to continue the conversation).

**Method:** POST
**URL:** `https://hook.make.com/your-webhook-id-here`
**Headers:**
| Key | Value |
|---|---|
| Content-Type | application/json |

**Body (JSON):**
```json
{
  "user_name": "{{user_name}}",
  "business_name": "{{business_name}}",
  "phone": "{{capture_phone}}",
  "email": "{{capture_email}}",
  "business_type": "{{business_type}}",
  "monthly_volume": "{{monthly_volume}}",
  "volume_value": {{volume_value}},
  "industry_focus": "{{industry_focus}}",
  "location": "{{location}}",
  "current_supplier": "{{current_supplier}}",
  "qualification_score": {{qualification_score}},
  "lead_source": "{{lead_source}}",
  "lead_tier": "hot",
  "timestamp": "{{$timestamp}}",
  "bot_session_id": "{{$session_id}}"
}
```

**QMe Booking Link Variable:**
```
booking_link = "https://qme.app/sokogate/discovery-call"
```

**Transition:** → Block End (Post-Channel message)

---

### BLOCK 9B: Warm Lead Path (Score 40-69)

**Node Type:** Text + Buttons + API Call

**Bot Says:**
```
Thanks, {{user_name}}! We'd love to help you find the right products 
for {{business_name}}.

Here's what we'll do:
📍 We'll send you more info about sourcing on Sokogate
📍 In a few days, a team member will check in to answer questions
📍 In the meantime, here's a catalog of popular products
```

**Buttons:**
| Button Label | Action |
|---|---|
| 📚 View Product Catalog | Opens catalog link |
| 📅 Book a Call (Optional) | Opens QMe booking link |
| ✅ Sounds good, I'll wait | → Block End |

**API Call to Make.com (same structure as Block 9A, but with different tier):**
```json
{
  ...same fields...,
  "lead_tier": "warm",
  ...same fields...
}
```

**Transition:** → Block End

---

### BLOCK 9C: Cold Lead Path (Score < 40)

**Node Type:** Text + Buttons + API Call

**Bot Says:**
```
Thanks, {{user_name}} from {{business_name}}! Here are some resources 
to help you get started with Sokogate:

📚 [Guide: How to Start Importing from China]
📚 [Product Catalog]
📚 [FAQ: Minimum Order Quantities & Pricing]

When you're ready to take the next step, feel free to come back or 
book a call with our team.
```

**Buttons:**
| Button Label | Action |
|---|---|
| 📚 Send me the guide | Triggers email send → → Block End |
| 📅 Book a Call (Optional) | Opens QMe booking link |
| ❌ No thanks, I'm just browsing | → Block End |

**API Call to Make.com (cold tier — no WhatsApp follow-up triggered):**
```json
{
  ...same fields...,
  "lead_tier": "cold",
  ...same fields...
}
```

**Transition:** → Block End

---

### BLOCK End: Exit Message

**Node Type:** Text

**Bot Says:**
```
Thanks for chatting with us, {{user_name}}! 🚀

If you have any other questions, just type them here or reach out 
on WhatsApp: wa.me/254758947124

Have a great day!
```

**No buttons.** Conversation ends. The chat widget goes back to idle state.

---

### BLOCK End: Collect Contact Info (Post-Channel)

**Node Type:** Text + Text Input

This block is reached AFTER the main flow if the user hasn't provided phone/email yet. It's a second-chance capture.

**Bot Says:**
```
Before you go — can we get your email or phone number so we can 
send you the resources we mentioned?
```

**Capture 1: Email (optional)**
- Prompt: "Email address:"
- Store in: `capture_email`

**Capture 2: Phone (optional)**
- Prompt: "Phone number (WhatsApp preferred):"
- Store in: `capture_phone`

**After capture → Final exit**

---

## PART 3: WHATSAPP PATH (separate flow, identical logic)

Create a separate Voiceflow project or a parallel flow within the same project for WhatsApp inbound messages.

**Trigger:** Wati.io sends incoming WhatsApp message to Voiceflow API endpoint.

**Flow is identical to the website flow** except:

| Difference | Website Flow | WhatsApp Flow |
|---|---|---|
| Greeting | "Hi there! 👋 Welcome to Sokogate..." | "Hi {{user_name}}! Thanks for WhatsApp-ing Sokogate. I'm the AI assistant. Let me help you find products." |
| Lead source variable | `"website_chatbot"` | `"whatsapp_inbound"` |
| URLs | Opens in browser | Sends as WhatsApp message |
| QMe link | Opens in browser | Sends WhatsApp template with link |

**Everything else (Blocks 2-9C): IDENTICAL.**

---

## PART 4: JSON EXPORT STRUCTURE

While Voiceflow doesn't export to a standard JSON format easily, here's the structure you'd use if you were building the flow via Voiceflow's API or as a reference for manual recreation:

```json
{
  "project": {
    "name": "Sokogate Lead Qualification",
    "version": "1.0",
    "platform": "web",
    "locale": "en-KE"
  },
  "variables": [
    {"name": "user_name", "type": "text", "default": ""},
    {"name": "business_name", "type": "text", "default": ""},
    {"name": "phone", "type": "text", "default": ""},
    {"name": "email", "type": "text", "default": ""},
    {"name": "business_type", "type": "text", "default": ""},
    {"name": "monthly_volume", "type": "text", "default": ""},
    {"name": "volume_value", "type": "number", "default": 0},
    {"name": "industry_focus", "type": "text", "default": ""},
    {"name": "location", "type": "text", "default": ""},
    {"name": "current_supplier", "type": "text", "default": ""},
    {"name": "qualification_score", "type": "number", "default": 0},
    {"name": "lead_source", "type": "text", "default": "website_chatbot"},
    {"name": "capture_email", "type": "text", "default": ""},
    {"name": "capture_phone", "type": "text", "default": ""},
    {"name": "booking_link", "type": "text", "default": ""}
  ],
  "flow": {
    "start": "block_1_greeting",
    "blocks": [
      {
        "id": "block_1_greeting",
        "type": "text_with_buttons",
        "text": "Hi there! 👋 Welcome to Sokogate...",
        "buttons": [
          {"label": "Source new products", "next": "block_2_name_capture"},
          {"label": "Check pricing on items", "next": "block_2_name_capture"},
          {"label": "Learn how Sokogate works", "next": "block_1b_info"},
          {"label": "Something else", "next": "block_1c_free_text"}
        ]
      },
      {
        "id": "block_1b_info",
        "type": "text_with_buttons",
        "text": "Sokogate connects Kenyan wholesalers...",
        "buttons": [
          {"label": "Yes, let's start!", "next": "block_2_name_capture"},
          {"label": "Not right now", "next": "block_end"}
        ]
      },
      {
        "id": "block_1c_free_text",
        "type": "text_input",
        "text": "What can I help you with?",
        "capture_variable": "bot_response",
        "intent_classification": {
          "model": "voiceflow_nlu",
          "intents": [
            {"name": "sourcing", "keywords": ["source","buy","import","order","products","supplier"], "next": "block_2_name_capture"},
            {"name": "pricing", "keywords": ["price","cost","pricing","quote"], "next": "block_2_name_capture"},
            {"name": "information", "keywords": ["how","what is","explain","learn"], "next": "block_1b_info"},
            {"name": "unknown", "default": true, "next": "block_1b_info"}
          ]
        }
      },
      {
        "id": "block_2_name_capture",
        "type": "text_input_pair",
        "text": "Great, let's get started! First, what's your name and the name of your business?",
        "inputs": [
          {"prompt": "Your name:", "variable": "user_name"},
          {"prompt": "Business name:", "variable": "business_name"}
        ],
        "next": "block_3_business_type"
      },
      {
        "id": "block_3_business_type",
        "type": "text_with_buttons",
        "text": "Thanks, {{user_name}} from {{business_name}}! What type of business are you?",
        "set_variable": "business_type",
        "buttons": [
          {"label": "Wholesaler / Distributor", "value": "wholesaler", "next": "block_4_volume"},
          {"label": "Importer / Exporter", "value": "importer", "next": "block_4_volume"},
          {"label": "Retailer", "value": "retailer", "next": "block_4_volume"},
          {"label": "Agent / Broker", "value": "agent", "next": "block_4_volume"},
          {"label": "Other", "value": "other", "next": "block_3b_other"}
        ]
      },
      {
        "id": "block_3b_other",
        "type": "text_input",
        "text": "Tell me more about your business...",
        "capture_variable": "business_type",
        "next": "block_4_volume"
      },
      {
        "id": "block_4_volume",
        "type": "text_with_buttons",
        "text": "What's your estimated monthly order volume?",
        "buttons": [
          {"label": "Under KES 100,000", "value": "under_100k", "score": 10, "next": "block_5_industry"},
          {"label": "KES 100,000 - 500,000", "value": "100k_to_500k", "score": 30, "next": "block_5_industry"},
          {"label": "KES 500,000 - 2,000,000", "value": "500k_to_2m", "score": 60, "next": "block_5_industry"},
          {"label": "KES 2,000,000+", "value": "over_2m", "score": 100, "next": "block_5_industry"},
          {"label": "Not sure yet", "value": "not_sure", "score": 5, "next": "block_5_industry"}
        ],
        "set_variables": [
          {"name": "monthly_volume", "from": "button.value"},
          {"name": "volume_value", "from": "button.score"}
        ]
      },
      {
        "id": "block_5_industry",
        "type": "text_with_buttons",
        "text": "Which industry are you most interested in?",
        "set_variable": "industry_focus",
        "buttons": [
          {"label": "FMCG / Consumer Goods", "value": "fmcg", "next": "block_6_location"},
          {"label": "Electronics & Gadgets", "value": "electronics", "next": "block_6_location"},
          {"label": "Textiles & Fashion", "value": "textiles", "next": "block_6_location"},
          {"label": "Agriculture & Food", "value": "agriculture", "next": "block_6_location"},
          {"label": "Building & Construction", "value": "construction", "next": "block_6_location"},
          {"label": "Automotive & Spare Parts", "value": "automotive", "next": "block_6_location"},
          {"label": "General Merchandise", "value": "general", "next": "block_6_location"},
          {"label": "Other", "value": "other", "next": "block_5b_other"}
        ]
      },
      {
        "id": "block_5b_other",
        "type": "text_input",
        "text": "What industry or products?",
        "capture_variable": "industry_focus",
        "next": "block_6_location"
      },
      {
        "id": "block_6_location",
        "type": "text_with_buttons",
        "text": "Where is your business based?",
        "set_variable": "location",
        "buttons": [
          {"label": "Nairobi", "value": "nairobi", "next": "block_7_supplier"},
          {"label": "Mombasa", "value": "mombasa", "next": "block_7_supplier"},
          {"label": "Kisumu", "value": "kisumu", "next": "block_7_supplier"},
          {"label": "Other Kenya", "value": "other_kenya", "next": "block_7_supplier"},
          {"label": "Uganda", "value": "uganda", "next": "block_7_supplier"},
          {"label": "Tanzania", "value": "tanzania", "next": "block_7_supplier"},
          {"label": "Rwanda", "value": "rwanda", "next": "block_7_supplier"},
          {"label": "Other Africa", "value": "other_africa", "next": "block_7_supplier"},
          {"label": "Outside Africa", "value": "outside_africa", "next": "block_7_supplier"}
        ]
      },
      {
        "id": "block_7_supplier",
        "type": "text_with_buttons",
        "text": "Do you currently have a supplier?",
        "set_variable": "current_supplier",
        "buttons": [
          {"label": "Yes, want better pricing", "value": "better_pricing", "next": "block_8_scoring"},
          {"label": "Yes, quality issues", "value": "quality_issues", "next": "block_8_scoring"},
          {"label": "No, first supplier", "value": "first_supplier", "next": "block_8_scoring"},
          {"label": "Comparing options", "value": "compare", "next": "block_8_scoring"}
        ]
      },
      {
        "id": "block_8_scoring",
        "type": "code",
        "code": "qualification_score = volume_value; if (['wholesaler','importer'].includes(business_type)) { qualification_score += 15; } else if (business_type === 'distributor') { qualification_score += 10; } else if (business_type === 'retailer') { qualification_score += 5; } if (current_supplier === 'quality_issues') { qualification_score += 10; } else if (current_supplier === 'better_pricing') { qualification_score += 5; } else if (current_supplier === 'first_supplier') { qualification_score += 3; } else if (current_supplier === 'compare') { qualification_score += 2; } if (qualification_score > 100) qualification_score = 100;",
        "routes": [
          {"condition": "qualification_score >= 70", "next": "block_9a_hot"},
          {"condition": "qualification_score >= 40", "next": "block_9b_warm"},
          {"default": true, "next": "block_9c_cold"}
        ]
      },
      {
        "id": "block_9a_hot",
        "type": "text_with_buttons_and_api",
        "text": "Thanks {{user_name}}! You're exactly the type of business Sokogate was built for. 🎯 Here's what happens next...",
        "buttons": [
          {"label": "Book My Discovery Call", "action": "open_url", "url": "https://qme.app/sokogate/discovery-call"},
          {"label": "Continue on WhatsApp", "action": "open_url", "url": "https://wa.me/254758947124"},
          {"label": "Show me the catalog", "action": "open_url", "url": "https://sokogate.com/catalog"}
        ],
        "api_call": {
          "method": "POST",
          "url": "https://hook.make.com/your-webhook-id",
          "headers": {"Content-Type": "application/json"},
          "body": {
            "user_name": "{{user_name}}",
            "business_name": "{{business_name}}",
            "phone": "{{capture_phone}}",
            "email": "{{capture_email}}",
            "business_type": "{{business_type}}",
            "monthly_volume": "{{monthly_volume}}",
            "volume_value": "{{volume_value}}",
            "industry_focus": "{{industry_focus}}",
            "location": "{{location}}",
            "current_supplier": "{{current_supplier}}",
            "qualification_score": "{{qualification_score}}",
            "lead_source": "{{lead_source}}",
            "lead_tier": "hot"
          }
        },
        "next": "block_end"
      },
      {
        "id": "block_9b_warm",
        "type": "text_with_buttons_and_api",
        "text": "Thanks {{user_name}}! We'd love to help {{business_name}} find the right products...",
        "buttons": [
          {"label": "View Product Catalog", "action": "open_url", "url": "https://sokogate.com/catalog"},
          {"label": "Book a Call", "action": "open_url", "url": "https://qme.app/sokogate/discovery-call"},
          {"label": "Sounds good, I'll wait", "action": "none", "next": "block_end"}
        ],
        "api_call": {
          "same as 9a but lead_tier = warm"
        },
        "next": "block_end"
      },
      {
        "id": "block_9c_cold",
        "type": "text_with_buttons_and_api",
        "text": "Thanks {{user_name}}! Here are some resources to help you get started...",
        "buttons": [
          {"label": "Send me the guide", "action": "api", "triggers_email": true, "next": "block_end"},
          {"label": "Book a Call", "action": "open_url", "url": "https://qme.app/sokogate/discovery-call"},
          {"label": "No thanks", "action": "none", "next": "block_end"}
        ],
        "api_call": {
          "same as 9a but lead_tier = cold"
        },
        "next": "block_end"
      },
      {
        "id": "block_end",
        "type": "text",
        "text": "Thanks for chatting with us, {{user_name}}! 🚀 If you have questions, reach out on WhatsApp: wa.me/254758947124. Have a great day!"
      },
      {
        "id": "block_contact_capture",
        "type": "text_input_pair",
        "text": "Before you go — can we get your contact info so we can send you resources?",
        "inputs": [
          {"prompt": "Email:", "variable": "capture_email", "optional": true},
          {"prompt": "Phone (WhatsApp):", "variable": "capture_phone", "optional": true}
        ],
        "next": "block_final_exit"
      },
      {
        "id": "block_final_exit",
        "type": "text",
        "text": "You're all set! We'll be in touch. 🙏"
      }
    ]
  }
}
```

---

## PART 5: VOICEFLOW → MAKE.COM API INTEGRATION SETUP

### In Voiceflow:
1. Go to the block where you want the API call
2. Add an **API Step** (not a "Card" step)
3. Configure as shown in Block 9A above
4. **Important**: Set the API call to run **in parallel** (don't wait for response) — this prevents the bot from hanging if the webhook is slow

### In Make.com:
1. Create a new scenario: `Voiceflow Lead Capture`
2. Add **Webhook** module as trigger
3. Click "Add" → copy the webhook URL
4. Paste this URL in Voiceflow's API step
5. Add **JSON Parse** module to parse the incoming body
6. Add **Zoho CRM** module: Create a Lead
7. Add **Router** based on `lead_tier`:
   - `hot` → WhatsApp notification + Slack alert + QMe booking trigger
   - `warm` → WhatsApp nurture sequence start
   - `cold` → Add to email list only
8. Save and turn on the scenario

### Test the Connection:
1. In Make.com, click "Run once" on the webhook module (it waits)
2. In Voiceflow, run a test chat and reach Block 9A
3. Check Make.com — the webhook should have received the data
4. Check Zoho CRM — a new lead record should appear
5. Check WhatsApp — notification should arrive

---

## PART 6: VOICEFLOW WEB WIDGET SETTINGS

When deploying to the website:

| Setting | Recommended Value |
|---|---|
| **Position** | Bottom-right |
| **Open delay** | 5 seconds after page load |
| **Auto-open** | Off (don't annoy visitors) |
| **Launcher text** | "Need help sourcing products? 💬" |
| **Launcher icon** | Chat bubble (default) |
| **Brand color** | #00A859 (Sokogate green) or matching brand |
| **Font** | System font |
| **Header title** | "Sokogate Assistant" |
| **Header subtitle** | "We typically reply in 2 seconds" |
| **Collect info before chat** | Off (capture info inside the flow naturally) |
| **Allow file upload** | Off |
| **Allow emojis** | On |
| **Language** | English |
| **GDPR consent** | On (if needed for your region) |
| **Z-index** | 999999 (above all other elements) |
