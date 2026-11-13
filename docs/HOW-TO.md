# How-To Guide — Step by Step

Concrete procedures. Each one is self-contained; follow it top to bottom.

Prefix every `gcloud` command with:
```bash
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"
```

---

## HOW-TO 1 — Give a prospect a 50-lead trial

**Time: 3 minutes.**

1. **Pick an unguessable slug.** Company name + random suffix:
   `northwind-pilot-aa11`. Never a bare year like `acme2026` — those get probed.

2. **Add it to the env var.** Existing slugs must be included; this replaces the
   whole value.
   ```bash
   npx vercel env rm TRIAL_SLUGS production --yes   # ignore error if unset
   npx vercel env add TRIAL_SLUGS production
   # paste: northwind-pilot-aa11,summit-demo-x9k2
   ```

3. **Redeploy so it's live immediately.**
   ```bash
   git commit --allow-empty -m "chore: pick up TRIAL_SLUGS" && git push origin main
   ```

4. **Verify before sending.**
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' \
     https://products.devcabin.tech/trial/northwind-pilot-aa11   # expect 200
   ```

5. **Check you have capacity.** A trial costs ≈285 Hunter credits.
   ```bash
   curl -s "https://api.hunter.io/v2/account?api_key=$HUNTER_API_KEY" \
     | python3 -c "import json,sys; d=json.load(sys.stdin)['data']['requests']['searches']; print(d)"
   ```
   Under ~400 remaining? Upgrade Hunter before sending more links.

6. **Send it.**
   > Here's your private link — 50 free leads, no card:
   > https://products.devcabin.tech/trial/northwind-pilot-aa11
   > Describe the kind of business you sell to and hit generate. Export to CSV any time.

---

## HOW-TO 2 — Check how a trial is going

```bash
curl -s "https://products.devcabin.tech/api/admin/trials?secret=$ADMIN_SECRET" \
  | python3 -m json.tool
```

Or open `/admin/trials`.

Read it as:
- `leadsUsed` 0 after a day → they never tried. Follow up.
- `leadsUsed` 50 → they consumed the whole allowance. **Call them now.**
- `leadsUsed` stuck at 5–10 → they hit a thin niche. Offer a better ICP.

---

## HOW-TO 3 — Diagnose "the tool isn't returning leads"

Work in this order; stop when you find it.

1. **Is it returning an error or just few leads?**
   ```bash
   curl -s -X POST https://products.devcabin.tech/api/leads \
     -H 'Content-Type: application/json' \
     -H 'User-Agent: Mozilla/5.0' -H 'Accept: */*' -H 'Accept-Language: en-US,en;q=0.9' \
     -d '{"icp":"HVAC contractors in Milwaukee","batchNum":1,"plan":"client-trial","trialSlug":"demo-50-leads","leadsPerBatch":5}' \
     | python3 -m json.tool | head -40
   ```
   The bot gate rejects requests without browser-like headers — include all three.

2. **Check `provider` in the response.**
   - `google-places` → discovery is healthy
   - `groq` → **Places is down or disabled**, running on LLM fallback. See HOW-TO 4.

3. **Check `quality.screened`.**
   - `noMX` over half the candidates → confirms LLM fallback
   - `noContact` high → Hunter has no coverage for that niche; not a bug
   - `rounds: 4` → thin niche, advise a broader ICP

4. **Check provider quotas.**
   ```bash
   curl -s "https://api.hunter.io/v2/account?api_key=$HUNTER_API_KEY" | python3 -m json.tool | head -25
   curl -s "https://api.zerobounce.net/v2/getcredits?api_key=$ZEROBOUNCE_API_KEY"
   ```

5. **Check the LLM still exists.** Providers retire model IDs without warning.
   ```bash
   node -e "
   const fs=require('fs');
   const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n')
     .filter(l=>l.includes('=')&&!l.startsWith('#'))
     .map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()]}));
   const Groq=require('groq-sdk');
   new Groq({apiKey:env.GROQ_API_KEY}).models.list()
     .then(r=>console.log(r.data.map(m=>m.id).sort().join('\n')));
   "
   ```
   If the ID in `lib/aiModels.js` isn't listed, it was retired. Update it there.

---

## HOW-TO 4 — Enable or repair Google Places

Places is what makes discovery real. Without it you fall back to an LLM naming
companies from memory, ~70% of which don't exist.

1. **Find the project that owns the key.**
   ```bash
   gcloud projects list
   ```
   Currently: `dev-cabin-techno-1712281019191`.

2. **Confirm billing is attached.** Places returns `PERMISSION_DENIED` without
   it even when enabled.
   ```bash
   gcloud billing projects describe dev-cabin-techno-1712281019191
   # want: billingEnabled: true
   ```

3. **Enable the API.**
   ```bash
   gcloud services enable places.googleapis.com --project=dev-cabin-techno-1712281019191
   ```

4. **Verify.**
   ```bash
   gcloud services list --enabled --project=dev-cabin-techno-1712281019191 | grep places
   ```

5. **Confirm end to end** — run HOW-TO 3 step 1 and check `provider` is
   `google-places`.

No Vercel env var is needed if `PAGESPEED_API_KEY` belongs to the same project;
the adapter falls back to it. To use a dedicated key, set `GOOGLE_PLACES_API_KEY`.

---

## HOW-TO 5 — Make quotas durable (Supabase)

Without this, lead caps live in `/tmp` and are wiped on cold starts — a trial
user can exceed 50 by waiting.

1. Create a Supabase project.
2. **SQL Editor** → paste all of `supabase/schema.sql` → Run.
3. **Settings → API** → copy the Project URL and the **service_role** key.
4. Add both to Vercel. Type these into your terminal yourself — never paste
   secrets into a chat:
   ```bash
   npx vercel env add SUPABASE_URL production
   npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
   ```
5. Redeploy, then confirm a trial counter survives: run one batch, wait for a
   cold start, and check `/admin/trials` still shows the usage.

---

## HOW-TO 6 — Change a price

**Never edit a price in more than one file.** They drifted before: the chatbot
quoted $97/$297/$797/$1,997 while Stripe charged $100/$250/$500/$1,000.

1. Edit **only** `lib/plans.js` → `PRODUCTS` → `amountCents` (integer cents).
2. Verify everything downstream picks it up:
   ```bash
   node -e "import('./lib/plans.js').then(m=>console.table(m.LEAD_TIERS))"
   ```
3. `npm test && npm run build`
4. Push.

The pricing page, trial page, chat assistant, agent knowledge table and Stripe
checkout all read from that one file.

---

## HOW-TO 7 — Rotate a leaked key

1. Revoke at the provider first (Hunter, ZeroBounce, Resend, Stripe, Google).
2. Create the replacement.
3. Update every environment:
   ```bash
   for E in production preview development; do
     npx vercel env rm KEY_NAME $E --yes
     npx vercel env add KEY_NAME $E
   done
   ```
4. Update `.env.local`.
5. Redeploy and confirm the new key answers:
   ```bash
   curl -s "https://api.hunter.io/v2/account?api_key=NEW_KEY" | head -5
   ```

---

## HOW-TO 8 — Ship a change safely

```bash
npm test                 # 109 tests must pass
npm run build            # must compile
git add <specific files> # never `git add -A` — there's in-progress work in the tree
git commit -m "..."
git push origin main     # Vercel auto-deploys from main
```

Then verify live:
```bash
npx vercel ls --environment production | head -5
curl -s -o /dev/null -w '%{http_code}\n' https://products.devcabin.tech/pricing
```

**Gotcha:** when grepping rendered HTML for prices, React emits `$<!-- -->100`,
so `grep '\$100'` returns nothing even though the page is correct.

---

## HOW-TO 9 — Onboard a paying customer

1. They subscribe via `/pricing` → Stripe Checkout.
2. `/api/webhook` fires on `checkout.session.completed`, creates a dashboard
   token, emails them the link, and grants the signup bonus.
3. They land on `/dashboard/<token>` — that link is their login.
4. **Pro and above:** they must add their own Hunter.io key under **API Keys**,
   or generation fails with a `byok` error.
5. Confirm they appear:
   ```bash
   curl -s "https://products.devcabin.tech/api/admin/clients?secret=$ADMIN_SECRET" | python3 -m json.tool
   ```
