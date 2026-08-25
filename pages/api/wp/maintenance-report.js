/**
 * /api/wp/maintenance-report
 * CabinMind WP Monthly Maintenance Report Generator
 * Free tier: 1 sample report per month per IP
 */
import OpenAI from 'openai';
import { checkFreeLimit, getClientIP, setCorsHeaders } from '../../../lib/wpFreeLimit';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const ip    = getClientIP(req);
  const check = checkFreeLimit(ip, 'maintenance-report');

  if (!check.allowed) {
    return res.status(429).json({
      error:      'free_limit_reached',
      message:    'Free tier allows 1 sample report per month. Upgrade for unlimited white-label reports.',
      upgradeUrl: 'https://wp.devcabin.tech/agents/maintenance-report',
    });
  }

  const { siteUrl, businessName, period } = req.body || {};
  if (!siteUrl || typeof siteUrl !== 'string') return res.status(400).json({ error: 'siteUrl is required' });

  let url = siteUrl.trim().replace(/\/$/, '');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const safeName   = String(businessName   || '').slice(0, 100).trim() || 'Your Business';
  const safePeriod = String(period || '').slice(0, 30).trim()
    || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // ── Live PageSpeed data ──────────────────────────────────────────────────────
  const psiKey = process.env.PAGESPEED_API_KEY || '';
  const psiUrl = [
    'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
    '?url=', encodeURIComponent(url),
    '&strategy=mobile&category=performance&category=seo&category=accessibility',
    psiKey ? '&key=' + psiKey : '',
  ].join('');

  let psiScores = null;
  try {
    const r = await fetch(psiUrl, { signal: AbortSignal.timeout(18000) });
    if (r.ok) {
      const d = await r.json();
      const c = d.lighthouseResult?.categories || {};
      psiScores = {
        performance:   Math.round((c.performance?.score   || 0) * 100),
        seo:           Math.round((c.seo?.score           || 0) * 100),
        accessibility: Math.round((c.accessibility?.score || 0) * 100),
      };
    }
  } catch {}

  // ── Generate report via AI ───────────────────────────────────────────────────
  const prev = psiScores
    ? { perf: psiScores.performance - Math.floor(Math.random() * 5), seo: psiScores.seo - 1 }
    : { perf: 72, seo: 68 };

  const prompt = `You are a WordPress agency writing a professional monthly maintenance report for a client.

Client: ${safeName}
Website: ${url}
Report period: ${safePeriod}
${psiScores
  ? `Live Lighthouse scores — Performance: ${psiScores.performance}/100, SEO: ${psiScores.seo}/100, Accessibility: ${psiScores.accessibility}/100`
  : 'Live scores unavailable — use realistic estimates.'}

Generate a complete, professional report. Be specific; avoid generic filler. Use realistic but optimistic values consistent with a well-maintained site.

Respond ONLY with valid JSON:
{
  "reportTitle": "string",
  "period": "string",
  "clientName": "string",
  "websiteUrl": "string",
  "executiveSummary": "2-3 sentence executive summary",
  "uptime": { "percentage": "99.9%", "downtime": "0h 4m", "incidents": 0, "notes": "string" },
  "performance": {
    "currentScore": ${psiScores?.performance || 75},
    "previousScore": ${prev.perf},
    "trend": "improved|declined|stable",
    "lcp": "string estimate",
    "cls": "string estimate",
    "notes": "string"
  },
  "updates": {
    "coreUpdates": 1,
    "pluginUpdates": 4,
    "themeUpdates": 0,
    "allCurrent": true,
    "notes": "string"
  },
  "security": {
    "scansPassed": 4,
    "issuesFound": 0,
    "issuesResolved": 0,
    "malwareDetected": false,
    "sslStatus": "Valid",
    "sslExpiry": "string (approximate month/year)",
    "notes": "string"
  },
  "backups": {
    "count": 30,
    "lastSuccessful": "string",
    "storageUsed": "string",
    "offsite": true,
    "notes": "string"
  },
  "recommendations": [
    { "priority": "high|medium|low", "action": "string", "reason": "string" }
  ],
  "nextMonthFocus": "string"
}`;

  let data;
  try {
    const completion = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      messages:        [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens:      1400,
      temperature:     0.3,
    });
    data = JSON.parse(completion.choices[0].message.content);
  } catch {
    return res.status(500).json({ error: 'Report generation failed. Please try again.' });
  }

  // Merge live PSI scores
  if (psiScores) {
    data.performance = { ...(data.performance || {}), ...psiScores };
  }

  return res.status(200).json({
    success:    true,
    data,
    upgradeUrl: 'https://wp.devcabin.tech/agents/maintenance-report',
  });
}
