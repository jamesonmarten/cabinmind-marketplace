# CabinMind Cold Email Campaign Playbook
## Dev Cabin Technologies — March 2026

---

## 🎯 Campaign 1: Demo Visitors (Warmest Audience)

**ICP:** People who hit `/demo` at products.devcabin.tech and submitted their email + ICP.

**Why they're the best leads:**
- Already know what CabinMind does
- Described their own target customer (use it back in the email)
- Low friction — they came to you, you didn't chase them

**Goal:** Get them from free demo → Starter $97/mo

---

## 📧 4-Step Email Sequence

### Sequence rules (non-negotiable)
- Plain text only — no HTML, no images, no logos in body
- Under 150 words emails 1, 3, 4 — under 180 words email 2
- Subject lines under 8 words, no punctuation, no emojis
- Send name: Jameson (from trycabinmind.com once warmed)
- Reply-to: jameson@devcabin.tech
- Send Mon–Thu only, 8–11am recipient local time
- Wait at least 3 days between each step

---

### Email 1 — Day 0 (Cold Intro)
**Subject:** `leads for {{COMPANY}}`

```
Hey {{FIRST_NAME}},

You searched for leads on CabinMind a little while back — targeting {{ICP_SUMMARY}}.

Quick question: did the 5 demo leads match what you were looking for, or was the ICP off?

I ask because we've been tweaking the scoring engine and I want to know if it's actually useful to people like you.

— Jameson
Dev Cabin Technologies
```

*If no ICP was captured, use this fallback:*

**Subject:** `quick question about your search`

```
Hey {{FIRST_NAME}},

You checked out the CabinMind lead demo recently — just wanted to see if it was useful.

Are you currently doing lead research manually, or using a tool? Either way, happy to run a custom search for your exact ICP at no cost.

— Jameson
```

---

### Email 2 — Day 4 (Value Add)
**Subject:** `what the A leads actually mean`

```
Hey {{FIRST_NAME}},

In case it wasn't obvious from the demo — every lead gets a letter grade (A–D) based on 8 signals:

Title seniority, ICP keyword match, ZeroBounce validation, Hunter confidence, direct LinkedIn URL, company size fit, catch-all domain flag, and email source tier.

An A lead means: right person, right company, email is confirmed deliverable, LinkedIn verified. You contact them first.

Most tools give you a list. CabinMind tells you which 20% of that list will actually convert.

Worth a quick look? products.devcabin.tech/demo

— Jameson
```

---

### Email 3 — Day 8 (Social Proof / Stakes)
**Subject:** `what $200/mo in tools was doing`

```
Hey {{FIRST_NAME}},

Most sales teams I talk to are paying for Apollo, Hunter, and ZeroBounce separately — plus someone's time to stitch it all together and write sequences manually.

That's $130–$200/mo in tools plus 5–10 hours of work per campaign.

CabinMind Starter is $97/mo and does all of it: finds companies, gets decision-maker emails, validates them with ZeroBounce, scores every lead A–D, and writes a 4-step cold email sequence for each person.

You run one search. You get a campaign.

If that's interesting, the demo is free and takes 90 seconds: products.devcabin.tech/demo

— Jameson
```

---

### Email 4 — Day 14 (Break-up)
**Subject:** `closing the loop`

```
Hey {{FIRST_NAME}},

Last email from me — I don't want to clutter your inbox.

If you ever want to test CabinMind against your current lead process, the free demo is always live at products.devcabin.tech/demo. No signup, no card, results in 90 seconds.

If the timing's off, no worries — I'll leave you to it.

— Jameson
```

---

## ⚙️ Instantly.ai Setup

### Step 1 — Domain + mailboxes
1. Register `trycabinmind.com` (Namecheap, ~$12/yr)
2. Add 2–3 Google Workspace mailboxes:
   - `jameson@trycabinmind.com`
   - `hello@trycabinmind.com`
   - `team@trycabinmind.com`
3. Add domain to Instantly → DNS wizard sets SPF/DKIM/DMARC for you

### Step 2 — Warmup (2 weeks minimum)
- Enable warmup in Instantly for all 3 mailboxes
- Set warmup volume: 40 emails/day per mailbox
- Wait 14 days before any real sends
- Check Instantly's deliverability score — must be >90 before launching

### Step 3 — Campaign structure in Instantly
```
Campaign name: CM-Demo-Visitors-2026-Q1
Sending accounts: jameson@, hello@, team@ (rotate evenly)
Daily send cap: 30/day per mailbox (90/day total)
Send days: Mon–Thu
Send hours: 8am–11am (recipient timezone)
Tracking: Reply tracking ON, click tracking OFF (click tracking URLs trigger spam filters)
```

### Step 4 — Import CSV
Use the CabinMind Campaign Builder → Export tab → "Download Instantly CSV"
Columns: First Name, Last Name, Email, Company, Website, Title, ICP Score, Personalization

Custom variables to map:
- `{{FIRST_NAME}}` → First Name column
- `{{COMPANY}}` → Company column
- `{{ICP_SUMMARY}}` → Personalization column (auto-built from CabinMind signals)

---

## 📊 Expected Results (conservative)

| Metric | Estimate |
|--------|----------|
| Open rate | 45–65% (demo visitors are warm) |
| Reply rate | 8–15% |
| Positive reply rate | 3–6% |
| Demo → trial conversion | 30–40% of positive replies |
| Trial → paid | 20–30% |

**At 100 demo email captures/month:**
- ~10–15 positive replies
- ~4–6 trial starts
- ~1–2 new paying customers/month = $97–$494 MRR/month from email alone

---

## 🚀 Campaign 2: Cold ICP Outreach (Second Campaign)

**Run once domain is warmed (Week 3+)**

**ICP for Campaign 2:**
```
Agency owners, 5–30 employees, digital marketing agencies serving SMBs,
looking to productise services, United States, using tools like
ActiveCampaign, Mailchimp, HubSpot, or doing outreach manually.
```

**Why agency owners:**
- Immediately understand lead research pain (they do it for clients)
- Agency plan ($997/mo) has highest LTV
- Can resell CabinMind to their own clients → viral acquisition
- Easy to find on LinkedIn + Hunter

**Subject:** `lead research for your clients`

**Email 1 body:**
```
Hey {{FIRST_NAME}},

Do you do lead research for your agency clients, or do they handle prospecting themselves?

I ask because we built something that might be worth knowing about — CabinMind finds verified B2B leads, scores them A–D, and writes personalised cold email sequences. Agencies use it to deliver prospecting as a service without hiring researchers.

It exports directly to Instantly.ai. Would that be useful at {{COMPANY}}?

— Jameson
```

---

## 📋 Tracking

| UTM | Value |
|-----|-------|
| `utm_source` | `instantly` |
| `utm_medium` | `cold-email` |
| `utm_campaign` | `demo-visitors` or `agency-icp` |
| `utm_content` | `email-1`, `email-2`, `email-3`, `email-4` |

Add UTMs to every link in the sequence. GA4 is already wired to `G-V2TT0W7L2G`.

---

## ✅ Pre-launch Checklist

```
[ ] trycabinmind.com registered
[ ] Google Workspace mailboxes created (3x)
[ ] Domain added to Instantly.ai
[ ] SPF / DKIM / DMARC DNS records set
[ ] Warmup enabled — 40/day per mailbox
[ ] Wait 14 days
[ ] Deliverability score >90 in Instantly
[ ] Demo email captures flowing (demo-capture API now live)
[ ] First CSV exported from CabinMind demo leads
[ ] Sequence copy pasted into Instantly (4 steps)
[ ] UTM links added to all CTA links
[ ] Launch at 30/day per mailbox
[ ] Check reply inbox daily (replies go to jameson@devcabin.tech)
```

---

## 🔑 Pending From Previous Sessions
- Hunter.io upgrade: free 25/mo exhausted → Starter $49/mo at hunter.io/pricing
- ZeroBounce credits: monitor balance as volume grows
- STRIPE_PRICE_* env vars: add to Vercel for exact plan mapping in admin dashboard
