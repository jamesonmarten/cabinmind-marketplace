/**
 * GET /api/dashboard/usage?subscriptionKey=...&plan=...
 * Returns this month's lead-batch / ZeroBounce-validation usage for the quota banner.
 */
import { getUsageSummary, PLAN_LIMITS } from '../../../lib/usageStore';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { subscriptionKey, plan } = req.query;
  if (!subscriptionKey) return res.status(400).json({ error: 'subscriptionKey is required' });

  const planForLimits = PLAN_LIMITS[plan] ? plan : 'starter';
  const summary = await getUsageSummary(subscriptionKey, planForLimits);

  return res.status(200).json({
    plan: planForLimits,
    month: summary.month,
    leadBatches: {
      used:      summary.leadBatches.used,
      limit:     summary.leadBatches.limit,
      leadsUsed: summary.leadBatches.used * 5,
      leadsLimit: summary.leadBatches.limit === Infinity ? null : summary.leadBatches.limit * 5,
      unlimited: summary.leadBatches.limit === Infinity,
    },
    zbValidations: {
      used:      summary.zbValidations.used,
      limit:     summary.zbValidations.limit === Infinity ? null : summary.zbValidations.limit,
      unlimited: summary.zbValidations.limit === Infinity,
    },
  });
}
