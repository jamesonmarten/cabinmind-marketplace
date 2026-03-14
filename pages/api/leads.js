/**
 * /api/leads — B2B Lead Generation Pipeline
 *
 * Tier selection (auto, by batch size — guarantees response within 25s):
 *   1–5  leads  → GPT targets + Wikipedia enrichment + Hunter emails
 *   6–10 leads  → GPT targets + Hunter emails (skip Wikipedia per-lead)
 *   11–15 leads → Single GPT synthesis call (~6s, no external deps)
 *
 * External deps (all optional):
 *   HUNTER_API_KEY — hunter.io, 25 free domain searches/mo
 *   Wikipedia REST — free, no key required
 */
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Timeout-safe fetch (AbortSignal.timeout not available on all Node versions) ─
function fetchT(url, opts = {}, ms = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

// ─── Safe JSON parser — strips markdown fences, extracts first [...] or {...} ─
function safeJSON(raw) {
  if (!raw) throw new Error('Empty GPT response');
  let s = raw.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  if (s[0] !== '[' && s[0] !== '{') {
    const arr = s.match(/(\[[\s\S]*\])/);
    const obj = s.match(/(\{[\s\S]*\})/);
    s = (arr?.[1] ?? obj?.[1] ?? s).trim();
  }
  try { return JSON.parse(s); }
  catch { throw new Error(`GPT returned non-JSON: "${s.slice(0, 80)}"`); }
}

// ─── Email helpers ────────────────────────────────────────────────────────────
function emailPattern(first, last, domain) {
  const f = (first || '').toLowerCase().replace(/[^a-z]/g, '');
  const l = (last  || '').toLowerCase().replace(/[^a-z]/g, '');
  return `${f}.${l}@${domain}`;
}
function allPatterns(first, last, domain) {
  const f = (first || '').toLowerCase().replace(/[^a-z]/g, '');
  const l = (last  || '').toLowerCase().replace(/[^a-z]/g, '');
  return [`${f}.${l}@${domain}`, `${f}${l}@${domain}`, `${f[0] || 'a'}${l}@${domain}`, `${f}@${domain}`];
}

// ─── Wikipedia enrichment (free, no key, 3.5s timeout) ───────────────────────
async function wikiEnrich(company) {
  try {
    const sr = await fetchT(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(company)}&limit=2&format=json&namespace=0`,
      { headers: { 'User-Agent': 'CabinMind/1.0 (support@devcabin.tech)' } },
      3500
    );
    if (!sr.ok) return null;
    const [, titles] = await sr.json();
    if (!titles?.length) return null;
    const pr = await fetchT(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titles[0])}`,
      { headers: { 'User-Agent': 'CabinMind/1.0 (support@devcabin.tech)' } },
      3500
    );
    if (!pr.ok) return null;
    const d = await pr.json();
    const desc = (d.description || '').toLowerCase();
    const isOrg = ['company', 'corporation', 'software', 'startup', 'firm', 'platform',
      'service', 'technology', 'saas', 'inc', 'ltd', 'llc'].some(w => desc.includes(w));
    if (!isOrg || !d.extract) return null;
    return { description: d.extract.split('. ').slice(0, 2).join('. ') + '.' };
  } catch { return null; }
}

// ─── Hunter.io email lookup (4s timeout — keep well under Vercel limit) ──────
async function hunterLookup(domain) {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return null;
  try {
    const r = await fetchT(
      `https://api.hunter.io/v2/domain-search?${new URLSearchParams({ domain, api_key: key, limit: 3, type: 'personal' })}`,
      {},
      4000
    );
    if (!r.ok) return null;
    const d = await r.json();
    return d.data?.emails?.length ? d.data.emails : null;
  } catch { return null; }
}

// ─── GPT: generate target companies (Tier 1/2) ───────────────────────────────
async function gptTargets(icp, count, filters) {
  const extras = [
    filters.industry    ? `Industry: ${filters.industry}` : '',
    filters.location    ? `Geography: ${filters.location}` : '',
    filters.companySize ? `Company size: ${filters.companySize}` : '',
    filters.exclude     ? `Exclude: ${filters.exclude}` : '',
  ].filter(Boolean).join('\n');

  const r = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `B2B sales expert. ICP: "${icp}"${extras ? `\n${extras}` : ''}
Generate ${count} realistic B2B targets. Vary geography, seniority, gender.
Return ONLY a JSON array — no markdown. Fields: company_name, domain, contact_first_name, contact_last_name, contact_title, contact_location, icp_fit_reason, buying_signal, pain_points, budget_range, tech_stack_hint, score (72–97 varied).`,
    }],
    max_tokens: Math.min(count * 300 + 200, 3800),
    temperature: 0.8,
  });
  const result = safeJSON(r.choices[0].message.content);
  if (!Array.isArray(result)) throw new Error('GPT targets: not an array');
  return result;
}

// ─── GPT: full synthesis — 2 parallel calls for large batches ────────────────
async function gptSynthesis(icp, count, filters) {
  const extras = [
    filters.industry    ? `Industry: ${filters.industry}` : '',
    filters.location    ? `Location: ${filters.location}` : '',
    filters.companySize ? `Company size: ${filters.companySize}` : '',
    filters.exclude     ? `Exclude: ${filters.exclude}` : '',
  ].filter(Boolean).join('\n');

  const makePrompt = (n, batch = 1) =>
    `B2B sales analyst. ICP: "${icp}"${extras ? `\n${extras}` : ''}
Generate ${n} prospect profiles${batch === 2 ? ' (different people/companies from batch 1)' : ''}.
Vary names, gender, geography, company size. Scores 72–97.
Return ONLY a JSON array, no markdown. Fields: name, title, company, domain, industry, size, location, score, score_reason, tech, signal, pain_points, budget_range, email, phone (null), linkedin_search, why_now, company_description, all_email_patterns (4-item array), data_source ("ai-synthesised").`;

  const callGPT = async (n, batch = 1) => {
    const r = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: makePrompt(n, batch) }],
      max_tokens: Math.min(n * 380 + 200, 3800),
      temperature: 0.8,
    });
    const result = safeJSON(r.choices[0].message.content);
    if (!Array.isArray(result)) throw new Error('GPT synthesis: not an array');
    return result;
  };

  // Always split into 2 parallel calls to halve response time
  const half = Math.ceil(count / 2);
  const [a, b] = await Promise.all([callGPT(half, 1), callGPT(count - half, 2)]);
  const raw = [...a, ...b];

  return raw.slice(0, count).map(l => ({
    name:               l.name  || '',
    title:              l.title || '',
    company:            l.company || '',
    domain:             l.domain  || '',
    industry:           l.industry || '',
    size:               l.size || '—',
    location:           l.location || '',
    score:              typeof l.score === 'number' ? l.score : 80,
    score_reason:       l.score_reason || '',
    tech:               l.tech || '',
    signal:             l.signal || '',
    pain_points:        l.pain_points || '',
    budget_range:       l.budget_range || '',
    email:              l.email || '',
    email_verified:     false,
    email_source:       'ai-pattern',
    phone:              null,
    linkedin_search:    l.linkedin_search || '',
    why_now:            l.why_now || '',
    company_description: l.company_description || null,
    company_wiki:       null,
    all_email_patterns: Array.isArray(l.all_email_patterns) ? l.all_email_patterns : [],
    data_source:        'ai-synthesised',
  }));
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { icp, count = 5, industry, location, companySize, excludeCompanies } = req.body || {};
    if (!icp?.trim()) return res.status(400).json({ error: 'icp is required' });

    const batchSize = Math.min(Math.max(parseInt(count) || 5, 1), 15);
    const filters = {
      industry:    industry          || '',
      location:    location          || '',
      companySize: companySize       || '',
      exclude:     excludeCompanies  || '',
    };
    const hasHunter = !!process.env.HUNTER_API_KEY;

    // ── Route by batch size ───────────────────────────────────────────────────
    // >10 leads → 2 parallel GPT synthesis calls (fast, ~12s, no external deps)
    if (batchSize > 10) {
      const leads = await gptSynthesis(icp, batchSize, filters);
      return res.status(200).json({ leads, count: leads.length, sources: { tier: 3 } });
    }

    // ≤10 leads → GPT targets → enrichment
    const targets = await gptTargets(icp, batchSize, filters);
    const useWiki = batchSize <= 5;    // Wikipedia only for small batches (~3s each)
    const useHunter = hasHunter && batchSize <= 8; // Skip Hunter for 9-10 leads (too slow in parallel)

    const enriched = await Promise.all(targets.map(async (t) => {
      const firstName = t.contact_first_name || 'Contact';
      const lastName  = t.contact_last_name  || '';

      const [wiki, found] = await Promise.all([
        useWiki   ? wikiEnrich(t.company_name) : Promise.resolve(null),
        useHunter ? hunterLookup(t.domain)     : Promise.resolve(null),
      ]);

      let email = emailPattern(firstName, lastName, t.domain);
      let emailVerified = false;
      let emailSource   = 'pattern';
      let first = firstName, last = lastName;

      if (found?.length) {
        const best = found.find(e =>
          e.position?.toLowerCase().includes((t.contact_title || '').toLowerCase().split(' ')[0])
        ) || found[0];
        email         = best.value;
        emailVerified = best.verification?.status === 'valid';
        emailSource   = 'hunter';
        if (best.first_name) first = best.first_name;
        if (best.last_name)  last  = best.last_name;
      }

      return {
        name:            `${first} ${last}`.trim(),
        title:           t.contact_title    || '',
        company:         t.company_name     || '',
        domain:          t.domain           || '',
        industry:        '',
        size:            '—',
        location:        t.contact_location || '',
        score:           typeof t.score === 'number' ? t.score : 80,
        score_reason:    t.icp_fit_reason   || '',
        tech:            t.tech_stack_hint  || '',
        signal:          t.buying_signal    || '',
        pain_points:     t.pain_points      || '',
        budget_range:    t.budget_range     || '',
        email,
        email_verified:  emailVerified,
        email_source:    emailSource,
        phone:           null,
        linkedin_search: `${first} ${last} ${t.contact_title} ${t.company_name} site:linkedin.com`,
        why_now:         t.buying_signal || '',
        company_description: wiki?.description || null,
        company_wiki:    null,
        all_email_patterns: allPatterns(first, last, t.domain),
        data_source:     emailSource === 'hunter'
          ? (useWiki ? 'hunter+wikipedia' : 'hunter+pattern')
          : (useWiki ? 'wikipedia+pattern' : 'pattern'),
      };
    }));

    return res.status(200).json({
      leads: enriched,
      count: enriched.length,
      sources: { wikipedia: useWiki, hunter: useHunter, tier: useHunter ? 1 : 2 },
    });

  } catch (err) {
    console.error('[/api/leads] Error:', err.message);
    // Emergency fallback — try bare GPT synthesis with no enrichment
    try {
      const { icp = 'B2B decision makers', count = 5 } = req.body || {};
      const leads = await gptSynthesis(icp, Math.min(parseInt(count) || 5, 10), {});
      return res.status(200).json({ leads, count: leads.length, sources: { tier: 3, fallback: true } });
    } catch (fb) {
      console.error('[/api/leads] Fallback failed:', fb.message);
      return res.status(500).json({ error: 'Lead generation failed. Please try again.' });
    }
  }
}
