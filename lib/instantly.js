/**
 * lib/instantly.js
 * Thin wrapper around the Instantly.ai v2 API for one-click lead push (BYOK).
 * Docs: https://developer.instantly.ai/ (Create Lead endpoint)
 */

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v2';

export async function pushLeadsToInstantly(apiKey, campaignId, leads) {
  let success = 0;
  const failures = [];

  for (const lead of leads) {
    if (!lead.email) continue;
    const parts = (lead.name || '').trim().split(/\s+/);
    try {
      const r = await fetch(`${INSTANTLY_BASE}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          campaign: campaignId,
          email: lead.email,
          first_name: parts[0] || '',
          last_name: parts.slice(1).join(' ') || '',
          company_name: lead.company || '',
          personalization: [lead.signal, lead.pain_points].filter(Boolean).join(' · ').slice(0, 300),
          custom_variables: {
            title: lead.title || '',
            icp_score: lead.score || '',
            persona: lead.persona_label || '',
          },
        }),
      });
      if (r.ok) success++;
      else failures.push({ email: lead.email, status: r.status });
    } catch (err) {
      failures.push({ email: lead.email, error: err.message });
    }
  }

  return { success, failed: failures.length, failures };
}
