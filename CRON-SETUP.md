# Subscription Follow-up Cron Setup

The subscription follow-up automation sends timed email + WhatsApp reminders to users as their 14-day free trial progresses. It runs daily and checks which stage each user is in.

## Sequence

| Stage | Timing | Channel | Message |
|-------|--------|---------|---------|
| Day 10 | 4 days before trial ends | Email + WhatsApp | "Trial ending soon — 4 days left" |
| Day 13 | 1 day before trial ends | Email + WhatsApp | "3 days remaining — pick a plan" |
| Day 14 | Trial end date | Email + WhatsApp | "Last day of your trial!" |
| D+3 | 3 days after expiry | Email + WhatsApp | "Your trial has expired" |
| D+7 | 7 days after expiry | Email + WhatsApp | "Last chance — extended offer" |

## Endpoint

```
GET /api/cron/subscription-followups
```

**Security:** Requires one of:
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

Pick one of the options below:

---

### Option A: cron-job.org (Free)

1. Go to [cron-job.org](https://cron-job.org) and create a free account
2. Click **Create Cronjob**
3. Configure:

| Field | Value |
|-------|-------|
| **Title** | Mapato Subscription Follow-ups |
| **URL** | `https://your-domain.com/api/cron/subscription-followups` |
| **Schedule** | `Every day at 8:00` |
| **Request Method** | GET |
| **Headers** | Add header: `x-cron-secret: your-cron-secret-value` |

4. Click **Create**

---

### Option B: GitHub Actions

Create `.github/workflows/cron-subscription-followups.yml`:

```yaml
name: Subscription Follow-ups

on:
  schedule:
    # Every day at 8 AM UTC
    - cron: '0 8 * * *'

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Call follow-up endpoint
        run: |
          curl -X GET "https://your-domain.com/api/cron/subscription-followups" \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
```

Then add `CRON_SECRET` to your GitHub repository secrets:
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
      "path": "/api/cron/subscription-followups",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Then set `CRON_SECRET` in your Vercel environment variables:
- Go to Project Settings → Environment Variables
- Add `CRON_SECRET` with your random secret

---

### Option D: Manual Trigger (for testing)

Open in browser (if you're an admin user):
```
https://your-domain.com/api/cron/subscription-followups
```

Or via curl:
```bash
curl https://your-domain.com/api/cron/subscription-followups
```

## API Response

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
  "timestamp": "2026-06-02T08:00:00.000Z"
}
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

- Follow-up logs are stored in the `FollowUpLog` database table
- Each message sent is logged with: `userId`, `stage`, `type`, and `sentAt`
- Duplicate messages are prevented by a unique constraint on `[userId, stage, type]`
- Errors are returned in the cron response's `details.errors` array
- Check the server logs for `[FollowUps]` prefix for detailed debugging
