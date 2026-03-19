# CabinMind Marketplace — Launch Checklist

> Last updated: 2026-03-18  
> Repo: `origin/main` — HEAD `bc4ecc5`  
> Build: ✅ Clean (18 routes, 0 errors)  
> Deploy target: `products.devcabin.tech` via Vercel

---

## ✅ DONE — Code & Infrastructure

| Item | Status |
|------|--------|
| Next.js build — zero errors | ✅ |
| All 5 agent demo components | ✅ |
| All 8 API routes | ✅ |
| `/demo` sales page — correct $0.49 pricing | ✅ |
| `/pricing` — 4 BYOK tiers + other agents | ✅ |
| `/api/leads` — full BYOK routing, ZeroBounce, deterministic scoring | ✅ |
| `/api/checkout` — all prices correct | ✅ |
| `/api/webhook` — BYOK email template all 5 LR tiers | ✅ |
| Stripe webhook secret configured | ✅ |
| Resend `support@devcabin.tech` verified | ✅ |
| `ZEROBOUNCE_API_KEY` in Vercel env | ✅ |
| Dashboard token provisioning | ✅ |
| `LeadDashboard` BYOK API Keys tab | ✅ |
| Header Live Demo link + pulse dot | ✅ |

---

## ⏳ PENDING — Manual Steps Before Go-Live

### 1. Switch Stripe to Live Keys (REQUIRED before charging real money)

**Where:** Stripe Dashboard → Developers → API keys

**Vercel env vars to update:**
```
STRIPE_SECRET_KEY        →  sk_live_...
NEXT_PUBLIC_STRIPE_KEY   →  pk_live_...
STRIPE_WEBHOOK_SECRET    →  whsec_...  (re-register webhook on live endpoint)
```

**Steps:**
1. Go to https://dashboard.stripe.com → toggle **Live mode** (top-left)
2. Copy `sk_live_...` → paste into Vercel → Settings → Environment Variables → `STRIPE_SECRET_KEY`
3. Copy `pk_live_...` → paste into `NEXT_PUBLIC_STRIPE_KEY`
4. Go to Stripe → Developers → Webhooks → **Add endpoint**
   - URL: `https://products.devcabin.tech/api/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`
5. Copy the new `whsec_...` signing secret → paste into `STRIPE_WEBHOOK_SECRET`
6. Redeploy on Vercel (env var changes auto-trigger a redeploy)

> ⚠️ You do NOT need to create Stripe Price IDs — checkout.js uses `price_data` (inline pricing).

---

### 2. Upgrade Hunter.io (REQUIRED for Lead Researcher live runs)

**Why:** Free tier = 25 searches/month — almost certainly exhausted.  
**Platform key used by:** Starter plan ($49) users — all Pro/Scale/Agency users bring their own key.

**Recommended:** Hunter Starter at $49/mo → 500 searches/month  
**Link:** https://hunter.io/pricing

**After upgrading:**  
No code changes needed — `PLATFORM_HUNTER` env var in Vercel already points to your key.  
Just ensure the key is still valid: https://hunter.io/api-keys

---

### 3. ZeroBounce Credits Check

**Current:** Free tier 100 validations/month (`ZEROBOUNCE_API_KEY` in Vercel)  
**Used by:** Starter plan users (platform ZB key) + Pro plan users (platform ZB key)

**When to upgrade:** When Starter/Pro users generate >100 leads/month total  
**Link:** https://www.zerobounce.net/pricing (Pay-as-you-go: $16 / 2,000 credits)

---

### 4. Set RESEND_FROM_EMAIL in Vercel (if not already set)

Check Vercel env vars — should be:
```
RESEND_FROM_EMAIL=CabinMind <support@devcabin.tech>
NOTIFY_EMAIL=hello@devcabin.tech
```

---

### 5. Verify Vercel Domain

Confirm `products.devcabin.tech` points to Vercel:
- Vercel → Project Settings → Domains → `products.devcabin.tech` should show ✅
- DNS: CNAME `products` → `cname.vercel-dns.com`

---

### 6. Test Full Checkout Flow (live keys)

After switching to live keys:
1. Buy `lead-starter` ($49) with a real card
2. Confirm: Stripe payment appears in Live dashboard
3. Confirm: Webhook fires → email received at buyer address with dashboard link
4. Confirm: Dashboard token URL loads correctly
5. Confirm: BYOK API Keys tab visible in LeadDashboard

---

## 💰 Pricing Reference (current, all files consistent)

| Plan | Price | Leads | Keys |
|------|-------|-------|------|
| Lead Researcher Starter | $49/mo | 100 | Platform (included) |
| Lead Researcher Pro | $149/mo | 500 | Client Hunter + Platform ZB |
| Lead Researcher Scale | $299/mo | Unlimited | Full BYOK |
| Lead Researcher Agency | $599/mo | Unlimited | Full BYOK, 5 seats |
| AI Receptionist | $79/mo | — | Platform |
| AI Website Auditor | $29/mo | — | Platform |
| AI Blog Writer | $49/mo | — | Platform |
| AI Sales Assistant | $99/mo | — | Platform |

---

## 🔑 Environment Variables — Full Reference

| Variable | Where | Notes |
|----------|-------|-------|
| `STRIPE_SECRET_KEY` | Vercel | `sk_test_` now → swap to `sk_live_` |
| `NEXT_PUBLIC_STRIPE_KEY` | Vercel | `pk_test_` now → swap to `pk_live_` |
| `STRIPE_WEBHOOK_SECRET` | Vercel | Re-register on live endpoint |
| `RESEND_API_KEY` | Vercel | ✅ Active |
| `RESEND_FROM_EMAIL` | Vercel | `CabinMind <support@devcabin.tech>` |
| `NOTIFY_EMAIL` | Vercel | Internal sale alert recipient |
| `ZEROBOUNCE_API_KEY` | Vercel | ✅ Active (100 free/mo → upgrade when needed) |
| `PLATFORM_HUNTER` | Vercel | Hunter.io key for Starter plan users |
| `PLATFORM_ZEROBOUNCE` | Vercel | Same as `ZEROBOUNCE_API_KEY` (or separate) |
| `OPENAI_API_KEY` | Vercel | GPT-4o mini fallback |
| `GROQ_API_KEY` | Vercel | Primary LLM (14,400 req/day free) |

---

## 📊 Competitive Position (for reference)

| Tool | Price | Leads | Data freshness |
|------|-------|-------|---------------|
| Apollo | $99–$199/mo | Bundled | Stale (crowdsourced) |
| Clay | $149–$800/mo | Bundled | Mixed |
| Seamless.ai | $147–$397/mo | Bundled | Mixed |
| **CabinMind Starter** | **$49/mo** | **100** | **Live (Hunter + ZB)** |
| **CabinMind Pro** | **$149/mo** | **500** | **Live (Hunter + ZB)** |
| **CabinMind Scale** | **$299/mo** | **Unlimited** | **Live (your quota)** |
