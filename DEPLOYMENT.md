# Rhythm Guardian — Deployment Guide
Deploying a Vite + React + Supabase app to Vercel.

---

## Prerequisites

- Node.js 18+
- Git repository (GitHub, GitLab, or Bitbucket)
- Vercel account — [vercel.com](https://vercel.com)
- Supabase project already set up

---

## Step 1 — Verify the build locally

Before deploying, confirm the production build succeeds:

```bash
npm run build
```

You should see a `dist/` folder with no errors. Fix any TypeScript or build errors before continuing.

---

## Step 2 — Push to Git

If not already on Git:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/rhythm-guardian.git
git push -u origin main
```

---

## Step 3 — Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to your Vercel account
vercel login

# Deploy from the project root
vercel

# Answer the prompts:
# Set up and deploy? → Y
# Which scope? → your account
# Link to existing project? → N (first time)
# Project name → rhythm-guardian
# Directory → ./
# Override settings? → N
```

Or deploy directly to production:

```bash
vercel --prod
```

---

## Step 4 — Set Environment Variables in Vercel

Go to **Vercel Dashboard → Project → Settings → Environment Variables** and add:

| Variable | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://vptqcceuufmgwahrimor.supabase.co` | Required |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Required |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Required for admin ops |
| `VITE_PAYSTACK_PUBLIC_KEY` | `pk_test_...` or `pk_live_...` | Required |
| `PAYSTACK_SECRET_KEY` | `sk_test_...` or `sk_live_...` | No VITE_ prefix — edge functions only |
| `VITE_OPENAI_API_KEY` | `sk-...` | Optional — AI assistant |

Set all variables for **Production**, **Preview**, and **Development** environments.

After adding env vars, redeploy:

```bash
vercel --prod
```

---

## Step 5 — Update Supabase Auth Settings

After getting your Vercel URL (e.g. `https://rhythm-guardian.vercel.app`):

1. Go to **Supabase Dashboard → Authentication → URL Configuration**
2. Set **Site URL** to: `https://rhythm-guardian.vercel.app`
3. Add to **Redirect URLs**:
   - `https://rhythm-guardian.vercel.app/**`
   - `https://rhythm-guardian.vercel.app/login`
   - `https://rhythm-guardian.vercel.app/reset-password`
   - `http://localhost:8080/**` (keep for local dev)

---

## Step 6 — Switch Paystack to Live Mode (when ready)

When going live, update in Vercel env vars:
- `VITE_PAYSTACK_PUBLIC_KEY` → `pk_live_...`
- `PAYSTACK_SECRET_KEY` → `sk_live_...`

Also update in Supabase → **Edge Function Secrets**:
- `PAYSTACK_SECRET_KEY` → `sk_live_...`

---

## Vercel Project Settings

The `vercel.json` in the root handles:
- **SPA routing** — all routes rewrite to `index.html` so direct URL navigation works
- **Asset caching** — static assets cached for 1 year (immutable, hash-based filenames)
- **Security headers** — X-Frame-Options, XSS protection, etc.

Build settings (auto-detected by Vercel for Vite):
- Framework: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

---

## Continuous Deployment

Once connected to Git, every push to `main` automatically deploys to production. Pull requests get preview deployments at unique URLs.

To disable auto-deploy for a branch, go to **Vercel → Project → Settings → Git → Ignored Build Step**.

---

## Troubleshooting

**Blank page on direct URL navigation**
→ Ensure `vercel.json` exists with the SPA rewrite rule.

**Auth redirects broken after deploy**
→ Add your Vercel domain to Supabase redirect URLs (Step 5).

**Environment variables not loading**
→ All frontend env vars must start with `VITE_`. Redeploy after adding them.

**Build fails with TypeScript errors**
→ Run `npm run build` locally first and fix all errors.

**Supabase edge functions not working**
→ Edge functions are deployed separately via `supabase functions deploy`. They run on Supabase infrastructure, not Vercel.

**CORS errors**
→ Add your Vercel domain to Supabase → API → CORS allowed origins.
