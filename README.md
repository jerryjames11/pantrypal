# PantryPal v2 — Deployment Guide

Grocery tracker + receipt history + AI recipe suggester.
Uses **Gemini 1.5 Flash** (free tier) instead of paid APIs.

---

## What's new in v2
- ✅ **Free AI** — Gemini 1.5 Flash (1,500 req/day free)
- ✅ **Image receipt scanning** — photograph any receipt
- ✅ **Receipt history** — every scan saved, expandable item list
- ✅ **Price delta indicators** — ▲/▼ next to each item showing change vs last purchase
- ✅ **Persistent login** — Google OAuth, pantry syncs across devices
- ✅ **Price tracking** — last known price stored per pantry item

---

## Step 1 — Get your free Gemini API key

1. Go to **https://aistudio.google.com**
2. Sign in with your Google account
3. Click **Get API Key** → **Create API key in new project**
4. Copy the key (starts with `AIza...`)

Free tier limits: **1,500 requests/day**, 1M tokens/minute — more than enough for personal/small-team use.

---

## Step 2 — Set up Supabase

### Create project
1. Go to **https://supabase.com** → New project
2. Choose a region close to your users
3. Wait ~2 min for the project to provision

### Run the schema
1. In Supabase: **SQL Editor → New query**
2. Paste all of `supabase-schema.sql` → click **Run**

### Enable Google Auth
1. **Authentication → Providers → Google** → toggle on
2. You need a **Google Cloud OAuth client**:
   - Go to https://console.cloud.google.com
   - **APIs & Services → Credentials → Create OAuth 2.0 Client**
   - Application type: **Web application**
   - Authorized redirect URIs: add `https://your-project.supabase.co/auth/v1/callback`
3. Paste the Client ID and Secret back into Supabase
4. In Supabase **Authentication → URL Configuration**, add your Vercel URL to "Redirect URLs"

### Get your keys
Go to **Settings → API** and copy:
- Project URL
- `anon` / public key
- `service_role` key (keep secret — server only)

---

## Step 3 — Deploy to Vercel

### Via GitHub (recommended)
1. Push this folder to a GitHub repo
2. Go to **https://vercel.com** → New Project → import repo
3. Add these **Environment Variables** in Vercel before deploying:

```
GEMINI_API_KEY=AIza...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

4. Click **Deploy** — get a URL like `pantrypal.vercel.app`

5. Go back to Supabase → **Authentication → URL Configuration**:
   - Site URL: `https://pantrypal.vercel.app`
   - Redirect URLs: `https://pantrypal.vercel.app/**`

---

## Local development

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your keys
npm run dev
# → http://localhost:3000
```

For Google OAuth locally, add `http://localhost:3000` to your Supabase redirect URLs.

---

## Database schema overview

| Table | Purpose |
|---|---|
| `pantry_items` | Live inventory per user (name, qty, status, last_price) |
| `receipts` | One row per scanned receipt (store, date, total, item count) |
| `receipt_items` | Line items per receipt — includes `price`, `prev_price`, `price_delta` |

Price delta is computed at scan time: the API looks up the most recent prior purchase of each item by name, compares prices, and stores the difference. A ▲ red badge means it went up; ▼ green means it went down.

---

## Cost

| Service | Cost |
|---|---|
| Vercel | Free (hobby) |
| Supabase | Free (500MB DB, unlimited auth) |
| Gemini 1.5 Flash | **Free** (1,500 req/day) |

Total: **$0/month** for typical personal or small-group use.

---

## Folder structure

```
pantrypal2/
├── pages/
│   ├── index.js              ← Full app UI (auth, pantry, scan, history, recipes)
│   ├── _app.js
│   └── api/
│       ├── parse-receipt.js  ← Image + text parsing, price delta, DB save
│       ├── recipes.js        ← Recipe suggestions
│       ├── pantry.js         ← Pantry CRUD
│       └── receipts.js       ← Receipt history + delete
├── lib/
│   ├── supabase.js           ← Supabase client
│   └── gemini.js             ← Gemini client + JSON helper
├── styles/
├── supabase-schema.sql       ← Run once in Supabase SQL editor
├── .env.example
└── package.json
```
