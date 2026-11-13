# Admin Guide — CabinMind AI Lead Researcher

Operator runbook. Everything you need to run the product day to day.

Last verified: 2026-11-13.

---

## 1. What the system actually does

```
Discovery   Google Places API  → real businesses, verified by Google, each with its own website
Screen      DNS MX lookup      → drops anything that can't receive mail (≈10% of candidates)
Enrich      Hunter.io          → finds the real named contact at that domain
Verify      ZeroBounce         → confirms the mailbox is deliverable
Score       deterministic      → A/B/C/D grade with visible signals
Deliver     redaction by plan  → CSV / dashboard
```

**The rule that governs everything:** the LLM never supplies a fact. It writes
copy from facts the pipeline proved. If Hunter has no contact for a real domain,
the company is skipped — we do not invent a person. This is enforced by
`allowSynthesisedContacts: false` in `pages/api/leads.js`.

---

## 2. Admin surfaces

| URL | What it's for |
|---|---|
| `/admin` | Top-level operations dashboard |
| `/admin/runs` | **Run log** — every lead search, what was asked for, what came back, and why a run was short. Requires Supabase. |
| `/admin/trials` | Trial accounts: leads used, leads remaining, estimated cost |
| `/admin/dashboards` | Per-product dashboard previews |

> **Both `/admin/runs` and the usage figures on `/admin/trials` require Supabase.**
> On Vercel each API route is a separate serverless function with its own `/tmp`,
> so counters written by `/api/leads` can never be read back by an `/api/admin/*`
> route. Until `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, those
> dashboards will show zeros no matter how much the product is used.

Admin APIs require the `ADMIN_SECRET`, passed either as the `x-admin-secret`
header or a `?secret=` query param:

```bash
curl "https://products.devcabin.tech/api/admin/trials?secret=$ADMIN_SECRET"
```

| Endpoint | Returns |
|---|---|
| `GET /api/admin/trials` | Every trial slug with usage + remaining leads |
| `GET /api/admin/clients` | Paying customers |
| `GET /api/admin/weekly-report` | Weekly summary (also runs as a Monday 9am cron) |

---

## 3. Environment variables

Set in Vercel → Project → Settings → Environment Variables.

### Required — the product does not work without these

| Variable | Purpose |
|---|---|
| `HUNTER_API_KEY` | Finds the real contact at a domain. Platform key, used for Starter + trials. |
| `ZEROBOUNCE_API_KEY` | Confirms the mailbox is deliverable. |
| `GROQ_API_KEY` | Writes copy from proven facts. Primary LLM. |
| `STRIPE_SECRET_KEY` | Charges cards. |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe callbacks. |
| `ADMIN_SECRET` | Gates every `/api/admin/*` endpoint. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Transactional email. |

### Strongly recommended

| Variable | Purpose | If missing |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | Real business discovery | Falls back to `PAGESPEED_API_KEY`, then to LLM discovery (~70% fabrication) |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Durable quota + token storage | Falls back to `/tmp` JSON, wiped on cold start — **lead caps become unenforceable** |
| `TRIAL_SLUGS` | Add trial accounts without a deploy | Only built-in slugs work |
| `OPENAI_API_KEY` | LLM fallback when Groq is down | No fallback; Groq outage = downtime |

### Optional

`PAGESPEED_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_META_PIXEL`,
`NEXT_PUBLIC_BASE_URL`, `NOTIFY_EMAIL`, `STRIPE_PRICE_*`.

---

## 4. Handing out a trial account

Each trial gets **50 leads, one time** — the allowance does not reset monthly.

### Add the account

```bash
vercel env add TRIAL_SLUGS production
# comma-separated, e.g.:
# northwind-pilot-aa11,summit-demo-x9k2
```

Redeploy is not required for the env var to take effect on the next cold start,
but trigger one if you want it live immediately.

**Pick unguessable slugs.** `acme2026` is trivial to guess; `acme-pilot-7k42` is
not. Invalid slugs return a real 404.

### Send the link

```
https://products.devcabin.tech/trial/<slug>
```

The prospect lands on a self-serve page: describe your ideal customer, pick 5 or
10 leads per run, generate, export CSV. Pricing is visible on the page from the
first second.

### Watch it

```bash
curl "https://products.devcabin.tech/api/admin/trials?secret=$ADMIN_SECRET"
```

Or visit `/admin/trials`.

### Revoke it

Remove the slug from `TRIAL_SLUGS`, or from `BUILT_IN_SLUGS` in `lib/trials.js`.

---

## 5. Capacity — read this before a demo push

Hunter bills **1 credit per search** and **0.5 per verification** from one shared
monthly pool. Measured consumption with Places discovery active is
**≈1.9 credits per delivered lead** (20 leads cost 19 searches + 38 verifications).

| Hunter plan | Credits/mo | Leads/mo capacity |
|---|---|---|
| Hunter Starter ($49/mo) | 2,000 | **≈1,050** |
| Hunter Growth ($99/mo) | 10,000 | ≈5,200 |

**A single 50-lead trial consumes ≈95 credits — about 5% of a Starter plan**, so
roughly 20 full trials per month before the pool is gone.

This is far cheaper than it was before Google Places was enabled. With LLM
discovery the pipeline burned a Hunter search on every fabricated domain and
spun through four rounds finding nothing — about 5.7 credits per lead, and far
worse on a miss. If you ever see credit burn jump back to that level, discovery
has fallen back to the LLM: check `provider` in the response.

Trials and Starter customers draw from the same pool; Pro/Scale/Agency do not,
because they bring their own Hunter key.

Check remaining capacity any time:

```bash
curl -s "https://api.hunter.io/v2/account?api_key=$HUNTER_API_KEY" | python3 -m json.tool
curl -s "https://api.zerobounce.net/v2/getcredits?api_key=$ZEROBOUNCE_API_KEY"
```

---

## 6. Cost per lead

| Input | Per lead |
|---|---|
| Hunter (1.9 credits @ $49/2,000) | $0.047 |
| ZeroBounce (1.3 validations @ ~$0.005) | $0.007 |
| Google Places (~0.1 calls @ $32/1,000) | $0.004 |
| Groq | $0.00 (free tier) |
| **Total** | **≈ $0.06** |

Measured over 20 real leads across four verticals on 2026-11-13. Earlier figures
in this guide said $0.19/lead; that was measured while discovery was fabricating
companies and wasting provider calls on them.

At Starter ($100 for 100 leads) that is roughly a **94% gross margin**.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Every request returns 429 "limit reached" with no `used`/`remaining` in the body | An async usage call lost its `await`, so the check reads a Promise | Check `await checkUsage(...)` in `pages/api/leads.js` |
| 500 on every lead run | Both LLM providers failing | Check Groq model still exists (`groq.models.list()`), check OpenAI billing |
| `provider: groq` instead of `google-places` | Places API disabled or key lacks access | Enable **Places API (New)** on the key's GCP project; confirm billing attached |
| Leads returned with no-DNS domains | Screening bypassed | `allowSynthesisedContacts` must be `false` |
| Trial counter resets | Supabase not configured; `/tmp` wiped | Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| `hunterQuotaExceeded: true` in response | Monthly Hunter pool exhausted, **or the plan silently lapsed to Free at renewal** | Check `plan_name` in the Hunter account call — not just the remaining count |
| Every vertical returns ~95% `noContact` and 0 leads | Almost always Hunter quota, not data coverage | Check the Hunter meter **before** concluding a niche has no coverage |
| Chatbot quotes a wrong price | A price was hardcoded instead of imported | All prices must come from `lib/plans.js` |

### Reading the diagnostics

Every response includes `quality.screened`:

```json
{ "candidates": 63, "noMX": 7, "noEmail": 0, "noContact": 17, "rounds": 2 }
```

- `noMX` high (>50%) → discovery is falling back to the LLM; check Places
- `noContact` high → Hunter has no coverage for that niche
- `rounds` at 4 → the niche is thin; results will be short

---

## 8. Known gaps

These are real and currently unmitigated.

1. **No per-account spend ceiling.** `.github/copilot-instructions.md` rule 4
   requires one. Scale and Agency skip the quota check entirely, so Google
   Places spend on those plans is uncapped.
2. **"Unlimited" is literally unlimited** on Scale/Agency. Define a fair-use
   number before selling either tier at volume.
3. **Trials share the Starter Hunter pool.** A demo push can starve a paying
   customer. Consider a separate Hunter key for trials.
4. **Quota is not durable without Supabase.** On `/tmp` storage the 50-lead cap
   can be bypassed by waiting for a cold start.

---

## 9. Deploying

The project is Git-connected to Vercel — pushing `main` deploys production.

```bash
npm test          # 109 tests
npm run build     # must pass before pushing
git push origin main
```

Verify after deploy:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://products.devcabin.tech/trial/<slug>   # 200
curl -s -o /dev/null -w '%{http_code}\n' https://products.devcabin.tech/trial/bogus    # 404
```
