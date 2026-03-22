/**
 * /api/admin/weekly-report
 *
 * Sends a weekly digest email to jameson@devcabin.tech with:
 *   - MRR + ARR
 *   - Per-client usage breakdown
 *   - New signups this week
 *   - Cancellations
 *   - Usage warnings (clients near limits)
 *
 * Can be called manually (GET with x-admin-secret header) or
 * triggered via a cron job (Vercel Cron → add to vercel.json).
 *
 * GET /api/admin/weekly-report
 * Headers: x-admin-secret: <ADMIN_SECRET>
 */
import Stripe from 'stripe';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const USAGE_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/cabinmind-usage.json'
  : path.join(process.cwd(), 'data', 'usage.json');

const PLAN_LIMITS = {
  starter: { zbValidations: 100,      leadBatches: 20  },
  pro:     { zbValidations: 500,      leadBatches: 100 },
  scale:   { zbValidations: Infinity, leadBatches: Infinity },
  agency:  { zbValidations: Infinity, leadBatches: Infinity },
};

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

function planFromSub(sub) {
  const agentId = sub?.metadata?.agentId || '';
  if (agentId.includes('agency'))  return 'agency';
  if (agentId.includes('scale'))   return 'scale';
  if (agentId.includes('pro'))     return 'pro';
  return 'starter';
}

function pct(used, limit) {
  if (limit === Infinity || limit === '∞') return 0;
  return Math.round((used / limit) * 100);
}

function usageBar(used, limit) {
  if (limit === Infinity) return '∞ (BYOK)';
  const p = pct(used, limit);
  const filled = Math.round(p / 10);
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)} ${used}/${limit} (${p}%)`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'GET or POST only' });
  }

  // Auth — allow Vercel Cron (CRON_SECRET) or manual admin call
  const adminSecret = req.headers['x-admin-secret'];
  const cronSecret  = req.headers['authorization'];
  const validAdmin  = adminSecret && adminSecret === process.env.ADMIN_SECRET;
  const validCron   = cronSecret  && cronSecret  === `Bearer ${process.env.CRON_SECRET}`;
  if (!validAdmin && !validCron) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const usage = readUsageStore();
    const mk = monthKey();
    const now = new Date();
    const sevenDaysAgo = Math.floor(now.getTime() / 1000) - 7 * 24 * 60 * 60;

    // Fetch all active subs + customers
    const allCustomers = [];
    let startingAfter;
    for (let page = 0; page < 5; page++) {
      const batch = await stripe.customers.list({ limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
      allCustomers.push(...batch.data);
      if (!batch.has_more) break;
      startingAfter = batch.data[batch.data.length - 1].id;
    }

    const activeSubs = [];
    let subCursor;
    for (let page = 0; page < 5; page++) {
      const batch = await stripe.subscriptions.list({ status: 'active', limit: 100, ...(subCursor ? { starting_after: subCursor } : {}) });
      activeSubs.push(...batch.data);
      if (!batch.has_more) break;
      subCursor = batch.data[batch.data.length - 1].id;
    }

    const customerMap = Object.fromEntries(allCustomers.map(c => [c.id, c]));

    // Build enriched client list
    const clients = activeSubs.map(sub => {
      const customer  = customerMap[sub.customer] || {};
      const plan      = planFromSub(sub);
      const limits    = PLAN_LIMITS[plan];
      const subKey    = sub.id || `plan-${plan}`;
      const monthData = usage[subKey]?.[mk] || usage[`plan-${plan}`]?.[mk] || {};
      const zbUsed    = monthData.zbValidations || 0;
      const lbUsed    = monthData.leadBatches   || 0;
      const zbWarn    = limits.zbValidations !== Infinity && pct(zbUsed, limits.zbValidations) >= 80;
      const lbWarn    = limits.leadBatches   !== Infinity && pct(lbUsed, limits.leadBatches)   >= 80;
      return {
        email: customer.email || sub.customer,
        name:  customer.name  || '',
        plan,
        mrr:    (sub.items?.data?.[0]?.price?.unit_amount || 0) / 100,
        isNew:  sub.start_date > sevenDaysAgo,
        zbUsed, lbUsed,
        zbLimit: limits.zbValidations,
        lbLimit: limits.leadBatches,
        zbWarn, lbWarn,
        anyWarn: zbWarn || lbWarn,
        dashboardToken: customer.metadata?.dashboardToken || '',
      };
    }).sort((a, b) => b.mrr - a.mrr);

    const mrr         = clients.reduce((s, c) => s + c.mrr, 0);
    const arr         = mrr * 12;
    const newClients  = clients.filter(c => c.isNew);
    const warnClients = clients.filter(c => c.anyWarn);

    // Recent cancellations
    const cancelledSubs = await stripe.subscriptions.list({ status: 'canceled', limit: 10, created: { gt: sevenDaysAgo } });
    const cancellations = cancelledSubs.data.map(sub => {
      const customer = customerMap[sub.customer] || {};
      return {
        email: customer.email || sub.customer,
        name:  customer.name  || '',
        plan:  planFromSub(sub),
        mrr:   (sub.items?.data?.[0]?.price?.unit_amount || 0) / 100,
      };
    });
    const churn = cancellations.reduce((s, c) => s + c.mrr, 0);

    // Plan breakdown
    const planBreakdown = clients.reduce((acc, c) => { acc[c.plan] = (acc[c.plan] || 0) + 1; return acc; }, {});

    // ── Build the email HTML ──────────────────────────────────────────────────
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const clientRows = clients.map(c => `
      <tr style="border-bottom:1px solid #1e293b;">
        <td style="padding:10px 12px;color:#e2e8f0;font-size:13px;">${c.name || '—'}<br><span style="color:#64748b;font-size:11px;">${c.email}</span></td>
        <td style="padding:10px 12px;text-align:center;">
          <span style="background:${c.plan==='agency'?'#6d28d9':c.plan==='scale'?'#7c3aed':c.plan==='pro'?'#4f46e5':'#334155'};color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase;">${c.plan}</span>
          ${c.isNew ? '<span style="background:#065f46;color:#34d399;font-size:10px;font-weight:700;padding:2px 6px;border-radius:20px;margin-left:4px;">NEW</span>' : ''}
        </td>
        <td style="padding:10px 12px;color:#a78bfa;font-weight:700;text-align:right;">$${c.mrr}/mo</td>
        <td style="padding:10px 12px;font-family:monospace;font-size:11px;color:${c.zbWarn?'#f87171':'#64748b'};">
          ZB: ${c.zbUsed}/${c.zbLimit===Infinity?'∞':c.zbLimit}${c.zbWarn?' ⚠️':''}<br>
          Leads: ${c.lbUsed}/${c.lbLimit===Infinity?'∞':c.lbLimit}${c.lbWarn?' ⚠️':''}
        </td>
      </tr>`).join('');

    const newRows = newClients.length
      ? newClients.map(c => `<li style="color:#34d399;margin:4px 0;"><strong>${c.name || c.email}</strong> — ${c.plan} — $${c.mrr}/mo</li>`).join('')
      : '<li style="color:#64748b;">No new signups this week</li>';

    const churnRows = cancellations.length
      ? cancellations.map(c => `<li style="color:#f87171;margin:4px 0;"><strong>${c.name || c.email}</strong> — ${c.plan} — $${c.mrr}/mo lost</li>`).join('')
      : '<li style="color:#64748b;">No cancellations this week 🎉</li>';

    const warnRows = warnClients.length
      ? warnClients.map(c => `<li style="color:#fb923c;margin:4px 0;"><strong>${c.email}</strong> (${c.plan}) is near limits — consider reaching out</li>`).join('')
      : '<li style="color:#64748b;">No clients near limits</li>';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:32px 16px;">
<tr><td align="center">
<table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:16px 16px 0 0;padding:32px 40px 28px;text-align:center;">
    <div style="font-size:36px;margin-bottom:8px;">📊</div>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">CabinMind Weekly Report</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:14px;">${dateStr}</p>
  </td></tr>

  <!-- MRR Banner -->
  <tr><td style="background:#111118;padding:28px 40px;border-bottom:1px solid #1e293b;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="text-align:center;padding:0 12px;">
          <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">MRR</div>
          <div style="color:#a78bfa;font-size:32px;font-weight:900;">$${mrr.toFixed(0)}</div>
        </td>
        <td style="text-align:center;padding:0 12px;border-left:1px solid #1e293b;border-right:1px solid #1e293b;">
          <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">ARR</div>
          <div style="color:#818cf8;font-size:32px;font-weight:900;">$${arr.toFixed(0)}</div>
        </td>
        <td style="text-align:center;padding:0 12px;border-right:1px solid #1e293b;">
          <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Clients</div>
          <div style="color:#e2e8f0;font-size:32px;font-weight:900;">${clients.length}</div>
        </td>
        <td style="text-align:center;padding:0 12px;">
          <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">New / Churn</div>
          <div style="font-size:20px;font-weight:900;">
            <span style="color:#34d399;">+${newClients.length}</span>
            <span style="color:#334155;"> / </span>
            <span style="color:#f87171;">-${cancellations.length}</span>
          </div>
          <div style="color:#64748b;font-size:11px;">($${(newClients.reduce((s,c)=>s+c.mrr,0)).toFixed(0)} gained / $${churn.toFixed(0)} lost)</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Plan breakdown -->
  <tr><td style="background:#111118;padding:20px 40px;border-bottom:1px solid #1e293b;">
    <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Plan Breakdown</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${['starter','pro','scale','agency'].map(p => `
        <td style="text-align:center;padding:0 8px;">
          <div style="color:#64748b;font-size:11px;text-transform:uppercase;">${p}</div>
          <div style="color:#e2e8f0;font-size:22px;font-weight:800;">${planBreakdown[p] || 0}</div>
          <div style="color:#64748b;font-size:11px;">× $${p==='starter'?97:p==='pro'?247:p==='scale'?497:997}/mo</div>
        </td>`).join('')}
      </tr>
    </table>
  </td></tr>

  <!-- New signups -->
  <tr><td style="background:#111118;padding:20px 40px;border-bottom:1px solid #1e293b;">
    <div style="color:#34d399;font-size:13px;font-weight:700;margin-bottom:8px;">🆕 New Signups This Week</div>
    <ul style="margin:0;padding-left:20px;">${newRows}</ul>
  </td></tr>

  <!-- Cancellations -->
  <tr><td style="background:#111118;padding:20px 40px;border-bottom:1px solid #1e293b;">
    <div style="color:#f87171;font-size:13px;font-weight:700;margin-bottom:8px;">❌ Cancellations This Week</div>
    <ul style="margin:0;padding-left:20px;">${churnRows}</ul>
  </td></tr>

  <!-- Usage warnings -->
  <tr><td style="background:#111118;padding:20px 40px;border-bottom:1px solid #1e293b;">
    <div style="color:#fb923c;font-size:13px;font-weight:700;margin-bottom:8px;">⚠️ Clients Near Usage Limits</div>
    <ul style="margin:0;padding-left:20px;">${warnRows}</ul>
  </td></tr>

  <!-- Full client table -->
  <tr><td style="background:#111118;padding:20px 40px;">
    <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">All Active Clients — ${mk} Usage</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1e293b;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#1e293b;">
          <th style="padding:10px 12px;text-align:left;color:#64748b;font-size:11px;font-weight:600;">Client</th>
          <th style="padding:10px 12px;text-align:center;color:#64748b;font-size:11px;font-weight:600;">Plan</th>
          <th style="padding:10px 12px;text-align:right;color:#64748b;font-size:11px;font-weight:600;">MRR</th>
          <th style="padding:10px 12px;color:#64748b;font-size:11px;font-weight:600;">Usage</th>
        </tr>
      </thead>
      <tbody>${clientRows || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#64748b;font-size:13px;">No active clients yet</td></tr>'}</tbody>
    </table>
  </td></tr>

  <!-- Admin link -->
  <tr><td style="background:#111118;padding:16px 40px 28px;text-align:center;border-top:1px solid #1e293b;">
    <a href="https://products.devcabin.tech/admin" style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#fff;font-size:13px;font-weight:700;text-decoration:none;padding:10px 24px;border-radius:8px;">Open Admin Dashboard →</a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#0d0d14;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
    <p style="margin:0;color:#334155;font-size:11px;">CabinMind · Dev Cabin Technologies · Weekly digest for jameson@devcabin.tech</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    const from = process.env.RESEND_FROM_EMAIL || 'CabinMind <onboarding@resend.dev>';
    const result = await resend.emails.send({
      from,
      to: 'jameson@devcabin.tech',
      subject: `📊 CabinMind Weekly — $${mrr.toFixed(0)} MRR · ${clients.length} clients · ${newClients.length} new`,
      html,
    });

    if (result.error) throw new Error(JSON.stringify(result.error));

    console.log(`[admin/weekly-report] Report sent — id=${result.data?.id}`);
    return res.status(200).json({
      sent: true,
      emailId: result.data?.id,
      summary: { mrr, arr, totalClients: clients.length, newThisWeek: newClients.length, churnThisWeek: cancellations.length },
    });

  } catch (err) {
    console.error('[admin/weekly-report]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
