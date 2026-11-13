# CabinMind — Dev Cabin Technologies

Next.js app powering **products.devcabin.tech**: the AI Lead Researcher, the
agent marketplace, the project cost calculator, and the WordPress plugin suite.

---

## Documentation

| Doc | For | Covers |
|---|---|---|
| **[docs/ADMIN-GUIDE.md](docs/ADMIN-GUIDE.md)** | You, operating the product | Architecture, env vars, admin endpoints, capacity limits, cost per lead, troubleshooting, known gaps |
| **[docs/HOW-TO.md](docs/HOW-TO.md)** | You, doing a specific task | Step-by-step: issue a trial, diagnose no-leads, enable Places, wire Supabase, change a price, rotate a key, ship a change |
| **[docs/CLIENT-GUIDE.md](docs/CLIENT-GUIDE.md)** | Customers and trial users | What they get, how to write a good ICP, reading grades, why a batch can be short, plans |
| **[docs/SALES-CHEAT-SHEET.md](docs/SALES-CHEAT-SHEET.md)** | Selling | Pricing, objection handling, demo script, qualifying signals, red lines |

### Supporting material

| Doc | Covers |
|---|---|
| [LEAD-SCORING-EXPLAINED.md](LEAD-SCORING-EXPLAINED.md) | How the A–D grade is calculated |
| [PITCH-DECK.md](PITCH-DECK.md) | Investor/partner narrative |
| [ADS-PLAYBOOK.md](ADS-PLAYBOOK.md) | Paid acquisition copy |
| [CAMPAIGN-PLAYBOOK.md](CAMPAIGN-PLAYBOOK.md) | Outbound email sequences |
| [CLIENT-DEMO-PLAYBOOK.md](CLIENT-DEMO-PLAYBOOK.md) | Running a live demo |
| [LOCAL-BUSINESS-PLAYBOOK.md](LOCAL-BUSINESS-PLAYBOOK.md) | Local-business vertical |
| [CALCULATOR-README.md](CALCULATOR-README.md) | Project cost calculator at `/calculator` |
| [LAUNCH.md](LAUNCH.md) | Launch checklist |
| [TASK-QUEUE.md](TASK-QUEUE.md) | Build plan |

Engineering conventions and the non-negotiable product rules live in
[.github/copilot-instructions.md](.github/copilot-instructions.md).

---

## Running locally

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 109 tests
npm run build   # must pass before pushing
```

Secrets go in `.env.local` — see the env var table in the Admin Guide.

---

## Pipeline, in one block

```
Discovery   Google Places API   real businesses Google has verified
Screen      DNS MX lookup       drops anything that can't receive mail
Enrich      Hunter.io           the real named contact at that domain
Verify      ZeroBounce          confirms the mailbox is deliverable
Score       deterministic       A/B/C/D with visible signals
Deliver     redacted by plan    dashboard + CSV
```

**The rule that governs everything:** the LLM never supplies a fact. It writes
copy from facts the pipeline proved. If Hunter has no contact for a real domain,
the company is skipped rather than having a person invented for it.

---

## Key modules

| Path | Role |
|---|---|
| `lib/plans.js` | **Single source of truth for every price.** Change it here, nowhere else. |
| `lib/trials.js` | Trial slugs (extend with the `TRIAL_SLUGS` env var) and the 50-lead allowance |
| `lib/placesDiscovery.js` | Google Places adapter — the business list |
| `lib/aiModels.js` | LLM model IDs, centralised because providers retire them |
| `lib/usageStore.js` | Quota + plan limits (Supabase-backed, `/tmp` fallback) |
| `lib/rateLimit.js` | Bot gate and per-IP / per-subscriber rate limits |
| `pages/api/leads.js` | The pipeline |
| `signal-engine/` | Pure scoring core (TypeScript, fully tested) |

---

## Key routes

| Route | Who |
|---|---|
| `/trial/<slug>` | Gifted 50-lead trial |
| `/demo` | Public masked demo |
| `/pricing` | Plans and checkout |
| `/dashboard/<token>` | Paying customer |
| `/admin`, `/admin/trials` | Operator |

---

**Security:** never commit secrets. Use `.env.local` and Vercel environment
variables. Rotate anything exposed immediately.