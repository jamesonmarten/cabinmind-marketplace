/**
 * lib/tokenStore.js
 * Simple file-based token store for development + Vercel (uses /tmp on serverless).
 * Each token maps to { agentId, customerEmail, customerName, sessionId, createdAt }
 *
 * In production at scale, replace this with a DB (PlanetScale, Supabase, etc.)
 * For Vercel: /tmp is ephemeral per instance, so we also persist to Stripe customer metadata
 * as a fallback lookup path.
 */
import fs from 'fs';
import path from 'path';

// On Vercel serverless /tmp is the only writable dir; locally use project /data
const STORE_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/cabinmind-tokens.json'
  : path.join(process.cwd(), 'data', 'tokens.json');

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
    console.error('[tokenStore] Failed to write store:', err.message);
  }
}

export function saveToken(token, payload) {
  const store = readStore();
  store[token] = { ...payload, createdAt: new Date().toISOString() };
  writeStore(store);
  console.log(`[tokenStore] Saved token ${token.slice(0, 8)}… for ${payload.customerEmail}`);
}

export function getToken(token) {
  const store = readStore();
  return store[token] || null;
}

export function deleteToken(token) {
  const store = readStore();
  delete store[token];
  writeStore(store);
}
