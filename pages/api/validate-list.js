/**
 * /api/validate-list
 *
 * POST { leads: Lead[], zeroBounceApiKey?: string }
 *
 * Validates every lead's email address through ZeroBounce.
 * Falls back to the platform key (ZEROBOUNCE_API_KEY) if the user doesn't supply one.
 *
 * Returns:
 *   {
 *     valid:    Lead[]   — deliverable emails, safe to send
 *     warnings: Lead[]   — catch-all domains (may or may not accept mail)
 *     rejected: Lead[]   — hard bounces, spam traps, disposables, invalid
 *     stats: {
 *       total, valid, warnings, rejected,
 *       credits_remaining: number | null
 *     }
 *   }
 *
 * Limits:
 *   - Max 500 leads per call (server-side cap)
 *   - Concurrency 10 parallel ZeroBounce requests
 *   - 15 second ZeroBounce per-request timeout
 */

import { checkUsage, recordUsage, PLAN_LIMITS } from '../../lib/usageStore';
import { withProtection } from '../../lib/rateLimit';

const CONCURRENCY = 10;
const MAX_LEADS   = 500;
const ZB_TIMEOUT  = 15_000; // ms

// ZeroBounce status values:
//   valid        → deliverable
//   catch-all    → domain accepts everything, unknown if individual mailbox exists
//   unknown      → ZB couldn't determine (grey — treat as warning)
//   invalid      → hard bounce / non-existent
//   spamtrap     → honeypot, do not send
//   abuse        → complainers
//   do_not_mail  → role addresses, disposables, etc.

const STATUS_BUCKET = {
  valid:        'valid',
  'catch-all':  'warning',
  catch_all:    'warning',
  unknown:      'warning',
  invalid:      'rejected',
  spamtrap:     'rejected',
  abuse:        'rejected',
  do_not_mail:  'rejected',
};

async function checkCredit(apiKey) {
  try {
    const r = await fetch(
      `https://api.zerobounce.net/v2/getcredits?api_key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(8_000) }
    );
    const d = await r.json();
    return typeof d.Credits === 'number' ? d.Credits : null;
  } catch {
    return null;
  }
}

async function validateEmail(email, apiKey) {
  const url =
    `https://api.zerobounce.net/v2/validate` +
    `?api_key=${encodeURIComponent(apiKey)}` +
    `&email=${encodeURIComponent(email)}` +
    `&ip_address=`;

  const r = await fetch(url, { signal: AbortSignal.timeout(ZB_TIMEOUT) });
  if (!r.ok) throw new Error(`ZeroBounce HTTP ${r.status}`);
  return r.json();
}

/** Run async tasks with bounded concurrency */
async function pool(tasks, concurrency) {
  const results = new Array(tasks.length);
  let i = 0;

  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

export default withProtection('validate-list', async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { leads = [], zeroBounceApiKey, plan = 'starter', subscriptionKey } = req.body || {};

  // Determine which ZB key to use:
  //   Scale/Agency — client MUST supply their own key; platform key not available
  //   Pro          — platform key included (we cover ZB, client covers Hunter)
  //   Starter      — platform key included, capped to 100 validations/mo
  const usingPlatformKey = !zeroBounceApiKey?.trim();
  const apiKey = zeroBounceApiKey?.trim() || process.env.ZEROBOUNCE_API_KEY;

  // Scale/Agency: require BYOK for ZeroBounce (we don't pay for their volume)
  if ((plan === 'scale' || plan === 'agency') && usingPlatformKey) {
    return res.status(400).json({
      error: 'Scale/Agency plan requires your own ZeroBounce API key. Add it in Dashboard → API Keys.',
      byok: true, missingKey: 'zerobounce',
    });
  }

  if (!apiKey) {
    return res.status(400).json({
      error:
        'No ZeroBounce API key provided. Add yours under the API Keys tab, ' +
        'or upgrade to a plan that includes platform keys.',
    });
  }

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'No leads supplied.' });
  }

  const capped = leads.slice(0, MAX_LEADS);
  const withEmail    = capped.filter(l => l.email && l.email.includes('@'));
  const withoutEmail = capped.filter(l => !l.email || !l.email.includes('@'));

  // ── Monthly ZB validation quota (platform-key plans only) ─────────────────
  const subKey       = subscriptionKey || `plan-${plan}`;
  const planForLimit = plan || 'starter';

  if (usingPlatformKey && planForLimit !== 'scale' && planForLimit !== 'agency') {
    const check = checkUsage(subKey, planForLimit, 'zbValidations', withEmail.length);
    if (!check.allowed) {
      const limits = PLAN_LIMITS[planForLimit];
      return res.status(429).json({
        error: `Monthly email validation limit reached. Your ${planForLimit} plan includes ${limits.zbValidations} validations/month. ${check.remaining} remaining this month. Upgrade or add your own ZeroBounce key.`,
        quota:      true,
        used:       check.used,
        limit:      check.limit,
        remaining:  check.remaining,
        upgradeUrl: '/pricing',
      });
    }
  }

  if (withEmail.length === 0) {
    return res.status(200).json({
      valid: [],
      warnings: [],
      rejected: withoutEmail.map(l => ({
        ...l,
        _vz_status: 'no-email',
        _vz_reason:  'No email address',
      })),
      stats: {
        total:    capped.length,
        valid:    0,
        warnings: 0,
        rejected: withoutEmail.length,
        credits_remaining: null,
      },
    });
  }

  // Credit check before run — catch insufficient balance early
  const creditsBefore = await checkCredit(apiKey);
  if (creditsBefore !== null && creditsBefore < withEmail.length) {
    return res.status(402).json({
      error:
        `Insufficient ZeroBounce credits. You have ${creditsBefore} credits but need ` +
        `at least ${withEmail.length}. Top up at zerobounce.net.`,
    });
  }

  // Build validation tasks
  const tasks = withEmail.map(lead => async () => {
    try {
      const result = await validateEmail(lead.email, apiKey);
      const rawStatus = (result.status || 'unknown').toLowerCase().replace(/_/g, '-');
      const bucket    = STATUS_BUCKET[rawStatus] || 'warning';
      return {
        lead: {
          ...lead,
          _vz_status: rawStatus,
          _vz_reason: result.sub_status || rawStatus,
          zb_status:  rawStatus,
        },
        bucket,
      };
    } catch (err) {
      // Timeout / network error — treat as warning (don't silently drop)
      return {
        lead: {
          ...lead,
          _vz_status: 'unknown',
          _vz_reason: `Validation error: ${err.message}`,
          zb_status:  'unknown',
        },
        bucket: 'warning',
      };
    }
  });

  const results = await pool(tasks, CONCURRENCY);

  const valid    = [];
  const warnings = [];
  const rejected = [];

  for (const { lead, bucket } of results) {
    if (bucket === 'valid')        valid.push(lead);
    else if (bucket === 'warning') warnings.push(lead);
    else                           rejected.push(lead);
  }

  // Leads with no email → also rejected
  for (const l of withoutEmail) {
    rejected.push({ ...l, _vz_status: 'no-email', _vz_reason: 'No email address' });
  }

  // Record platform-key ZB usage (only count emails that actually went to ZeroBounce)
  if (usingPlatformKey && planForLimit !== 'scale' && planForLimit !== 'agency') {
    recordUsage(subKey, planForLimit, 'zbValidations', withEmail.length);
  }

  const creditsAfter = await checkCredit(apiKey);

  return res.status(200).json({
    valid,
    warnings,
    rejected,
    stats: {
      total:    capped.length,
      valid:    valid.length,
      warnings: warnings.length,
      rejected: rejected.length,
      credits_remaining: creditsAfter,
    },
  });
});
