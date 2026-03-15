/**
 * /api/leads — Real B2B Lead Generation
 *
 * Architecture:
 *   Step 1 — AI (Groq/OpenAI) generates REAL company domains matching the ICP.
 *   Step 2 — Hunter.io /domain-search fetches real verified contacts at each domain.
 *            Each domain search = 1 Hunter credit, returns real name + verified email + direct LinkedIn URL.
 *   Step 3 — Heuristic ICP scoring + company enrichment from AI company metadata.
 *   Fallback — If Hunter quota exceeded or domain has no contacts, AI synthesises a
 *              profile with a pattern email (clearly badged 🟡 Pattern / 🤖 AI Profile).
 *
 * LinkedIn URLs: Hunter returns real linkedin.com/in/ URLs — direct profile links, no search needed.
 * Email verification: Hunter confidence score + verification status (valid/risky/invalid).
 */

import Groq from 'groq-sdk';
import OpenAI from 'openai';

const groq   = process.env.GROQ_API_KEY   ? new Groq({ apiKey: process.env.GROQ_API_KEY })   : null;
const openai = process.env.OPENAI_API_KEY  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const HUNTER = process.env.HUNTER_API_KEY  || null;

// ─── Safe JSON parser ─────────────────────────────────────────────────────────
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
  catch { throw new Error(`Non-JSON response: "${s.slice(0, 100)}"`); }
}

// ─── Email helpers ────────────────────────────────────────────────────────────
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

// ─── Step 1: AI → real company domains ────────────────────────────────────────
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
${batchNum > 1 ? `Batch ${batchNum} — return DIFFERENT companies from previous batches.` : ''}

Rules:
- Only real companies with real websites and real employees
- Avoid Fortune 500 (Google, Microsoft, Meta, Salesforce, Oracle, Apple, Amazon)
- Prefer mid-market 50–500 employees where decision-makers are reachable
- Vary geography and sub-vertical within the ICP
- Domains must be correct (e.g. "close.com", "pipedrive.com", "outreach.io")

Return ONLY a JSON array of exactly 5 objects, no markdown:
[{"company":"Acme Corp","domain":"acmecorp.com","industry":"B2B SaaS","size":"51-200","location":"Austin, TX","why_fits":"Why employees here fit the ICP","signal":"Concrete reason to reach out this week","pain_points":"pain 1, pain 2","budget_range":"$20K-$60K/yr","tech":"HubSpot, Stripe"}]`;

  let raw, aiProvider;

  if (groq) {
    try {
      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });
      const parsed = safeJSON(res.choices[0]?.message?.content || '');
      raw = Array.isArray(parsed) ? parsed
        : parsed.companies || parsed.leads || parsed.results
          || Object.values(parsed).find(v => Array.isArray(v)) || [];
      aiProvider = 'groq';
    } catch (e) {
      console.warn('[leads] Groq domain gen failed:', e.message);
    }
  }

  if (!raw?.length && openai) {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.7,
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

// ─── Step 2: Hunter domain search → real contacts ─────────────────────────────
async function hunterDomainSearch(domain) {
  if (!HUNTER) return null;
  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=5&type=personal&api_key=${HUNTER}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      if (r.status === 429 || body?.errors?.[0]?.code === 429) return 'quota_exceeded';
      console.warn(`[hunter] ${domain} → HTTP ${r.status}`);
      return null;
    }
    const data = await r.json();
    return data?.data || null;
  } catch (e) {
    console.warn(`[hunter] ${domain}:`, e.message);
    return null;
  }
}

// ─── Heuristic ICP score for a real Hunter contact ────────────────────────────
function scoreContact(contact, icp) {
  let score = 72;
  const title = (contact.position || '').toLowerCase();
  const icpL  = icp.toLowerCase();

  if (['ceo','cto','coo','cfo','vp','founder','director','head','chief','president','owner','partner']
    .some(k => title.includes(k))) score += 12;
  else if (['manager','lead','senior','principal'].some(k => title.includes(k))) score += 6;

  const icpWords = icpL.split(/\s+/).filter(w => w.length > 4);
  score += Math.min(icpWords.filter(w => title.includes(w)).length * 3, 9);

  if (contact.confidence >= 90) score += 4;
  else if (contact.confidence >= 70) score += 2;
  if (contact.linkedin) score += 3;

  return Math.min(Math.max(score, 72), 97);
}

// ─── AI fallback: synthesise person for a real company when Hunter has no data ─
async function synthesisePerson(companyMeta, icp, aiProvider) {
  const prompt = `For this REAL company, generate 1 realistic senior decision-maker that fits the ICP.
Company: ${companyMeta.company} (${companyMeta.domain})
ICP: "${icp}"
Return ONLY: {"name":"Full Name","title":"Job Title","score":80,"score_reason":"Why they fit"}`;
  try {
    let content;
    if (aiProvider === 'groq' && groq) {
      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.8,
        response_format: { type: 'json_object' },
      });
      content = res.choices[0]?.message?.content;
    } else if (openai) {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.8,
      });
      content = res.choices[0]?.message?.content;
    }
    return safeJSON(content || '{}');
  } catch { return { name: 'Decision Maker', title: 'Director', score: 75, score_reason: companyMeta.why_fits }; }
}

// ─── Build one normalised lead ─────────────────────────────────────────────────
function buildLead({ name, title, email, linkedin, emailVerified, emailConfidence,
                     emailSource, companyMeta, domain, score, scoreReason, dataSource }) {
  const parts  = (name || '').trim().split(/\s+/);
  const first  = parts[0] || '';
  const last   = parts.slice(1).join(' ') || '';
  const _id    = `${name}|${companyMeta.company}`.toLowerCase().replace(/[^a-z0-9|]/g, '');
  const finalEmail = email || emailPattern(first, last, domain);

  // LinkedIn: if Hunter gave a direct /in/ URL → use it directly (always works).
  // Otherwise build a targeted Google search for a real equivalent.
  const linkedinDirect = linkedin?.startsWith('https://www.linkedin.com/in/');
  const linkedinUrl = linkedinDirect
    ? linkedin
    : `https://www.google.com/search?q=${encodeURIComponent(`${name} ${title} ${companyMeta.company} site:linkedin.com/in`)}`;

  return {
    _id,
    name,
    title:              title || '',
    company:            companyMeta.company || '',
    domain,
    industry:           companyMeta.industry || '',
    size:               companyMeta.size || '—',
    location:           companyMeta.location || '',
    score,
    score_reason:       scoreReason,
    signal:             companyMeta.signal || '',
    pain_points:        companyMeta.pain_points || '',
    budget_range:       companyMeta.budget_range || '$15K–$50K/yr',
    why_now:            companyMeta.signal || '',
    tech:               companyMeta.tech || '',
    email:              finalEmail,
    email_verified:     emailVerified || false,
    email_confidence:   emailConfidence || null,
    email_source:       emailSource || 'pattern',
    linkedin:           linkedinUrl,
    linkedin_is_direct: !!linkedinDirect,
    phone:              null,
    company_description: companyMeta.why_fits || '',
    all_email_patterns: allPatterns(first, last, domain),
    data_source:        dataSource,
    _provider:          'hunter',
  };
}

// ─── Main pipeline ─────────────────────────────────────────────────────────────
async function generateLeads(icp, filters, batchNum) {
  const { companies, aiProvider } = await getCompanyDomains(icp, filters, batchNum);

  const leads = [];
  let hunterQuotaExceeded = false;

  for (const companyMeta of companies) {
    if (leads.length >= 5) break;
    const domain = (companyMeta.domain || '').toLowerCase()
      .replace(/^https?:\/\//, '').replace(/\/$/, '');
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
      // ── REAL DATA PATH ── Hunter found real contacts
      // Prefer senior/executive seniority
      const senior = emails.filter(e =>
        ['executive','senior','director'].includes(e.seniority) ||
        ['ceo','cto','coo','cfo','vp','founder','director','head','chief','president','owner']
          .some(k => (e.position || '').toLowerCase().includes(k))
      );
      const contacts = (senior.length ? senior : emails).slice(0, 2);

      for (const c of contacts) {
        if (leads.length >= 5) break;
        leads.push(buildLead({
          name:            `${c.first_name || ''} ${c.last_name || ''}`.trim(),
          title:           c.position || c.department || '',
          email:           c.value,
          linkedin:        c.linkedin || null,
          emailVerified:   c.verification?.status === 'valid',
          emailConfidence: c.confidence,
          emailSource:     'hunter',
          companyMeta:     { ...companyMeta, location: hunterData.country || companyMeta.location },
          domain,
          score:           scoreContact(c, icp),
          scoreReason:     `${c.position || 'Decision maker'} at ${companyMeta.company} — ${companyMeta.why_fits || icp.slice(0, 80)}`,
          dataSource:      c.verification?.status === 'valid' ? 'hunter-verified' : 'hunter',
        }));
      }
    } else {
      // ── FALLBACK PATH ── No Hunter data — synthesise a name for a real company
      const s = await synthesisePerson(companyMeta, icp, aiProvider);
      const nameParts = (s.name || '').trim().split(/\s+/);
      leads.push(buildLead({
        name:          s.name || 'Contact',
        title:         s.title || '',
        email:         null,
        linkedin:      null,
        emailVerified: false,
        emailSource:   'pattern',
        companyMeta,
        domain,
        score:         s.score || 75,
        scoreReason:   s.score_reason || companyMeta.why_fits || '',
        dataSource:    'ai-pattern',
      }));
    }
  }

  const realCount     = leads.filter(l => l.email_source === 'hunter').length;
  const verifiedCount = leads.filter(l => l.email_verified).length;
  const directLinkedIn = leads.filter(l => l.linkedin_is_direct).length;

  return {
    leads: leads.slice(0, 5),
    meta: { aiProvider, hunterQuotaExceeded, realCount, verifiedCount, directLinkedIn },
  };
}

// ─── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { icp, industry, location, companySize, excludeCompanies, batchNum = 1 } = req.body || {};
    if (!icp?.trim()) return res.status(400).json({ error: 'icp is required' });

    const filters = {
      industry:    industry         || '',
      location:    location         || '',
      companySize: companySize      || '',
      exclude:     excludeCompanies || '',
    };

    const { leads, meta } = await generateLeads(icp.trim(), filters, parseInt(batchNum) || 1);

    return res.status(200).json({
      leads,
      count:    leads.length,
      provider: meta.aiProvider,
      sources: {
        tier:                meta.realCount > 0 ? 1 : 3,
        hunterUsed:          !!HUNTER && !meta.hunterQuotaExceeded,
        hunterQuotaExceeded: meta.hunterQuotaExceeded,
        realLeads:           meta.realCount,
        verifiedEmails:      meta.verifiedCount,
        directLinkedIn:      meta.directLinkedIn,
      },
    });
  } catch (err) {
    console.error('[/api/leads]', err.message);
    return res.status(500).json({ error: 'Lead generation failed. Please try again.' });
  }
}
