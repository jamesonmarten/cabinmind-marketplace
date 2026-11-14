/**
 * POST /api/leads/push-instantly
 * Server-side proxy so the customer's Instantly.ai API key never round-trips
 * through browser CORS restrictions or gets logged in client network tools.
 * Body: { apiKey, campaignId, leads }
 */
import { pushLeadsToInstantly } from '../../../lib/instantly';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { apiKey, campaignId, leads } = req.body || {};
  if (!apiKey || !campaignId) {
    return res.status(400).json({ error: 'Instantly.ai API key and Campaign ID are required.' });
  }
  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'No leads supplied.' });
  }

  try {
    const result = await pushLeadsToInstantly(apiKey, campaignId, leads.slice(0, 500));
    return res.status(200).json(result);
  } catch (err) {
    console.error('[push-instantly] error:', err.message);
    return res.status(500).json({ error: 'Instantly.ai push failed. Check your API key and campaign ID.' });
  }
}
