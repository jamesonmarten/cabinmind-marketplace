/**
 * /api/wp/vuln-scan
 * CabinMind WP Plugin Vulnerability Scanner
 * Free tier: 1 scan per day per IP
 */
import OpenAI from 'openai';
import { checkFreeLimit, getClientIP, setCorsHeaders } from '../../../lib/wpFreeLimit';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const ip    = getClientIP(req);
  const check = checkFreeLimit(ip, 'vuln-scan');

  if (!check.allowed) {
    return res.status(429).json({
      error:      'free_limit_reached',
      message:    'Free tier allows 1 scan per day. Upgrade for unlimited scans and per-site tracking.',
      upgradeUrl: 'https://wp.devcabin.tech/agents/vulnerability-scanner',
    });
  }

  let { url } = req.body || {};
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url is required' });
  url = url.trim().replace(/\/$/, '');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  // ── Fetch page for plugin/theme fingerprinting ───────────────────────────────
  let html        = '';
  let respHeaders = {};
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CabinMindScanner/1.0; +https://products.devcabin.tech)' },
      signal:  AbortSignal.timeout(12000),
      redirect: 'follow',
    });
    html        = (await r.text()).slice(0, 50000);
    respHeaders = Object.fromEntries(r.headers.entries());
  } catch (fetchErr) {
    html = `[Could not fetch: ${fetchErr.message}]`;
  }

  // ── AI vulnerability analysis ────────────────────────────────────────────────
  const prompt = `You are a WordPress security auditor. Analyse the following site data for vulnerabilities.

TARGET: ${url}
HTTP HEADERS: ${JSON.stringify(respHeaders).slice(0, 1500)}
HTML (first 6000 chars): ${html.slice(0, 6000)}

Tasks:
1. Detect WordPress version from meta generator tags, ?ver= params, or readme.html clues.
2. Extract plugin slugs from /wp-content/plugins/SLUG/ paths in src/href attributes.
3. Detect the active theme from /wp-content/themes/SLUG/ paths.
4. Flag exposed attack surfaces: wp-login.php visible, xmlrpc.php, readme.html, /wp-json/wp/v2/users.
5. Check HTTP security headers: X-Frame-Options, X-Content-Type-Options, Content-Security-Policy, HSTS.
6. For each detected plugin, note any known CVEs or vulnerability classes from your training data.
7. Assign an overall risk level.

Respond ONLY with valid JSON matching this schema exactly:
{
  "wordpressVersion": "string or null",
  "plugins": [
    { "slug": "string", "name": "string", "versionDetected": "string or null", "riskLevel": "critical|high|medium|low|info", "cve": "string or null", "issue": "string" }
  ],
  "theme": { "slug": "string or null", "name": "string or null", "riskLevel": "low|medium|high" },
  "exposedEndpoints": [
    { "path": "string", "severity": "critical|high|medium|low", "description": "string" }
  ],
  "missingHeaders": [
    { "header": "string", "severity": "medium|low", "recommendation": "string" }
  ],
  "overallRisk": "critical|high|medium|low",
  "summary": "2-3 sentence plain-English summary for the site owner"
}`;

  let data;
  try {
    const completion = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      messages:        [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens:      1400,
      temperature:     0.1,
    });
    data = JSON.parse(completion.choices[0].message.content);
  } catch {
    return res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }

  return res.status(200).json({
    success:    true,
    url,
    data,
    usedToday:  check.used,
    freeLimit:  check.limit,
    upgradeUrl: 'https://wp.devcabin.tech/agents/vulnerability-scanner',
  });
}
