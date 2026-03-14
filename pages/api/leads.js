/**
 * /api/leads — Fast B2B Lead Generation
 *
 * Primary:  Groq (llama-3.3-70b-versatile) — ~1-2s per 5-lead batch
 * Fallback: OpenAI (gpt-4o-mini)           — ~8-12s per 5-lead batch
 *
 * Always generates exactly 5 leads per request.
 * The dashboard calls this in a loop to stream 10, 25, 50, or 100 leads.
 *
 * Set GROQ_API_KEY in .env.local + Vercel env vars to enable Groq.
 * Falls back to OPENAI_API_KEY automatically if Groq is unavailable.
 */

import Groq from 'groq-sdk';
import OpenAI from 'openai';

const groq   = process.env.GROQ_API_KEY  ? new Groq({ apiKey: process.env.GROQ_API_KEY })   : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

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
  if (!f || !domain) return '';
  return `${f}.${l}@${domain}`;
}
function allPatterns(first, last, domain) {
  const f = (first || '').toLowerCase().replace(/[^a-z]/g, '');
  const l = (last  || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!f || !domain) return [];
  return [
    `${f}.${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${f[0] || 'x'}${l}@${domain}`,
    `${f}@${domain}`,
  ];
}

// ─── Build the prompt ─────────────────────────────────────────────────────────
function buildPrompt(icp, filters, batchNum = 1) {
  const extras = [
    filters.industry    ? `Industry: ${filters.industry}` : '',
    filters.location    ? `Location: ${filters.location}` : '',
    filters.companySize ? `Company size: ${filters.companySize}` : '',
    filters.exclude     ? `Exclude these companies: ${filters.exclude}` : '',
  ].filter(Boolean).join('\n');

  return `You are a B2B sales intelligence expert. Generate exactly 5 realistic B2B prospect profiles.

ICP: "${icp}"
${extras}
${batchNum > 1 ? `Note: This is batch ${batchNum} — generate DIFFERENT people and companies from previous batches.` : ''}

Rules:
- Use real-sounding but fictional company names and people
- Vary gender, ethnicity, geography, and seniority
- Scores must be between 72–97 and varied (not all above 90)
- Domains should be plausible (e.g. "acmecorp.io", "vertexsales.com")

Return ONLY a JSON array of exactly 5 objects. No markdown, no explanation.
Each object must have these exact fields:
{
  "name": "Full Name",
  "title": "Job Title",
  "company": "Company Name",
  "domain": "company.com",
  "location": "City, Country",
  "score": 85,
  "score_reason": "One sentence why this person fits the ICP",
  "signal": "Specific buying signal — one concrete reason to reach out this week",
  "pain_points": "2-3 specific pain points, comma-separated",
  "budget_range": "$20K–$60K/yr",
  "tech": "Tool1, Tool2, Tool3",
  "email": "firstname.lastname@domain.com",
  "company_description": "One sentence about what this company does",
  "all_email_patterns": ["f.last@domain.com", "flast@domain.com", "f@domain.com", "first@domain.com"]
}`;
}

// ─── Call Groq (primary — ~1-2s) ─────────────────────────────────────────────
async function callGroq(prompt) {
  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
    temperature: 0.8,
    response_format: { type: 'json_object' },
  });
  const content = res.choices[0]?.message?.content || '';
  // Groq json_object mode wraps arrays in an object — unwrap it
  const parsed = safeJSON(content);
  const arr = Array.isArray(parsed) ? parsed
    : parsed.leads || parsed.prospects || parsed.results
      || Object.values(parsed).find(v => Array.isArray(v))
      || [];
  if (!arr.length) throw new Error('Groq returned empty array');
  return arr;
}

// ─── Call OpenAI (fallback — ~8-12s) ─────────────────────────────────────────
async function callOpenAI(prompt) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
    temperature: 0.8,
  });
  const content = res.choices[0]?.message?.content || '';
  const parsed = safeJSON(content);
  const arr = Array.isArray(parsed) ? parsed
    : parsed.leads || parsed.prospects || parsed.results
      || Object.values(parsed).find(v => Array.isArray(v))
      || [];
  if (!arr.length) throw new Error('OpenAI returned empty array');
  return arr;
}

// ─── Generate 5 leads — Groq → OpenAI fallback ───────────────────────────────
async function generateLeads(icp, filters, batchNum) {
  const prompt = buildPrompt(icp, filters, batchNum);

  let raw;
  let provider = 'groq';

  if (groq) {
    try {
      raw = await callGroq(prompt);
    } catch (err) {
      console.warn('[leads] Groq failed, falling back to OpenAI:', err.message);
      provider = 'openai-fallback';
      if (!openai) throw new Error('Both Groq and OpenAI unavailable');
      raw = await callOpenAI(prompt);
    }
  } else if (openai) {
    provider = 'openai';
    raw = await callOpenAI(prompt);
  } else {
    throw new Error('No AI provider configured — set GROQ_API_KEY or OPENAI_API_KEY');
  }

  // Normalise each lead — stamp a stable _id (name|company slug) so the
  // dashboard never needs to compute identity from the email (which can collide).
  return raw.slice(0, 5).map(l => {
    const nameParts = (l.name || '').split(' ');
    const first = nameParts[0] || '';
    const last  = nameParts.slice(1).join(' ') || '';
    const domain = (l.domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const email = l.email || emailPattern(first, last, domain);
    const patterns = Array.isArray(l.all_email_patterns) && l.all_email_patterns.length
      ? l.all_email_patterns
      : allPatterns(first, last, domain);
    const _id = `${l.name}|${l.company}`.toLowerCase().replace(/[^a-z0-9|]/g, '');

    return {
      _id,
      name:               l.name            || '',
      title:              l.title           || '',
      company:            l.company         || '',
      domain,
      industry:           l.industry        || '',
      size:               l.size            || '—',
      location:           l.location        || '',
      score:              typeof l.score === 'number' ? Math.min(Math.max(l.score, 60), 99) : 80,
      score_reason:       l.score_reason    || '',
      tech:               l.tech            || '',
      signal:             l.signal          || '',
      pain_points:        l.pain_points     || '',
      budget_range:       l.budget_range    || '',
      email,
      email_verified:     false,
      email_source:       'pattern',
      phone:              null,
      linkedin_search:    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${l.name} ${l.title || ''} ${l.company}`.trim())}`,
      why_now:            l.signal          || '',
      company_description: l.company_description || null,
      company_wiki:       null,
      all_email_patterns: patterns,
      data_source:        provider === 'groq' ? 'groq+pattern' : 'gpt+pattern',
      _provider:          provider,
    };
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────
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

    const leads = await generateLeads(icp.trim(), filters, parseInt(batchNum) || 1);
    const provider = leads[0]?._provider || 'unknown';

    return res.status(200).json({
      leads,
      count: leads.length,
      provider,
      sources: { tier: provider.startsWith('groq') ? 1 : 2 },
    });

  } catch (err) {
    console.error('[/api/leads]', err.message);
    return res.status(500).json({ error: 'Lead generation failed. Please try again.' });
  }
}
