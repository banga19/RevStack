# Email Deliverability Guide — Keep Transactional Emails Out of Spam

This guide walks you through configuring your domain (`ultimotradingltd.co.ke`) so that transactional emails sent from your app land in inboxes, not spam folders.

## Why This Matters

By default, your emails are sent via **nodemailer** using either:
- An SMTP provider (recommended) configured via `.env` SMTP_* variables
- Or Ethereal (dev-only fake SMTP) as a fallback

Without proper DNS records, email providers (Gmail, Outlook, Yahoo) have no way to verify that your emails are legitimate, so they often flag them as spam.

---

## Step 1: Choose a Transactional Email Provider

You have several options. Pick one:

| Provider | Free Tier | Setup Time | Notes |
|----------|-----------|------------|-------|
| **SendGrid** (Twilio) | 100 emails/day free | ~15 min | Most popular, easy API keys |
| **Amazon SES** | 62,000/month free (from EC2) | ~30 min | Cheapest at scale, needs domain verification |
| **Mailgun** | 5,000 emails/month free | ~15 min | Good analytics |
| **Resend** | 3,000 emails/month free | ~10 min | Modern, developer-friendly |
| **Postmark** | 100 emails/month free | ~10 min | Best deliverability, but pricey |
| **Your domain's SMTP** (e.g., Google Workspace, Zoho Mail) | Included with your plan | ~30 min | Works if you have a business email already |

**Recommended for your setup:** SendGrid (easiest to configure with nodemailer) or Resend (modern, great deliverability).

---

## Step 2: Update Your .env File

After choosing a provider, update these variables in `.env`:

```env
# ── SMTP Configuration ─────────────────────────────────────
SMTP_HOST="smtp.sendgrid.net"        # or smtp.resend.com, etc.
SMTP_PORT=587                        # 465 for SSL, 587 for TLS
SMTP_USER="apikey"                   # SendGrid uses "apikey" as username
SMTP_PASS="SG.xxxxx..."              # Your API key
SMTP_SECURE="false"                  # true for port 465, false for 587
```

---

## Step 3: Set Up SPF Record (Sender Policy Framework)

**What it does:** Tells email providers which servers are authorized to send email for your domain.

**How to set it up:**
1. Log into your domain registrar's DNS management console (e.g., Namecheap, Cloudflare, GoDaddy)
2. Add a **TXT record** for `ultimotradingltd.co.ke`:

```
Type:  TXT
Host:  @                  (or leave blank, meaning the root domain)
Value: v=spf1 include:_spf.google.com include:spf.sendgrid.net ~all
```

Replace `include:spf.sendgrid.net` with your provider's SPF include:
- **SendGrid:** `include:spf.sendgrid.net`
- **Amazon SES:** `include:amazonses.com`
- **Mailgun:** `include:mailgun.org`
- **Resend:** `include:_spf.resend.com`
- **Google Workspace:** `include:_spf.google.com`

**Multiple includes:** You can chain them: `v=spf1 include:_spf.google.com include:spf.sendgrid.net ~all`

---

## Step 4: Set Up DKIM (DomainKeys Identified Mail)

**What it does:** Cryptographically signs your emails so recipients can verify they haven't been tampered with.

**How to set it up:**

### For SendGrid:
1. Go to Settings → Sender Authentication → Domain Authentication
2. Follow the wizard to add a DKIM TXT record
3. Typically you'll add something like:

```
Type:  TXT
Host:  s1._domainkey.ultimotradingltd.co.ke
Value: k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...
```

### For Resend:
1. Go to Domains → Add Domain
2. Follow the instructions to add DKIM, SPF, and DMARC records
3. Resend will generate the exact TXT records for you

### For Google Workspace / Zoho Mail:
1. These providers generate DKIM keys automatically in their admin consoles
2. Add the generated TXT record to your DNS

---

## Step 5: Set Up DMARC (Domain-based Message Authentication)

**What it does:** Tells email providers what to do if SPF or DKIM checks fail (e.g., reject, quarantine, or allow).

**How to set it up:**
Add this TXT record to your DNS:

```
Type:  TXT
Host:  _dmarc.ultimotradingltd.co.ke
Value: v=DMARC1; p=quarantine; rua=mailto:bangali@ultimotradingltd.co.ke; pct=100; sp=quarantine
```

**Explanation of options:**
- `p=none` — Monitor only, no action taken (start here to avoid breaking things)
- `p=quarantine` — Mark failing emails as spam (recommended after testing)
- `p=reject` — Reject failing emails entirely (strictest, use after confirming SPF/DKIM work)
- `rua=mailto:...` — Receive aggregate reports about email authentication (optional)

**Start with `p=none`**, wait 48 hours to see the reports, then move to `p=quarantine`.

---

## Step 6: Configure Return-Path / CNAME (Optional but Recommended)

Some providers (SendGrid, Amazon SES) require a CNAME record to track bounces and complaints:

```
Type:  CNAME
Host:  em1234.ultimotradingltd.co.ke
Value: u1234567.wl.sendgrid.net
```

Your provider will give you the exact values during domain setup.

---

## Step 7: Verify Your Setup

Use these free tools to verify your DNS records are correct:

1. **SPF check:** https://mxtoolbox.com/spf.aspx (enter: ultimotradingltd.co.ke)
2. **DKIM check:** https://www.dmarcanalyzer.com/dkim/dkim-check/ (enter your selector + domain)
3. **DMARC check:** https://mxtoolbox.com/dmarc.aspx (enter: ultimotradingltd.co.ke)
4. **Full email test:** Send a test email to `check-auth@verifier.port25.com` — they'll send back a detailed report
5. **Google Postmaster Tools:** https://postmaster.google.com (add your domain after sending enough emails)

---

## Step 8: Warm Up Your Sending Reputation

If you're sending from a new domain or IP, follow these best practices:

1. **Start slow:** Send 5–10 emails/day for the first week
2. **Increase gradually:** Double volume each week
3. **Monitor bounces:** Keep bounce rate under 2%
4. **Monitor spam complaints:** Keep complaint rate under 0.1%
5. **Only send to engaged recipients:** People who signed up or opted in

---

## Step 9: Update Your From Address

In `src/lib/email.ts`, the `from` field is currently set to `"Mapato" <welcome@mapato.app>`.

After configuring your domain, update it to use your real domain:

```typescript
from: '"Mapato" <noreply@ultimotradingltd.co.ke>',
```

Using the same domain as your sending infrastructure improves deliverability.

---

## Quick Reference: DNS Records Summary

| Record | Host | Value |
|--------|------|-------|
| **SPF** | `@` | `v=spf1 include:spf.sendgrid.net ~all` |
| **DKIM** | `s1._domainkey` | `k=rsa; p=MIGf...` (from your provider) |
| **DMARC** | `_dmarc` | `v=DMARC1; p=none; rua=mailto:bangali@ultimotradingltd.co.ke` |
| **CNAME** | `em1234` | `u1234567.wl.sendgrid.net` (if needed) |

---

## Troubleshooting

### Emails still going to spam?
- Check SPF/DKIM/DMARC with the tools in Step 7
- Make sure your domain is not on any blocklists: https://mxtoolbox.com/blacklists.aspx
- Ensure your email content doesn't contain spam trigger words (free, guarantee, act now, etc.)
- Use a dedicated IP if you send >50,000 emails/month

### Emails not being delivered at all?
- Check your SMTP credentials
- Verify port 587 (or 465) is open on your server
- Check your provider's dashboard for delivery logs

### Receiving DMARC reports?
- The `rua` email address in your DMARC record will receive XML reports. These are verbose but useful for diagnosing issues. Use a free parser like https://dmarcian.com/dmarc-report-parser/ to read them.
