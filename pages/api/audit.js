/**
 * /api/audit
 * Calls Google PageSpeed Insights API (free, no key needed for ≤25 req/day/IP).
 * Returns real Lighthouse scores + categorised issues derived from the audit data.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  // Normalise — ensure https:// prefix
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  // Strip trailing slash for consistency
  url = url.replace(/\/$/, '');

  const PSI_URL =
    'https://www.googleapis.com/pagespeedonline/v5/runPagespeed' +
    '?url=' + encodeURIComponent(url) +
    '&strategy=mobile' +
    '&category=performance' +
    '&category=seo' +
    '&category=accessibility' +
    '&category=best-practices';

  let psiData;
  try {
    const r = await fetch(PSI_URL, { signal: AbortSignal.timeout(25000) });
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}));
      return res.status(502).json({
        error: errBody?.error?.message || ('PageSpeed API returned ' + r.status),
      });
    }
    psiData = await r.json();
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ error: 'PageSpeed API timed out — try a faster site or try again.' });
    }
    return res.status(502).json({ error: 'Could not reach PageSpeed API: ' + err.message });
  }

  const cats   = psiData.lighthouseResult?.categories ?? {};
  const audits = psiData.lighthouseResult?.audits     ?? {};

  const s = (key) => Math.round((cats[key]?.score ?? 0) * 100);

  const perfScore = s('performance');
  const seoScore  = s('seo');
  const a11yScore = s('accessibility');
  const bpScore   = s('best-practices');

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
    'meta-description':          'Add a unique 120-160 character meta description to every page.',
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
    'uses-optimized-images':    '1-3s faster load',
    'offscreen-images':         '0.5-1.5s faster load',
    'unused-javascript':        '0.8s faster TTI',
    'meta-description':         '+15% CTR in search',
    'image-alt':                '+10% image traffic',
    'color-contrast':           'WCAG AA compliant',
    'button-name':              'Keyboard accessible',
  };

  function extractIssues(auditRefs, maxItems) {
    if (!maxItems) maxItems = 4;
    return (auditRefs || [])
      .filter(function(ref) {
        var a = audits[ref.id];
        return a && a.score !== null && a.score < 1 && a.title;
      })
      .slice(0, maxItems)
      .map(function(ref) {
        var a = audits[ref.id];
        var score = a.score != null ? a.score : 0;
        var sev = score < 0.5 ? 'high' : score < 0.9 ? 'medium' : 'low';
        var text = a.title.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
        if (a.displayValue) text = text + ' - ' + a.displayValue;
        if (text.length > 90) text = text.slice(0, 87) + '...';
        return {
          sev: sev,
          text: text,
          fix: FIX_HINTS[ref.id] || 'Review and fix this issue based on the full report.',
          impact: IMPACT_HINTS[ref.id] || 'Improves user experience',
        };
      });
  }

  var perfAuditRefs = cats['performance']    ? cats['performance']['auditRefs']    : [];
  var seoAuditRefs  = cats['seo']            ? cats['seo']['auditRefs']            : [];
  var a11yAuditRefs = cats['accessibility']  ? cats['accessibility']['auditRefs']  : [];
  var bpAuditRefs   = cats['best-practices'] ? cats['best-practices']['auditRefs'] : [];

  var uxScore    = Math.round(perfScore * 0.6 + bpScore * 0.4);
  var perfIssues = extractIssues(perfAuditRefs, 4);
  var seoIssues  = extractIssues(seoAuditRefs,  4);
  var a11yIssues = extractIssues(a11yAuditRefs, 4);
  var uxIssues   = extractIssues(bpAuditRefs.concat(perfAuditRefs.slice(0, 2)), 4);

  var PAD_OK = [{ sev: 'low', text: 'No critical issues found in this category', fix: 'Keep monitoring as your site evolves.', impact: 'Already optimised' }];

  var results = {
    seo:  { label: 'SEO',           score: seoScore,  color: 'from-yellow-400 to-orange-400', issues: seoIssues.length  ? seoIssues  : PAD_OK },
    perf: { label: 'Performance',   score: perfScore, color: 'from-red-400 to-pink-400',      issues: perfIssues.length ? perfIssues : PAD_OK },
    ux:   { label: 'UX',            score: uxScore,   color: 'from-orange-400 to-amber-400',  issues: uxIssues.length   ? uxIssues   : PAD_OK },
    a11y: { label: 'Accessibility', score: a11yScore, color: 'from-green-400 to-emerald-400', issues: a11yIssues.length ? a11yIssues : PAD_OK },
  };

  var avgScore    = Math.round((seoScore + perfScore + a11yScore + uxScore) / 4);
  var scoreGap    = Math.max(0, 90 - avgScore);
  var trafficGain = Math.round(scoreGap * 85 + 200);

  return res.status(200).json({ results: results, trafficGain: trafficGain, audited: url });
}
