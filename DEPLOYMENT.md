# Next Door — Deployment Guide

Complete step-by-step instructions for deploying the Next.js + Supabase + Vercel stack.

---

## Prerequisites

- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account (free tier works)
- A [Resend](https://resend.com) account for transactional emails
- A Google Cloud project with OAuth credentials
- Your custom domain (optional but recommended)

---

## Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name (e.g. `next-door`), set a strong database password, pick the region closest to your users
3. Wait ~2 minutes for provisioning to complete
4. Go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` *(keep this secret — never expose client-side)*

---

## Step 2 — Run the Database Schema

1. In the Supabase dashboard, go to **SQL Editor → New query**
2. Open `supabase/schema.sql` from this repo (557 lines, 30 tables)
3. Paste the entire contents into the SQL editor and click **Run**
4. Verify in **Table Editor** that all 30 tables are created:
   - `users`, `messages`, `reactions`, `attachments`, `message_reads`
   - `hashtags`, `system_messages`, `notifications`, `app_settings`, `email_notification_users`
   - `events`, `event_members`, `event_messages`, `event_message_attachments`
   - `event_message_reactions`, `event_message_reads`, `event_history`, `event_history_attendees`
   - `typing_status`, `market_listings`, `market_listing_images`, `market_listing_interested`
   - `listing_messages`, `listing_message_attachments`, `listing_message_reactions`, `listing_message_reads`
   - `market_transactions`, `market_listing_history`, `market_listing_history_interested`, `reminders`

---

## Step 3 — Configure Supabase Storage

The app uses two storage buckets.

1. In the Supabase dashboard, go to **Storage → New bucket**
2. Create bucket: **`avatars`**
   - Public: **Yes** (profile pictures must be publicly readable)
   - File size limit: 5 MB
3. Create bucket: **`attachments`**
   - Public: **Yes** (chat attachments are served directly via URL)
   - File size limit: 30 MB

### Storage Policies (RLS)

For each bucket, set the following Row Level Security policies so authenticated users can upload and anyone can read:

Go to **Storage → Policies → New policy** for each bucket:

**avatars — INSERT policy:**
```sql
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');
```

**avatars — SELECT policy:**
```sql
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

**avatars — DELETE policy:**
```sql
CREATE POLICY "Authenticated users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
```

Repeat the same three policies for the **`attachments`** bucket (replacing `'avatars'` with `'attachments'`).

---

## Step 4 — Configure Google OAuth

### 4a — Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Go to **APIs & Services → Credentials → Create credentials → OAuth 2.0 Client IDs**
4. Application type: **Web application**
5. Add **Authorized redirect URIs**:
   ```
   https://<your-supabase-project>.supabase.co/auth/v1/callback
   ```
   Replace `<your-supabase-project>` with your Supabase project ref (found in Project Settings → General).
6. Copy the **Client ID** and **Client Secret**

### 4b — Supabase Auth Settings

1. In Supabase dashboard, go to **Authentication → Providers → Google**
2. Toggle **Enable Google provider**: ON
3. Paste in your **Client ID** and **Client Secret**
4. Add to **Redirect URLs** (under Authentication → URL Configuration):
   ```
   https://your-domain.com/auth/callback
   https://your-vercel-app.vercel.app/auth/callback
   ```
   Add both your production domain and the Vercel preview URL.
5. Set **Site URL**: `https://your-domain.com`

---

## Step 5 — Configure Resend (Email)

1. Go to [resend.com](https://resend.com) → **API Keys → Create API Key**
2. Give it a name (e.g. `next-door-prod`), set permissions to **Full access**
3. Copy the key → `RESEND_API_KEY`
4. In Resend, go to **Domains → Add Domain** and verify your sending domain
   - The app sends from `noreply@your-domain.com` — update the `from` address in `app/api/cron/send-scheduled-emails/route.ts` to match your verified domain

---

## Step 6 — Deploy to Vercel

### 6a — Push to GitHub

```bash
cd nextdoor-app
git init
git add .
git commit -m "Initial Next Door deployment"
git remote add origin https://github.com/your-username/next-door.git
git push -u origin main
```

### 6b — Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository** and select your repo
3. Framework preset: **Next.js** (auto-detected)
4. Click **Deploy** — the first deploy will fail (no env vars yet); that's fine

### 6c — Set Environment Variables

In Vercel dashboard → your project → **Settings → Environment Variables**, add:

| Variable | Value | Environment |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` | Preview |
| `ADMIN_EMAIL` | `deepakkrishnar1618@gmail.com` | Production, Preview |
| `RESEND_API_KEY` | `re_...` | Production, Preview |
| `CRON_WEBHOOK_SECRET` | *(generate a random 32-char string)* | Production, Preview |

**Generate CRON_WEBHOOK_SECRET:**
```bash
openssl rand -hex 32
```

### 6d — Redeploy

After setting env vars, go to **Deployments → Redeploy** (or push a new commit). The build should succeed.

---

## Step 7 — Configure Custom Domain (Optional)

1. In Vercel → project → **Settings → Domains → Add**
2. Enter your domain (e.g. `nextdoor.website`)
3. Follow the DNS instructions (add the CNAME or A records at your registrar)
4. Wait for DNS propagation (usually <5 minutes with Vercel)
5. Once verified, go back to **Step 4b** and ensure this domain is in Supabase's Redirect URLs and Site URL

---

## Step 8 — Set Up the Cron Job (Scheduled Emails)

The app has a cron endpoint at `POST /api/cron/send-scheduled-emails` that sends community digest emails. It is protected by `CRON_WEBHOOK_SECRET`.

### Using Vercel Cron (recommended)

Add a `vercel.json` at the project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-scheduled-emails",
      "schedule": "0 8 * * *"
    }
  ]
}
```

This runs at 8:00 AM UTC daily. Note: Vercel cron jobs call the route directly and do not send a `CRON_WEBHOOK_SECRET` header — update the route to also accept Vercel's `Authorization: Bearer <CRON_SECRET>` header, or disable the secret check for Vercel-originating requests.

### Using an External Cron Service (e.g. cron-job.org)

1. Go to [cron-job.org](https://cron-job.org) → **Create cron job**
2. URL: `https://your-domain.com/api/cron/send-scheduled-emails`
3. Method: **POST**
4. Headers: `x-cron-secret: <your CRON_WEBHOOK_SECRET value>`
5. Schedule: Daily at your preferred time

---

## Step 9 — Post-Deployment Verification

After a successful deploy, test each major flow:

### Auth Flow
- [ ] Visit `https://your-domain.com` — landing page loads
- [ ] Click **Sign in with Google** — Google OAuth consent screen appears
- [ ] Complete sign-in — redirected to `/profile/setup`
- [ ] Enter name, room number, accept terms — redirected to `/onboarding`
- [ ] Complete onboarding — redirected to `/chat`

### Chat
- [ ] Send a message in community chat
- [ ] Upload an image attachment (up to 30MB)
- [ ] Verify read receipts appear
- [ ] Verify typing indicators work

### Events
- [ ] Create a new event
- [ ] Join the event from another account
- [ ] Send a message in the event chat

### Marketplace
- [ ] Create a new listing (offering or requesting)
- [ ] Express interest from another account
- [ ] Verify listing chat is accessible

### Admin
- [ ] Visit `/admin` (must be logged in as `ADMIN_EMAIL`)
- [ ] Check user management and settings

---

## Environment Variables Reference

```bash
# .env.local (for local development — never commit this file)

# Supabase — find in Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000   # or https://your-domain.com in prod

# Admin — the Google account email that gets admin privileges
ADMIN_EMAIL=deepakkrishnar1618@gmail.com

# Email — Resend API key
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Cron — random secret to protect the cron endpoint
CRON_WEBHOOK_SECRET=a1b2c3d4e5f6...   # openssl rand -hex 32
```

---

## Local Development

```bash
# Install dependencies
npm install

# Copy env template and fill in your values
cp .env.example .env.local
# Edit .env.local with your Supabase/Resend credentials

# Run the dev server
npm run dev

# App runs at http://localhost:3000
```

For Google OAuth to work locally, add `http://localhost:3000/auth/callback` to your:
- Google Cloud Console → Authorized redirect URIs
- Supabase → Authentication → URL Configuration → Redirect URLs

---

## Architecture Overview

```
Browser
  └── Next.js App Router (Vercel Edge Network)
        ├── /app/page.tsx           Landing page + Google sign-in
        ├── /app/auth/callback      OAuth PKCE exchange (server route)
        ├── /app/chat               Main community chat (ChatLayout)
        ├── /app/events             Events list + event chat
        ├── /app/market             Marketplace + listing chat
        ├── /app/profile/[userId]   User profiles
        └── /app/api/**             All API route handlers (70+ routes)
              └── Supabase Postgres (database + auth)
              └── Supabase Storage  (avatars + attachments buckets)
              └── Resend            (transactional emails)
```

All pages use `force-dynamic` (set in `app/layout.tsx`) — there is no static prerendering, every request is server-rendered on demand. This is intentional because all pages require live auth context.
