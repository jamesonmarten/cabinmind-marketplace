/**
 * /api/admin/clients
 *
 * Returns a full view of all active clients: Stripe subscriber data +
 * per-client usage from usageStore. Protected by ADMIN_SECRET env var.
 *
 * GET /api/admin/clients
 * Headers: x-admin-secret: <ADMIN_SECRET>
 *
 * Returns: { clients: Client[], summary: { mrr, totalClients, planBreakdown } }
 */
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const USAGE_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/cabinmind-usage.json'
  : path.join(process.cwd(), 'data', 'usage.json');

function readUsageStore() {
  try {
    if (!fs.existsSync(USAGE_PATH)) return {};
    return JSON.parse(fs.readFileSync(USAGE_PATH, 'utf8'));
  } catch { return {}; }
}

function monthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const PLAN_LIMITS = {
  starter: { zbValidations: 100,      leadBatches: 20  },
  pro:     { zbValidations: 500,      leadBatches: 100 },
  scale:   { zbValidations: Infinity, leadBatches: Infinity },
  agency:  { zbValidations: Infinity, leadBatches: Infinity },
};

// Map Stripe price IDs → plan slugs (update these to match your real price IDs)
const PRICE_TO_PLAN = {
  [process.env.STRIPE_PRICE_STARTER]:  'starter',
  [process.env.STRIPE_PRICE_PRO]:      'pro',
  [process.env.STRIPE_PRICE_SCALE]:    'scale',
  [process.env.STRIPE_PRICE_AGENCY]:   'agency',
};

function planFromSession(sessionOrSub) {
  // Try agentId metadata first
  const agentId = sessionOrSub?.metadata?.agentId || '';
  if (agentId.includes('agency'))  return 'agency';
  if (agentId.includes('scale'))   return 'scale';
  if (agentId.includes('pro'))     return 'pro';
  if (agentId.includes('starter') || agentId.includes('lead')) return 'starter';
  return 'starter';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  // ── Auth ──────────────────────────────────────────────────────────────────
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const usage = readUsageStore();
    const mk = monthKey();

    // ── Pull all Stripe customers (paginate up to 500) ───────────────────────
    const allCustomers = [];
    let startingAfter;
    for (let page = 0; page < 5; page++) {
      const batch = await stripe.customers.list({
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      allCustomers.push(...batch.data);
      if (!batch.has_more) break;
      startingAfter = batch.data[batch.data.length - 1].id;
    }

    // ── Pull all active subscriptions ────────────────────────────────────────
    const allSubs = [];
    let subCursor;
    for (let page = 0; page < 5; page++) {
      const batch = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        expand: ['data.latest_invoice'],
        ...(subCursor ? { starting_after: subCursor } : {}),
      });
      allSubs.push(...batch.data);
      if (!batch.has_more) break;
      subCursor = batch.data[batch.data.length - 1].id;
    }

    // Index subs by customer
    const subByCustomer = {};
    for (const sub of allSubs) {
      subByCustomer[sub.customer] = sub;
    }

    // ── Build client list ─────────────────────────────────────────────────────
    const clients = allCustomers
      .filter(c => subByCustomer[c.id]) // only paying customers
      .map(customer => {
        const sub    = subByCustomer[customer.id];
        const plan   = planFromSession(sub);
        const agentId = customer.metadata?.agentId || sub.metadata?.agentId || '';
        const token   = customer.metadata?.dashboardToken || '';

        // Usage this month
        // subscriptionKey matches what leads.js / validate-list.js sends:
        // either sessionId or `plan-${plan}` fallback
        const subKey = sub.id || `plan-${plan}`;
        const monthUsage = usage[subKey]?.[mk] || usage[`plan-${plan}`]?.[mk] || {};
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;

        const mrr = (sub.items?.data?.[0]?.price?.unit_amount || 0) / 100;

        return {
          customerId:     customer.id,
          email:          customer.email,
          name:           customer.name || '',
          plan,
          agentId,
          subscriptionId: sub.id,
          dashboardToken: token,
          dashboardUrl:   token ? `https://products.devcabin.tech/dashboard/${token}` : null,
          mrr,
          status:         sub.status,
          createdAt:      customer.created ? new Date(customer.created * 1000).toISOString() : null,
          nextBilling:    sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          usage: {
            leadBatches:   { used: monthUsage.leadBatches   || 0, limit: limits.leadBatches   === Infinity ? '∞' : limits.leadBatches   },
            zbValidations: { used: monthUsage.zbValidations || 0, limit: limits.zbValidations === Infinity ? '∞' : limits.zbValidations },
            month: mk,
          },
          canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        };
      })
      .sort((a, b) => b.mrr - a.mrr); // highest MRR first

    // ── Summary stats ─────────────────────────────────────────────────────────
    const mrr = clients.reduce((s, c) => s + c.mrr, 0);
    const planBreakdown = clients.reduce((acc, c) => {
      acc[c.plan] = (acc[c.plan] || 0) + 1;
      return acc;
    }, {});

    // Also surface recent cancelled subs
    const cancelled = [];
    const cancelledSubs = await stripe.subscriptions.list({ status: 'canceled', limit: 20 });
    for (const sub of cancelledSubs.data) {
      const customer = allCustomers.find(c => c.id === sub.customer);
      if (customer) {
        cancelled.push({
          email:    customer.email,
          name:     customer.name || '',
          plan:     planFromSession(sub),
          canceledAt: new Date(sub.canceled_at * 1000).toISOString(),
          mrr:      (sub.items?.data?.[0]?.price?.unit_amount || 0) / 100,
        });
      }
    }

    return res.status(200).json({
      clients,
      cancelled: cancelled.slice(0, 10),
      summary: {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
        totalClients: clients.length,
        planBreakdown,
        month: mk,
      },
    });
  } catch (err) {
    console.error('[admin/clients]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
