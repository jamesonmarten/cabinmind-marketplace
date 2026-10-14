# Copilot Instructions — CabinMind AI Lead Researcher

## What this product is

A local lead generation tool. A user describes a business category and geography,
tells us what they sell, and we return ranked local businesses with evidence for
why each one is likely to buy right now.

**Buyers:** marketing/web/SEO agencies, solo consultants, B2B small businesses,
and local vendor sales teams. Not consumers. Not B2C prospecting.

**The differentiator is scoring, not finding.** Anyone can list businesses from
Google Maps. We rank them by timing signals and explain the ranking with citable
evidence. If a change makes the results harder to justify to a skeptical user,
it is the wrong change.

---

## Architecture

```
Discovery   → Google Places API (primary source of the business list)
Enrich      → fetch + parse the business's own website
Augment     → Meta Ad Library, Google Ads Transparency, job boards,
              state business registry, Google review history
Fallback    → Apollo / PDL (multi-location operators only, where coverage exists)
Verify      → email verification provider
Score       → signal-engine/ (pure, no I/O, already built)
Deliver     → tiers.ts deliver() redacts by entitlement, then export
```

`signal-engine/` is the core and is already written and tested:

| File | Role |
| --- | --- |
| `types.ts` | Data contracts for the whole pipeline |
| `signals.ts` | 23 extractors, `BusinessProfile -> Signal \| null` |
| `offer-profiles.ts` | Signal weights keyed to what the *seller* sells |
| `score.ts` | fit + trigger + reachability → priority, grade, whyNow |
| `tiers.ts` | Enrichment depths, plans, credits, redaction, quota |

---

## Non-negotiable rules

These exist because violating them creates legal, financial, or trust damage
that is expensive to undo. Do not relax them for convenience.

### 1. The LLM never sources facts

An LLM may **rewrite** facts the pipeline proved. It may never **supply** a
business name, email, phone number, address, review count, rating, or any other
factual claim about a real business.

Every factual field must trace to an API response or a scraped page, and carry a
`sourceUrl` a user can click to verify. A hallucinated email destroys the user's
sending domain reputation and we get blamed. This is the single highest-severity
failure mode in the product.

### 2. Redaction happens server-side

`deliver()` strips fields the buyer has not paid for before the response leaves
the server. Never send a full object to the client and hide fields in the UI.

### 3. Credits are debited transactionally and idempotently

Every enrichment job carries a client-supplied idempotency key. A retry must
never double-charge. A failed enrichment must never charge at all. Debit on
successful delivery, not on request.

### 4. Cost ceilings are enforced per session and per account

Every pipeline run declares a max spend before it starts and aborts when it hits
it. The free trial is an open invitation to burn our API budget; treat it as
hostile by default.

### 5. Respect robots.txt and rate limits on scraping

Identify our crawler honestly in the User-Agent. Per-domain rate limiting. Never
scrape behind a login. Cache aggressively — the same business gets requested by
many users.

### 6. No PII in logs

Emails, phone numbers, and contact names never appear in application logs, error
messages, or third-party monitoring. Log the business ID instead.

---

## Conventions

- TypeScript, `strict: true`. No `any` — use `unknown` and narrow.
- Signal extractors are **pure functions**. No I/O, no clock reads outside the
  provided helpers, no randomness. They must be unit-testable without mocks.
- Every new signal needs: an extractor in `signals.ts`, weights in the relevant
  offer profiles, and a unit test with a realistic fixture.
- Evidence strings must read as a sentence a salesperson could paste into an
  email unedited. Write them in plain English. No jargon, no placeholders.
- External API calls go through an adapter module with a typed response, a
  timeout, retries with backoff, and a cache layer. Never call `fetch` directly
  from business logic.
- Prefer failing soft: if an augmentation source is down, return the lead with
  fewer signals and a lower confidence, not an error.
- Currency in cents as integers. Never floats for money.

## Caching

Two distinct TTLs — conflating them causes both stale data and wasted spend:

- **Company-level** (place details, site scrape, registry): 30 days.
- **Volatile** (review counts, ratings, ad status, job postings): 24–72 hours.

Cache keys are the Google `place_id`, never the business name.

## Testing

- Signal extractors: pure unit tests against fixtures in `__fixtures__/`.
- Scoring: snapshot tests asserting rank *order* for a given offer, not exact
  scores — scores shift legitimately when weights are tuned, order shouldn't.
- Adapters: contract tests against recorded fixtures, not live APIs.
- Never write a test that hits a paid API in CI.

## What NOT to build

- Consumer / B2C prospecting of any kind.
- Scraping LinkedIn. It violates their terms and will get the product killed.
- Any feature that emails prospects on the user's behalf from our infrastructure.
  We deliver leads; the user sends from their own domain. Sending on their behalf
  makes us liable for their compliance and puts our IP reputation at risk.
- "AI generates leads" framing anywhere in code, copy, or API naming. We
  research and rank real businesses. The distinction is the product.
