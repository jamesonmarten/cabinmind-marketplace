/**
 * lib/plans.js
 *
 * Canonical catalogue of everything we sell. Prices are in cents, as integers.
 *
 * This is the single source of truth. The Stripe checkout session, the pricing
 * page, the trial page and the AI chat assistant all read from here, because
 * they previously drifted: the assistant was quoting $97/$297/$797/$1,997 to
 * visitors while checkout actually charged $100/$250/$500/$1,000. Quoting a
 * price we don't charge is a misrepresentation, so there must only ever be one
 * place to change a number.
 */

export const PRODUCTS = {
  // ─── Flat-rate agents ──────────────────────────────────────────────────────
  'website-audit':   { name: 'AI Website Auditor',        amountCents: 5000,  unit: '/mo' },
  'blog-writer':     { name: 'AI Blog Writer',            amountCents: 5000,  unit: '/hr' },
  'receptionist':    { name: 'AI Receptionist',           amountCents: 8000,  unit: '/mo' },
  'sales-assistant': { name: 'AI Sales Assistant',        amountCents: 10000, unit: '/mo' },
  'social-hub':      { name: 'AI Social Media Hub',       amountCents: 5000,  unit: '/mo' },
  'ai-training':     { name: '1-on-1 AI Training (1 hr)', amountCents: 5000,  unit: '/hr' },
  'ai-training-lifetime': { name: '1-on-1 AI Training — Lifetime Pass', amountCents: 50000, unit: ' once' },

  // ─── Lead Researcher — tiered ─────────────────────────────────────────────
  'lead-researcher': { name: 'AI Lead Researcher — Starter', amountCents: 10000, unit: '/mo', legacyAliasOf: 'lead-starter' },
  'lead-starter':    { name: 'AI Lead Researcher — Starter', amountCents: 10000, unit: '/mo', leads: 100 },
  'lead-pro':        { name: 'AI Lead Researcher — Pro',     amountCents: 25000, unit: '/mo', leads: 500 },
  'lead-scale':      { name: 'AI Lead Researcher — Scale',   amountCents: 50000, unit: '/mo', leads: null },
  'lead-agency':     { name: 'AI Lead Researcher — Agency',  amountCents: 100000, unit: '/mo', leads: null },

  // ─── Automation ───────────────────────────────────────────────────────────
  'automation-single': { name: 'AI Automation — Single Workflow', amountCents: 4700,  unit: ' once', mode: 'payment' },
  'automation-expert': { name: 'AI Automation Expert',            amountCents: 19700, unit: '/mo' },
  'automation-agency': { name: 'AI Automation Expert — Agency',   amountCents: 49700, unit: '/mo' },
};

export function priceUsd(id) {
  const p = PRODUCTS[id];
  return p ? Math.round(p.amountCents / 100) : null;
}

/** "$250/mo" — for display and for the assistant's system prompt. */
export function priceLabel(id) {
  const p = PRODUCTS[id];
  return p ? `$${priceUsd(id)}${p.unit}` : '';
}

/** The four Lead Researcher tiers, in upgrade order, for pricing tables. */
export const LEAD_TIERS = ['lead-starter', 'lead-pro', 'lead-scale', 'lead-agency'].map(id => ({
  id,
  name: PRODUCTS[id].name.replace('AI Lead Researcher — ', ''),
  priceUsd: priceUsd(id),
  label: priceLabel(id),
  leads: PRODUCTS[id].leads,
  leadsLabel: PRODUCTS[id].leads ? `${PRODUCTS[id].leads} leads / month` : 'Unlimited leads',
  perLead: PRODUCTS[id].leads
    ? `$${(priceUsd(id) / PRODUCTS[id].leads).toFixed(2)} per lead`
    : 'No per-lead cap',
}));
