# Copilot Task Queue

Copy one block at a time into Copilot Chat (or `/` an agent task). **One task per
PR.** Copilot degrades badly on multi-part prompts — it does the first part well,
the second adequately, and quietly skips the third.

Each task states scope, acceptance criteria, and explicit non-goals. The
non-goals matter as much as the goals; without them Copilot invents adjacent work
and the diff becomes unreviewable.

Tasks are ordered by dependency. Don't skip ahead.

---

## Task 0 — signal-engine ✅ done

Prerequisite that the original queue assumed already existed. TypeScript is now
configured (`tsconfig.json`, `tsconfig.jest.json`, `jest.config.js`) and
`signal-engine/` is written and tested:

| File | Contents |
| --- | --- |
| `types.ts` | All pipeline data contracts |
| `signals.ts` | 23 pure extractors + `THRESHOLDS` |
| `offer-profiles.ts` | 8 offers, every signal priced in every offer |
| `score.ts` | `scoreLead` / `scoreBatch` |
| `tiers.ts` | `LEVELS`, `PLANS`, `deliver()`, `checkQuota()`, watchlists |

Fixtures live in `__fixtures__/profiles.ts`. `npm test` runs the suite,
`npm run typecheck` runs `tsc --noEmit`. Costs are `STAGE_COST_MICROS`
(integers); `STAGE_COST_USD` is a derived view for display only.

---

## Task 1 — Google Places discovery adapter

```
Create src/adapters/places.ts — an adapter over the Google Places API
(searchNearby + place details) that returns PlacesData objects matching the
interface in signal-engine/types.ts.

Requirements:
- searchByCategoryAndRadius(category, lat, lng, radiusMeters, maxResults)
- getDetails(placeId) returning full PlacesData including rating, reviewCount,
  isClaimed, hasHours, photoCount, hasDescription, latestReviewAt
- Field masking on every request so we only pay for fields we use. Log the
  requested field mask so cost is auditable.
- Redis cache. Place details 30 days, volatile fields (rating, reviewCount)
  72 hours, keyed by place_id.
- Handle pagination via next_page_token, including Google's required delay
  before a page token becomes valid.
- Typed error class PlacesError distinguishing quota, invalid request, and
  transient failures. Retry transient only, exponential backoff, max 3.
- Per-request timeout of 8s.
- Dedupe results by place_id across paginated pages.

Acceptance:
- Unit tests against recorded JSON fixtures in __fixtures__/places/. No live
  API calls in tests.
- A cost-estimation helper returning USD for a given call plan.
- README section documenting which field masks map to which billing SKU.

Non-goals: do not modify signal-engine/. Do not add the site scraper. Do not
wire this into any route yet.
```

---

## Task 2 — Website enricher

```
Create src/adapters/site-enricher.ts that fetches a business website and returns
a SiteData object matching signal-engine/types.ts.

Detect and populate:
- reachable, httpsValid (verify the cert, don't just check the scheme)
- hasViewportMeta, loadMs (time to first byte plus HTML parse)
- hasContactForm (any <form> with an email or tel input)
- hasOnlineBooking (detect calendly, acuity, squarespace-scheduling, setmore,
  booksy, vagaro, janeapp, zocdoc, plus generic /book /schedule /appointment links)
- hasLiveChat, hasBlog
- platform (wordpress, wix, squarespace, godaddy, shopify, webflow, custom)
- stack: array of detected third-party script slugs
- lastContentUpdateAt from sitemap.xml lastmod, falling back to visible post dates
- emails: scraped from mailto links and visible text, deduped, junk filtered
  (no noreply@, no example@, no image filenames misparsed as emails)
- people: name + title from /about, /team, /our-team, /staff, /meet-the-team
- locationCount from a /locations page or repeated distinct addresses

Requirements:
- Respect robots.txt. Honest User-Agent identifying our crawler with a contact URL.
- Max 4 pages per domain: homepage, about/team, contact, locations.
- Per-domain rate limit and a global concurrency cap.
- 10s total budget per domain, then return partial data rather than failing.
- Never follow links off the target domain.
- Cache by domain for 30 days.

Acceptance:
- Unit tests against saved HTML fixtures covering wordpress, wix, godaddy, and
  a JS-heavy site that yields almost nothing.
- Returns { reachable: false } cleanly for dead domains, never throws.

Non-goals: no headless browser yet — static HTML only. Do not implement contact
verification. Do not modify signal-engine/.
```

---

## Task 3 — Augmentation sources

```
Create src/adapters/augment/ with one module per source, each returning a partial
ExternalData object from signal-engine/types.ts. Compose them in
src/adapters/augment/index.ts which runs all sources in parallel with
Promise.allSettled and merges successes.

Modules:
- ads.ts — Meta Ad Library API and Google Ads Transparency Center. Set
  runningPaidAds and adPlatforms.
- jobs.ts — search Indeed and the business's own /careers page. Set openJobCount
  and jobTitles.
- registry.ts — state business registry lookup. Start with Wisconsin DFI, behind
  an interface so other states drop in. Set registeredAt and licenseStatus.

Requirements:
- Every module fails soft. A source being down returns {} and logs a warning; it
  must never fail the overall enrichment.
- Per-source timeout of 6s.
- Cache 72 hours.
- Confidence must degrade honestly: if ads.ts couldn't run, the resulting lead
  should have no running_paid_ads signal rather than a false negative implied
  as fact.

Acceptance:
- Integration test proving that with all three sources failing, augment()
  resolves to {} and does not throw.
- Fixtures for each source.

Non-goals: do not add more sources than these three. Do not modify scoring.
```

---

## Task 4 — Pipeline orchestrator with cost ceilings

```
Create src/pipeline/run.ts exporting runPipeline(request, options).

The request specifies: categories, geo (center + radius), offer profile,
enrichment level, and desired lead count. The orchestrator:

1. Discovers via places adapter
2. Applies ICP hard filters early to avoid enriching leads we'll reject
3. Runs site enrichment and augmentation in parallel, per business, respecting
   the stages listed in LEVELS[level].stages from signal-engine/tiers.ts
4. Calls scoreBatch from signal-engine/score.ts
5. Returns ScoredLead[] sorted by priority

Requirements:
- Declare maxSpendUsd before starting. Track actual spend per stage using
  STAGE_COST_USD. Abort cleanly and return partial results when the ceiling is
  hit, with a spendExceeded flag.
- Stream results: emit each lead as it finishes scoring via an async iterator, so
  the UI can render progressively rather than waiting for the full batch.
- Only run stages the requested level includes. Never run mobile_lookup or
  llm_opener below the campaign level.
- Enrich in bounded-concurrency batches (start at 5) rather than all at once.
- Every lead carries which stages actually succeeded, so confidence is auditable.

Acceptance:
- Test proving a level:'contact' request never invokes the augment adapters.
- Test proving the spend ceiling aborts and returns partial results.
- Test proving the async iterator yields incrementally, not all at the end.

Non-goals: no HTTP routes. No credit ledger yet. No UI.
```

---

## Task 5 — Credit ledger

```
Create src/billing/ledger.ts — an append-only credit ledger backed by Postgres.

Schema:
- accounts(id, plan_id, credits_included, cycle_start, cycle_end)
- ledger_entries(id, account_id, delta, reason, idempotency_key UNIQUE,
  lead_count, level, created_at, metadata jsonb)

API:
- getBalance(accountId): computed from entries, never a mutable column
- reserve(accountId, credits, idempotencyKey): holds credits before work starts
- commit(reservationId, actualCredits): debits actual usage, releases the rest
- release(reservationId): full refund on failure

Requirements:
- Idempotency key is UNIQUE. A duplicate insert returns the original entry
  instead of erroring, so retries are safe.
- Reserve/commit runs in a transaction with SELECT ... FOR UPDATE on the account.
- Debit on successful delivery only. A failed enrichment releases in full.
- Use checkQuota from signal-engine/tiers.ts for entitlement checks; this module
  handles only the accounting.
- Money and credits are integers. No floats anywhere.

Acceptance:
- Concurrency test: 20 parallel reserves against a 10-credit balance results in
  exactly 10 credits reserved and 10 rejections.
- Idempotency test: the same key submitted 5 times produces one ledger entry.
- Test proving a failed pipeline run leaves the balance unchanged.

Non-goals: no Stripe integration. No plan upgrade flow. No invoicing.
```

---

## Task 6 — Delivery API with server-side redaction

```
Create the HTTP layer: POST /api/leads/search and GET /api/leads/:jobId/stream.

Flow:
1. Authenticate, resolve account and plan
2. checkQuota() — reject with the suggestedPlan upsell payload if blocked
3. ledger.reserve()
4. runPipeline(), streaming results over SSE
5. deliver(lead, level, plan) on EVERY lead before it leaves the server
6. ledger.commit() with actual delivered count

Requirements:
- deliver() is the only path by which a lead reaches a response body. Add a test
  that fails if any route serializes a raw ScoredLead.
- SSE stream emits delivered leads incrementally plus a final summary event with
  credits used and remaining.
- Rate limit: per account, per IP, and a global concurrency cap on trial accounts.
- Trial accounts get maskContacts: true from PLANS.trial. Verify the masked value
  never contains the full email anywhere in the payload, including nested metadata.
- No PII in any log line or error response. Log business IDs only.

Acceptance:
- Test asserting a trial response contains no unmasked email, scanning the full
  serialized JSON string.
- Test asserting a level:'discovery' response contains no signals array.
- Load test: 50 concurrent trial sessions stay under a defined spend ceiling.

Non-goals: no UI changes. No export formats yet.
```

---

## Task 7 — Frontend: offer selector and vertical chips

```
Update the trial UI at /trial.

Replace the current ICP chip row with two rows:

Row 1 — "What kind of business?" (the prospect's vertical)
  Dentists · HVAC · Roofing · Med Spas · Law Firms · Auto Repair ·
  Restaurants · Salons · Chiropractors · Landscaping
  Each maps to Google Places category slugs.

Row 2 — "What do you sell them?" (maps to OfferProfileId in
signal-engine/offer-profiles.ts)
  Websites · Local SEO · Reputation · Paid Ads · Booking Software ·
  POS & Payments · Staffing · Something else

Plus a location input defaulting to the user's metro, with a radius slider.

Lead cards must render:
- Grade badge (A/B/C/D) with priority score
- Signal chips, each with its evidence as a tooltip and sourceUrl as a link
- The whyNow line as the visual centerpiece of the card
- Masked contacts on trial, with the locked.teaser text and an upgrade CTA

Requirements:
- Consume the SSE stream and render cards progressively as they arrive.
- Skeleton cards while the batch runs — never a blank screen.
- Credit counter, not a lead counter, reflecting the ledger balance.
- Natural palette with orange as the accent color.
- Mobile-first. Cards must be fully readable at 375px.

Acceptance:
- Row 2 selection demonstrably changes result ordering for the same Row 1 input.
  This is the core demo moment; make it obvious.
- No layout shift as streamed cards arrive.

Non-goals: no pricing page. No account settings. No export UI.
```

---

## Task 8 — Export

```
Add export to CSV, Google Sheets, and webhook.

- CSV: columns mirror the DeliveredLead fields the account's level grants.
  Never include redacted fields as empty columns — omit them entirely.
- Google Sheets: OAuth, create a new sheet, one row per lead, signals as a
  semicolon-joined column, sourceUrls as hyperlinks.
- Webhook: POST delivered leads as JSON to a user-configured URL, HMAC-signed
  with a per-account secret, with retry and a dead-letter queue.

Requirements:
- Export runs off already-delivered (redacted) leads. Never re-query the pipeline.
- Rate limit exports per account.
- Gate by PLANS[planId].exports.

Acceptance:
- Test proving a discovery-level export contains no signal or score columns.
- Test proving webhook signatures verify against the account secret.

Non-goals: no HubSpot or Pipedrive yet — those are separate tasks with their own
OAuth flows.
```

---

## Task 9 — Watchlists (the retention product)

```
Implement saved watchlists with change detection.

Schema:
- watchlists (matching the Watchlist interface in signal-engine/tiers.ts)
- watchlist_snapshots(watchlist_id, place_id, signals jsonb, priority,
  captured_at)

Behavior:
- Scheduled job per cadence re-runs the pipeline for the watchlist criteria.
- Diff against the most recent snapshot per place_id.
- Alert only on CHANGE, never on steady state:
    * a business newly crosses minPriority
    * a signal in alertOnSignals newly appears
    * a business new to the geography appears at all
- Deliver via email, Slack, or webhook per the watchlist config.
- Charge credits at WATCH_REFRESH_COST_MULTIPLIER of full enrichment, since
  company-level data is cached.

Requirements:
- Idempotent runs. A job retry must not re-alert.
- Suppress repeat alerts for the same place_id + signal for 30 days.
- Cap watchlist size by plan.

Acceptance:
- Test proving a business whose signals are unchanged produces no alert.
- Test proving a rating dropping from 4.1 to 3.8 fires low_rating exactly once.
- Test proving a retried job sends no duplicate alerts.

Non-goals: no digest templating beyond plain text and a basic HTML email.
```

---

## How to run these well

- **One task, one PR.** Review each diff before starting the next.
- If Copilot's output drifts, paste the acceptance criteria back and ask it to
  revise against them specifically rather than re-prompting from scratch.
- After each task, run the full suite. The scoring snapshot tests are your
  regression net — if rank order changes unexpectedly, something upstream broke.
- Tasks 1–4 are the critical path to a working product. 5–6 make it sellable.
  7 makes it demoable. 8–9 make it retentive.
