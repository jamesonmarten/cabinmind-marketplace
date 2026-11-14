/**
 * POST /api/dashboard/branding
 * Lets Agency-tier customers set white-label branding (logo, color, company name)
 * shown on their /dashboard/[token] page instead of "CabinMind".
 * Body: { token, brandLogoUrl, brandColor, brandCompany }
 */
import { getToken, saveToken } from '../../../lib/tokenStore';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { token, brandLogoUrl, brandColor, brandCompany } = req.body || {};
  if (!token || token.length < 10) return res.status(400).json({ error: 'Invalid token' });

  const existing = await getToken(token);
  if (!existing) return res.status(404).json({ error: 'Dashboard not found.' });

  if (existing.agentId !== 'lead-agency') {
    return res.status(403).json({ error: 'White-label branding is available on the Agency plan.' });
  }

  await saveToken(token, {
    ...existing,
    brandLogoUrl: brandLogoUrl?.trim() || null,
    brandColor:   brandColor?.trim() || null,
    brandCompany: brandCompany?.trim() || null,
    whiteLabel:   true,
  });

  return res.status(200).json({ ok: true });
}
