# Deployment Guide

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_APP_URL` | App URL e.g. `https://next-door-app-three.vercel.app` |
| `RESEND_API_KEY` | Resend API key for email digest |
| `CRON_WEBHOOK_SECRET` | Shared secret for cron-job.org webhook authentication |

## Supabase — Required app_settings Rows

Run this SQL once in Supabase SQL Editor:

```sql
INSERT INTO app_settings (setting_key, setting_value) VALUES
  ('email_notifications_enabled', '1'),
  ('email_send_days', '["monday"]'),
  ('email_send_time', '09:00'),
  ('email_last_sent', '')
ON CONFLICT (setting_key) DO NOTHING;
```

## cron-job.org Setup

Create **2 jobs** at https://cron-job.org:

### Job 1 — Cleanup (events + announcements)

| Field | Value |
|---|---|
| URL | `https://next-door-app-three.vercel.app/api/cron/cleanup` |
| Schedule | Every 15 minutes |
| Method | POST |
| Header | `x-webhook-secret: <CRON_WEBHOOK_SECRET value>` |

Handles:
- Auto-deletes events that ended more than 24 hours ago
- Expires stale announcements where `announcement_expires_at < NOW()`

### Job 2 — Email Digest

| Field | Value |
|---|---|
| URL | `https://next-door-app-three.vercel.app/api/cron` |
| Schedule | Every 15 minutes |
| Method | POST |
| Header | `x-webhook-secret: <CRON_WEBHOOK_SECRET value>` |

The handler uses a **smart schedule check** — only sends when current UK day/time matches the configured schedule and email hasn't already been sent today.

Configure the schedule in **Admin Settings → Email Notifications → Send Schedule**.

## Vercel

`vercel.json` has an empty crons array — all scheduling is handled by cron-job.org.
