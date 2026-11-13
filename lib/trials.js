/**
 * lib/trials.js
 *
 * Who has a gifted trial, and how much it's worth.
 *
 * Slugs can be added at runtime via the TRIAL_SLUGS env var (comma-separated)
 * so handing a new prospect an account is a Vercel env change, not a code
 * change and redeploy. The built-in list stays as a fallback.
 *
 *   TRIAL_SLUGS="acme-pilot-a1b2,northwind-trial-9x7q"
 *
 * The matching allowance is enforced server-side in /api/leads via
 * PLAN_LIMITS['client-trial'] in lib/usageStore.js — changing TRIAL_LEAD_LIMIT
 * here alone does not raise the cap.
 */

const BUILT_IN_SLUGS = [
  'demo-50-leads',
  'acme2026',
  'defiantcnc2026',
  'defiantcnc-pilot-7k42',
];

export const TRIAL_LEAD_LIMIT = 50;

/** Slugs are lowercased and de-duplicated so a stray capital in env doesn't lock someone out. */
export function getTrialSlugs() {
  const fromEnv = (process.env.TRIAL_SLUGS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set([...BUILT_IN_SLUGS, ...fromEnv])];
}

export function isValidTrialSlug(slug) {
  return getTrialSlugs().includes((slug || '').toLowerCase().trim());
}
