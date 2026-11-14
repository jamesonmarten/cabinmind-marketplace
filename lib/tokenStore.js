/**
 * lib/tokenStore.js
 * Dashboard token store — maps a token to { agentId, customerEmail, customerName, sessionId, createdAt }.
 *
 * Backed by Supabase (persists across cold starts) when configured; falls back
 * to a local JSON file (original /tmp-on-Vercel behavior) otherwise.
 */
import fs from 'fs';
import path from 'path';
import { getSupabase } from './supabaseClient';

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

export async function saveToken(token, payload) {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('dashboard_tokens').upsert({
      token,
      agent_id:       payload.agentId,
      customer_email: payload.customerEmail,
      customer_name:  payload.customerName,
      session_id:     payload.sessionId,
      brand_logo_url: payload.brandLogoUrl,
      brand_color:    payload.brandColor,
      brand_company:  payload.brandCompany,
      white_label:    !!payload.whiteLabel,
    });
    if (error) console.error('[tokenStore] supabase upsert failed:', error.message);
  } else {
    const store = readStore();
    store[token] = { ...payload, createdAt: new Date().toISOString() };
    writeStore(store);
  }
  console.log(`[tokenStore] Saved token ${token.slice(0, 8)}… for ${payload.customerEmail}`);
}

export async function getToken(token) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('dashboard_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    if (error) console.error('[tokenStore] supabase fetch failed:', error.message);
    if (!data) return null;
    return {
      agentId:       data.agent_id,
      customerEmail: data.customer_email,
      customerName:  data.customer_name,
      sessionId:     data.session_id,
      brandLogoUrl:  data.brand_logo_url,
      brandColor:    data.brand_color,
      brandCompany:  data.brand_company,
      whiteLabel:    data.white_label,
      createdAt:     data.created_at,
    };
  }
  const store = readStore();
  return store[token] || null;
}

export async function deleteToken(token) {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('dashboard_tokens').delete().eq('token', token);
    if (error) console.error('[tokenStore] supabase delete failed:', error.message);
    return;
  }
  const store = readStore();
  delete store[token];
  writeStore(store);
}
