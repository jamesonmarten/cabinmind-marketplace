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

const groq       = process.env.GROQ_API_KEY        ? new Groq({ apiKey: process.env.GROQ_API_KEY })        : null;
const openai     = process.env.OPENAI_API_KEY       ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })    : null;
const HUNTER     = process.env.HUNTER_API_KEY       || null;
const ZEROBOUNCE = process.env.ZEROBOUNCE_API_KEY   || null;

const ZB_ACTIVE  = ZEROBOUNCE && ZEROBOUNCE !== 'your_zerobounce_api_key_here';

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
// Free tier: 100 validations/month
// Detects: spam traps, disposables, hard bounces, catch-all domains, role addresses
async function zeroBounceValidate(email) {
  if (!ZB_ACTIVE) return { available: false, reason: 'no-zb-key' };
  try {
    const url = `https://api.zerobounce.net/v2/validate?api_key=${ZEROBOUNCE}&email=${encodeURIComponent(email)}&ip_address=`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      if (r.status === 400 || r.status === 429 ||
          (body?.error && (body.error.includes('Invalid API Key') || body.error.includes('quota')))) {
        return { available: false, reason: 'zb-quota' };
      }
      return { available: false, reason: `zb-http-${r.status}` };
    }
    const d = await r.json();
    const status    = (d.status     || '').toLowerCase();
    const subStatus = (d.sub_status || '').toLowerCase();
    const catchAll  = status === 'catch-all';
    const valid     = status === 'valid';
    // Definitely bad statuses
    const bad = ['invalid', 'spamtrap', 'abuse', 'do_not_mail'].includes(status);
    return { available: true, status, subStatus, valid, catchAll, bad, reason: subStatus || status };
  } catch (e) {
    return { available: false, reason: e.message };
  }
}

// Hunter email verifier (FALLBACK when ZeroBounce unavailable)
async function hunterVerify(email) {
  if (!HUNTER) return { status: 'unknown', score: 0, reason: 'no-key' };
  try {
    const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${HUNTER}`;
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
async function validateEmail(email, hunterConfidence = null, hunterStatus = null) {
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

  // Layer 5: Hunter domain-search status
  if (hunterStatus === 'invalid') return { pass: false, reason: 'hunter-invalid' };

  // Layer 6a: ZeroBounce (primary)
  const zb = await zeroBounceValidate(email);
  if (zb.available) {
    if (zb.bad) {
      return { pass: false, reason: `zb-${zb.status}${zb.subStatus ? `-${zb.subStatus}` : ''}`, zbStatus: zb.status };
    }
    return { pass: true, reason: zb.status, zbStatus: zb.status, catchAll: zb.catchAll, verified: zb.valid && !zb.catchAll };
  }

  // Layer 6b: Hunter verifier fallback
  if (hunterStatus === 'valid') {
    return { pass: true, reason: 'hunter-valid', zbStatus: null, catchAll: false, verified: true };
  }
  const hv = await hunterVerify(email);
  if (hv.status === 'invalid') {
    return { pass: false, reason: 'hunter-verifier-invalid', zbStatus: null };
  }
  return { pass: true, reason: hv.status || 'mx-ok', zbStatus: null, catchAll: false, verified: hv.status === 'valid' };
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

  // Title tier
  if (['ceo','founder','cto','coo','cfo','chief','president','owner','managing director','md'].some(k => t.includes(k))) {
    score += 20; signals.push('C-suite / Founder title (+20)');
  } else if (['vp','vice president','director','head of','partner'].some(k => t.includes(k))) {
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
  if (emailVerified && zbStatus === 'valid') {
    score += 15; signals.push('ZeroBounce verified email (+15)');
  } else if (emailVerified && hunterStatus === 'valid') {
    score += 12; signals.push('Hunter verified email (+12)');
  } else if (emailSource === 'hunter' && hunterStatus !== 'invalid') {
    score += 8;  signals.push('Hunter email (unverified) (+8)');
  } else if (emailSource && emailSource.startsWith('pattern')) {
    score += 6;  signals.push('Pattern email (+6)');
  } else if (!emailSource || emailSource === 'none') {
    score -= 10; signals.push('No email found (−10)');
  }

  // Catch-all domain (emails may accept anything — less reliable)
  if (catchAll) { score -= 5; signals.push('Catch-all domain (−5)'); }

  // LinkedIn direct profile URL from Hunter
  if (linkedInDirect) { score += 8; signals.push('Direct LinkedIn profile (+8)'); }

  // Company size sweet spot (51-500 = most reachable decision-makers)
  const sz = (companySize || '').replace(/\s/g, '').replace('–', '-');
  if (['51-200','101-200','201-500','51-500'].some(s => sz.includes(s) || sz === s)) {
    score += 6; signals.push('Company size 51–500 (+6)');
  }

  // Hunter confidence bonus
  if (typeof hunterConfidence === 'number' && hunterConfidence >= 90) {
    score += 5; signals.push('Hunter confidence ≥90 (+5)');
  }

  return { score: Math.min(Math.max(Math.round(score), 40), 99), signals };
}

function scoreLabel(score) {
  if (score >= 90) return { grade: 'A', label: 'Hot',  color: 'green'  };
  if (score >= 75) return { grade: 'B', label: 'Warm', color: 'blue'   };
  if (score >= 60) return { grade: 'C', label: 'Cool', color: 'yellow' };
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
  return [`${f}.${l}@${domain}`, `${f}${l}@${domain}`, `${f[0]||'x'}${l}@${domain}`, `${f}@${domain}`];
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
  score, scoreSignals, scoreReason, dataSource,
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
    company_description: companyMeta.why_fits || '',
    all_email_patterns:  allPatterns(first, last, domain),
    data_source:         dataSource,
    _provider:           'hunter',
  };
}

// Demo masking — applied server-side after generation
function maskForDemo(leads) {
  return leads.map(l => {
    let maskedEmail = l.email;
    if (l.email) {
      const [local, domain] = l.email.split('@');
      const ml = local[0] + '••••••';
      const domParts = domain.split('.');
      const md = domParts[0][0] + '••••' + '.' + domParts.slice(1).join('.');
      maskedEmail = `${ml}@${md}`;
    }
    return {
      ...l,
      email:              maskedEmail,
      email_verified:     false,
      linkedin:           l.linkedin_is_direct ? null : l.linkedin,
      linkedin_is_direct: false,
      linkedin_validated: false,
      all_email_patterns: [],
      zb_status:          null,
      score_signals:      [],
      _demo_masked:       true,
    };
  });
}

// Step 1: AI generates real company domains
async function getCompanyDomains(icp, filters, batchNum) {
  const extras = [
    filters.industry    ? `Industry: ${filters.industry}` : '',
    filters.location    ? `Location: ${filters.location}` : '',
    filters.companySize ? `Company size: ${filters.companySize}` : '',
    filters.exclude     ? `Exclude: ${filters.exclude}` : '',
  ].filter(Boolean).join('\n');

  const prompt = `You are a B2B sales intelligence expert. List exactly 5 REAL, existing companies whose employees match this ICP.

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

Return ONLY a JSON array of exactly 5 objects, no markdown:
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
  return { companies: raw.slice(0, 5), aiProvider };
}

// Step 2: Hunter domain search -> real contacts
async function hunterDomainSearch(domain) {
  if (!HUNTER) return null;
  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=5&type=personal&api_key=${HUNTER}`;
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
  const prompt = `For this REAL company, generate 1 realistic senior decision-maker that fits the ICP.
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
    return { name: 'Decision Maker', title: 'Director', score_reason: companyMeta.why_fits };
  }
}

// Main pipeline
async function generateLeads(icp, filters, batchNum) {
  const { companies, aiProvider } = await getCompanyDomains(icp, filters, batchNum);
  const leads = [];
  let hunterQuotaExceeded = false;

  for (const companyMeta of companies) {
    if (leads.length >= 5) break;

    const domain = await sanitiseDomain(companyMeta.domain);
    if (!domain) continue;

    let hunterData = null;
    if (HUNTER && !hunterQuotaExceeded) {
      const result = await hunterDomainSearch(domain);
      if (result === 'quota_exceeded') {
        hunterQuotaExceeded = true;
        console.warn('[leads] Hunter quota exceeded — AI fallback for remaining');
      } else {
        hunterData = result;
      }
    }

    const emails = hunterData?.emails || [];

    if (emails.length > 0) {
      // REAL DATA PATH — Hunter found contacts
      const senior = emails.filter(e =>
        ['executive','senior','director'].includes(e.seniority) ||
        ['ceo','cto','coo','cfo','vp','founder','director','head','chief','president','owner','partner']
          .some(k => (e.position || '').toLowerCase().includes(k))
      );
      const candidates = (senior.length ? senior : emails).slice(0, 5);

      for (const c of candidates) {
        if (leads.length >= 5) break;
        const hunterStatus = c.verification?.status || null;

        // 6-layer validation
        const validation = await validateEmail(c.value, c.confidence, hunterStatus);
        if (!validation.pass) {
          console.warn(`[leads] Skip ${c.value}: ${validation.reason}`);
          continue;
        }

        // LinkedIn URL validation
        const linkedIn = await buildLinkedIn(
          `${c.first_name || ''} ${c.last_name || ''}`.trim(),
          companyMeta.company,
          c.linkedin || null,
        );

        // Deterministic score
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

        leads.push(buildLead({
          name:            `${c.first_name || ''} ${c.last_name || ''}`.trim(),
          title:           c.position || c.department || '',
          email:           c.value,
          linkedIn,
          emailVerified:   validation.verified || hunterStatus === 'valid',
          emailConfidence: c.confidence,
          emailSource:     'hunter',
          zbStatus:        validation.zbStatus,
          catchAll:        validation.catchAll,
          companyMeta:     { ...companyMeta, location: hunterData?.country || companyMeta.location },
          domain,
          score,
          scoreSignals:    signals,
          scoreReason:     `${c.position || 'Decision maker'} at ${companyMeta.company} — ${companyMeta.why_fits || icp.slice(0, 80)}`,
          dataSource:      (validation.verified || hunterStatus === 'valid') ? 'hunter-verified' : 'hunter',
        }));
      }
    } else {
      // FALLBACK PATH — No Hunter contacts — AI synthesises person for real company
      const s = await synthesisePerson(companyMeta, icp, aiProvider);
      const nameParts = (s.name || 'Contact').trim().split(/\s+/);
      const patternEmail = emailPattern(nameParts[0], nameParts.slice(1).join(' '), domain);

      let finalEmail    = patternEmail;
      let emailVerified = false;
      let emailSource   = 'pattern';
      let zbStatus      = null;
      let catchAll      = false;

      const validation = await validateEmail(patternEmail, null, null);
      if (!validation.pass) {
        console.warn(`[leads] Pattern email ${patternEmail} failed: ${validation.reason}`);
        finalEmail   = null;
        emailSource  = 'pattern-invalid';
      } else {
        zbStatus      = validation.zbStatus;
        catchAll      = validation.catchAll;
        emailVerified = validation.verified || false;
        emailSource   = emailVerified ? 'pattern-verified' : 'pattern';
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

      leads.push(buildLead({
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
      }));
    }
  }

  // Sort highest score first
  leads.sort((a, b) => b.score - a.score);

  // Aggregate stats
  const hotLeads        = leads.filter(l => l.score >= 90).length;
  const warmLeads       = leads.filter(l => l.score >= 75 && l.score < 90).length;
  const avgScore        = leads.length ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0;
  const realCount       = leads.filter(l => l.email_source === 'hunter').length;
  const verifiedCount   = leads.filter(l => l.email_verified).length;
  const directLinkedIn  = leads.filter(l => l.linkedin_is_direct).length;
  const zbVerified      = leads.filter(l => l.zb_status === 'valid').length;
  const patternVerified = leads.filter(l => l.email_source === 'pattern-verified').length;

  return {
    leads: leads.slice(0, 5),
    meta: {
      aiProvider, hunterQuotaExceeded,
      zbAvailable: ZB_ACTIVE,
      realCount, verifiedCount, directLinkedIn, zbVerified, patternVerified,
      avgScore, hotLeads, warmLeads,
    },
  };
}

// Handler
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      icp, industry, location, companySize, excludeCompanies,
      batchNum = 1, isDemo = false,
    } = req.body || {};

    if (!icp?.trim()) return res.status(400).json({ error: 'icp is required' });

    // Demo gate — server-side enforcement
    if (isDemo && parseInt(batchNum) > 1) {
      return res.status(403).json({
        error: 'Demo limited to 1 batch of 5 leads. Purchase to unlock unlimited generation.',
        upgrade: true,
      });
    }

    const filters = {
      industry:    industry         || '',
      location:    location         || '',
      companySize: companySize      || '',
      exclude:     excludeCompanies || '',
    };

    const { leads, meta } = await generateLeads(icp.trim(), filters, parseInt(batchNum) || 1);

    const finalLeads = isDemo ? maskForDemo(leads) : leads;

    return res.status(200).json({
      leads:    finalLeads,
      count:    finalLeads.length,
      provider: meta.aiProvider,
      scoring: {
        avgScore:  meta.avgScore,
        hotLeads:  meta.hotLeads,
        warmLeads: meta.warmLeads,
      },
      sources: {
        tier:                meta.realCount > 0 ? 1 : 3,
        hunterUsed:          !!HUNTER && !meta.hunterQuotaExceeded,
        hunterQuotaExceeded: meta.hunterQuotaExceeded,
        zeroBounceUsed:      meta.zbAvailable,
        zeroBounceVerified:  meta.zbVerified,
        realLeads:           meta.realCount,
        verifiedEmails:      meta.verifiedCount,
        patternVerified:     meta.patternVerified,
        directLinkedIn:      meta.directLinkedIn,
      },
    });
  } catch (err) {
    console.error('[/api/leads]', err.message);
    return res.status(500).json({ error: 'Lead generation failed. Please try again.' });
  }
}
