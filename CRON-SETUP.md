# Cron Job Setup

Two daily cron endpoints power the subscription lifecycle:

1. **Trial Expiry** (`/api/cron/trial-expiry`) — Auto-expires trials that have passed 14 days
2. **Subscription Follow-ups** (`/api/cron/subscription-followups`) — Sends timed reminders to trial users

## 1. Trial Expiry Cron

Auto-expires users whose 14-day free trial has ended. Sets `subscriptionStatus` from `"trial"` to `"expired"`.

### Endpoint

```
GET /api/cron/trial-expiry
```

### Response

```json
{
  "success": true,
  "expired": 3,
  "alreadyExpired": 5,
  "errors": 0,
  "timestamp": "2026-06-03T08:00:00.000Z"
}
```

## 2. Subscription Follow-up Cron

Sends timed email + WhatsApp reminders to users as their 14-day free trial progresses and after it expires.

### Sequence

| Stage | Timing | Channel | Message |
|-------|--------|---------|---------|
| Day 10 | 4 days before trial ends | Email + WhatsApp | "Trial ending soon — 4 days left" |
| Day 13 | 1 day before trial ends | Email + WhatsApp | "1 day remaining — pick a plan" |
| Day 14 | Trial end date | Email + WhatsApp | "Last day of your trial!" |
| D+3 | 3 days after expiry | Email + WhatsApp | "Your trial has expired" |
| D+7 | 7 days after expiry | Email + WhatsApp | "Last chance — extended offer" |

### Endpoint

```
GET /api/cron/subscription-followups
```

### Response

```json
{
  "success": true,
  "processed": 5,
  "sent": 8,
  "errors": 0,
  "details": {
    "processed": 5,
    "sent": [
      { "userId": "abc", "stage": "day-10", "type": "email" },
      { "userId": "abc", "stage": "day-10", "type": "whatsapp" }
    ],
    "errors": []
  },
  "timestamp": "2026-06-03T08:00:00.000Z"
}
```

## Authentication

Both endpoints require one of:
- `CRON_SECRET` environment variable (recommended for cron services)
- Valid admin session (for manual testing via browser)

## Configuration

### 1. Set up the CRON_SECRET

Add to your `.env`:

```env
CRON_SECRET=your-random-secret-here
```

Generate a random secret:
```bash
openssl rand -hex 32
```

### 2. Configure your cron service

Pick one of the options below. For production, you need **two cron jobs** — one for trial expiry and one for follow-ups, both running daily.

---

### Option A: cron-job.org (Free)

Create **two cron jobs**:

| Field | Job 1: Trial Expiry | Job 2: Follow-ups |
|-------|--------------------|-------------------|
| **Title** | Mapato Trial Expiry | Mapato Subscription Follow-ups |
| **URL** | `https://your-domain.com/api/cron/trial-expiry` | `https://your-domain.com/api/cron/subscription-followups` |
| **Schedule** | `Every day at 7:00` | `Every day at 8:00` |
| **Request Method** | GET | GET |
| **Headers** | `x-cron-secret: your-cron-secret-value` | `x-cron-secret: your-cron-secret-value` |

---

### Option B: GitHub Actions

Create `.github/workflows/cron-daily.yml`:

```yaml
name: Daily Cron Jobs

on:
  schedule:
    # Every day at 7 AM UTC
    - cron: '0 7 * * *'

jobs:
  trial-expiry:
    runs-on: ubuntu-latest
    steps:
      - name: Expire trials
        run: |
          curl -X GET "https://your-domain.com/api/cron/trial-expiry" \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"

  subscription-followups:
    runs-on: ubuntu-latest
    steps:
      - name: Send follow-ups
        run: |
          curl -X GET "https://your-domain.com/api/cron/subscription-followups" \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
```

Add `CRON_SECRET` to your GitHub repository secrets:
1. Go to Settings → Secrets and variables → Actions
2. Click **New repository secret**
3. Name: `CRON_SECRET`, Value: your random secret

---

### Option C: Vercel Cron Jobs (if hosted on Vercel)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/trial-expiry",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/cron/subscription-followups",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Then set `CRON_SECRET` in your Vercel environment variables.

---

### Option D: Manual Trigger (for testing)

Open in browser (if you're an admin user):
```
https://your-domain.com/api/cron/trial-expiry
https://your-domain.com/api/cron/subscription-followups
```

Or via curl:
```bash
curl https://your-domain.com/api/cron/trial-expiry
curl https://your-domain.com/api/cron/subscription-followups
```

## Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `CRON_SECRET` | Secret for cron job authentication | Yes (for cron) |
| `NEXT_PUBLIC_APP_URL` | App base URL (used in email links) | Yes |
| `SMTP_HOST` | SMTP server hostname | For email sending |
| `SMTP_PORT` | SMTP server port (default: 587) | For email sending |
| `SMTP_USER` | SMTP username | For email sending |
| `SMTP_PASS` | SMTP password | For email sending |
| `WATI_API_TOKEN` | WATI.io API token | For WhatsApp messages |
| `WATI_WHATSAPP_NUMBER_ID` | WATI WhatsApp number ID | For WhatsApp messages |

## Monitoring

- **Follow-up logs** are stored in the `FollowUpLog` database table (userId, stage, type, sentAt)
- **Audit logs** are stored in the `AdminAuditLog` table (adminId, action, target, details)
- **Trial expiry logs** appear in server logs with `[TrialExpiry]` prefix
- Check the **Admin Panel → Audit Log** tab for all admin actions
- Check the **Admin Panel → Follow-ups** tab for sent reminders
