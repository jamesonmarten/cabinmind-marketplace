/**
 * GET /api/admin/runs
 * Headers: x-admin-secret: <ADMIN_SECRET>   (or ?secret=)
 *
 * Returns the lead-run log so the owner can see what prospects searched for
 * and what came back. Business identifiers only — no contact PII.
 */
import { getRuns, summarise } from '../../../lib/runLog';
import { isSupabaseConfigured } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
  const runs = await getRuns({ limit });

  return res.status(200).json({
    runs,
    summary: summarise(runs),
    // Without Supabase the log lives in /tmp and is wiped on cold start.
    durable: isSupabaseConfigured(),
  });
}
