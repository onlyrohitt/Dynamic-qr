# Dynamic QR Code Manager

A production-ready web app that lets you print **one permanent QR code** and change where it redirects—forever—without reprinting.

```
You print the QR once  →  QR points to YOUR-APP.vercel.app/r  →  /r reads Supabase  →  302 to current destination
                                                                        ↑
                                                         You change this from your dashboard
```

---

## How it works (plain language)

| Piece | What it does |
|---|---|
| **QR code** | Encodes `https://YOUR-APP.vercel.app/r` — this URL never changes |
| **`/r` route** | Every scan hits this endpoint, reads the current URL from Supabase, issues HTTP **302** redirect |
| **Supabase** | Stores the single destination URL in a locked-down database table |
| **Admin dashboard** | Only you can log in and change the destination |
| **Vercel** | Hosts the app 24/7 — works even when your PC is off |

**Why 302 and not 301?** A 301 "permanent" redirect is cached by browsers forever, so scanning after a URL change would still go to the old destination. A 302 "temporary" redirect is never cached — every scan hits your server fresh.

---

## Prerequisites (Windows)

You need these installed before starting:

1. **Node.js 18+** — download from https://nodejs.org (LTS version)
   - After install, open Command Prompt and run: `node --version` (should print v18.x or higher)

2. **Git** — download from https://git-scm.com/download/win
   - Accept all defaults during install

3. **A free Supabase account** — https://supabase.com

4. **A free Vercel account** — https://vercel.com

---

## Part 1 — Supabase setup (5 minutes)

### Step 1 — Create a project
1. Go to https://supabase.com and sign in
2. Click **New project**
3. Fill in: Project name (e.g. `dynamic-qr`), Database password (save this!), Region: **South Asia (Mumbai)**
4. Click **Create new project** — wait ~2 minutes for it to spin up

### Step 2 — Create the database table
1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase/schema.sql` from this project
4. Copy its entire contents and paste into the SQL editor
5. Click **Run** (green button)
6. You should see: `Success. No rows returned`

### Step 3 — Copy your API keys
1. In Supabase, go to **Settings** (gear icon) → **API**
2. Note down these three values — you'll need them in Part 3:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public** key — long string starting with `eyJ...`
   - **service_role / secret** key — another long string starting with `eyJ...` (⚠️ keep this secret!)

---

## Part 2 — Local setup (10 minutes)

### Step 4 — Download the project

Open **Command Prompt** (press `Win + R`, type `cmd`, press Enter):

```cmd
cd C:\Users\YourName\Documents
mkdir projects
cd projects
```

If you're using Git:
```cmd
git clone https://github.com/YOUR-USERNAME/dynamic-qr.git
cd dynamic-qr
```

Or if you downloaded a ZIP: extract it and `cd` into the folder.

### Step 5 — Install dependencies

```cmd
npm install
```

This downloads all required packages. Wait for it to finish (may take 1–2 minutes).

### Step 6 — Create your environment file

In the project folder, copy the example file:

```cmd
copy .env.example .env.local
```

Now open `.env.local` in Notepad (or VS Code):

```cmd
notepad .env.local
```

Fill in your values:

```env
# From Supabase Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# While developing locally
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Your admin login credentials — choose something strong
ADMIN_USERNAME=admin
ADMIN_PASSWORD=MyStr0ngP@ssword!

# Generate this by running the command below in Command Prompt
SESSION_SECRET=PASTE_OUTPUT_HERE
```

**Generate your SESSION_SECRET:**
```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output (64 hex characters) and paste it as your `SESSION_SECRET`.

Save and close the file.

### Step 7 — Run locally

```cmd
npm run dev
```

Open your browser and go to: **http://localhost:3000**

You should see the login page. Log in with the username and password you set in `.env.local`.

**Test the full flow locally:**
1. Log in → you're redirected to the dashboard
2. Enter a destination URL (e.g. `https://google.com`) → click **Save destination**
3. Open a new tab and go to `http://localhost:3000/r`
4. You should be redirected to Google ✓
5. Go back to the dashboard, change the URL to `https://github.com`, save
6. Refresh the `/r` tab — you should now land on GitHub ✓

---

## Part 3 — Deploy to Vercel (10 minutes)

Vercel hosts your app for free and keeps it running 24/7.

### Step 8 — Push to GitHub

If you haven't already, create a GitHub account and repository:

1. Go to https://github.com → **New repository**
2. Name it `dynamic-qr`, keep it **Private**, click **Create repository**
3. Back in Command Prompt:

```cmd
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/dynamic-qr.git
git push -u origin main
```

> GitHub will ask for your credentials. Use your GitHub username and a Personal Access Token (Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token, check `repo`).

### Step 9 — Deploy on Vercel

1. Go to https://vercel.com and sign in with your GitHub account
2. Click **Add New** → **Project**
3. Find your `dynamic-qr` repository → click **Import**
4. On the configuration page, **do not change the framework** (it auto-detects Next.js)
5. Click **Environment Variables** and add each one from your `.env.local`:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service role key |
   | `NEXT_PUBLIC_APP_URL` | **leave blank for now** (fill in after deploy) |
   | `ADMIN_USERNAME` | your chosen username |
   | `ADMIN_PASSWORD` | your chosen password |
   | `SESSION_SECRET` | the 64-char hex string you generated |

6. Click **Deploy** — wait ~2 minutes

### Step 10 — Set your app URL

After deploy, Vercel gives you a URL like `https://dynamic-qr-abc123.vercel.app`:

1. In your Vercel project → **Settings** → **Environment Variables**
2. Edit `NEXT_PUBLIC_APP_URL` → set it to your Vercel URL (no trailing slash)
3. Go to **Deployments** → click the three dots on the latest deployment → **Redeploy**

This is important: the QR code encodes `NEXT_PUBLIC_APP_URL/r`, so it must be your real production URL.

### Step 11 — Generate and print your QR code

1. Go to `https://YOUR-APP.vercel.app` → log in
2. Set your first destination URL
3. Click **1200px (print)** to download the QR code PNG
4. **Print it** — this is the only time you ever need to print it

**You're done.** The QR code now works from Vercel's servers, not your PC.

---

## Day-to-day use

**To change where the QR goes:**
1. Open `https://YOUR-APP.vercel.app` on any device
2. Log in
3. Click **Change destination** → enter new URL → **Save destination**
4. Done — all future scans go to the new URL immediately

**Session expires after 8 hours** — just log in again.

---

## Security notes

| What | How it's protected |
|---|---|
| Admin password | Never stored in plaintext — bcrypt-hashed server-side, never sent to browser |
| Session | Signed HMAC-SHA256 cookie, HttpOnly, SameSite=Strict, Secure (on HTTPS) |
| Database | Row-Level Security enabled — the browser's anon key cannot read or write the URL table |
| Service role key | Only used in server-side API routes — never shipped to the browser |
| Redirect caching | HTTP 302 + `Cache-Control: no-store` on `/r` — browsers never cache the redirect |

---

## Troubleshooting

**"Missing SUPABASE_URL" error on startup**
→ Your `.env.local` file is missing or has wrong variable names. Check spelling exactly.

**Login says "Invalid username or password"**
→ Double-check `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env.local` (case-sensitive).

**`/r` returns 503 "Destination URL not configured"**
→ You haven't set a destination URL yet. Log in to the dashboard and add one.

**QR code preview doesn't load on dashboard**
→ Your session may have expired. Refresh the page and log in again.

**Deployed on Vercel but QR goes to wrong URL**
→ Make sure `NEXT_PUBLIC_APP_URL` is set to your Vercel URL (not localhost) and redeploy.

**"relation qr_destination does not exist" in Vercel logs**
→ You haven't run the SQL schema yet. Go to Supabase → SQL Editor and run `supabase/schema.sql`.

---

## File structure

```
dynamic-qr/
├── app/
│   ├── r/
│   │   └── route.ts          ← THE redirect endpoint (encoded in QR)
│   ├── admin/
│   │   ├── login/
│   │   │   ├── page.tsx       ← Login page (server component)
│   │   │   └── LoginForm.tsx  ← Login form (client component)
│   │   └── dashboard/
│   │       ├── page.tsx       ← Dashboard (server component, auth-gated)
│   │       └── DashboardClient.tsx  ← Dashboard UI (client component)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts   ← POST: validates credentials, sets cookie
│   │   │   └── logout/route.ts  ← POST: clears session cookie
│   │   ├── destination/route.ts ← GET/POST: read & update destination URL
│   │   └── qr-code/route.ts     ← GET: generates QR PNG server-side
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx               ← Redirects to dashboard or login
├── lib/
│   ├── auth.ts                ← Session signing/verification (server only)
│   ├── supabase-client.ts     ← Browser-safe Supabase client (anon key)
│   ├── supabase-admin.ts      ← Server-only Supabase client (service role)
│   └── validate.ts            ← URL validation (shared)
├── middleware.ts               ← Protects /admin/* routes at the edge
├── supabase/
│   └── schema.sql             ← Run once in Supabase SQL Editor
├── .env.example               ← Template — copy to .env.local
├── vercel.json                ← Vercel deploy config
└── README.md                  ← This file
```
#   D y n a m i c - q r  
 