/**
 * GET /api/admin/trials
 * Headers: x-admin-secret: <ADMIN_SECRET>
 *
 * Returns usage data for all trial slugs so the owner can monitor
 * how many leads each gifted client has consumed.
 */
import fs from 'fs';
import path from 'path';
import { getTrialSlugs } from '../../../lib/trials';

const USAGE_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/cabinmind-usage.json'
  : path.join(process.cwd(), 'data', 'usage.json');

const LEADS_PER_BATCH = 5;
const BATCH_LIMIT = 10; // 50 leads

function readUsageStore() {
  try {
    if (!fs.existsSync(USAGE_PATH)) return {};
    return JSON.parse(fs.readFileSync(USAGE_PATH, 'utf8'));
  } catch (e) { return {}; }
}

export default function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

    const secret = req.headers['x-admin-secret'] || req.query.secret;
    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const store = readUsageStore();

  // Gifted trials are a one-time allowance, so usageStore buckets them under
  // 'lifetime' rather than a month key (see periodKey() in lib/usageStore.js).
  const trials = getTrialSlugs().map(slug => {
    const key = `trial-${slug}`;
    const record = store[key]?.lifetime || {};
    const batchesUsed = record.leadBatches || 0;

    return {
      slug,
      url: `/trial/${slug}`,
      used: {
        batchesUsed,
        batchLimit: BATCH_LIMIT,
        leadsUsed: batchesUsed * LEADS_PER_BATCH,
        leadsLimit: BATCH_LIMIT * LEADS_PER_BATCH,
        leadsRemaining: Math.max(0, (BATCH_LIMIT - batchesUsed) * LEADS_PER_BATCH),
        zbUsed: record.zbValidations || 0,
      },
      allTime: {
        totalBatches: batchesUsed,
        totalLeads: batchesUsed * LEADS_PER_BATCH,
      },
      active: batchesUsed > 0,
      limitReached: batchesUsed >= BATCH_LIMIT,
    };
  });

  // Estimate platform cost: ~$0.018/lead (Hunter search + ZB validation + Groq/OpenAI)
  const COST_PER_LEAD = 0.018;
  const totalLeadsAllTrials = trials.reduce((s, t) => s + t.allTime.totalLeads, 0);

  return res.status(200).json({
    trials,
    summary: {
      totalTrials: trials.length,
      activeTrials: trials.filter(t => t.active).length,
      completedTrials: trials.filter(t => t.limitReached).length,
      totalLeadsGenerated: totalLeadsAllTrials,
      estimatedCost: `$${(totalLeadsAllTrials * COST_PER_LEAD).toFixed(2)}`,
    },
  });
  } catch (err) {
    console.error('[admin/trials] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
