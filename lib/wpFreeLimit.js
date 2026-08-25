/**
 * lib/wpFreeLimit.js
 *
 * Per-IP free-tier counter for CabinMind WordPress tool API routes.
 * Persisted in /tmp (Vercel warm instance) or data/ (local dev).
 * Resets on Vercel cold start — intentional; keeps infra simple.
 */

import fs   from 'fs';
import path from 'path';

const STORE_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/cm-wp-freetier.json'
  : path.join(process.cwd(), 'data', 'cm-wp-freetier.json');

/** tool → { max, period: 'day' | 'month' } */
const LIMITS = {
  'vuln-scan':          { max: 1, period: 'day'   },
  'plugin-recommender': { max: 2, period: 'month' },
  'speed-optimizer':    { max: 1, period: 'day'   },
  'maintenance-report': { max: 1, period: 'month' },
  'css-snippet':        { max: 3, period: 'month' },
  'link-checker':       { max: 1, period: 'day'   },
};

function periodKey(period) {
  const iso = new Date().toISOString();
  return period === 'day' ? iso.slice(0, 10) : iso.slice(0, 7);
}

function readStore() {
  try {
    return fs.existsSync(STORE_PATH)
      ? JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'))
      : {};
  } catch { return {}; }
}

function writeStore(data) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(data), 'utf8');
  } catch {}
}

/**
 * Check and increment free-tier usage for one request.
 *
 * @param {string} ip
 * @param {string} tool  - key from LIMITS
 * @returns {{ allowed: boolean, used: number, limit: number, period: string }}
 */
export function checkFreeLimit(ip, tool) {
  const cfg = LIMITS[tool];
  if (!cfg) return { allowed: true, used: 0, limit: Infinity, period: 'none' };

  const key   = `${ip}:${tool}:${periodKey(cfg.period)}`;
  const store = readStore();
  const used  = store[key] || 0;

  if (used >= cfg.max) {
    return { allowed: false, used, limit: cfg.max, period: cfg.period };
  }

  store[key] = used + 1;
  writeStore(store);
  return { allowed: true, used: store[key], limit: cfg.max, period: cfg.period };
}

/**
 * Extract the real client IP from a Next.js request.
 * @param {import('next').NextApiRequest} req
 * @returns {string}
 */
export function getClientIP(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Set CORS headers so WordPress plugin front-ends (any domain) can call these routes.
 * @param {import('next').NextApiResponse} res
 */
export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
