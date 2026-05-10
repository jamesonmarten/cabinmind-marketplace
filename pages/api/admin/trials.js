/**
 * GET /api/admin/trials
 * Headers: x-admin-secret: <ADMIN_SECRET>
 *
 * Returns usage data for all trial slugs so the owner can monitor
 * how many leads each gifted client has consumed.
 */
import fs from 'fs';
import path from 'path';

const USAGE_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/cabinmind-usage.json'
  : path.join(process.cwd(), 'data', 'usage.json');

// Keep in sync with pages/trial/[slug].js
const VALID_SLUGS = ['acme2026', 'defiantcnc2026'];
const LEADS_PER_BATCH = 5;
const BATCH_LIMIT = 10; // 50 leads

function readUsageStore() {
  try {
    if (!fs.existsSync(USAGE_PATH)) return {};
    return JSON.parse(fs.readFileSync(USAGE_PATH, 'utf8'));
  } catch (e) { return {}; }
}

function monthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

    const secret = req.headers['x-admin-secret'] || req.query.secret;
    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const store = readUsageStore();
    const mk = monthKey();

  const trials = VALID_SLUGS.map(slug => {
    const key = `trial-${slug}`;
    const currentMonth = store[key]?.[mk] || {};
    // Collect all months for this slug
    const allMonths = store[key] || {};
    const totalBatches = Object.values(allMonths)
      .reduce((sum, m) => sum + (m.leadBatches || 0), 0);

    return {
      slug,
      url: `/trial/${slug}`,
      currentMonth: {
        month: mk,
        batchesUsed: currentMonth.leadBatches || 0,
        batchLimit: BATCH_LIMIT,
        leadsUsed: (currentMonth.leadBatches || 0) * LEADS_PER_BATCH,
        leadsLimit: BATCH_LIMIT * LEADS_PER_BATCH,
        zbUsed: currentMonth.zbValidations || 0,
      },
      allTime: {
        totalBatches,
        totalLeads: totalBatches * LEADS_PER_BATCH,
      },
      active: totalBatches > 0,
      limitReached: (currentMonth.leadBatches || 0) >= BATCH_LIMIT,
    };
  });

  // Estimate platform cost: ~$0.018/lead (Hunter search + ZB validation + Groq/OpenAI)
  const COST_PER_LEAD = 0.018;
  const totalLeadsAllTrials = trials.reduce((s, t) => s + t.allTime.totalLeads, 0);

  return res.status(200).json({
    trials,
    summary: {
      totalTrials: VALID_SLUGS.length,
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
