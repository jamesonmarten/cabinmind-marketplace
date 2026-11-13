/**
 * lib/runLog.js
 *
 * Append-only log of every lead run, so the owner can see what prospects are
 * searching for and what they actually got back.
 *
 * PII RULE: this log never stores a contact's name, email or phone. Rule 6 in
 * .github/copilot-instructions.md forbids personal data in application logs.
 * Company names and domains are business identifiers, not personal data, so
 * they are kept — they're what makes the log useful.
 *
 * Backed by Supabase when configured; otherwise a local JSON file, which on
 * Vercel means /tmp and is wiped on cold start. Without Supabase, treat this
 * dashboard as a live tail rather than a durable record.
 */

import fs from 'fs';
import path from 'path';
import { getSupabase } from './supabaseClient';

const STORE_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/cabinmind-runs.json'
  : path.join(process.cwd(), 'data', 'runs.json');

// File fallback keeps only the newest entries so /tmp can't grow unbounded.
const FILE_CAP = 300;

function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) return [];
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(rows) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(rows.slice(0, FILE_CAP), null, 2), 'utf8');
  } catch (err) {
    console.error('[runLog] write failed:', err.message);
  }
}

/** Who ran it, in a form that's useful without being personal. */
function describeSource(subscriptionKey = '') {
  if (subscriptionKey.startsWith('trial-')) return { kind: 'trial', label: subscriptionKey.slice(6) };
  if (subscriptionKey.startsWith('demo-'))  return { kind: 'demo',  label: 'public demo' };
  return { kind: 'customer', label: subscriptionKey };
}

/**
 * Record one lead run. Never throws — a logging failure must not fail a
 * customer's request.
 */
export async function recordRun(entry) {
  const source = describeSource(entry.subscriptionKey);

  const row = {
    at: new Date().toISOString(),
    source_kind: source.kind,
    source_label: source.label,
    plan: entry.plan || null,
    icp: (entry.icp || '').slice(0, 400),
    requested: entry.requested ?? null,
    delivered: entry.delivered ?? 0,
    provider: entry.provider || null,
    grades: entry.grades || {},
    screened: entry.screened || {},
    duration_ms: entry.durationMs ?? null,
    hunter_quota_exceeded: !!entry.hunterQuotaExceeded,
    // Business identifiers only — no contact names or emails.
    companies: (entry.companies || []).slice(0, 10),
  };

  try {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('lead_runs').insert(row);
      if (error) console.error('[runLog] supabase insert failed:', error.message);
      return;
    }
    const rows = readStore();
    rows.unshift(row);
    writeStore(rows);
  } catch (err) {
    console.error('[runLog] recordRun failed:', err.message);
  }
}

/** Newest first. */
export async function getRuns({ limit = 100 } = {}) {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('lead_runs')
        .select('*')
        .order('at', { ascending: false })
        .limit(limit);
      if (error) {
        console.error('[runLog] supabase fetch failed:', error.message);
        return [];
      }
      return data || [];
    }
    return readStore().slice(0, limit);
  } catch (err) {
    console.error('[runLog] getRuns failed:', err.message);
    return [];
  }
}

/** Headline numbers for the dashboard. */
export function summarise(runs) {
  const total = runs.length;
  const delivered = runs.reduce((s, r) => s + (r.delivered || 0), 0);
  const empty = runs.filter(r => !r.delivered).length;
  const durations = runs.map(r => r.duration_ms).filter(Boolean).sort((a, b) => a - b);

  return {
    totalRuns: total,
    leadsDelivered: delivered,
    emptyRuns: empty,
    emptyRate: total ? Math.round((empty / total) * 100) : 0,
    medianMs: durations.length ? durations[Math.floor(durations.length / 2)] : null,
    viaPlaces: runs.filter(r => r.provider === 'google-places').length,
    quotaBlocked: runs.filter(r => r.hunter_quota_exceeded).length,
    uniqueSources: new Set(runs.map(r => r.source_label)).size,
  };
}
