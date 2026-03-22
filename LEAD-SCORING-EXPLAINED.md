# CabinMind AI Lead Researcher — How We Score Leads

_A plain-English guide for clients and team members._

---

## What is a Lead Score?

Every lead the AI generates gets a **score from 40–99** and a letter grade (**A, B, C, or D**).  
The score is **deterministic** — the same inputs always produce the same score. There is no randomness.  
Below each lead in the dashboard you can expand **"Score Signals"** to see the exact reasons.

---

## The Four Grade Buckets

| Grade | Score Range | Label | What it means |
|-------|:-----------:|-------|---------------|
| **A** | 90–99 | 🔥 Hot | Senior decision-maker, verified email, direct LinkedIn, ICP match. Prioritise immediately. |
| **B** | 75–89 | 🌊 Warm | Good title and verified email but missing one or two signals. Strong follow-up candidate. |
| **C** | 60–74 | 🧊 Cool | Mid-level title or unverified email. Worth nurturing; lower reply probability. |
| **D** | 40–59 | ❄️ Cold | Junior title, no email found, or catch-all domain. Use for awareness only. |

---

## How the Score is Built — Signal by Signal

Every lead starts at **40 points**. Points are added or deducted based on the signals below.

### 1. Job Title Tier (up to +20 pts)

The AI reads the contact's job title and classifies it into one of three tiers.

| Title tier | Points | Example titles |
|------------|:------:|----------------|
| C-suite / Founder | **+20** | CEO, CTO, COO, CFO, Founder, Owner, President, Managing Director |
| VP / Director | **+14** | VP of Sales, Director of Marketing, Head of Growth, Partner |
| Manager / Senior | **+8** | Sales Manager, Senior Developer, Lead Designer, Principal Engineer |
| No recognisable seniority | **+0** | Coordinator, Analyst, Associate, Intern |

> **Why title matters:** Decision-makers control budget. A VP of Sales can approve a $50K contract; a sales coordinator cannot.

---

### 2. ICP Keyword Match in Title (up to +10 pts)

When you describe your Ideal Customer Profile (ICP) — e.g. _"B2B SaaS companies selling to HR teams"_ — the AI extracts the key words (**saas, sales, hr**, etc.) and checks whether any appear in the contact's title.

- Each matching keyword adds **+4 points**, capped at **+10 total**.

> **Example:** ICP = _"growth marketing agencies"_. Contact title = _"Head of Growth"_.  
> Match: "growth" → **+4 points**.

---

### 3. Email Verification Tier (−10 to +15 pts)

This is the most important signal. We run every email through up to **6 validation layers**:

| Result | Points | What happened |
|--------|:------:|---------------|
| ZeroBounce confirmed `valid` | **+15** | Best possible — not a spam trap, not a bounce, not disposable |
| Hunter confirmed `valid` (ZeroBounce unavailable) | **+12** | Hunter's own verifier confirmed deliverability |
| Hunter found the email (unverified) | **+8** | Email exists in Hunter's database but not fully verified |
| Pattern-guessed email | **+6** | We constructed `firstname.lastname@company.com` — may or may not exist |
| No email found at all | **−10** | Nothing could be found; lead is much harder to reach |

> **The 6 validation layers (in order):**
> 1. Format check — is it a real email address shape?
> 2. Role-address filter — we reject `info@`, `admin@`, `support@`, `hello@`, and 25 other catch-alls that never reach a real person
> 3. MX record check — does the company's domain even accept email?
> 4. Hunter confidence floor — we require ≥ 50% Hunter confidence to proceed
> 5. Hunter status check — we reject emails Hunter has marked `invalid`
> 6. ZeroBounce validation (primary) / Hunter verifier (fallback) — deep deliverability check

---

### 4. Catch-All Domain Penalty (−5 pts)

Some company mail servers accept **any** email sent to them — even made-up addresses — to avoid bounces.  
ZeroBounce detects these and flags them as `catch-all`.  
We still include the lead but deduct 5 points because we cannot confirm the specific address is monitored.

---

### 5. Direct LinkedIn Profile (+8 pts)

Hunter.io sometimes returns a verified `/in/username` LinkedIn URL for a contact.  
A direct profile URL means:
- We confirmed this is a real person with a public profile
- You can send a connection request or InMail as a secondary channel
- The identity has been cross-referenced

If no direct `/in/` URL is found, we fall back to a LinkedIn People Search link (no bonus).

---

### 6. Company Size Sweet Spot (+6 pts)

Companies with **51–500 employees** tend to have the best combination of:
- Enough budget to be a real customer
- Small enough that one decision-maker can approve a purchase

We add +6 for companies in the 51–500 range. Very small (<10) or very large (1000+) companies get no bonus.

---

### 7. Hunter Confidence Bonus (+5 pts)

Hunter assigns a **confidence score (0–100%)** to every email it finds, based on how many matching patterns it has seen for that domain. If Hunter's confidence is ≥ 90%, we add +5 bonus points.

---

## Score Ceiling & Floor

- **Floor: 40** — no lead scores below 40, even if multiple signals are negative
- **Ceiling: 99** — no lead scores 100; there's always some uncertainty
- Scores are always **whole numbers**

---

## Full Scoring Example

> **Lead:** Sarah Chen, VP of Marketing, Acme SaaS Co (200 employees)  
> **ICP:** "B2B SaaS marketing teams"  
> **Email:** `sarah.chen@acmesaas.com` — ZeroBounce verified valid  
> **LinkedIn:** `linkedin.com/in/sarahchen` (direct)  
> **Hunter confidence:** 92%

| Signal | Points |
|--------|:------:|
| Starting score | 40 |
| VP title | +14 |
| "marketing" matches ICP keyword | +4 |
| ZeroBounce verified email | +15 |
| Direct LinkedIn profile | +8 |
| Company size 51–500 | +6 |
| Hunter confidence ≥ 90% | +5 |
| **Total** | **92** |

**Result: Grade A (Hot) — 92/99**

---

## What Gets a Lead Rejected Entirely?

Some leads never make it into your results at all because they fail the email validation gate:

| Rejection reason | Why |
|-----------------|-----|
| `role-address` | Email is `info@`, `hello@`, `admin@`, etc. — not a real person's inbox |
| `no-mx` | The company's domain doesn't accept any email |
| `low-confidence` | Hunter is less than 50% sure the email is real |
| `hunter-invalid` | Hunter has verified this email doesn't exist |
| `zb-spamtrap` | ZeroBounce identified the address as a spam trap |
| `zb-abuse` | Address flagged for abuse complaints |
| `zb-do_not_mail` | Address is on a suppression list |

These leads are silently dropped. You only see leads that passed all applicable layers.

---

## Frequently Asked Questions

**Q: Can I see why a specific lead scored as it did?**  
A: Yes. Click any lead in your dashboard to expand it. The **Score Signals** section lists every point addition and deduction with the exact reason.

**Q: Why does the same person sometimes appear with a different score in a second batch?**  
A: Scores are deterministic based on the data returned by Hunter and ZeroBounce at query time. If Hunter updates its confidence for that email (which happens as their database grows), the score will reflect that.

**Q: What does "catch-all" mean for my outreach?**  
A: The email will likely not hard-bounce, but there's no guarantee the specific inbox is monitored. We still include catch-all leads but recommend prioritising `valid` (non-catch-all) leads first.

**Q: Why is the floor 40 and not 0?**  
A: A lead in your results has already passed our validation gate — it's a real company, real domain, and at least a plausible contact. Starting at 40 reflects that baseline quality. A score of 0 would imply we know nothing; we always know at least something by the time a lead appears.

**Q: Do A-grade leads always convert better?**  
A: In practice, yes — higher scores correlate with higher reply rates because the email is deliverable, the title is senior, and the ICP match is strong. But outreach quality and timing matter too. Use the grade as a prioritisation tool, not a guarantee.

---

_Last updated: March 2026 — Dev Cabin Technologies / CabinMind_
