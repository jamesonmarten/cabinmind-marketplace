# CabinMind — Local Business Sales Playbook
## Dev Cabin Technologies

Goal: get your first paying local-business customers using CabinMind's own tools
on yourself, then a tailored cold outreach sequence (not the B2B SaaS one in
`CAMPAIGN-PLAYBOOK.md` — local owners respond to very different messaging).

Relevant products for this ICP: **AI Receptionist**, **AI Website Auditor**,
**AI Blog Writer**, **AI Social Media Hub** (see `/local` landing page).
Lead Researcher ($100+/mo) is priced for B2B SaaS teams, not local shops —
don't lead with it here.

---

## 1. Source the target list (use your own product)

Run CabinMind's Lead Researcher on yourself with a **local-services ICP** —
the engine (Groq + Hunter.io + ZeroBounce) isn't limited to B2B SaaS, it just
needs a plain-English ICP description. From `/dashboard` (or `/demo` for a
free 5-lead test), try ICPs like:

```
Owner or office manager at a dentist, med spa, or law firm in [YOUR CITY],
10-50 employees, has a website but posts on Google/Yelp less than monthly
```
```
General contractor or home services business (roofing, HVAC, plumbing) in
[YOUR CITY], website looks 5+ years old, no visible blog or social activity
```

Score signals to prioritize manually (the A–D grade is tuned for B2B SaaS
titles, so treat B/C-grade local leads as normal — don't discard them):
- Has a website but it looks outdated / not mobile-friendly → pitch AI Website Auditor
- No recent Google/Facebook/Instagram posts → pitch AI Social Media Hub
- Reviews mention "never answers the phone" / "hard to reach" → pitch AI Receptionist
- No blog, thin site content → pitch AI Blog Writer

Export the CSV from your dashboard and work it like the sequence below.

**Free ammo for the first pitch:** run `/agents/website-audit` or the audit
API against their real domain before you email — walking in with 2-3 specific,
correct problems on *their* actual site converts far better than a generic pitch.

---

## 2. Cold email sequence — local business owners

Rules: shorter than the SaaS sequence, more casual, always name a *specific*
problem with their business (not their industry in general). Send from a
real person's name, plain text, no images.

### Email 1 — Day 0 (Specific problem, no pitch)
**Subject:** `quick note about {{BUSINESS_NAME}}'s site`

```
Hey {{FIRST_NAME}},

Was looking up {{SERVICE}} options in {{CITY}} and came across {{BUSINESS_NAME}}.
Noticed {{SPECIFIC_ISSUE — e.g. "your site doesn't load great on mobile" /
"I couldn't find a way to book online" / "last Google post was a while back"}}.

Not trying to sell you anything in this email — just flagging it because it's
probably costing you a few calls a month without you knowing.

— {{SENDER_NAME}}
```

### Email 2 — Day 3 (Introduce the fix, cheap framing)
**Subject:** `the fix for that`

```
Hey {{FIRST_NAME}},

Following up — we built a small AI tool that handles this for local
businesses like {{BUSINESS_NAME}}: answers every call/booking 24/7 so you
never lose a lead to a missed call, or (if it's more of a "the site itself"
problem) audits + explains exactly what to fix, in plain English, no jargon.

Starts at $50-80/mo, no contract, cancel anytime. Want me to run a free
report on your site first so you can see exactly what's off?

— {{SENDER_NAME}}
```

### Email 3 — Day 7 (Social proof / low-risk offer)
**Subject:** `free report, no strings`

```
{{FIRST_NAME}} — last note from me.

Happy to just send you the free audit even if you never sign up. Takes 2
minutes, no call needed. Reply "yes" and I'll have it in your inbox today.

— {{SENDER_NAME}}
```

### Email 4 — Day 14 (Breakup + referral seed)
**Subject:** `closing the loop`

```
{{FIRST_NAME}} — I'll stop here. If it's ever useful: {{LINK_TO_/local}}

Also — if you know another local business owner who's always complaining
about missed calls or an outdated site, send them that link. First month's
free for anyone they refer, and you get a free month too.

Good luck with {{BUSINESS_NAME}}.
— {{SENDER_NAME}}
```

---

## 3. Where to actually send from
- Small batches (20-30/day) from a real inbox, not a bulk sender, while your
  domain warms up — local business owners' spam filters are aggressive.
- Follow up by phone/text for anyone who opens 2+ emails but doesn't reply —
  local owners respond far better to a call than a 5th email.
- Track everything with UTM `?utm_source=cold_email&utm_campaign=local_biz`
  on the `/local` link so conversions attribute correctly.

## 4. Perks to close faster (already live on the site)
- 50% off first month on any plan, auto-applied at checkout — no code needed.
- Referral link (`/pricing?ref=cus_xxx`, shown on the checkout success page)
  gives the new business a free first month and credits the referrer a free
  month automatically.
