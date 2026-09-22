/**
 * lib/supabaseClient.js
 *
 * Lazily-created Supabase client for server-side (API route) use only.
 * Returns null when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY aren't configured
 * so local dev and existing file-based stores keep working without Supabase set up.
 *
 * Uses the service-role key (never expose this to the browser) because API
 * routes need unrestricted read/write across all customers' rows.
 */
import { createClient } from '@supabase/supabase-js';

let cachedClient;

export function getSupabase() {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(url, key, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

export function isSupabaseConfigured() {
  return !!getSupabase();
}
