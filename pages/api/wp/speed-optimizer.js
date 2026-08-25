/**
 * /api/wp/speed-optimizer
 * CabinMind WordPress Speed Optimizer
 * Free tier: 1 audit per day per IP
 */
import OpenAI from 'openai';
import { checkFreeLimit, getClientIP, setCorsHeaders } from '../../../lib/wpFreeLimit';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const ip    = getClientIP(req);
  const check = checkFreeLimit(ip, 'speed-optimizer');

  if (!check.allowed) {
    return res.status(429).json({
      error:      'free_limit_reached',
      message:    'Free tier allows 1 audit per day. Upgrade for unlimited audits and multi-page tracking.',
      upgradeUrl: 'https://wp.devcabin.tech/agents/speed-optimizer',
    });
  }

  let { url } = req.body || {};
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url is required' });
  url = url.trim().replace(/\/$/, '');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  // ── Google PageSpeed Insights ────────────────────────────────────────────────
  const psiKey = process.env.PAGESPEED_API_KEY || '';
  const psiUrl = [
    'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
    '?url=', encodeURIComponent(url),
    '&strategy=mobile',
    '&category=performance&category=seo&category=accessibility&category=best-practices',
    psiKey ? '&key=' + psiKey : '',
  ].join('');

  let psiData  = null;
  let psiError = null;
  try {
    const r = await fetch(psiUrl, { signal: AbortSignal.timeout(20000) });
    if (r.ok) { psiData = await r.json(); }
    else { psiError = 'PageSpeed API returned ' + r.status; }
  } catch (e) { psiError = e.message; }

  if (!psiData) {
    // AI-only fallback
    const fallback = await aiOnlyAnalysis(url, openai);
    return res.status(200).json({ success: true, url, source: 'ai-fallback', data: fallback, upgradeUrl: 'https://wp.devcabin.tech/agents/speed-optimizer' });
  }

  // ── Extract scores ───────────────────────────────────────────────────────────
  const cats   = psiData.lighthouseResult?.categories || {};
  const audits = psiData.lighthouseResult?.audits     || {};

  const scores = {
    performance:   Math.round((cats.performance?.score           || 0) * 100),
    seo:           Math.round((cats.seo?.score                   || 0) * 100),
    accessibility: Math.round((cats.accessibility?.score         || 0) * 100),
    bestPractices: Math.round((cats['best-practices']?.score     || 0) * 100),
  };

  const cwv = {
    lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
    cls: audits['cumulative-layout-shift']?.displayValue  || 'N/A',
    fcp: audits['first-contentful-paint']?.displayValue   || 'N/A',
    tbt: audits['total-blocking-time']?.displayValue      || 'N/A',
    tti: audits['interactive']?.displayValue              || 'N/A',
  };

  const opportunities = Object.values(audits)
    .filter(a => a.details?.type === 'opportunity' && (a.numericValue || 0) > 300)
    .sort((a, b) => (b.numericValue || 0) - (a.numericValue || 0))
    .slice(0, 8)
    .map(a => ({
      title:       a.title,
      impact:      a.displayValue || '',
      score:       a.score,
    }));

  // ── AI recommendations ───────────────────────────────────────────────────────
  const aiPrompt = `You are a WordPress performance expert. Based on these Lighthouse scores, give WordPress-specific fix recommendations.

URL: ${url}
Scores — Performance: ${scores.performance}, SEO: ${scores.seo}, Accessibility: ${scores.accessibility}
Core Web Vitals — LCP: ${cwv.lcp}, CLS: ${cwv.cls}, FCP: ${cwv.fcp}, TBT: ${cwv.tbt}
Top failing audits: ${opportunities.map(o => o.title).join('; ')}

Provide 5–7 prioritised, WordPress-specific fixes. Name real plugins where relevant.

Respond ONLY with valid JSON:
{
  "fixes": [
    { "priority": 1, "category": "Images|Caching|JavaScript|CSS|Server|Database|CDN|Fonts", "title": "string", "description": "string", "wpSolution": "Plugin name or server config step", "estimatedGain": "e.g. +8 points" }
  ],
  "quickWins": ["Action completable in under 5 minutes"],
  "topPlugin": "Single most impactful plugin to install right now",
  "summary": "2-3 sentence plain-English diagnosis and action plan"
}`;

  let aiData = {};
  try {
    const c = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      messages:        [{ role: 'user', content: aiPrompt }],
      response_format: { type: 'json_object' },
      max_tokens:      1000,
      temperature:     0.2,
    });
    aiData = JSON.parse(c.choices[0].message.content);
  } catch {}

  return res.status(200).json({
    success:    true,
    url,
    source:     'pagespeed',
    data:       { scores, cwv, opportunities, ...aiData },
    upgradeUrl: 'https://wp.devcabin.tech/agents/speed-optimizer',
  });
}

async function aiOnlyAnalysis(url, openai) {
  const prompt = `You are a WordPress performance expert. Provide general speed recommendations for ${url}. Note live data was unavailable.
Respond ONLY with valid JSON:
{
  "scores": { "performance": null, "seo": null, "accessibility": null, "bestPractices": null },
  "cwv": { "lcp": "N/A", "cls": "N/A", "fcp": "N/A", "tbt": "N/A", "tti": "N/A" },
  "opportunities": [],
  "fixes": [{ "priority": 1, "category": "string", "title": "string", "description": "string", "wpSolution": "string", "estimatedGain": "string" }],
  "quickWins": ["string"],
  "topPlugin": "string",
  "summary": "General recommendations — live PageSpeed data was unavailable for this URL."
}`;
  try {
    const c = await openai.chat.completions.create({
      model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }, max_tokens: 800, temperature: 0.3,
    });
    return JSON.parse(c.choices[0].message.content);
  } catch {
    return { summary: 'Could not retrieve data. Please try again.' };
  }
}
