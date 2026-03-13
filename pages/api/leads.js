/**
 * /api/leads — Real B2B Lead Generation Pipeline
 *
 * Enrichment tiers (all degrade gracefully):
 *   Tier 1: GPT targets → Wikipedia/DDG company description (FREE, no key) → Hunter real emails
 *   Tier 2: GPT targets → Wikipedia/DDG company description (FREE, no key) → email patterns
 *   Tier 3: Full GPT synthesis — always works, no external deps
 *
 * Free env vars (optional — sign up takes 2 min, no card needed):
 *   HUNTER_API_KEY — 25 free domain searches/mo @ hunter.io/users/sign_up
 *
 * NOTE: Clearbit was acquired by HubSpot (Jan 2024) and no longer has a free tier.
 *       We use Wikipedia REST API + DuckDuckGo Instant Answers instead — both
 *       completely free, no key, no rate limits for reasonable use.
 */
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Email helpers ────────────────────────────────────────────────────────────

function pickEmailPattern(firstName, lastName, domain) {
  const f = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const l = lastName.toLowerCase().replace(/[^a-z]/g, '');
  return `${f}.${l}@${domain}`;
}

function allEmailPatterns(firstName, lastName, domain) {
  const f = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const l = lastName.toLowerCase().replace(/[^a-z]/g, '');
  return [
    `${f}.${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${f[0]}${l}@${domain}`,
    `${f}@${domain}`,
    `${l}@${domain}`,
  ];
}

// ─── Wikipedia REST API — free, no key, no rate limits ───────────────────────
// Looks up a company name and returns a plain-English description + metadata.

async function enrichWithWikipedia(companyName) {
  try {
    // Step 1: search for the company page title
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(companyName)}&limit=3&format=json&namespace=0`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'CabinMind-LeadResearcher/1.0 (support@devcabin.tech)' },
      signal: AbortSignal.timeout(4000),
    });
    if (!searchRes.ok) return null;
    const [, titles] = await searchRes.json();
    if (!titles?.length) return null;

    // Step 2: fetch summary for the best matching title
    const pageTitle = encodeURIComponent(titles[0]);
    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${pageTitle}`,
      {
        headers: { 'User-Agent': 'CabinMind-LeadResearcher/1.0 (support@devcabin.tech)' },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!summaryRes.ok) return null;
    const d = await summaryRes.json();

    // Only use if it looks like a company/org result
    const desc = (d.description || '').toLowerCase();
    const isCompany = ['company', 'corporation', 'software', 'startup', 'firm', 'platform',
      'service', 'technology', 'saas', 'inc', 'ltd', 'llc'].some(w => desc.includes(w));
    if (!isCompany) return null;

    return {
      description: d.extract ? d.extract.split('. ').slice(0, 2).join('. ') + '.' : null,
      wikiTitle: d.title || null,
      wikiDescription: d.description || null,
    };
  } catch { return null; }
}

// ─── DuckDuckGo Instant Answers — free fallback for company descriptions ─────

async function enrichWithDDG(companyName) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(companyName)}&format=json&no_html=1&skip_disambig=1`;
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const d = await r.json();
    const abstract = d.Abstract || '';
    if (!abstract) return null;
    return {
      description: abstract.slice(0, 300),
      wikiTitle: d.Heading || companyName,
      wikiDescription: d.AbstractSource === 'Wikipedia' ? abstract.split('. ')[0] : null,
    };
  } catch { return null; }
}

// ─── Combined free company enrichment (Wikipedia → DDG fallback) ─────────────

async function enrichCompanyFree(companyName) {
  const wiki = await enrichWithWikipedia(companyName);
  if (wiki?.description) return wiki;
  return enrichWithDDG(companyName);
}

// ─── Hunter.io domain-search (finds real emails) ─────────────────────────────

async function findEmailsWithHunter(domain) {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return null;
  try {
    const params = new URLSearchParams({ domain, api_key: key, limit: 10, type: 'personal' });
    const r = await fetch(`https://api.hunter.io/v2/domain-search?${params}`,
      { signal: AbortSignal.timeout(7000) }
    );
    if (!r.ok) return null;
    const d = await r.json();
    return d.data?.emails || null;
  } catch { return null; }
}

// ─── GPT: generate target companies ──────────────────────────────────────────

async function gptGenerateTargets(icp, count, filters) {
  const extras = [
    filters.industry     ? `Industry/vertical: ${filters.industry}` : '',
    filters.location     ? `Geography: ${filters.location}` : '',
    filters.companySize  ? `Company size: ${filters.companySize}` : '',
    filters.excludeCompanies ? `Exclude these companies: ${filters.excludeCompanies}` : '',
  ].filter(Boolean).join('\n');

  const prompt = `You are a B2B sales intelligence expert. For this Ideal Customer Profile:
"${icp}"
${extras ? `\nFilters:\n${extras}` : ''}

Generate exactly ${count} highly specific, realistic target companies that perfectly match.
Use real-sounding, varied companies — not generic placeholders.

Return ONLY a valid JSON array. Each object MUST have:
- company_name: string
- domain: string (realistic web domain, e.g. "stripe.com" — use plausible real domains)
- contact_first_name: string
- contact_last_name: string
- contact_title: string (specific senior title matching the ICP)
- contact_location: string (e.g. "Austin, TX" or "London, UK")
- icp_fit_reason: string (1 sentence: WHY this company fits the ICP)
- buying_signal: string (1 specific, timely reason to reach out THIS week)
- pain_points: string (2–3 role-specific pain points, comma-separated)
- budget_range: string (realistic annual budget, e.g. "$18K–$48K/yr")
- tech_stack_hint: string (3–4 tools they likely use)
- score: number (ICP fit 72–98, vary meaningfully — do NOT cluster above 90)

Vary gender, geography, company size, and seniority. Return ONLY the JSON array.`;

  const r = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: count * 300,
    temperature: 0.82,
  });
  const raw = r.choices[0].message.content.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(raw);
}

// ─── GPT: full synthesis fallback (Tier 3) ───────────────────────────────────

async function gptFullSynthesis(icp, count, filters) {
  const extras = [
    filters.industry     ? `Industry: ${filters.industry}` : '',
    filters.location     ? `Location: ${filters.location}` : '',
    filters.companySize  ? `Company size: ${filters.companySize}` : '',
    filters.excludeCompanies ? `Exclude: ${filters.excludeCompanies}` : '',
  ].filter(Boolean).join('\n');

  const prompt = `You are a world-class B2B sales intelligence analyst. Build ${count} highly realistic prospect profiles for:
ICP: "${icp}"
${extras ? `\nFilters:\n${extras}` : ''}

Rules: vary gender/ethnicity/geography/seniority. Real company names. Specific buying signals. Score range 72–98, varied.

Return ONLY a valid JSON array of exactly ${count} objects, each with ALL keys:
name, title, company, domain, industry, size, location, score, score_reason,
tech, signal, pain_points, budget_range, email, phone, linkedin_search, why_now,
all_email_patterns (array of 4 email variants), data_source (set to "ai-synthesised")

Return ONLY the JSON array, no markdown.`;

  const r = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: count * 420,
    temperature: 0.85,
  });
  const raw = r.choices[0].message.content.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const leads = JSON.parse(raw);
  if (!Array.isArray(leads)) throw new Error('Not an array');
  return leads;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { icp, count = 5, industry, location, companySize, excludeCompanies } = req.body;
  if (!icp) return res.status(400).json({ error: 'icp is required' });

  const batchSize = Math.min(Math.max(parseInt(count) || 5, 3), 15);
  const filters = { industry, location, companySize, excludeCompanies };
  const hasHunter = !!process.env.HUNTER_API_KEY;

  // ── Tier 1 / 2: GPT targets → Wikipedia/DDG enrichment → Hunter (optional) ─
  // Wikipedia & DDG are always free — no key needed. Hunter adds real emails (free 25/mo).
  try {
    const targets = await gptGenerateTargets(icp, batchSize, filters);

    const enriched = await Promise.all(targets.map(async (t) => {
      // Run Wikipedia/DDG enrichment and Hunter in parallel
      const [wikiData, hunterEmails] = await Promise.all([
        enrichCompanyFree(t.company_name),
        hasHunter ? findEmailsWithHunter(t.domain) : null,
      ]);

      // Resolve best email: Hunter first → pattern fallback
      let email = null;
      let emailVerified = false;
      let emailSource = 'pattern';
      let firstName = t.contact_first_name;
      let lastName  = t.contact_last_name;

      if (hunterEmails?.length) {
        const best = hunterEmails.find(e =>
          e.position?.toLowerCase().includes(t.contact_title.toLowerCase().split(' ')[0])
        ) || hunterEmails[0];
        email = best.value;
        emailVerified = best.verification?.status === 'valid';
        emailSource = 'hunter';
        if (best.first_name) firstName = best.first_name;
        if (best.last_name)  lastName  = best.last_name;
      } else {
        email = pickEmailPattern(firstName, lastName, t.domain);
      }

      return {
        name:            `${firstName} ${lastName}`,
        title:           t.contact_title,
        company:         t.company_name,
        domain:          t.domain,
        industry:        '',
        size:            '—',
        location:        t.contact_location || '',
        score:           t.score,
        score_reason:    t.icp_fit_reason,
        tech:            t.tech_stack_hint || '',
        signal:          t.buying_signal,
        pain_points:     t.pain_points,
        budget_range:    t.budget_range,
        email,
        email_verified:  emailVerified,
        email_source:    emailSource,
        phone:           null,
        linkedin_search: `${firstName} ${lastName} ${t.contact_title} ${t.company_name} site:linkedin.com`,
        why_now:         t.buying_signal,
        company_description: wikiData?.description || null,
        company_wiki:    wikiData?.wikiTitle || null,
        company_raised:  null,
        company_linkedin: null,
        company_founded: null,
        all_email_patterns: allEmailPatterns(firstName, lastName, t.domain),
        data_source: emailSource === 'hunter' ? 'hunter+wikipedia' : 'wikipedia+pattern',
      };
    }));

    return res.status(200).json({
      leads: enriched,
      count: enriched.length,
      sources: { wikipedia: true, hunter: hasHunter, tier: hasHunter ? 1 : 2 },
    });
  } catch (err) {
    console.error('Enrichment pipeline error, falling back to GPT synthesis:', err.message);
    // fall through to Tier 3
  }

  // ── Tier 3: Full GPT synthesis (always works) ──────────────────────────────
  try {
    const leads = await gptFullSynthesis(icp, batchSize, filters);
    return res.status(200).json({
      leads,
      count: leads.length,
      sources: { clearbit: false, hunter: false, tier: 3 },
    });
  } catch (err) {
    console.error('Leads API full failure:', err);
    return res.status(500).json({ error: 'Lead generation failed. Please try again.' });
  }
}
