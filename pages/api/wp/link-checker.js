/**
 * /api/wp/link-checker
 * CabinMind Broken Link Checker & Redirect Mapper
 * Free tier: 1 crawl per day per IP (up to 100 URLs)
 */
import { checkFreeLimit, getClientIP, setCorsHeaders } from '../../../lib/wpFreeLimit';

const FREE_URL_LIMIT = 100;
const CONCURRENCY    = 5;
const HEAD_TIMEOUT   = 8000;
const MAX_RUNTIME    = 44000; // stay under Vercel 60 s limit

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const ip    = getClientIP(req);
  const check = checkFreeLimit(ip, 'link-checker');

  if (!check.allowed) {
    return res.status(429).json({
      error:      'free_limit_reached',
      message:    'Free tier allows 1 crawl per day (up to 100 URLs). Upgrade for unlimited crawls.',
      upgradeUrl: 'https://wp.devcabin.tech/agents/link-checker',
    });
  }

  let { url, maxUrls } = req.body || {};
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url is required' });
  url = url.trim().replace(/\/$/, '');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const limit = Math.min(Math.max(parseInt(maxUrls, 10) || 50, 1), FREE_URL_LIMIT);
  const start = Date.now();
  const ua    = 'Mozilla/5.0 (compatible; CabinMindLinkChecker/1.0; +https://products.devcabin.tech)';

  // ── Discover URLs ─────────────────────────────────────────────────────────────
  const discovered = new Set([url]);

  for (const stem of ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml']) {
    if (discovered.size >= limit) break;
    try {
      const r = await fetch(url + stem, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(6000) });
      if (!r.ok) continue;
      const xml  = await r.text();
      const locs = xml.match(/<loc>(https?:\/\/[^<]+)<\/loc>/gi) || [];
      for (const m of locs) {
        discovered.add(m.replace(/<\/?loc>/gi, '').trim());
        if (discovered.size >= limit) break;
      }
    } catch {}
  }

  // Supplement from homepage links if we haven't hit limit
  if (discovered.size < limit) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const html  = await r.text();
        const hrefs = html.match(/href=["']([^"'#?][^"']*?)["']/gi) || [];
        for (const raw of hrefs) {
          let href = raw.replace(/^href=["']/i, '').replace(/["']$/, '').trim();
          if (href.startsWith('/')) href = url + href;
          if (/^https?:\/\//.test(href)) discovered.add(href);
          if (discovered.size >= limit) break;
        }
      }
    } catch {}
  }

  // ── Check each URL ────────────────────────────────────────────────────────────
  const urlList = [...discovered].slice(0, limit);
  const results = [];

  for (let i = 0; i < urlList.length; i += CONCURRENCY) {
    if (Date.now() - start > MAX_RUNTIME) break;

    const batch  = urlList.slice(i, i + CONCURRENCY);
    const checks = batch.map(async (checkUrl) => {
      const t0 = Date.now();
      try {
        const r = await fetch(checkUrl, {
          method:   'HEAD',
          headers:  { 'User-Agent': ua },
          signal:   AbortSignal.timeout(HEAD_TIMEOUT),
          redirect: 'manual',
        });
        return {
          url:        checkUrl,
          status:     r.status,
          statusText: r.statusText || '',
          redirectTo: (r.status >= 300 && r.status < 400) ? (r.headers.get('location') || '') : null,
          ms:         Date.now() - t0,
          ok:         r.status >= 200 && r.status < 300,
        };
      } catch (e) {
        return { url: checkUrl, status: 0, statusText: String(e.message).slice(0, 80), redirectTo: null, ms: Date.now() - t0, ok: false };
      }
    });

    results.push(...await Promise.all(checks));
  }

  const ok        = results.filter(r => r.ok);
  const broken    = results.filter(r => !r.ok && !(r.status >= 300 && r.status < 400));
  const redirects = results.filter(r => r.status >= 300 && r.status < 400);

  return res.status(200).json({
    success:    true,
    url,
    scanned:    results.length,
    summary:    { ok: ok.length, broken: broken.length, redirects: redirects.length },
    broken,
    redirects,
    all:        results,
    upgradeUrl: 'https://wp.devcabin.tech/agents/link-checker',
    note:       results.length >= limit
      ? `Free tier scanned the first ${limit} URLs. Upgrade for unlimited crawls.`
      : null,
  });
}
