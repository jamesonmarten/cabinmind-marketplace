/**
 * lib/rateLimit.js
 *
 * Lightweight in-memory rate limiter + bot/AI scraper detection for Vercel
 * serverless functions. Uses /tmp for cross-request persistence within a
 * warm instance (resets on cold start — intentional for simplicity).
 *
 * ─── Per-route limits ────────────────────────────────────────────────────────
 * Anonymous traffic is limited per IP. Verified paying subscribers get a much
 * higher ceiling, bucketed by subscription key instead of IP, so a customer can
 * pull a full month's allotment in one sitting and teams behind one office NAT
 * don't throttle each other. The monthly plan quota in lib/usageStore.js is what
 * actually caps spend — this is only an abuse guard.
 *
 *   route             anon (per IP)        paid (per subscription)
 *   /api/leads        10 req / 10 min      240 req / 10 min
 *   /api/validate-list 5 req / 10 min      120 req / 10 min
 *   /api/campaign     20 req / 10 min      120 req / 10 min
 *   /api/chat         30 req / 10 min      —
 *   /api/audit        15 req / 10 min      —
 *
 * ─── Bot detection ───────────────────────────────────────────────────────────
 *   Blocks requests that match known bot/AI/scraper User-Agent patterns.
 *   Blocks requests with no User-Agent (headless curl/scripts).
 *   Blocks requests missing standard browser headers (Accept, Accept-Language).
 *   Returns 403 with a JSON error — never silently drops.
 */

import fs   from 'fs';
import path from 'path';

// ─── Bot UA patterns ─────────────────────────────────────────────────────────
// AI crawlers, scrapers, headless browsers, automation frameworks
const BOT_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /scraper/i, /wget/i, /curl/i, /python-requests/i,
  /axios/i, /got\/\d/i, /node-fetch/i, /undici/i, /httpx/i, /aiohttp/i,
  /playwright/i, /puppeteer/i, /selenium/i, /phantomjs/i, /headless/i,
  /gptbot/i, /chatgpt/i, /openai/i, /anthropic/i, /claude/i, /gemini/i,
  /bingbot/i, /googlebot/i, /yandex/i, /baidu/i, /duckduckbot/i,
  /applebot/i, /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
  /semrushbot/i, /ahrefsbot/i, /mj12bot/i, /dotbot/i, /rogerbot/i,
  /archive\.org/i, /ia_archiver/i, /scrapy/i, /mechanize/i,
  /java\/\d/i, /go-http-client/i, /okhttp/i, /libwww/i,
];

// ─── Rate limit store ─────────────────────────────────────────────────────────
const STORE_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/cabinmind-ratelimit.json'
  : path.join(process.cwd(), 'data', 'ratelimit.json');

function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) return {};
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch { return {}; }
}

function writeStore(data) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(data), 'utf8');
  } catch {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function isBot(req) {
  const ua = req.headers['user-agent'] || '';

  // No User-Agent at all = bot/script
  if (!ua.trim()) return { blocked: true, reason: 'no-user-agent' };

  // Match known bot patterns
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(ua)) return { blocked: true, reason: `bot-ua: ${ua.slice(0, 80)}` };
  }

  // Headless browser fingerprint: missing Accept-Language (real browsers always send it)
  const acceptLang = req.headers['accept-language'];
  if (!acceptLang) return { blocked: true, reason: 'no-accept-language' };

  // Missing Accept header (curl, raw HTTP clients)
  const accept = req.headers['accept'];
  if (!accept) return { blocked: true, reason: 'no-accept-header' };

  return { blocked: false };
}

/**
 * Check + increment rate limit for this IP + route key.
 * @param {string} key      - route identifier e.g. 'leads'
 * @param {string} ip       - client IP
 * @param {number} max      - max requests allowed in the window
 * @param {number} windowMs - rolling window in milliseconds
 * @returns {{ limited: boolean, remaining: number, resetAt: number }}
 */
function checkRateLimit(key, ip, max, windowMs) {
  const store = readStore();
  const storeKey = `${key}:${ip}`;
  const now = Date.now();

  if (!store[storeKey]) store[storeKey] = { count: 0, windowStart: now };

  // Roll window if expired
  if (now - store[storeKey].windowStart > windowMs) {
    store[storeKey] = { count: 0, windowStart: now };
  }

  store[storeKey].count += 1;
  const count     = store[storeKey].count;
  const resetAt   = store[storeKey].windowStart + windowMs;
  const remaining = Math.max(0, max - count);

  writeStore(store);

  return { limited: count > max, remaining, resetAt, count };
}

// ─── Route configs ────────────────────────────────────────────────────────────
// `paidMax` applies only to requests an identify() callback has verified as a
// real subscriber; it is ignored for anonymous traffic.
const ROUTE_LIMITS = {
  leads:            { max: 10, windowMs: 10 * 60 * 1000, paidMax: 240 },
  campaign:         { max: 20, windowMs: 10 * 60 * 1000, paidMax: 120 },
  'validate-list':  { max: 5,  windowMs: 10 * 60 * 1000, paidMax: 120 },
  chat:             { max: 30, windowMs: 10 * 60 * 1000 },
  audit:            { max: 15, windowMs: 10 * 60 * 1000 },
  'demo-capture':   { max: 5,  windowMs: 10 * 60 * 1000 },  //  5 req / 10 min (form spam guard)
  'social-publish': { max: 20, windowMs: 10 * 60 * 1000, paidMax: 100 },
};

// ─── Main middleware ──────────────────────────────────────────────────────────

/**
 * Apply bot detection + rate limiting to a Next.js API handler.
 *
 * Usage:
 *   import { withProtection } from '../../lib/rateLimit';
 *   export default withProtection('leads', async (req, res) => { ... });
 *
 * @param {string}   routeKey - key from ROUTE_LIMITS
 * @param {Function} handler  - the actual Next.js handler
 * @param {object}   [options]
 * @param {Function} [options.identify] - async (req) => ({ id }) | null. Must
 *   verify the caller server-side; returning an id grants the elevated
 *   `paidMax` ceiling and buckets the limit by that id instead of IP.
 */
export function withProtection(routeKey, handler, options = {}) {
  return async function protectedHandler(req, res) {
    // ── Bot check ──────────────────────────────────────────────────────────
    const botCheck = isBot(req);
    if (botCheck.blocked) {
      console.warn(`[rateLimit] Bot blocked on ${routeKey}: ${botCheck.reason}`);
      return res.status(403).json({
        error: 'Automated requests are not permitted. Please use the web interface at products.devcabin.tech',
        blocked: true,
        reason: botCheck.reason,
      });
    }

    // ── Rate limit ─────────────────────────────────────────────────────────
    const config = ROUTE_LIMITS[routeKey];
    if (config) {
      // A verified subscriber is bucketed by subscription key and gets the
      // higher ceiling. Never trust a client-supplied id here — identify()
      // is responsible for checking it against the token store.
      let identity = null;
      if (options.identify) {
        try {
          identity = await options.identify(req);
        } catch (err) {
          console.error(`[rateLimit] identify() failed on ${routeKey}:`, err.message);
        }
      }

      const isPaid = !!identity?.id && typeof config.paidMax === 'number';
      const max    = isPaid ? config.paidMax : config.max;
      const bucket = identity?.id ? `sub:${identity.id}` : getIP(req);

      const { limited, remaining, resetAt } = checkRateLimit(routeKey, bucket, max, config.windowMs);

      res.setHeader('X-RateLimit-Limit',     max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset',     Math.ceil(resetAt / 1000));

      if (limited) {
        const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000);
        console.warn(`[rateLimit] Rate limited ${isPaid ? 'subscriber' : 'ip'} on ${routeKey} (${max} req/${config.windowMs / 60000}min)`);
        res.setHeader('Retry-After', retryAfterSec);
        return res.status(429).json({
          error: `Too many requests. You can make ${max} requests per ${config.windowMs / 60000} minutes on this endpoint. Try again in ${retryAfterSec} seconds.`,
          retryAfter: retryAfterSec,
          limited: true,
        });
      }
    }

    // ── Pass through ───────────────────────────────────────────────────────
    return handler(req, res);
  };
}
