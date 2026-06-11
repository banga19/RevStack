# WATI Template Setup Guide — Sokogate Vendor Outreach

Use this guide to create **5 WhatsApp Business templates** tailored for **Sokogate vendors** —
African B2B exporters of agricultural commodities (coffee, tea, cocoa, spices, nuts, cotton, etc.)
connecting with global buyers in Korea, Europe, and the Middle East.

After creation, submit them for Meta approval (MARKETING: 24-48h, UTILITY: faster).

---

## 1. sokogate_lead_welcome

**Category:** MARKETING
**Language:** English (en)

### Body Text

```
Hi {{1}}! 👋

Welcome to Sokogate — your direct line to verified global buyers for {{2}}.

We received your inquiry and our trade specialists are reviewing it now.
To match you with the right buyers, could you tell us:

1. What quantity can you supply monthly? (e.g., 500 kg)
2. What's your best export price? (e.g., $8.50/kg FOB Mombasa)
3. What certifications do you hold? (e.g., Organic, HACCP, Fair Trade)
4. What's your preferred shipping timeline?

Our AI matching engine will find the best buyer from our network
of 50+ active importers in Korea, Europe, and the Middle East.
```

### Footer
```
Reply STOP to opt out
```

### Buttons
- **Quick Reply:** "Tell us more"
- **Quick Reply:** "See current demand"

### Parameters
| # | Name | Example value |
|---|---|---|
| 1 | Customer name | "James" |
| 2 | Commodity / product | "Specialty Arabica Coffee" |

---

## 2. sokogate_quote_followup

**Category:** MARKETING
**Language:** English (en)

### Body Text

```
Hi {{1}}! 👋

Quick check-in on your {{2}} quote we prepared on {{3}}.

Market update: {{4}} buyers are actively sourcing {{2}} this month
at ${{5}}/ton — your pricing is competitive!

Would you like to:
1. ✅ Proceed with the order
2. 📋 Request sample certification documents
3. 💬 Discuss pricing or payment terms

Reply with your choice and our trade team will follow up.
```

### Footer
```
Reply STOP to opt out
```

### Buttons
- **Quick Reply:** "Proceed with order"
- **Quick Reply:** "Request sample docs"
- **Quick Reply:** "Discuss pricing"

### Parameters
| # | Name | Example value |
|---|---|---|
| 1 | Customer name | "James" |
| 2 | Product | "Specialty Arabica Coffee" |
| 3 | Quote date | "June 12" |
| 4 | Number of active buyers | "8" |
| 5 | Current market price/ton | "8,500" |

---

## 3. sokogate_market_intel

**Category:** MARKETING
**Language:** English (en)

### Body Text

```
Hi {{1}}! 👋

Hot market update for {{2}} suppliers 📊

This month on Sokogate:
• {{3}} active buyers looking for {{2}}
• Average price range: ${{4}} - ${{5}}/ton
• Top sourcing countries: {{6}}
• {{7}} suppliers matched this quarter

Don't miss the next opportunity — our buyer network is growing.

Reply "INTERESTED" and we'll send personalized buyer matches within 24 hours.
```

### Footer
```
Reply STOP to opt out
```

### Buttons
- **Quick Reply:** "Show me buyers"
- **Quick Reply:** "Update my prices"

### Parameters
| # | Name | Example value |
|---|---|---|
| 1 | Customer name | "James" |
| 2 | Commodity | "Specialty Arabica Coffee" |
| 3 | Active buyer count | "12" |
| 4 | Min market price | "7,500" |
| 5 | Max market price | "9,200" |
| 6 | Top sourcing countries | "South Korea, Germany, UAE" |
| 7 | Suppliers matched | "18" |

---

## 4. sokogate_order_confirmed

**Category:** UTILITY
**Language:** English (en)

### Body Text

```
Hi {{1}}! ✅

Your Sokogate order #{{2}} is confirmed!

📦 Product: {{3}}
📊 Quantity: {{4}}
💰 Total value: ${{5}}
🔒 Payment: Held securely in Sokogate Pay escrow
📅 Estimated shipment: {{6}}
🚢 Shipping: {{7}} (FOB {{8}})

Your buyer has been notified. We'll send tracking updates as your shipment progresses.
```

### Footer
```
Reply HELP for support | Reply STATUS for tracking
```

### Buttons
- **Quick Reply:** "Track shipment"
- **Quick Reply:** "Contact support"

### Parameters
| # | Name | Example value |
|---|---|---|
| 1 | Customer name | "James" |
| 2 | Order number | "SKG-2026-0421" |
| 3 | Product | "Specialty Arabica Coffee" |
| 4 | Quantity | "500 kg" |
| 5 | Total value | "4,250" |
| 6 | Shipment date | "June 30, 2026" |
| 7 | Shipping method | "Sea freight (20ft container)" |
| 8 | Port of departure | "Mombasa" |

---

## 5. sokogate_korea_corridor

**Category:** MARKETING
**Language:** English (en)

### Body Text

```
Hi {{1}}! 🚀

Your profile as a {{2}} supplier matches demand from our
Korea-Africa Trade Corridor pilot program.

Korean buyers are actively seeking:
• {{3}}
• Minimum order: {{4}}
• Required certifications: {{5}}
• Price range: ${{6}} - ${{7}}/ton

Limited pilot — {{8}} of 20 slots remaining. Benefits include:
✅ Pre-vetted Korean buyer introductions
✅ Sokogate Pay escrow protection
✅ Logistics support (Mombasa → Busan corridor)
✅ 3-month free Sokogate platform trial

Reply "JOIN" to enroll or "LEARN MORE" for program details.
```

### Footer
```
Reply STOP to opt out
```

### Buttons
- **Quick Reply:** "Join the pilot"
- **Quick Reply:** "Learn more"

### Parameters
| # | Name | Example value |
|---|---|---|
| 1 | Customer name | "James" |
| 2 | Commodity | "Specialty Arabica Coffee" |
| 3 | Buyer interest | "Single-origin Arabica, high-grade" |
| 4 | Minimum order quantity | "500 kg" |
| 5 | Required certifications | "Organic, HACCP" |
| 6 | Min price per ton | "8,000" |
| 7 | Max price per ton | "10,500" |
| 8 | Remaining pilot slots | "14" |

---

## Dashboard Steps

1. Open **[WATI Dashboard](https://app.wati.io)** → **Campaigns** → **Template Messages**
2. Click **"Create New Template"**
3. Fill in:
   - **Name:** Exact name from above (case-sensitive, underscores matter)
   - **Category:** MARKETING or UTILITY per spec
   - **Language:** English (en)
4. Paste the **Body Text** verbatim — `{{1}}`, `{{2}}` etc. placeholders are **critical**
5. Add **Footer** text for opt-out compliance on MARKETING templates
6. Configure **Buttons** per the specs above
7. Click **Submit** to send to **Meta for review**
8. Repeat for all 5 templates

### After Approval

```bash
npx tsx scripts/test-wati-e2e.ts
```

The template send test should now pass with the live API — 20/20 ✅
