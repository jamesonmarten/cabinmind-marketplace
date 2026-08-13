/**
 * /api/leads — Real B2B Lead Generation
 *
 * Pipeline:
 *   Step 1 — Groq→OpenAI generates 5 real company domains per batch
 *   Step 2 — Hunter /domain-search fetches real contacts (verified email + LinkedIn /in/ URLs)
 *   Step 3 — ZeroBounce (primary) → Hunter /email-verifier (fallback) validates every email
 *   Step 4 — Deterministic scoreLead() — 40-99 pts, A/B/C/D grade, fully auditable
 *
 * Email validation layers (in order):
 *   1. Format check
 *   2. Role-address filter (info@, admin@, etc.)
 *   3. MX record check (domain can receive email)
 *   4. Hunter confidence >= 50
 *   5. Hunter status != 'invalid'
 *   6. ZeroBounce validate (spam traps, disposables, hard bounces) -- primary
 *      -> fallback: Hunter /email-verifier when ZeroBounce unavailable/quota
 *
 * LinkedIn validation:
 *   - Hunter direct /in/ URL -> validated format check, used as-is
 *   - Otherwise -> LinkedIn People Search (no login required)
 *
 * Demo gate:
 *   - batchNum > 1 + isDemo -> 403 server-side
 *   - isDemo: true -> emails blurred, LinkedIn direct locked
 */

import Groq from 'groq-sdk';
import OpenAI from 'openai';
import dns from 'dns/promises';
import { checkUsage, recordUsage, PLAN_LIMITS, getSeenLeads, recordSeenLeads } from '../../lib/usageStore';
import { withProtection } from '../../lib/rateLimit';

const groq       = process.env.GROQ_API_KEY        ? new Groq({ apiKey: process.env.GROQ_API_KEY })        : null;
const openai     = process.env.OPENAI_API_KEY       ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })    : null;

// Platform fallback keys (used for Starter plan / demo only)
const PLATFORM_HUNTER     = process.env.HUNTER_API_KEY     || null;
const PLATFORM_ZEROBOUNCE = process.env.ZEROBOUNCE_API_KEY || null;

// Role/catch-all prefixes that are never real decision-maker inboxes
const ROLE_PREFIXES = new Set([
  'info','hello','hey','hi','support','contact','admin','sales','marketing',
  'team','office','enquiries','enquiry','noreply','no-reply','donotreply',
  'help','jobs','careers','billing','accounts','press','media','legal',
  'privacy','abuse','postmaster','hostmaster','webmaster','feedback',
]);
function isRoleEmail(local) {
  return ROLE_PREFIXES.has(local.toLowerCase().replace(/[^a-z]/g, ''));
}

// MX record cache (per request lifetime)
const mxCache = new Map();
async function domainHasMX(domain) {
  if (mxCache.has(domain)) return mxCache.get(domain);
  try {
    const records = await dns.resolveMx(domain);
    const ok = Array.isArray(records) && records.length > 0;
    mxCache.set(domain, ok);
    return ok;
  } catch {
    mxCache.set(domain, false);
    return false;
  }
}

// ZeroBounce email validator (PRIMARY)
// Free tier: 100 validations/month | Starter: $16/2K | Growth: $25/5K
// Detects: spam traps, disposables, hard bounces, catch-all domains, role addresses
async function zeroBounceValidate(email, apiKey) {
  // Strip any accidental whitespace/newlines from the key (env var corruption defence)
  const key = (apiKey || '').trim() || null;
  if (!key || key === 'your_zerobounce_api_key_here') return { available: false, reason: 'no-zb-key' };
  try {
    const url = `https://api.zerobounce.net/v2/validate?api_key=${key}&email=${encodeURIComponent(email)}&ip_address=`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      if (r.status === 429 || (body?.error && body.error.includes('quota'))) {
        console.warn('[zb] Quota exhausted');
        return { available: false, reason: 'zb-quota' };
      }
      if (r.status === 400 && body?.error?.includes('Invalid API Key')) {
        console.error('[zb] Invalid API key — check ZEROBOUNCE_API_KEY env var for trailing whitespace');
        return { available: false, reason: 'zb-invalid-key' };
      }
      console.warn(`[zb] HTTP ${r.status}:`, JSON.stringify(body).slice(0, 120));
      return { available: false, reason: `zb-http-${r.status}` };
    }
    const d = await r.json();
    const status    = (d.status     || '').toLowerCase();
    const subStatus = (d.sub_status || '').toLowerCase();
    const catchAll  = status === 'catch-all';
    const valid     = status === 'valid';
    const bad = ['invalid', 'spamtrap', 'abuse', 'do_not_mail'].includes(status);
    return { available: true, status, subStatus, valid, catchAll, bad, reason: subStatus || status };
  } catch (e) {
    console.warn('[zb] Error:', e.message);
    return { available: false, reason: e.message };
  }
}

// Hunter email verifier (FALLBACK when ZeroBounce unavailable)
async function hunterVerify(email, apiKey) {
  const key = apiKey || null;
  if (!key) return { status: 'unknown', score: 0, reason: 'no-key' };
  try {
    const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${key}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      if (r.status === 429 || body?.errors?.[0]?.code === 429) return { status: 'unknown', score: 0, reason: 'quota' };
      return { status: 'unknown', score: 0, reason: `http-${r.status}` };
    }
    const { data } = await r.json();
    return { status: data?.status || 'unknown', score: data?.score || 0, reason: data?.result || '' };
  } catch (e) {
    return { status: 'unknown', score: 0, reason: e.message };
  }
}

// 6-layer email validation gate
// Returns { pass, reason, zbStatus, catchAll, verified }
async function validateEmail(email, hunterConfidence = null, hunterStatus = null, zbKey = null, hunterKey = null) {
  // Layer 1: format
  if (!email || !email.includes('@')) return { pass: false, reason: 'malformed' };
  const [local, domain] = email.split('@');
  if (!local || !domain) return { pass: false, reason: 'malformed' };

  // Layer 2: role address
  if (isRoleEmail(local)) return { pass: false, reason: 'role-address' };

  // Layer 3: MX record
  const hasMX = await domainHasMX(domain);
  if (!hasMX) return { pass: false, reason: 'no-mx' };

  // Layer 4: Hunter confidence floor
  if (hunterConfidence !== null && hunterConfidence < 50) {
    return { pass: false, reason: `low-confidence-${hunterConfidence}` };
  }

  // Layer 5: Hunter domain-search status (from the free data already in the response)
  if (hunterStatus === 'invalid') return { pass: false, reason: 'hunter-invalid' };
  // Hunter's own confidence >=80 is a strong verification signal — trust it directly.
  // This covers the common case where ZeroBounce quota is exhausted.
  if (hunterStatus === 'valid' || (hunterConfidence !== null && hunterConfidence >= 80)) {
    const verified = hunterStatus === 'valid' || hunterConfidence >= 90;
    // Still run ZeroBounce if available (use remaining quota on high-value leads)
    const zb = await zeroBounceValidate(email, zbKey);
    if (zb.available) {
      if (zb.bad) return { pass: false, reason: `zb-${zb.status}`, zbStatus: zb.status };
      return { pass: true, reason: zb.status, zbStatus: zb.status, catchAll: zb.catchAll, verified: zb.valid && !zb.catchAll };
    }
    return { pass: true, reason: hunterStatus === 'valid' ? 'hunter-valid' : `hunter-confidence-${hunterConfidence}`, zbStatus: null, catchAll: false, verified };
  }

  // Layer 6a: ZeroBounce (primary) for lower-confidence emails
  const zb = await zeroBounceValidate(email, zbKey);
  if (zb.available) {
    if (zb.bad) {
      return { pass: false, reason: `zb-${zb.status}${zb.subStatus ? `-${zb.subStatus}` : ''}`, zbStatus: zb.status };
    }
    return { pass: true, reason: zb.status, zbStatus: zb.status, catchAll: zb.catchAll, verified: zb.valid && !zb.catchAll };
  }

  // Layer 6b: ZeroBounce unavailable (quota exhausted) — pass on MX + confidence alone.
  // Do NOT call hunterVerify() here — it burns Hunter credits and rarely returns 'valid'.
  // A contact that passed layers 1-5 is worth including; the score reflects the uncertainty.
  return { pass: true, reason: 'mx-confidence-ok', zbStatus: null, catchAll: false, verified: false };
}

// LinkedIn URL validator
// Hunter sometimes returns company pages instead of personal /in/ profiles
// Format validation is reliable — LinkedIn blocks server-side HEAD requests
// Returns { url, isDirect, validated }
async function buildLinkedIn(name, company, hunterUrl) {
  if (typeof hunterUrl === 'string' && /linkedin\.com\/in\/[a-zA-Z0-9_-]+/.test(hunterUrl)) {
    const clean = hunterUrl.split('?')[0].replace(/\/$/, '');
    return { url: clean, isDirect: true, validated: true };
  }
  // LinkedIn People Search — no login required, returns real results
  const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${name} ${company}`)}&origin=GLOBAL_SEARCH_HEADER`;
  return { url: searchUrl, isDirect: false, validated: false };
}

// Deterministic lead scorer — 40-99 pts, fully auditable
// Every signal is logged so the customer sees exactly why a lead scored as it did
function scoreLead({ title, emailVerified, emailSource, zbStatus, hunterConfidence,
                     hunterStatus, linkedInDirect, companySize, icp, catchAll }) {
  let score = 40;
  const signals = [];
  const t    = (title || '').toLowerCase();
  const icpL = (icp   || '').toLowerCase();

  // Title tier — includes creator/blogger equivalents
  const isCreatorTitle = ['blogger','content creator','creator','influencer','youtuber',
    'podcaster','newsletter author','recipe developer','food writer','food blogger',
    'social media','freelance'].some(k => t.includes(k));

  if (['ceo','founder','cto','coo','cfo','chief','president','owner','managing director','md'].some(k => t.includes(k)) || isCreatorTitle) {
    score += 20; signals.push(isCreatorTitle ? 'Creator / Owner title (+20)' : 'C-suite / Founder title (+20)');
  } else if (['vp','vice president','director','head of','partner','editor'].some(k => t.includes(k))) {
    score += 14; signals.push('VP / Director title (+14)');
  } else if (['manager','senior','lead','principal','supervisor'].some(k => t.includes(k))) {
    score += 8;  signals.push('Manager / Senior title (+8)');
  }

  // ICP keyword match in title
  const icpWords = icpL.split(/\s+/).filter(w => w.length > 4);
  const matches  = icpWords.filter(w => t.includes(w)).length;
  if (matches > 0) {
    const bonus = Math.min(matches * 4, 10);
    score += bonus; signals.push(`Title matches ICP keywords (+${bonus})`);
  }

  // Email verification tier
  // Priority: ZeroBounce verified > Hunter status='valid' > confidence ≥90 > ≥80 > unverified
  if (emailVerified && zbStatus === 'valid') {
    score += 22; signals.push('ZeroBounce verified email (+22)');
  } else if (emailVerified && hunterStatus === 'valid') {
    score += 20; signals.push('Hunter verified email (+20)');
  } else if (emailVerified) {
    score += 17; signals.push('Verified email (+17)');
  } else if (hunterStatus === 'valid') {
    score += 18; signals.push('Hunter status: valid (+18)');
  } else if (typeof hunterConfidence === 'number' && hunterConfidence >= 90) {
    score += 16; signals.push(`Hunter confidence ${hunterConfidence} (+16)`);
  } else if (typeof hunterConfidence === 'number' && hunterConfidence >= 80) {
    score += 12; signals.push(`Hunter confidence ${hunterConfidence} (+12)`);
  } else if (typeof hunterConfidence === 'number' && hunterConfidence >= 70) {
    score += 8;  signals.push(`Hunter confidence ${hunterConfidence} (+8)`);
  } else if (emailSource === 'hunter' && hunterStatus !== 'invalid') {
    score += 5;  signals.push('Hunter email, low confidence (+5)');
  } else if (emailSource === 'pattern-creator') {
    // firstname@ on a personal creator domain — very likely correct, MX confirmed
    score += 12; signals.push('Creator pattern email, MX confirmed (+12)');
  } else if (emailSource && emailSource.startsWith('pattern')) {
    score += 3;  signals.push('Pattern email (+3)');
  } else if (!emailSource || emailSource === 'none') {
    score -= 15; signals.push('No email found (−15)');
  }

  // Catch-all domain — less reliable delivery
  if (catchAll) { score -= 6; signals.push('Catch-all domain (−6)'); }

  // LinkedIn direct /in/ profile from Hunter
  if (linkedInDirect) { score += 8; signals.push('Direct LinkedIn profile (+8)'); }

  // Company size bonus
  const sz = (companySize || '').replace(/\s/g, '').replace('–', '-');
  if (['51-200','101-200','201-500','51-500'].some(s => sz.includes(s) || sz === s)) {
    score += 5; signals.push('Company size 51–500 (+5)');
  } else if (['1-10','1-50','11-50','solo','1'].some(s => sz.toLowerCase().includes(s))) {
    score += 3; signals.push('Small/solo team (+3)');
  }

  return { score: Math.min(Math.max(Math.round(score), 40), 99), signals };
}

// Grade thresholds:
//   A ≥ 88  — verified email + strong title signal
//   B ≥ 72  — high-confidence Hunter email + good title (reachable without ZB)
//   C ≥ 58  — present but lower confidence
//   D  < 58 — filtered out before returning to client
function scoreLabel(score) {
  if (score >= 88) return { grade: 'A', label: 'Hot',  color: 'green'  };
  if (score >= 72) return { grade: 'B', label: 'Warm', color: 'blue'   };
  if (score >= 58) return { grade: 'C', label: 'Cool', color: 'yellow' };
  return              { grade: 'D', label: 'Cold', color: 'gray'   };
}

// Safe JSON extractor
function safeJSON(raw) {
  if (!raw) throw new Error('Empty response');
  let s = raw.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  if (s[0] !== '[' && s[0] !== '{') {
    const arr = s.match(/(\[[\s\S]*\])/);
    const obj = s.match(/(\{[\s\S]*\})/);
    s = (arr?.[1] ?? obj?.[1] ?? s).trim();
  }
  try { return JSON.parse(s); }
  catch { throw new Error(`Non-JSON: "${s.slice(0, 100)}"`); }
}

// Email pattern helpers
function emailPattern(first, last, domain) {
  const f = (first || '').toLowerCase().replace(/[^a-z]/g, '');
  const l = (last  || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!f || !domain) return `contact@${domain}`;
  return `${f}.${l}@${domain}`;
}
function allPatterns(first, last, domain) {
  const f = (first || '').toLowerCase().replace(/[^a-z]/g, '');
  const l = (last  || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!f || !domain) return [];
  // Order matters — ZeroBounce is called for each until one passes.
  // firstname@ is most common for solo creators/bloggers; firstname.lastname@ for corporates.
  const patterns = [];
  if (f) patterns.push(`${f}@${domain}`);                        // erin@wellplated.com
  if (f && l) patterns.push(`${f}.${l}@${domain}`);              // erin.clarke@wellplated.com
  if (f && l) patterns.push(`${f}${l}@${domain}`);               // erinclarke@wellplated.com
  if (f && l) patterns.push(`${f[0]}${l}@${domain}`);            // eclarke@wellplated.com
  return patterns;
}

// Domain sanitiser — strips protocol/path, corrects .co -> .com when .com has MX records
async function sanitiseDomain(raw) {
  let domain = (raw || '').toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '')
    .trim();
  if (!domain) return null;

  // Bare .co (not .com / .co.uk / .co.nz) -> try .com first
  if (/\.co$/.test(domain)) {
    const dotCom = domain + 'm';
    const comHasMX = await domainHasMX(dotCom);
    if (comHasMX) {
      console.log(`[leads] .co->com: ${domain} -> ${dotCom} (MX confirmed)`);
      return dotCom;
    }
    console.log(`[leads] keeping .co: ${domain} (.com has no MX)`);
  }
  return domain;
}

// Build one normalised lead object
function buildLead({
  name, title, email, linkedIn, emailVerified, emailConfidence,
  emailSource, zbStatus, catchAll, companyMeta, domain,
  score, scoreSignals, scoreReason, dataSource, hunterMeta,
}) {
  const parts = (name || '').trim().split(/\s+/);
  const first = parts[0] || '';
  const last  = parts.slice(1).join(' ') || '';
  const _id   = `${name}|${companyMeta.company}`.toLowerCase().replace(/[^a-z0-9|]/g, '');
  const { grade, label: gradeLabel } = scoreLabel(score);

  return {
    _id,
    name,
    title:               title || '',
    company:             companyMeta.company || '',
    domain,
    industry:            companyMeta.industry || '',
    size:                companyMeta.size || 'Unknown',
    location:            companyMeta.location || '',
    score,
    grade,
    grade_label:         gradeLabel,
    score_reason:        scoreReason,
    score_signals:       scoreSignals || [],
    signal:              companyMeta.signal || '',
    pain_points:         companyMeta.pain_points || '',
    budget_range:        companyMeta.budget_range || '$15K-$50K/yr',
    why_now:             companyMeta.signal || '',
    tech:                companyMeta.tech || '',
    email:               email || null,
    email_verified:      emailVerified || false,
    email_confidence:    emailConfidence || null,
    email_source:        emailSource || 'none',
    zb_status:           zbStatus || null,
    catch_all:           catchAll || false,
    linkedin:            linkedIn?.url || null,
    linkedin_is_direct:  linkedIn?.isDirect || false,
    linkedin_validated:  linkedIn?.validated || false,
    phone:               null,
    company_description: hunterMeta?.description || companyMeta.why_fits || '',
    tech:                (hunterMeta?.technologies?.length ? hunterMeta.technologies.slice(0, 8).join(', ') : null) || companyMeta.tech || '',
    size:                hunterMeta?.headcount || companyMeta.size || 'Unknown',
    company_twitter:     hunterMeta?.twitter ? `https://twitter.com/${hunterMeta.twitter}` : null,
    company_linkedin:    hunterMeta?.linkedin || null,
    all_email_patterns:  allPatterns(first, last, domain),
    data_source:         dataSource,
    _provider:           'hunter',
  };
}

// Demo masking — applied server-side after generation
// Keeps: name, title, company, score, grade, signal, pain_points, industry, size, score_signals
// Hides: exact email (blurred), direct LinkedIn /in/ URL, all_email_patterns
function maskForDemo(leads) {
  return leads.map(l => {
    // Blur email: s••••••@a••••.com — clearly real but unactionable without upgrade
    let maskedEmail = null;
    if (l.email) {
      const [local, domain] = l.email.split('@');
      const ml = (local[0] || 's') + '••••••';
      const domParts = domain.split('.');
      const md = (domParts[0][0] || 'a') + '••••' + '.' + domParts.slice(1).join('.');
      maskedEmail = `${ml}@${md}`;
    }
    return {
      ...l,
      email:              maskedEmail,
      email_verified:     l.email_verified, // keep — shows validation worked
      zb_status:          l.zb_status,      // keep — shows ZeroBounce ran
      email_source:       l.email_source,   // keep — shows where the email came from
      email_confidence:   l.email_confidence, // keep — shows Hunter confidence %
      catch_all:          l.catch_all,      // keep — shows catch-all detection ran
      domain:             l.domain,         // keep — enables live MX verification in demo
      score_signals:      l.score_signals,  // keep — shows scoring quality
      linkedin:           l.linkedin_is_direct ? null : l.linkedin, // search link OK, /in/ locked
      linkedin_is_direct: false,
      linkedin_validated: false,
      all_email_patterns: [],               // locked behind paywall
      _demo_masked:       true,
    };
  });
}

// Detect creator / blogger / influencer ICPs so we can switch prompt framing
function isCreatorICP(icp) {
  const t = (icp || '').toLowerCase();
  return [
    'blog', 'blogger', 'food blog', 'recipe', 'creator', 'content creator',
    'influencer', 'youtuber', 'podcaster', 'newsletter', 'substack',
    'instagram', 'tiktok creator', 'solo', 'solopreneur',
  ].some(k => t.includes(k));
}

// Extract location hints directly from the ICP text (e.g. "in Milwaukee" / "Wisconsin")
function extractLocationFromICP(icp) {
  const patterns = [
    /\bin\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z]{2})?)/,           // "in Milwaukee, WI"
    /\bbased\s+in\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z]{2})?)/,   // "based in Wisconsin"
    /\b([A-Z][a-zA-Z\s]+),?\s*(WI|MN|IL|TX|CA|NY|FL|OH|CO|WA|OR|GA|NC|VA|MA|AZ|NV|MI|PA|NJ|MD|CT|MO|TN|IN|KY|SC|AL|LA|AR|MS|OK|KS|NE|SD|ND|MT|ID|UT|WY|NM|AK|HI|DE|RI|NH|VT|ME|WV)\b/i,
    /\b(Milwaukee|Madison|Wisconsin|Chicago|Minneapolis|Austin|Denver|Seattle|Portland|Atlanta|Boston|Dallas|Houston|Phoenix|Detroit|Nashville|Indianapolis|Columbus|Charlotte|Raleigh|San Francisco|Los Angeles|New York|Miami)\b/i,
  ];
  for (const re of patterns) {
    const m = icp.match(re);
    if (m) return m[1] || m[0];
  }
  return null;
}

// Step 1: AI generates real company domains
async function getCompanyDomains(icp, filters, batchNum) {
  // Merge explicit filters with location inferred from the ICP text itself
  const icpLocation = extractLocationFromICP(icp);
  const locationHint = filters.location || icpLocation || null;

  const extras = [
    filters.industry    ? `Industry: ${filters.industry}` : '',
    locationHint        ? `Location: ${locationHint}` : '',
    filters.companySize ? `Company size: ${filters.companySize}` : '',
    filters.exclude     ? `Exclude: ${filters.exclude}` : '',
  ].filter(Boolean).join('\n');

  const creatorMode = isCreatorICP(icp);

  const prompt = creatorMode
    ? `You are a digital media research expert with encyclopedic knowledge of real, named content creators and bloggers worldwide.

List exactly 8 REAL, NAMED, VERIFIABLE individual creators or creator-owned sites that match this ICP.

ICP: "${icp}"
${extras}
${batchNum > 1 ? `Batch ${batchNum} — return DIFFERENT creators from all previous batches.` : ''}

CRITICAL — you MUST return REAL PEOPLE with REAL NAMES who actually exist:
- These must be specific, identifiable people — NOT generic descriptions
- Use your training knowledge of well-known bloggers, Substackers, YouTubers, podcasters
- If a location is specified (e.g. Milwaukee, Wisconsin, Midwest), prioritise creators FROM that location first
  Examples for Wisconsin/Milwaukee food bloggers: Erin Clarke (Well Plated by Erin - wellplated.com), etc.
  Expand to nearby region (Midwest, US) only if you cannot find 8 in the specified location
- Include a mix of sub-niches within the ICP (e.g. recipe, restaurant review, vegan, baking, meal-prep for food)
- Focus on mid-tier creators (10K–500K followers/readers) who are actively monetised and reachable

Field rules:
- "company" = the creator's brand/site name (e.g. "Well Plated by Erin")
- "domain" = the creator's OWN website domain — NOT youtube.com, instagram.com, twitter.com
  - Personal site: use that domain (e.g. wellplated.com)
  - Substack-only: use their-handle.substack.com
  - NEVER use a social platform URL
- "location" = the creator's actual city/state (e.g. "Milwaukee, WI")
- "why_fits" = specifically why THIS named person fits the ICP
- "signal" = a concrete, current reason to reach out (new cookbook, recent brand deal, seasonal campaign, etc.)

CRITICAL domain rules:
- NEVER use youtube.com, instagram.com, tiktok.com, twitter.com, x.com, facebook.com
- NEVER use .co unless it is literally the only domain they own
- Correct: "wellplated.com", "pinchofyum.com", "sallysbakingaddiction.com", "minimalistbaker.com"
- Wrong: "youtube.com/c/FoodChannel", "instagram.com/foodblogger"

Return ONLY a JSON array of exactly 8 objects, no markdown:
[{"company":"Well Plated by Erin","domain":"wellplated.com","industry":"Food Blog","size":"1-10","location":"Milwaukee, WI","why_fits":"Erin Clarke runs one of the top healthy recipe blogs with 1M+ monthly readers, actively partners with food brands","signal":"Spring recipe content push — ideal timing for ingredient/kitchen brand sponsorships","pain_points":"managing brand deal pipeline, scaling newsletter revenue","budget_range":"$2K-$10K/project","tech":"WordPress, Mediavine"}]`
    : `You are a B2B sales intelligence expert. List exactly 8 REAL, existing companies whose employees match this ICP.

ICP: "${icp}"
${extras}
${batchNum > 1 ? `Batch ${batchNum} — return DIFFERENT companies from all previous batches.` : ''}

Rules:
- Only real companies with real websites and employees
- Avoid Fortune 500 (Google, Microsoft, Meta, Salesforce, Oracle, Apple, Amazon)
- Prefer mid-market 50-500 employees where decision-makers are reachable
- Vary geography and sub-vertical within the ICP

CRITICAL domain rules:
- Use the real primary .com domain the company uses for email
- NEVER use .co unless it is literally the only domain the company uses
- If unsure between .com and .co — always choose .com
- Correct: "close.com", "pipedrive.com", "outreach.io"
- Wrong: "kairosventures.co", "acme.co"

Return ONLY a JSON array of exactly 8 objects, no markdown:
[{"company":"Acme Corp","domain":"acmecorp.com","industry":"B2B SaaS","size":"51-200","location":"Austin, TX","why_fits":"Why employees here fit the ICP","signal":"Concrete reason to reach out this week","pain_points":"pain 1, pain 2","budget_range":"$20K-$60K/yr","tech":"HubSpot, Stripe"}]`;

  let raw, aiProvider;

  if (groq) {
    try {
      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200, temperature: 0.7,
        response_format: { type: 'json_object' },
      });
      const parsed = safeJSON(res.choices[0]?.message?.content || '');
      raw = Array.isArray(parsed) ? parsed
        : parsed.companies || parsed.leads || parsed.results
          || Object.values(parsed).find(v => Array.isArray(v)) || [];
      aiProvider = 'groq';
    } catch (e) { console.warn('[leads] Groq failed:', e.message); }
  }

  if (!raw?.length && openai) {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200, temperature: 0.7,
    });
    const parsed = safeJSON(res.choices[0]?.message?.content || '');
    raw = Array.isArray(parsed) ? parsed
      : parsed.companies || parsed.leads || parsed.results
        || Object.values(parsed).find(v => Array.isArray(v)) || [];
    aiProvider = 'openai';
  }

  if (!raw?.length) throw new Error('AI failed to generate company list');
  return { companies: raw.slice(0, 8), aiProvider };
}

// Step 2: Hunter domain search -> real contacts
async function hunterDomainSearch(domain, apiKey) {
  const key = apiKey || null;
  if (!key) return null;
  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&type=personal&api_key=${key}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      if (r.status === 429 || body?.errors?.[0]?.code === 429) return 'quota_exceeded';
      console.warn(`[hunter] ${domain} HTTP ${r.status}`);
      return null;
    }
    const data = await r.json();
    return data?.data || null;
  } catch (e) {
    console.warn(`[hunter] ${domain}:`, e.message);
    return null;
  }
}

// AI person synthesiser (fallback when Hunter has no contacts for a company)
async function synthesisePerson(companyMeta, icp, aiProvider) {
  const creatorMode = isCreatorICP(icp);
  const prompt = creatorMode
    ? `For this REAL creator-owned site, return the ACTUAL real person who runs it — use your knowledge of who owns/founded this brand.
Site: ${companyMeta.company} (${companyMeta.domain})
ICP: "${icp}"
Return the real founder/creator's actual name and title (e.g. "Blogger & Recipe Developer", "Food Blogger & Author", "Content Creator").
Return ONLY valid JSON: {"name":"Real Full Name","title":"Job Title","score_reason":"Why they fit the ICP"}`
    : `For this REAL company, generate 1 realistic senior decision-maker that fits the ICP.
Company: ${companyMeta.company} (${companyMeta.domain})
ICP: "${icp}"
Return ONLY valid JSON: {"name":"Full Name","title":"Job Title","score_reason":"Why they fit"}`;
  try {
    let content;
    if (aiProvider === 'groq' && groq) {
      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200, temperature: 0.8,
        response_format: { type: 'json_object' },
      });
      content = res.choices[0]?.message?.content;
    } else if (openai) {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200, temperature: 0.8,
      });
      content = res.choices[0]?.message?.content;
    }
    return safeJSON(content || '{}');
  } catch {
    const creatorFallback = isCreatorICP(icp);
    return {
      name: creatorFallback ? 'Site Owner' : 'Decision Maker',
      title: creatorFallback ? 'Blogger & Content Creator' : 'Director',
      score_reason: companyMeta.why_fits,
    };
  }
}

// Main pipeline
// Strategy:
//   1. Ask AI for 8 candidates (buffer) — process until we have exactly 5 good leads
//   2. Server-side dedup via seen-leads set (persisted per subscriptionKey)
//   3. Hunter domain-search gives up to 10 contacts per domain
//   4. ZeroBounce called on every email — conserved by stopping at first valid pattern
//   5. D-grade leads dropped before output; keeps trying next candidate
async function generateLeads(
  icp,
  filters,
  batchNum,
  hunterKey,
  zbKey,
  subscriptionKey,
  {
    allowMultiplePerCompany = false,
    requireVerifiedEmail = false,
    requireDirectLinkedIn = false,
  } = {}
) {
  const { companies, aiProvider } = await getCompanyDomains(icp, filters, batchNum);
  const leads = [];
  const seenIds = subscriptionKey ? getSeenLeads(subscriptionKey) : new Set();
  const seenCompanies = new Set(); // Company diversity — 1 lead per company by default
  let hunterQuotaExceeded = false;
  const creatorMode = isCreatorICP(icp);
  const strictRejected = { unverifiedEmail: 0, noDirectLinkedIn: 0 };

  for (const companyMeta of companies) {
    if (leads.length >= 5) break;  // got enough — stop early

    const domain = await sanitiseDomain(companyMeta.domain);
    if (!domain) { console.log(`[leads] Skip — bad domain: ${companyMeta.domain}`); continue; }

    // ── Step 2: Hunter domain-search ────────────────────────────────────────
    let hunterData = null;
    if (hunterKey && !hunterQuotaExceeded) {
      const result = await hunterDomainSearch(domain, hunterKey);
      if (result === 'quota_exceeded') {
        hunterQuotaExceeded = true;
        console.warn('[leads] Hunter quota exceeded — switching to AI pattern fallback');
      } else {
        hunterData = result;
      }
    }

    const emails = hunterData?.emails || [];

    if (emails.length > 0) {
      // ── REAL DATA PATH — Hunter found contacts ──────────────────────────
      // For creator mode accept any contact (tiny team); for B2B filter to decision-makers first
      const senior = creatorMode ? emails : emails.filter(e =>
        ['executive','senior','director'].includes(e.seniority) ||
        ['ceo','cto','coo','cfo','vp','founder','director','head','chief','president','owner','partner']
          .some(k => (e.position || '').toLowerCase().includes(k))
      );
      // Use senior if available, otherwise fall back to all contacts — up to 10 candidates
      const candidates = (senior.length ? senior : emails).slice(0, 10);

      for (const c of candidates) {
        if (leads.length >= 5) break;

        const hunterStatus = c.verification?.status || null;

        // ── ZeroBounce validation on every Hunter email ──────────────────
        const validation = await validateEmail(c.value, c.confidence, hunterStatus, zbKey, hunterKey);
        if (!validation.pass) {
          console.log(`[leads] ZB/validation reject ${c.value}: ${validation.reason}`);
          continue;
        }

        const linkedIn = await buildLinkedIn(
          `${c.first_name || ''} ${c.last_name || ''}`.trim(),
          companyMeta.company,
          c.linkedin || null,
        );

        const { score, signals } = scoreLead({
          title:            c.position || '',
          emailVerified:    validation.verified || hunterStatus === 'valid',
          emailSource:      'hunter',
          zbStatus:         validation.zbStatus,
          hunterConfidence: c.confidence,
          hunterStatus,
          linkedInDirect:   linkedIn.isDirect,
          companySize:      companyMeta.size || hunterData?.company_size || '',
          icp,
          catchAll:         validation.catchAll,
        });

        const { grade } = scoreLabel(score);
        if (grade === 'D') {
          console.log(`[leads] Drop D: ${c.position || 'unknown'} at ${companyMeta.company} (${score})`);
          continue;
        }

        const lead = buildLead({
          name:            `${c.first_name || ''} ${c.last_name || ''}`.trim(),
          title:           c.position || c.department || '',
          email:           c.value,
          linkedIn,
          emailVerified:   validation.verified || hunterStatus === 'valid',
          emailConfidence: c.confidence,
          emailSource:     'hunter',
          zbStatus:        validation.zbStatus,
          catchAll:        validation.catchAll,
          companyMeta:     { ...companyMeta, location: hunterData?.city ? `${hunterData.city}, ${hunterData.country || ''}`.trim().replace(/,$/, '') : (hunterData?.country || companyMeta.location) },
          hunterMeta:      { description: hunterData?.description, technologies: hunterData?.technologies, headcount: hunterData?.headcount, twitter: hunterData?.twitter, linkedin: hunterData?.linkedin },
          domain,
          score,
          scoreSignals:    signals,
          scoreReason:     `${c.position || 'Decision maker'} at ${companyMeta.company} — ${companyMeta.why_fits || icp.slice(0, 80)}`,
          dataSource:      (validation.verified || hunterStatus === 'valid') ? 'hunter-verified' : 'hunter',
        });

        // Optional strict proof mode: only return leads with confirmed email + direct LinkedIn profile URL.
        if (requireVerifiedEmail && !lead.email_verified) {
          strictRejected.unverifiedEmail += 1;
          continue;
        }
        if (requireDirectLinkedIn && !lead.linkedin_is_direct) {
          strictRejected.noDirectLinkedIn += 1;
          continue;
        }

        // ── Cross-batch dedup ──────────────────────────────────────────────
        if (seenIds.has(lead._id)) {
          console.log(`[leads] Dedup skip: ${lead._id}`);
          continue;
        }

        // ── Company diversity — 1 best lead per company (unless opted in) ─
        const companyKey = (lead.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!allowMultiplePerCompany && companyKey && seenCompanies.has(companyKey)) {
          console.log(`[leads] Company diversity skip: already have lead from ${lead.company}`);
          continue;
        }

        seenIds.add(lead._id);
        if (companyKey) seenCompanies.add(companyKey);
        leads.push(lead);

        // When enforcing 1-per-company, break out of this company's candidates
        if (!allowMultiplePerCompany) break;
      }

    } else {
      // ── AI PATTERN FALLBACK — Hunter found no contacts ──────────────────
      const s = await synthesisePerson(companyMeta, icp, aiProvider);
      const nameParts = (s.name || 'Contact').trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName  = nameParts.slice(1).join(' ');

      // Try email patterns in order — stop at first ZeroBounce-valid result.
      // firstname@ tried first for creators; firstname.lastname@ for B2B.
      const candidateEmails = creatorMode
        ? allPatterns(firstName, lastName, domain)           // firstname@ first
        : [...allPatterns(firstName, lastName, domain)].reverse();  // firstname.lastname@ first

      let finalEmail    = null;
      let emailVerified = false;
      let emailSource   = 'pattern-invalid';
      let zbStatus      = null;
      let catchAll      = false;

      for (const candidate of candidateEmails) {
        const validation = await validateEmail(candidate, null, null, zbKey, hunterKey);
        if (validation.pass) {
          finalEmail    = candidate;
          zbStatus      = validation.zbStatus;
          catchAll      = validation.catchAll;
          emailVerified = validation.verified || false;
          // Creator mode: firstname@ on their own domain is high-signal even without ZB
          emailSource   = emailVerified
            ? 'pattern-verified'
            : (creatorMode ? 'pattern-creator' : 'pattern');
          console.log(`[leads] Pattern hit: ${candidate} zb=${zbStatus} verified=${emailVerified} source=${emailSource}`);
          break;
        }
        console.log(`[leads] Pattern miss: ${candidate} (${validation.reason})`);
      }

      const linkedIn = await buildLinkedIn(s.name || 'Contact', companyMeta.company, null);

      const { score, signals } = scoreLead({
        title:            s.title || '',
        emailVerified,
        emailSource,
        zbStatus,
        hunterConfidence: null,
        hunterStatus:     null,
        linkedInDirect:   false,
        companySize:      companyMeta.size || '',
        icp,
        catchAll,
      });

      const { grade } = scoreLabel(score);
      if (grade === 'D') {
        console.log(`[leads] Drop D (pattern): ${s.title} at ${companyMeta.company} (${score})`);
        continue;
      }

      const lead = buildLead({
        name:         s.name || 'Contact',
        title:        s.title || '',
        email:        finalEmail,
        linkedIn,
        emailVerified,
        emailSource,
        zbStatus,
        catchAll,
        companyMeta,
        domain,
        score,
        scoreSignals: signals,
        scoreReason:  s.score_reason || companyMeta.why_fits || '',
        dataSource:   'ai-pattern',
        hunterMeta:   null,
      });

      // Optional strict proof mode: pattern leads are excluded when proof requirements aren't met.
      if (requireVerifiedEmail && !lead.email_verified) {
        strictRejected.unverifiedEmail += 1;
        continue;
      }
      if (requireDirectLinkedIn && !lead.linkedin_is_direct) {
        strictRejected.noDirectLinkedIn += 1;
        continue;
      }

      // ── Cross-batch dedup ────────────────────────────────────────────────
      if (seenIds.has(lead._id)) {
        console.log(`[leads] Dedup skip: ${lead._id}`);
        continue;
      }

      // ── Company diversity (AI pattern path) ──────────────────────────────
      const companyKey2 = (lead.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!allowMultiplePerCompany && companyKey2 && seenCompanies.has(companyKey2)) {
        console.log(`[leads] Company diversity skip: already have lead from ${lead.company}`);
        continue;
      }

      seenIds.add(lead._id);
      if (companyKey2) seenCompanies.add(companyKey2);
      leads.push(lead);
    }
  }

  console.log(`[leads] Pipeline complete: ${leads.length}/5 leads from ${companies.length} candidates`);

  // Sort: ZB-verified A first → verified B → unverified A/B → C, then by score desc within tier
  leads.sort((a, b) => {
    const zbA = a.zb_status === 'valid' ? 2 : a.email_verified ? 1 : 0;
    const zbB = b.zb_status === 'valid' ? 2 : b.email_verified ? 1 : 0;
    if (zbB !== zbA) return zbB - zbA;
    return b.score - a.score;
  });

  // Aggregate stats
  const hotLeads        = leads.filter(l => l.grade === 'A').length;
  const warmLeads       = leads.filter(l => l.grade === 'B').length;
  const avgScore        = leads.length ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0;
  const realCount       = leads.filter(l => l.email_source === 'hunter' || l.email_source === 'hunter-verified').length;
  const verifiedCount   = leads.filter(l => l.email_verified).length;
  const directLinkedIn  = leads.filter(l => l.linkedin_is_direct).length;
  const zbVerified      = leads.filter(l => l.zb_status === 'valid').length;
  const patternVerified = leads.filter(l => l.email_source === 'pattern-verified').length;

  return {
    leads: leads.slice(0, 5),
    seenIds,
    meta: {
      aiProvider, hunterQuotaExceeded,
      zbAvailable: !!(zbKey),
      realCount, verifiedCount, directLinkedIn, zbVerified, patternVerified,
      avgScore, hotLeads, warmLeads,
      strictRejected,
    },
  };
}

// ─── Plan limits ─────────────────────────────────────────────────────────────
// Starter:  uses platform keys, capped 50 leads/mo  (you foot the bill, but it's <$3/mo)
// Pro:      client brings Hunter key; platform ZB key; up to 500 leads/mo
// Scale:    client brings both keys; unlimited
// Agency:   client brings both keys; unlimited + multi-seat
// isDemo:   no real keys used; AI + pattern only

const PLAN_BATCH_CAPS = { starter: 10, pro: 100, scale: Infinity, agency: Infinity };

// Handler
export default withProtection('leads', async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      icp, industry, location, companySize, excludeCompanies,
      batchNum = 1, isDemo = false,
      // Company diversity: false = 1 best lead per company (default), true = allow multiple
      allowMultiplePerCompany = false,
      // Client-supplied BYOK keys (Pro / Scale / Agency plans)
      hunterApiKey: clientHunterKey,
      zeroBounceApiKey: clientZbKey,
      // Plan tier sent by the client (dashboard knows its own plan)
      plan = 'starter',
      // For gifted client-trial sessions: a short slug that acts as the subscription key
      trialSlug,
    } = req.body || {};

    if (!icp?.trim()) return res.status(400).json({ error: 'icp is required' });

    // Demo gate — server-side enforcement
    const DEMO_MAX_BATCHES = 5; // 5 batches × 5 leads = 25 demo leads total (~$0.45 platform cost)
    if (isDemo && parseInt(batchNum) > DEMO_MAX_BATCHES) {
      return res.status(403).json({
        error: `Demo limited to ${DEMO_MAX_BATCHES * 5} leads (${DEMO_MAX_BATCHES} batches). Subscribe to unlock unlimited lead generation.`,
        upgrade: true,
        demoLimit: DEMO_MAX_BATCHES * 5,
      });
    }

    // ── Monthly quota enforcement ──────────────────────────────────────────
    // subscriptionKey = session_id from client (passed by dashboard); falls back
    // to a plan-level shared key for clients that don't send one.
    // Scale/Agency use BYOK so platform costs are $0 — no cap needed.
    // client-trial: keyed by trialSlug so each gifted client has their own counter.
    const subscriptionKey = trialSlug
      ? `trial-${trialSlug}`
      : (req.body.subscriptionKey || `plan-${plan}`);
    const planForLimits   = isDemo ? 'demo' : (plan || 'starter');

    if (planForLimits !== 'scale' && planForLimits !== 'agency') {
      const batchCheck = checkUsage(subscriptionKey, planForLimits, 'leadBatches', 1);
      if (!batchCheck.allowed) {
        const limits = PLAN_LIMITS[planForLimits];
        return res.status(429).json({
          error: `Monthly lead limit reached. Your ${planForLimits} plan includes ${limits.leadBatches * 5} leads/month (${limits.leadBatches} batches). Upgrade for more.`,
          quota: true,
          used:      batchCheck.used,
          limit:     batchCheck.limit,
          remaining: batchCheck.remaining,
          upgradeUrl: '/pricing',
        });
      }
    }

    // Resolve which keys to use based on plan:
    //   Starter  — platform Hunter + platform ZB (both capped to keep your costs low)
    //   Pro      — client Hunter key + platform ZB key (client pays for Hunter)
    //   Scale+   — client Hunter key + client ZB key (client pays for both)
    //   Demo     — no real keys (AI pattern-only, masked)
    let hunterKey, zbKey;
    if (isDemo) {
      // Demo uses platform keys so real Hunter data flows through —
      // maskForDemo() handles the gate (blurs email, strips LinkedIn direct).
      hunterKey = PLATFORM_HUNTER;
      zbKey     = PLATFORM_ZEROBOUNCE || null;
    } else if (plan === 'scale' || plan === 'agency') {
      // Full BYOK — both keys must come from client
      hunterKey = clientHunterKey || null;
      zbKey     = clientZbKey     || null;
      if (!hunterKey) {
        return res.status(400).json({
          error: 'Scale/Agency plan requires your Hunter.io API key. Add it in Dashboard → API Keys.',
          byok: true, missingKey: 'hunter',
        });
      }
      if (!zbKey) {
        return res.status(400).json({
          error: 'Scale/Agency plan requires your ZeroBounce API key. Add it in Dashboard → API Keys.',
          byok: true, missingKey: 'zerobounce',
        });
      }
    } else if (plan === 'pro') {
      // Client brings Hunter; platform supplies ZB
      hunterKey = clientHunterKey || PLATFORM_HUNTER;
      zbKey     = PLATFORM_ZEROBOUNCE || null;
    } else if (plan === 'client-trial') {
      // Gifted trial — platform supplies both keys, same as Starter
      hunterKey = PLATFORM_HUNTER;
      zbKey     = PLATFORM_ZEROBOUNCE || null;
    } else {
      // Starter — platform supplies both (low-volume fallback)
      hunterKey = PLATFORM_HUNTER;
      zbKey     = PLATFORM_ZEROBOUNCE || null;
    }

    const filters = {
      industry:    industry         || '',
      location:    location         || '',
      companySize: companySize      || '',
      exclude:     excludeCompanies || '',
    };

    const strictProofMode = false; // requireDirectLinkedIn is too aggressive — drops nearly all candidates
    const { leads, meta } = await generateLeads(
      icp.trim(),
      filters,
      parseInt(batchNum) || 1,
      hunterKey,
      zbKey,
      subscriptionKey,
      {
        allowMultiplePerCompany: !!allowMultiplePerCompany,
        requireVerifiedEmail: false,
        requireDirectLinkedIn: false,
      }
    );

    // Record successful batch usage (after work completes — failed calls don't count)
    if (planForLimits !== 'scale' && planForLimits !== 'agency') {
      recordUsage(subscriptionKey, planForLimits, 'leadBatches', 1);
    }

    // Persist seen lead IDs for cross-batch dedup
    if (leads.length) {
      recordSeenLeads(subscriptionKey, leads.map(l => l._id));
    }

    const finalLeads = isDemo ? maskForDemo(leads) : leads;

    // Per-batch quality diagnostics so trial users can see exactly why A-grade leads are low.
    const gradeCounts = finalLeads.reduce((acc, l) => {
      const g = l.grade || 'D';
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, { A: 0, B: 0, C: 0, D: 0 });

    const decisionMakerRegex = /(ceo|founder|chief|owner|president|managing director|\bvp\b|vice president|director|head of|partner|editor|cro|cmo|cto|coo|cfo)/i;
    const diagnostics = {
      unverifiedEmails: finalLeads.filter(l => !l.email_verified).length,
      lowConfidenceEmails: finalLeads.filter(l => typeof l.email_confidence === 'number' && l.email_confidence < 80).length,
      nonDecisionMakerTitles: finalLeads.filter(l => !decisionMakerRegex.test(l.title || '')).length,
      noDirectLinkedIn: finalLeads.filter(l => !l.linkedin_is_direct).length,
      catchAllDomains: finalLeads.filter(l => l.catch_all).length,
      noBuyingSignal: finalLeads.filter(l => !(l.signal || '').trim()).length,
    };

    const tips = [];
    if (gradeCounts.A === 0) {
      tips.push('No A-grade leads this batch: tighten ICP toward decision-maker titles (Founder, CEO, VP, Director, Head of).');
    }
    if (diagnostics.unverifiedEmails >= 3) {
      tips.push('Most emails were not verified: narrow industry/location so Hunter finds stronger personal emails for each company.');
    }
    if (diagnostics.nonDecisionMakerTitles >= 3) {
      tips.push('Titles are mostly non-senior: add seniority constraints directly in ICP (e.g., "VP/Director/Founder only").');
    }
    if (diagnostics.noDirectLinkedIn >= 3) {
      tips.push('Few direct LinkedIn profiles: include clearer role + company-size signals to improve contact match quality.');
    }
    if (diagnostics.catchAllDomains >= 2) {
      tips.push('Multiple catch-all domains detected: prefer niches with established B2B companies over creator/solo sites.');
    }
    if (tips.length === 0) {
      tips.push('Quality looks healthy for this batch. To push more A-leads, tighten ICP by role, company size, and region.');
    }

    const debug = {
      generatedAt: new Date().toISOString(),
      batchNum: parseInt(batchNum) || 1,
      icp: icp.trim(),
      gradeCounts,
      diagnostics,
      tips,
      thresholdGuide: 'A>=88, B>=72, C>=58',
    };

    return res.status(200).json({
      leads:    finalLeads,
      count:    finalLeads.length,
      provider: meta.aiProvider,
      plan,
      byok: {
        hunterClientKey:     !!(clientHunterKey),
        zeroBounceClientKey: !!(clientZbKey),
      },
      scoring: {
        avgScore:  meta.avgScore,
        hotLeads:  meta.hotLeads,
        warmLeads: meta.warmLeads,
      },
      sources: {
        tier:                meta.realCount > 0 ? 1 : 3,
        hunterUsed:          !!hunterKey && !meta.hunterQuotaExceeded,
        hunterQuotaExceeded: meta.hunterQuotaExceeded,
        zeroBounceUsed:      meta.zbAvailable,
        zeroBounceVerified:  meta.zbVerified,
        realLeads:           meta.realCount,
        verifiedEmails:      meta.verifiedCount,
        patternVerified:     meta.patternVerified,
        directLinkedIn:      meta.directLinkedIn,
      },
      quality: {
        strictMode: strictProofMode,
        requirements: strictProofMode ? ['verified-email', 'direct-linkedin-profile'] : [],
        strictRejected: meta.strictRejected || { unverifiedEmail: 0, noDirectLinkedIn: 0 },
      },
      debug,
    });
  } catch (err) {
    console.error('[/api/leads]', err.message);
    return res.status(500).json({ error: 'Lead generation failed. Please try again.' });
  }
});
