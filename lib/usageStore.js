/**
 * lib/usageStore.js
 *
 * Tracks per-subscription monthly API usage so platform costs stay under control.
 * Keyed by Stripe session_id (or a client-supplied token) + calendar month (YYYY-MM).
 *
 * Stored in /tmp on Vercel (ephemeral per instance — resets on cold start).
 * This is intentional: month-resets wipe naturally, and the caps are soft
 * protections against runaway usage within a single warm instance.
 *
 * ─── Monthly hard limits per plan (platform-key usage) ───────────────────────
 *   Starter  : 100 ZB validations / mo  (we pay ~$0.80/client)
 *   Pro      : 500 ZB validations / mo  (we pay ~$4.00/client — client brings Hunter)
 *   Scale    : unlimited                (client brings both keys — $0 platform cost)
 *   Agency   : unlimited                (client brings both keys — $0 platform cost)
 *
 *   Lead batches (5 leads each):
 *   Starter  : 20 batches / mo  → 100 leads max
 *   Pro      : 100 batches / mo → 500 leads max
 *   Scale+   : unlimited
 *
 * ─── Cost model sanity check ─────────────────────────────────────────────────
 *   Starter  $97 MRR  | platform cost ≤$15  | gross margin ≥85%
 *   Pro      $247 MRR | platform cost ≤$7   | gross margin ≥97%
 *   Scale    $497 MRR | platform cost ≤$12  | gross margin ≥97%
 *   Agency   $997 MRR | platform cost ≤$55  | gross margin ≥94%
 */

import fs   from 'fs';
import path from 'path';

const STORE_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/cabinmind-usage.json'
  : path.join(process.cwd(), 'data', 'usage.json');

// ─── Limits ──────────────────────────────────────────────────────────────────

export const PLAN_LIMITS = {
  starter: { zbValidations: 100,       leadBatches: 20  },  // 100 leads/mo
  pro:     { zbValidations: 500,       leadBatches: 100 },  // 500 leads/mo
  scale:   { zbValidations: Infinity,  leadBatches: Infinity },
  agency:  { zbValidations: Infinity,  leadBatches: Infinity },
  demo:    { zbValidations: 25,        leadBatches: 5   },   // 25 leads (5 batches × 5) per session
};

// ─── Storage helpers ─────────────────────────────────────────────────────────

function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) return {};
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeStore(data) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[usageStore] write failed:', err.message);
  }
}

function monthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getRecord(store, subscriptionKey) {
  const mk = monthKey();
  if (!store[subscriptionKey]) store[subscriptionKey] = {};
  if (!store[subscriptionKey][mk]) {
    store[subscriptionKey][mk] = { zbValidations: 0, leadBatches: 0, month: mk };
  }
  return store[subscriptionKey][mk];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check whether incrementing `field` by `amount` would exceed the plan limit.
 * Returns { allowed: boolean, used: number, limit: number, remaining: number }
 */
export function checkUsage(subscriptionKey, plan, field, amount = 1) {
  const store  = readStore();
  const rec    = getRecord(store, subscriptionKey);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
  const limit  = limits[field] ?? Infinity;
  const used   = rec[field] || 0;
  const remaining = Math.max(0, limit - used);
  return {
    allowed:   limit === Infinity || (used + amount) <= limit,
    used,
    limit,
    remaining,
  };
}

/**
 * Atomically increment `field` by `amount` and persist.
 * Call AFTER the API work succeeds so failed calls don't count against quota.
 */
export function recordUsage(subscriptionKey, plan, field, amount = 1) {
  const store = readStore();
  const rec   = getRecord(store, subscriptionKey);
  rec[field]  = (rec[field] || 0) + amount;
  writeStore(store);
  const limits    = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
  const limit     = limits[field] ?? Infinity;
  const remaining = Math.max(0, limit - rec[field]);
  console.log(`[usageStore] ${subscriptionKey} ${plan} ${field}: ${rec[field]}/${limit === Infinity ? '∞' : limit} (${remaining} remaining)`);
  return { used: rec[field], limit, remaining };
}

/**
 * Get the full usage record for a subscription this month (for dashboard display).
 */
export function getUsageSummary(subscriptionKey, plan) {
  const store  = readStore();
  const rec    = getRecord(store, subscriptionKey);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
  return {
    month:          rec.month,
    leadBatches:    { used: rec.leadBatches || 0,    limit: limits.leadBatches    },
    zbValidations:  { used: rec.zbValidations || 0,  limit: limits.zbValidations  },
  };
}
