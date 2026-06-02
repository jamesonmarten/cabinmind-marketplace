/**
 * /api/audit
 * Tier 1: Google PageSpeed Insights (real Lighthouse scores).
 * Tier 2: AI-generated audit fallback via GPT-4o mini.
 * Both tiers also include AI-powered tech stack detection (Wappalyzer-style).
 */
import OpenAI from 'openai';
import { withProtection } from '../../lib/rateLimit';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default withProtection('audit', async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  // Normalise
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  url = url.replace(/\/$/, '');

  // Run tech stack detection in parallel with PSI — never blocks the main audit
  const techStackPromise = detectTechStack(url);

  // ── Tier 1: Google PageSpeed Insights ──────────────────────────────────────
  const apiKey = process.env.PAGESPEED_API_KEY || '';
  const PSI_URL =
    'https://www.googleapis.com/pagespeedonline/v5/runPagespeed' +
    '?url=' + encodeURIComponent(url) +
    '&strategy=mobile' +
    '&category=performance' +
    '&category=seo' +
    '&category=accessibility' +
    '&category=best-practices' +
    (apiKey ? '&key=' + apiKey : '');

  let psiData = null;
  let psiError = null;

  try {
    const r = await fetch(PSI_URL, { signal: AbortSignal.timeout(20000) });
    if (r.ok) {
      psiData = await r.json();
    } else {
      const errBody = await r.json().catch(() => ({}));
      psiError = errBody?.error?.message || ('PageSpeed API returned ' + r.status);
      console.warn('[audit] PSI error — falling back to AI audit:', psiError);
    }
  } catch (err) {
    psiError = err.message;
    console.warn('[audit] PSI unreachable — falling back to AI audit:', psiError);
  }

  const techStack = await techStackPromise;

  if (!psiData) {
    return runAiAudit(url, res, techStack);
  }
  return parsePsiAndRespond(psiData, url, res, techStack);
});

// ── Tech stack detection (Wappalyzer-style via AI + HTTP headers) ────────────
async function detectTechStack(url) {
  let headers = {};
  try {
    const r = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CabinMindAudit/1.0)' },
    });
    // Collect useful response headers
    for (const h of ['server','x-powered-by','x-generator','x-drupal-cache','x-wp-total','cf-ray','x-vercel-id','x-amz-cf-id','x-cache','via','x-shopify-stage']) {
      const v = r.headers.get(h);
      if (v) headers[h] = v;
    }
  } catch {}

  let hostname = url;
  try { hostname = new URL(url).hostname.replace(/^www\./, ''); } catch {}

  const headerStr = Object.entries(headers).map(([k,v]) => `${k}: ${v}`).join('\n') || 'none detected';

  const prompt = `You are a web technology analyst. Identify the tech stack for: ${url}

HTTP response headers:
${headerStr}

Based on the domain name "${hostname}" and headers, identify what technologies this site likely uses.

Return ONLY valid JSON in this exact shape — no markdown, no prose:
{
  "technologies": [
    {
      "name": "WordPress",
      "category": "CMS",
      "confidence": "high",
      "icon": "📝",
      "pros": ["Huge plugin ecosystem", "Easy content management", "Large community"],
      "cons": ["Can be slow without optimisation", "Security vulnerabilities if unpatched", "Plugin conflicts common"],
      "recommendation": "Ensure you're running latest version, use a caching plugin like WP Rocket, and audit plugins quarterly."
    }
  ]
}

Categories to use: CMS, Hosting, CDN, Analytics, Framework, E-commerce, Marketing, Security, Font, Payment, Chat, Email, Other

Confidence levels: high, medium, low

Include 3–8 technologies. Be specific — "Cloudflare" not "CDN provider". Each tech needs exactly: name, category, confidence, icon (emoji), pros (array of 3), cons (array of 2–3), recommendation (1 sentence).

If you can't identify specific technologies, make educated guesses based on the domain/headers — but mark them as "low" confidence.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.4,
    });
    let s = completion.choices[0].message.content.trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    if (s[0] !== '{') { const m = s.match(/(\{[\s\S]*\})/); if (m) s = m[1]; else return null; }
    return JSON.parse(s);
  } catch (e) {
    console.warn('[audit] tech stack detection failed:', e.message);
    return null;
  }
}

// ── Shared fix/impact hint maps ─────────────────────────────────────────────
const FIX_HINTS = {
  'first-contentful-paint':    'Eliminate render-blocking resources and inline critical CSS.',
  'largest-contentful-paint':  'Serve images via CDN, use WebP, preload the hero image.',
  'total-blocking-time':       'Split large JS bundles, defer third-party scripts.',
  'cumulative-layout-shift':   'Set explicit width/height on images and embeds.',
  'speed-index':               'Reduce server response time; enable HTTP/2.',
  'interactive':               'Reduce JavaScript execution time.',
  'render-blocking-resources': 'Use <link rel=preload> for critical assets.',
  'uses-optimized-images':     'Convert images to WebP/AVIF; compress with Squoosh.',
  'uses-responsive-images':    'Use srcset to serve appropriately sized images.',
  'offscreen-images':          'Add loading="lazy" to below-the-fold images.',
  'unused-javascript':         'Tree-shake unused code; split by route.',
  'unused-css-rules':          'Remove unused CSS with PurgeCSS.',
  'meta-description':          'Add a unique 120–160 character meta description to every page.',
  'document-title':            'Add a descriptive, keyword-rich <title> tag.',
  'link-text':                 'Replace "click here" with descriptive anchor text.',
  'crawlable-anchors':         'Ensure all links have valid, crawlable href attributes.',
  'is-crawlable':              'Remove noindex tags blocking search engines.',
  'robots-txt':                'Add or fix your robots.txt file.',
  'image-alt':                 'Add descriptive alt attributes to all <img> elements.',
  'button-name':               'Add aria-label or visible text to all buttons.',
  'color-contrast':            'Increase text/background contrast to at least 4.5:1.',
  'label':                     'Attach <label> elements to every form input.',
  'aria-allowed-attr':         'Remove invalid ARIA attribute combinations.',
  'uses-https':                'Migrate all resources to HTTPS.',
  'no-vulnerable-libraries':   'Update outdated JavaScript libraries.',
  'csp-xss':                   'Add a Content Security Policy header.',
  'geolocation-on-start':      'Do not request geolocation on page load.',
};

const IMPACT_HINTS = {
  'first-contentful-paint':   '-40% bounce rate',
  'largest-contentful-paint': '-55% bounce rate',
  'total-blocking-time':      '+30% engagement',
  'cumulative-layout-shift':  '+18% conversions',
  'uses-optimized-images':    '1–3s faster load',
  'offscreen-images':         '0.5–1.5s faster load',
  'unused-javascript':        '0.8s faster TTI',
  'meta-description':         '+15% CTR in search',
  'image-alt':                '+10% image traffic',
  'color-contrast':           'WCAG AA compliant',
  'button-name':              'Keyboard accessible',
};

const PAD_OK = [{ sev: 'low', text: 'No critical issues found in this category', fix: 'Keep monitoring as your site evolves.', impact: 'Already optimised' }];

// ── Tier 1: Parse real PSI response ─────────────────────────────────────────
function parsePsiAndRespond(psiData, url, res, techStack) {
  const cats   = psiData.lighthouseResult?.categories ?? {};
  const audits = psiData.lighthouseResult?.audits     ?? {};

  const s = (key) => Math.round((cats[key]?.score ?? 0) * 100);
  const perfScore = s('performance');
  const seoScore  = s('seo');
  const a11yScore = s('accessibility');
  const bpScore   = s('best-practices');

  function extractIssues(auditRefs, maxItems = 4) {
    return (auditRefs || [])
      .filter(ref => {
        const a = audits[ref.id];
        return a && a.score !== null && a.score < 1 && a.title;
      })
      .slice(0, maxItems)
      .map(ref => {
        const a = audits[ref.id];
        const score = a.score ?? 0;
        const sev = score < 0.5 ? 'high' : score < 0.9 ? 'medium' : 'low';
        let text = a.title.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
        if (a.displayValue) text += ' — ' + a.displayValue;
        if (text.length > 90) text = text.slice(0, 87) + '…';
        return {
          sev,
          text,
          fix:    FIX_HINTS[ref.id]    || 'Review and fix this issue based on the full report.',
          impact: IMPACT_HINTS[ref.id] || 'Improves user experience',
        };
      });
  }

  const perfRefs = cats['performance']?.auditRefs    ?? [];
  const seoRefs  = cats['seo']?.auditRefs            ?? [];
  const a11yRefs = cats['accessibility']?.auditRefs  ?? [];
  const bpRefs   = cats['best-practices']?.auditRefs ?? [];

  const uxScore    = Math.round(perfScore * 0.6 + bpScore * 0.4);
  const perfIssues = extractIssues(perfRefs, 4);
  const seoIssues  = extractIssues(seoRefs,  4);
  const a11yIssues = extractIssues(a11yRefs, 4);
  const uxIssues   = extractIssues([...bpRefs, ...perfRefs.slice(0, 2)], 4);

  const results = {
    seo:  { label: 'SEO',           score: seoScore,  color: 'from-yellow-400 to-orange-400', issues: seoIssues.length  ? seoIssues  : PAD_OK },
    perf: { label: 'Performance',   score: perfScore, color: 'from-red-400 to-pink-400',      issues: perfIssues.length ? perfIssues : PAD_OK },
    ux:   { label: 'UX',            score: uxScore,   color: 'from-orange-400 to-amber-400',  issues: uxIssues.length   ? uxIssues   : PAD_OK },
    a11y: { label: 'Accessibility', score: a11yScore, color: 'from-green-400 to-emerald-400', issues: a11yIssues.length ? a11yIssues : PAD_OK },
  };

  const avgScore    = Math.round((seoScore + perfScore + a11yScore + uxScore) / 4);
  const scoreGap    = Math.max(0, 90 - avgScore);
  const trafficGain = Math.round(scoreGap * 85 + 200);

  return res.status(200).json({ results, trafficGain, audited: url, source: 'pagespeed', techStack: techStack || null });
}

// ── Tier 2: AI-powered audit fallback ───────────────────────────────────────
async function runAiAudit(url, res, techStack) {
  let hostname = url;
  try { hostname = new URL(url).hostname.replace(/^www\./, ''); } catch {}

  const prompt = `You are a senior web performance and SEO consultant with 15 years of experience. Conduct a realistic, expert-quality website audit for: ${url}

Based on common patterns for sites like "${hostname}", generate a detailed audit. Make scores realistic and varied — most sites score 50–80 range, not perfect 90s.

Return ONLY valid JSON (no markdown fences) in this exact shape:
{
  "scores": {
    "performance": <integer 30-85>,
    "seo": <integer 45-90>,
    "accessibility": <integer 40-88>,
    "ux": <integer 35-82>
  },
  "issues": {
    "perf": [
      { "sev": "high"|"medium"|"low", "text": "<specific issue title — max 80 chars>", "fix": "<actionable fix — 1 sentence>", "impact": "<business impact>" }
    ],
    "seo": [ ...same shape, 3-4 issues ],
    "a11y": [ ...same shape, 3-4 issues ],
    "ux":   [ ...same shape, 3-4 issues ]
  }
}

Rules:
- Each category needs 3–4 real issues, not generic ones
- Vary severity levels — not everything should be "high"
- Make fixes specific and actionable (not "improve your SEO")
- Impact should be a measurable business metric (e.g. "+12% CTR", "2s faster load")
- Scores must be consistent with the number/severity of issues
- Return ONLY the JSON object`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.6,
    });

    let s = completion.choices[0].message.content.trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    // If GPT prefixed with prose, extract the first { block
    if (s[0] !== '{') {
      const m = s.match(/(\{[\s\S]*\})/);
      if (m) s = m[1];
      else throw new Error('GPT returned non-JSON: ' + s.slice(0, 80));
    }
    const data = JSON.parse(s);

    const { scores, issues } = data;

    const results = {
      perf: { label: 'Performance',   score: scores.performance,   color: 'from-red-400 to-pink-400',      issues: issues.perf  ?? PAD_OK },
      seo:  { label: 'SEO',           score: scores.seo,           color: 'from-yellow-400 to-orange-400', issues: issues.seo   ?? PAD_OK },
      a11y: { label: 'Accessibility', score: scores.accessibility, color: 'from-green-400 to-emerald-400', issues: issues.a11y  ?? PAD_OK },
      ux:   { label: 'UX',            score: scores.ux,            color: 'from-orange-400 to-amber-400',  issues: issues.ux    ?? PAD_OK },
    };

    const avgScore    = Math.round((scores.performance + scores.seo + scores.accessibility + scores.ux) / 4);
    const scoreGap    = Math.max(0, 90 - avgScore);
    const trafficGain = Math.round(scoreGap * 85 + 200);

    return res.status(200).json({ results, trafficGain, audited: url, source: 'ai', techStack: techStack || null });

  } catch (err) {
    console.error('[audit] AI fallback failed:', err.message);
    return res.status(502).json({ error: 'Audit service temporarily unavailable. Please try again in a moment.' });
  }
}
