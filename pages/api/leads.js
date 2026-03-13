/**
 * /api/leads — Real B2B Lead Generation Pipeline
 *
 * 3-tier enrichment:
 *   Tier 1: GPT generates targets → Clearbit enriches company → Hunter finds real emails
 *   Tier 2: GPT generates targets → Clearbit enriches company → email pattern generation
 *   Tier 3: Full GPT synthesis (always succeeds — no external deps)
 *
 * Optional env vars (degrades gracefully without them):
 *   CLEARBIT_API_KEY  — free @ clearbit.com, 20k calls/mo
 *   HUNTER_API_KEY    — hunter.io, $34/mo for 500 searches/mo
 */
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Email helpers ───────────────────────────────────────────────────────────

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

// ─── Clearbit company enrichment (free tier — 20k/mo) ────────────────────────

async function enrichWithClearbit(domain) {
  const key = process.env.CLEARBIT_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(
      `https://company.clearbit.com/v2/companies/find?domain=${encodeURIComponent(domain)}`,
      { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5000) }
    );
    if (!r.ok) return null;
    const d = await r.json();
    return {
      domain: d.domain || domain,
      name: d.name,
      industry: d.category?.industry || d.category?.subIndustry || null,
      employees: d.metrics?.employees || null,
      employeesRange: d.metrics?.employeesRange || null,
      raised: d.metrics?.raised ? `$${(d.metrics.raised / 1e6).toFixed(1)}M raised` : null,
      location: d.geo?.city && d.geo?.country ? `${d.geo.city}, ${d.geo.country}` : null,
      description: d.description || null,
      tech: d.tech?.slice(0, 7).join(', ') || null,
      linkedinUrl: d.linkedin?.handle ? `https://linkedin.com/company/${d.linkedin.handle}` : null,
      foundedYear: d.foundedYear || null,
      tags: d.tags?.slice(0, 4) || [],
    };
  } catch { return null; }
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
  const hasClearbit = !!process.env.CLEARBIT_API_KEY;
  const hasHunter   = !!process.env.HUNTER_API_KEY;

  // ── Tier 1 / 2: Real company pipeline (Clearbit ± Hunter) ─────────────────
  if (hasClearbit || hasHunter) {
    try {
      const targets = await gptGenerateTargets(icp, batchSize, filters);

      const enriched = await Promise.all(targets.map(async (t) => {
        const [cbData, hunterEmails] = await Promise.all([
          hasClearbit ? enrichWithClearbit(t.domain) : null,
          hasHunter   ? findEmailsWithHunter(t.domain) : null,
        ]);

        // Resolve best email
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
          const domain = cbData?.domain || t.domain;
          email = pickEmailPattern(firstName, lastName, domain);
        }

        const domain = cbData?.domain || t.domain;
        const size = cbData?.employeesRange
          ? `${cbData.employeesRange} employees`
          : cbData?.employees ? `~${cbData.employees} employees` : '—';

        return {
          name:            `${firstName} ${lastName}`,
          title:           t.contact_title,
          company:         cbData?.name || t.company_name,
          domain,
          industry:        cbData?.industry || '',
          size,
          location:        cbData?.location || t.contact_location || '',
          score:           t.score,
          score_reason:    t.icp_fit_reason,
          tech:            cbData?.tech || t.tech_stack_hint || '',
          signal:          t.buying_signal,
          pain_points:     t.pain_points,
          budget_range:    t.budget_range,
          email,
          email_verified:  emailVerified,
          email_source:    emailSource,
          phone:           null,
          linkedin_search: `${firstName} ${lastName} ${t.contact_title} ${cbData?.name || t.company_name} site:linkedin.com`,
          why_now:         t.buying_signal,
          company_description: cbData?.description || null,
          company_raised:  cbData?.raised || null,
          company_linkedin: cbData?.linkedinUrl || null,
          company_founded: cbData?.foundedYear || null,
          all_email_patterns: allEmailPatterns(firstName, lastName, domain),
          data_source: emailSource === 'hunter' ? 'hunter+clearbit' : hasClearbit ? 'clearbit+pattern' : 'pattern',
        };
      }));

      return res.status(200).json({
        leads: enriched,
        count: enriched.length,
        sources: { clearbit: hasClearbit, hunter: hasHunter, tier: hasHunter ? 1 : 2 },
      });
    } catch (err) {
      console.error('Enrichment pipeline error, falling back:', err.message);
      // fall through to Tier 3
    }
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
