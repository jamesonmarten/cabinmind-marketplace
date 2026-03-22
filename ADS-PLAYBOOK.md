# CabinMind — Ad Campaign Playbook
**Site:** https://products.devcabin.tech  
**Brand:** CabinMind by Dev Cabin Technologies  
**Primary product:** AI Lead Researcher (from $49/mo)  
**Last updated:** March 2026

---

## 0. Tracking Setup — Do This First

The code is already deployed. You just need to plug in three IDs in Vercel.

### Step 1 — Google Tag Manager
1. Go to https://tagmanager.google.com → New Account
2. Account name: `Dev Cabin Technologies` · Container name: `products.devcabin.tech` · Web
3. Copy your **GTM-XXXXXXX** container ID
4. In Vercel → Settings → Environment Variables → add:
   ```
   NEXT_PUBLIC_GTM_ID = GTM-XXXXXXX
   ```

### Step 2 — GA4 inside GTM
1. In GTM → Tags → New → Google Analytics: GA4 Configuration
2. Go to https://analytics.google.com → Create Property → get **G-XXXXXXXXXX**
3. Paste it as the Measurement ID in the GA4 tag
4. Trigger: All Pages
5. In Vercel env vars add:
   ```
   NEXT_PUBLIC_GA4_ID = G-XXXXXXXXXX
   ```

### Step 3 — Google Ads Conversion in GTM
1. Google Ads → Tools → Measurement → Conversions → New conversion action
2. Type: **Website** · Category: **Purchase** · Value: **Use different values** · Count: **One**
3. Copy **Conversion ID** (`AW-XXXXXXXXX`) and **Conversion label**
4. In GTM → Tags → New → **Google Ads Conversion Tracking**
   - Conversion ID: your AW-XXXXXXXXX
   - Conversion label: your label
   - Conversion value: `{{DLV - value}}` (Data Layer Variable → `value`)
   - Trigger: Custom Event → `purchase`
5. This fires automatically when a customer hits `/checkout/success` ✅

### Step 4 — Meta Pixel
1. Go to https://business.facebook.com → Events Manager → Connect Data Source → Web
2. Create a Pixel → copy the **15-digit Pixel ID**
3. In Vercel env vars add:
   ```
   NEXT_PUBLIC_META_PIXEL = 123456789012345
   ```
4. Meta Pixel fires `PageView` on every page and `Purchase` on checkout success ✅

### Step 5 — Redeploy Vercel
After adding all 3 env vars, go to Vercel → Deployments → Redeploy (or `git commit --allow-empty -m "chore: trigger redeploy" && git push`).

---

## 1. UTM Naming Convention

Always use these UTM params so attribution flows into Stripe metadata:

| Parameter      | Google Ads value         | Meta Ads value           |
|----------------|--------------------------|--------------------------|
| `utm_source`   | `google`                 | `facebook` / `instagram` |
| `utm_medium`   | `cpc`                    | `paid-social`            |
| `utm_campaign` | campaign name (see below)| campaign name            |
| `utm_content`  | ad group or creative ID  | ad set name              |
| `utm_term`     | keyword (Google only)    | —                        |

Example final URL:
```
https://products.devcabin.tech/pricing?utm_source=google&utm_medium=cpc&utm_campaign=lead-researcher-starter&utm_content=headline-a&utm_term=ai+lead+generation+software
```

---

## 2. Google Ads Campaigns

### Campaign 1 — Lead Researcher | Search | Starter ($49)
**Goal:** Purchases · $49–$149 CPA target  
**Match types:** Exact + Phrase (no broad on launch)  
**Bid strategy:** Maximize Conversions (switch to Target CPA after 20 conversions)  
**Daily budget:** $20–$30/day to start  
**Landing page:** `https://products.devcabin.tech/pricing`

#### Ad Group A — AI Lead Generation Software
**Keywords:**
```
[ai lead generation software]
[automated lead research tool]
"ai lead finder"
"ai prospect research"
[b2b lead research tool]
"find b2b leads automatically"
[ai lead generation tool]
```

**Responsive Search Ad 1 — Features angle:**
- Headline 1: `AI Lead Researcher — $49/mo`
- Headline 2: `Find Verified B2B Leads Instantly`
- Headline 3: `Hunter.io + ZeroBounce Verified`
- Headline 4: `ICP Scoring + LinkedIn Profiles`
- Headline 5: `Cold Email Sequences Included`
- Headline 6: `No Manual Research Needed`
- Headline 7: `Try Free — 5 Leads, No Card`
- Headline 8: `HubSpot + Airtable Export`
- Headline 9: `Export to Instantly.ai`
- Headline 10: `100 Leads in Under 60 Seconds`
- Description 1: `Describe your ideal customer — get fully-profiled prospects with verified emails, LinkedIn profiles, ICP scores, and cold email sequences. From $49/mo.`
- Description 2: `Stop wasting hours on manual research. CabinMind finds, scores, and validates your best leads automatically. Try the live demo free — no credit card.`

**Responsive Search Ad 2 — Outcome angle:**
- Headline 1: `Stop Guessing Who to Email`
- Headline 2: `AI Finds Your Best Prospects`
- Headline 3: `Verified Emails — No Bounces`
- Headline 4: `ICP Score Every Lead A–D`
- Headline 5: `4-Step Cold Email Sequences`
- Headline 6: `Export Ready for Instantly.ai`
- Headline 7: `Starter Plan — $49/mo`
- Headline 8: `Live Demo — No Signup`
- Headline 9: `Works in 60 Seconds`
- Headline 10: `Built for B2B Sales Teams`
- Description 1: `AI Lead Researcher discovers prospects that match your ICP, validates their email with ZeroBounce, writes a 4-step cold email sequence — all in one click.`
- Description 2: `100 verified prospects per month on Starter. Upgrade for Hunter.io integration, unlimited generation, and Instantly.ai CSV export. Try free today.`

**Sitelink extensions:**
- `Live Demo` → `https://products.devcabin.tech/demo`
- `Pricing` → `https://products.devcabin.tech/pricing`
- `How It Works` → `https://products.devcabin.tech/agents/lead-researcher`
- `All AI Agents` → `https://products.devcabin.tech/agents`

**Callout extensions:**
- `No Credit Card for Demo`
- `ZeroBounce Email Validation`
- `Export to HubSpot & Airtable`
- `Groq-Powered — Under 60s`
- `Cancel Anytime`

#### Ad Group B — Cold Email Tools
**Keywords:**
```
[cold email lead finder]
"find emails for cold outreach"
[email list builder b2b]
"b2b contact finder tool"
"verified email finder"
[cold outreach automation tool]
```

**Responsive Search Ad:**
- Headline 1: `Build Verified Cold Email Lists`
- Headline 2: `AI Finds + Validates B2B Emails`
- Headline 3: `ZeroBounce — No Spam Traps`
- Headline 4: `Export to Instantly.ai in 1 Click`
- Headline 5: `ICP Scoring on Every Lead`
- Headline 6: `4-Step AI Email Sequences`
- Headline 7: `From $49/mo · Try Free`
- Description 1: `CabinMind builds your cold email list automatically — finds contacts, validates every email with ZeroBounce, scores leads A–D, then writes a 4-step sequence. From $49/mo.`
- Description 2: `Paste your ICP, get 100 verified prospects with emails, LinkedIn links, tech stack, and pain points — ready to import into Instantly.ai. Try the live demo free.`

#### Ad Group C — Competitor targeting (Apollo, ZoomInfo, Lusha)
**Keywords:**
```
"apollo.io alternative"
"zoominfo alternative cheaper"
"lusha alternative"
"linkedin sales navigator alternative"
"hunter.io alternative"
```

**Responsive Search Ad:**
- Headline 1: `Apollo Alternative — $49/mo`
- Headline 2: `AI Lead Research Without ZoomInfo`
- Headline 3: `Cheaper Than Sales Navigator`
- Headline 4: `Verified Emails + AI Sequences`
- Headline 5: `No $1,000/yr Contracts`
- Headline 6: `Try Free — 5 Leads, No Card`
- Description 1: `CabinMind does what Apollo charges $99/mo for — at $49. AI prospect research, ZeroBounce email validation, ICP scoring, and cold email sequence writing. No annual lock-in.`
- Description 2: `Skip the ZoomInfo contract. Get AI-powered lead research with verified emails, LinkedIn profiles, and 4-step cold email sequences written automatically. Cancel anytime.`

---

### Campaign 2 — Lead Researcher | Performance Max
**Goal:** Reach audiences across Search + Display + YouTube + Gmail  
**Budget:** $15/day  
**Asset group:** "Lead Researcher — Cold Outreach"

**Headlines (max 5):**
1. `Find Verified B2B Leads with AI`
2. `Cold Email Lists Built Automatically`
3. `AI Lead Researcher — From $49/mo`
4. `ZeroBounce + Hunter.io Included`
5. `Try Free — No Credit Card`

**Long headlines (max 5):**
1. `Stop spending hours on manual prospect research — let AI do it in 60 seconds`
2. `Get verified emails, LinkedIn profiles, and cold email sequences automatically`
3. `CabinMind AI finds your best prospects, scores them A–D, and writes your outreach`

**Descriptions:**
1. `AI Lead Researcher discovers, validates, and sequences your ideal prospects automatically. ICP scoring, ZeroBounce email validation, Instantly.ai export. From $49/mo. Try free.`
2. `Describe your ideal customer and get 100 verified prospects — with emails, LinkedIn profiles, tech stack signals, and 4-step cold email sequences. No manual research needed.`

**Final URL:** `https://products.devcabin.tech/pricing`  
**Display path:** `products.devcabin.tech/ai-lead-research`

**Audiences to add (signals only — PMax uses them as signals, not hard targeting):**
- In-market: `B2B Software`, `CRM Software`, `Business Services`
- Custom intent: create from keywords `ai lead generation`, `cold email tool`, `b2b prospecting software`
- Customer list: upload your existing customer emails (even just 1 = Jameson's account)

---

### Campaign 3 — Remarketing | Display
**Goal:** Re-engage visitors who didn't convert  
**Budget:** $5/day  
**Audience:** Visited `/pricing` or `/agents/lead-researcher` in last 14 days, did NOT complete checkout  

**Banner ad copy (responsive display):**
- Short headline: `Still looking for better leads?`
- Long headline: `AI Lead Researcher finds verified prospects in 60 seconds — from $49/mo`
- Description: `ZeroBounce validated emails. ICP scoring. Cold email sequences. Try the live demo free.`
- CTA: `Try Free Demo`

---

## 3. Meta / Facebook + Instagram Ads

### Campaign 1 — Lead Researcher | Conversions | Cold Traffic
**Objective:** Conversions → Purchase  
**Pixel event:** Purchase  
**Budget:** $20/day (CBO — let Meta optimise across ad sets)  
**Attribution:** 7-day click, 1-day view

#### Ad Set A — Lookalike: Sales & Marketing professionals (US)
**Audience:**
- Country: United States
- Age: 28–55
- Lookalike source: your customer list (upload Stripe customer emails)
- 1% lookalike

**Ad 1 — Video/Carousel (static image fallback):**
- **Primary text:**
  ```
  How long does your sales team spend finding leads? 
  
  Most teams waste 4–6 hours a week on manual prospect research.
  
  CabinMind does it in 60 seconds.
  
  ✅ Describe your ideal customer
  ✅ Get 100 verified prospects — emails, LinkedIn, tech stack
  ✅ AI writes a 4-step cold email sequence for each lead
  ✅ Export to Instantly.ai in one click
  
  From $49/mo. Try the live demo free — no credit card.
  ```
- **Headline:** `AI Lead Research in 60 Seconds`
- **Description:** `Verified emails. ICP scoring. Cold email sequences. From $49/mo.`
- **CTA button:** `Try It Free`
- **URL:** `https://products.devcabin.tech/demo?utm_source=facebook&utm_medium=paid-social&utm_campaign=lead-researcher-cold&utm_content=lal-sales-ad1`

**Ad 2 — Problem/solution:**
- **Primary text:**
  ```
  Apollo.io is $99/mo.
  ZoomInfo is $1,000+/yr.
  LinkedIn Sales Navigator is $800+/yr.
  
  CabinMind AI Lead Researcher is $49/mo.
  
  And it does more:
  → Writes cold email sequences automatically
  → Validates every email with ZeroBounce
  → Scores each lead A–D against your ICP
  → Exports directly to Instantly.ai
  
  No annual contracts. Cancel anytime.
  ```
- **Headline:** `B2B Lead Research Without the $1,000 Price Tag`
- **Description:** `AI-powered. ZeroBounce verified. From $49/mo.`
- **CTA button:** `See Pricing`
- **URL:** `https://products.devcabin.tech/pricing?utm_source=facebook&utm_medium=paid-social&utm_campaign=lead-researcher-cold&utm_content=lal-sales-ad2`

#### Ad Set B — Interest targeting (no lookalike needed yet)
**Audience:**
- Country: US, UK, Canada, Australia
- Age: 28–55
- Interests: `Sales`, `B2B marketing`, `Cold email`, `HubSpot`, `Salesforce`, `LinkedIn`
- Behaviours: `Small business owners`, `Business decision makers`
- Exclude: `People who visited products.devcabin.tech in the last 30 days`

**Ad 3 — Social proof angle:**
- **Primary text:**
  ```
  "I used to spend half my Monday finding leads. Now I just describe who I want and CabinMind finds 50 verified prospects before my coffee gets cold."
  
  That's what AI Lead Researcher does:
  
  🔎 Finds prospects that match your exact ICP
  📧 Validates every email with ZeroBounce
  📊 Scores each lead A, B, C, or D
  ✉️  Writes a personalised 4-step cold email sequence
  🚀 Exports to Instantly.ai ready to launch
  
  Try the live demo for free — 5 leads, no credit card.
  ```
- **Headline:** `Your AI Prospecting Team — $49/mo`
- **Description:** `Verified leads. AI sequences. Instantly export. Try free.`
- **CTA button:** `Try It Free`
- **URL:** `https://products.devcabin.tech/demo?utm_source=facebook&utm_medium=paid-social&utm_campaign=lead-researcher-cold&utm_content=interest-ad3`

#### Ad Set C — Retargeting (website visitors)
**Audience:**
- Visited `products.devcabin.tech` in last 14 days
- Did NOT trigger Purchase event
- Exclude: existing customers

**Ad 4 — Urgency/reminder:**
- **Primary text:**
  ```
  You checked out CabinMind. Here's what you'd get for $49/mo:
  
  → 100 verified B2B leads every month
  → AI-written cold email sequences for each one
  → ZeroBounce validation (no bounces, no spam traps)
  → Direct LinkedIn profile links
  → Export to Instantly.ai, HubSpot, or Airtable
  
  Still unsure? Try the live demo — 5 real leads, completely free.
  ```
- **Headline:** `Your First 100 Leads Are Waiting`
- **Description:** `5 free leads, no credit card. See what you'd get before you commit.`
- **CTA button:** `Try Free Demo`
- **URL:** `https://products.devcabin.tech/demo?utm_source=facebook&utm_medium=paid-social&utm_campaign=retargeting&utm_content=retarget-14d`

---

### Campaign 2 — Lead Gen Form (Facebook Lead Ads)
**Objective:** Lead Generation (in-app form — lower friction than click-to-website)  
**Budget:** $10/day  
**Goal:** Capture email → trigger Resend welcome sequence → convert to paid

**Ad copy:**
- **Primary text:**
  ```
  Want to see AI Lead Researcher find 5 real prospects for your business?
  
  We'll run a free demo for your exact ICP — no login, no credit card, just results.
  ```
- **Headline:** `Get 5 Free AI-Researched Leads`
- **Description:** `Tell us your ideal customer and we'll show you exactly what CabinMind finds.`
- **CTA:** `Get Free Leads`

**Form questions:**
1. Email (pre-filled by Meta)
2. First name (pre-filled)
3. "Who is your ideal customer?" (short answer — feeds the demo)
4. "How many leads do you need per month?" (dropdown: 10–50 / 50–200 / 200+)

**On form submit:** Use Meta Leads webhook → POST to `/api/leads` (or Zapier: Meta Lead → Resend email with dashboard link)

---

## 4. Instagram-Specific Ads

Run the same Meta campaigns but add Instagram-specific creatives:

**Story Ad (9:16 format):**
- Top text: `❌ Wasting time on manual research?`
- Middle: animated counter `0 → 100 verified leads`
- Bottom: `CabinMind AI Researcher · from $49/mo`
- Swipe-up CTA: `Try Free Demo`

**Reels Ad (15–30 sec script):**
```
[0-3s] Screen recording: typing ICP into CabinMind
[3-8s] Leads appearing one by one with score badges
[8-15s] Clicking a lead — showing email, LinkedIn, pain points
[15-22s] Campaign Builder tab — email sequences generating
[22-28s] Export button → "Downloaded instantly-import.csv"
[28-30s] "From $49/mo · Try free at products.devcabin.tech"
```

---

## 5. Google Ads — Negative Keywords

Add these to ALL campaigns immediately to avoid wasting budget:

```
free
crack
torrent
reddit
github
tutorial
how to
diy
python
script
job
career
hiring
template download
resume
```

---

## 6. Budget Allocation (Launch Month)

| Channel               | Daily Budget | Monthly Est. |
|-----------------------|-------------|--------------|
| Google Search (exact) | $25/day     | ~$750        |
| Google PMax           | $15/day     | ~$450        |
| Meta Cold Traffic     | $20/day     | ~$600        |
| Meta Retargeting      | $10/day     | ~$300        |
| Meta Lead Gen Form    | $10/day     | ~$300        |
| **Total**             | **$80/day** | **~$2,400**  |

**Expected returns at $49 avg order:**
- Break-even: ~49 sales/month from ads (~1.6 conversions/day)
- At 2–3% landing page CVR and $0.50–$2 CPC: achievable within 30 days

---

## 7. Conversion Tracking Verification Checklist

After setting up tracking IDs in Vercel:

- [ ] Visit `products.devcabin.tech` — open Chrome DevTools → Network → filter `gtm.js` — should load ✅
- [ ] Install **Meta Pixel Helper** Chrome extension — visit site — should show `PageView` ✅
- [ ] Install **Tag Assistant** Chrome extension — visit site — should show GTM container ✅
- [ ] Complete a test checkout with Stripe test card `4242 4242 4242 4242` (switch to test keys temporarily)
- [ ] On `/checkout/success` page: GTM preview → confirm `purchase` dataLayer event fires ✅
- [ ] Meta Pixel Helper on `/checkout/success` → confirm `Purchase` event fires ✅
- [ ] Google Ads → Conversions → should show "Recent conversion activity" within 24h ✅
- [ ] Switch back to live Stripe keys before running real ads ✅

---

## 8. Quick-Start Checklist (Do Today)

- [ ] Create Google Tag Manager account → get GTM-XXXXXXX
- [ ] Create GA4 property → get G-XXXXXXXXXX  
- [ ] Create Google Ads account (or use existing) → create Purchase conversion action → get AW-XXXXXXXXX
- [ ] Create Meta Business account → Events Manager → create Pixel → get 15-digit ID
- [ ] Add all 3 IDs to Vercel env vars + redeploy
- [ ] Set up GTM tags (GA4 + Google Ads Conversion) per Step 3 above
- [ ] Create Google Ads campaigns (start with Campaign 1, Ad Group A — exact match keywords only)
- [ ] Create Meta campaign (start with Ad Set B — interest targeting, cheapest to test)
- [ ] Verify conversions fire correctly using Chrome extensions
- [ ] After 50+ clicks: analyse which keywords/audiences convert → pause non-performers
- [ ] After 20 conversions: switch Google Search to Target CPA bidding

---

## 9. Landing Pages

**Primary:** `/pricing` — shows all tiers, pricing, FAQ  
**Demo gate:** `/demo` — live demo with upgrade wall (great for top-of-funnel ads)  
**Agent page:** `/agents/lead-researcher` — features + CTA  

For higher conversion rate, consider a **dedicated landing page** at `/lp/ai-lead-researcher` with:
- Single CTA (no navigation)
- Video demo embed (Loom/screen recording)
- 3 testimonials / case study numbers
- Pricing table (Starter + Pro only)

---

*Generated by GitHub Copilot for Dev Cabin Technologies — CabinMind AI Agent Marketplace*
