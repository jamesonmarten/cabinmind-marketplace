/**
 * lib/usageStore.js
 *
 * Tracks per-subscription monthly API usage so platform costs stay under control.
 * Keyed by Stripe session_id (or a client-supplied token) + calendar month (YYYY-MM).
 *
 * Backed by Supabase (persists across cold starts/instances) when configured;
 * falls back to a local JSON file (original /tmp-on-Vercel behavior) otherwise
 * so dev environments without Supabase credentials keep working.
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
 *   Starter  $100 MRR | platform cost ≤$15  | gross margin ≥85%
 *   Pro      $250 MRR | platform cost ≤$7   | gross margin ≥97%
 *   Scale    $500 MRR | platform cost ≤$12  | gross margin ≥97%
 *   Agency   $1000 MRR| platform cost ≤$55  | gross margin ≥94%
 */

import fs   from 'fs';
import path from 'path';
import { getSupabase } from './supabaseClient';

const STORE_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/cabinmind-usage.json'
  : path.join(process.cwd(), 'data', 'usage.json');

// ─── Limits ──────────────────────────────────────────────────────────────────

export const PLAN_LIMITS = {
  starter:       { zbValidations: 100,       leadBatches: 20  },  // 100 leads/mo
  pro:           { zbValidations: 500,       leadBatches: 100 },  // 500 leads/mo
  scale:         { zbValidations: Infinity,  leadBatches: Infinity },
  agency:        { zbValidations: Infinity,  leadBatches: Infinity },
  demo:          { zbValidations: 25,        leadBatches: 5   },   // 25 leads (5 batches × 5) per session
  'client-trial':{ zbValidations: 100,       leadBatches: 10  },  // 50 leads (10 batches × 5) — gifted trial
};

// ─── File fallback helpers (used only when Supabase isn't configured) ───────

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

// ─── Supabase-backed row helpers ─────────────────────────────────────────────

async function fetchRow(supabase, subscriptionKey) {
  const mk = monthKey();
  const { data, error } = await supabase
    .from('usage_records')
    .select('*')
    .eq('subscription_key', subscriptionKey)
    .eq('month', mk)
    .maybeSingle();
  if (error) console.error('[usageStore] supabase fetch failed:', error.message);
  return data || { subscription_key: subscriptionKey, month: mk, zb_validations: 0, lead_batches: 0 };
}

async function upsertRow(supabase, row) {
  const { error } = await supabase.from('usage_records').upsert(row, { onConflict: 'subscription_key,month' });
  if (error) console.error('[usageStore] supabase upsert failed:', error.message);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check whether incrementing `field` by `amount` would exceed the plan limit.
 * Returns { allowed: boolean, used: number, limit: number, remaining: number }
 */
export async function checkUsage(subscriptionKey, plan, field, amount = 1) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
  const limit  = limits[field] ?? Infinity;

  const supabase = getSupabase();
  let used;
  if (supabase) {
    const dbField = field === 'zbValidations' ? 'zb_validations' : 'lead_batches';
    const row = await fetchRow(supabase, subscriptionKey);
    used = row[dbField] || 0;
  } else {
    const store = readStore();
    const rec   = getRecord(store, subscriptionKey);
    used = rec[field] || 0;
  }

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
export async function recordUsage(subscriptionKey, plan, field, amount = 1) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
  const limit  = limits[field] ?? Infinity;

  const supabase = getSupabase();
  let used;
  if (supabase) {
    const dbField = field === 'zbValidations' ? 'zb_validations' : 'lead_batches';
    const row = await fetchRow(supabase, subscriptionKey);
    used = (row[dbField] || 0) + amount;
    await upsertRow(supabase, { ...row, subscription_key: subscriptionKey, [dbField]: used, updated_at: new Date().toISOString() });
  } else {
    const store = readStore();
    const rec   = getRecord(store, subscriptionKey);
    rec[field]  = (rec[field] || 0) + amount;
    writeStore(store);
    used = rec[field];
  }

  const remaining = Math.max(0, limit - used);
  console.log(`[usageStore] ${subscriptionKey} ${plan} ${field}: ${used}/${limit === Infinity ? '∞' : limit} (${remaining} remaining)`);
  return { used, limit, remaining };
}

/**
 * Signup perk — grants a one-time bonus of extra leads on top of the plan limit
 * for the customer's first billing month. Implemented as a negative usage
 * credit so `remaining = limit - used` comes out higher than the base plan.
 * Call once, right after checkout.session.completed, keyed by Stripe session id.
 */
export const SIGNUP_BONUS = { leadBatches: 10, zbValidations: 50 }; // +50 bonus leads

export async function grantSignupBonus(subscriptionKey, plan) {
  if (!(plan in PLAN_LIMITS)) return;
  await recordUsage(subscriptionKey, plan, 'leadBatches', -SIGNUP_BONUS.leadBatches);
  await recordUsage(subscriptionKey, plan, 'zbValidations', -SIGNUP_BONUS.zbValidations);
  console.log(`[usageStore] Granted signup bonus (+${SIGNUP_BONUS.leadBatches * 5} leads) to ${subscriptionKey}`);
}

/**
 * Get the full usage record for a subscription this month (for dashboard display).
 */
export async function getUsageSummary(subscriptionKey, plan) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;

  const supabase = getSupabase();
  let leadBatches, zbValidations, month;
  if (supabase) {
    const row = await fetchRow(supabase, subscriptionKey);
    leadBatches   = row.lead_batches || 0;
    zbValidations = row.zb_validations || 0;
    month         = row.month;
  } else {
    const store = readStore();
    const rec   = getRecord(store, subscriptionKey);
    leadBatches   = rec.leadBatches || 0;
    zbValidations = rec.zbValidations || 0;
    month         = rec.month;
  }

  return {
    month,
    leadBatches:    { used: leadBatches,    limit: limits.leadBatches    },
    zbValidations:  { used: zbValidations,  limit: limits.zbValidations  },
  };
}

/**
 * Cross-batch dedup — returns the Set of lead _ids already returned for this key.
 * Stored independently of monthly usage so it survives month rollovers.
 */
export async function getSeenLeads(subscriptionKey) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('seen_leads')
      .select('lead_ids')
      .eq('subscription_key', subscriptionKey)
      .maybeSingle();
    if (error) console.error('[usageStore] supabase seen_leads fetch failed:', error.message);
    return new Set(data?.lead_ids || []);
  }
  const store = readStore();
  return new Set(store[`seen_${subscriptionKey}`] || []);
}

/**
 * Mark lead _ids as seen so future batches skip them.
 */
export async function recordSeenLeads(subscriptionKey, ids) {
  if (!ids?.length) return;

  const supabase = getSupabase();
  if (supabase) {
    const existing = await getSeenLeads(subscriptionKey);
    for (const id of ids) existing.add(id);
    const { error } = await supabase
      .from('seen_leads')
      .upsert({ subscription_key: subscriptionKey, lead_ids: [...existing], updated_at: new Date().toISOString() }, { onConflict: 'subscription_key' });
    if (error) console.error('[usageStore] supabase seen_leads upsert failed:', error.message);
    return;
  }

  const store   = readStore();
  const seenKey = `seen_${subscriptionKey}`;
  const existing = new Set(store[seenKey] || []);
  for (const id of ids) existing.add(id);
  store[seenKey] = [...existing];
  writeStore(store);
}
