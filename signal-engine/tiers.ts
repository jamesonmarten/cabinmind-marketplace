/**
 * Enrichment depths, plans, credits, redaction, quota.
 *
 * `deliver()` is the boundary between what we know and what the buyer has paid
 * to see. Nothing reaches a response body without passing through it. Hiding a
 * field in the UI is not redaction — the data is still in the payload and the
 * buyer can open devtools.
 */

import type {
  Grade,
  OfferProfileId,
  PipelineStage,
  ScoredLead,
  Signal,
  SignalId,
} from './types';

// ---------------------------------------------------------------------------
// Cost
// ---------------------------------------------------------------------------

/**
 * Marginal cost per lead per stage, in millionths of a USD.
 *
 * Integers on purpose. Per-call API prices are fractions of a cent, so cents
 * would round them to zero and a 2,000-lead run would appear free. Micros
 * accumulate exactly; convert to currency only for display.
 */
export const STAGE_COST_MICROS: Readonly<Record<PipelineStage, number>> = {
  // A single Nearby Search request amortised across the results it returns.
  places_search: 1_600,
  place_details: 17_000,
  // Our own bandwidth and compute, not a vendor bill.
  site_scrape: 500,
  augment_ads: 2_000,
  augment_jobs: 2_000,
  augment_registry: 500,
  email_verify: 8_000,
  mobile_lookup: 40_000,
  llm_opener: 3_000,
};

export function microsToUsd(micros: number): number {
  return micros / 1_000_000;
}

/** Derived convenience view. Use STAGE_COST_MICROS for any accumulation. */
export const STAGE_COST_USD: Readonly<Record<PipelineStage, number>> = Object.freeze(
  (Object.keys(STAGE_COST_MICROS) as PipelineStage[]).reduce(
    (acc, stage) => {
      acc[stage] = microsToUsd(STAGE_COST_MICROS[stage]);
      return acc;
    },
    {} as Record<PipelineStage, number>,
  ),
);

export function estimateCostMicros(stages: readonly PipelineStage[], leadCount: number): number {
  const perLead = stages.reduce((acc, stage) => acc + STAGE_COST_MICROS[stage], 0);
  return perLead * leadCount;
}

// ---------------------------------------------------------------------------
// Enrichment levels
// ---------------------------------------------------------------------------

export type EnrichmentLevel = 'discovery' | 'contact' | 'signals' | 'campaign';

export const ENRICHMENT_LEVELS: readonly EnrichmentLevel[] = [
  'discovery',
  'contact',
  'signals',
  'campaign',
];

export interface LevelDefinition {
  id: EnrichmentLevel;
  label: string;
  description: string;
  stages: PipelineStage[];
  /** Credits charged per delivered lead. Integer. */
  creditsPerLead: number;
  /** Contact fields (emails, people) are included from this level up. */
  includesContacts: boolean;
  /** Signals, scores and whyNow are included from this level up. */
  includesSignals: boolean;
}

export const LEVELS: Readonly<Record<EnrichmentLevel, LevelDefinition>> = {
  discovery: {
    id: 'discovery',
    label: 'Discovery',
    description: 'The business list with public Google data. No contacts, no scoring.',
    stages: ['places_search', 'place_details'],
    creditsPerLead: 1,
    includesContacts: false,
    includesSignals: false,
  },
  contact: {
    id: 'contact',
    label: 'Contact',
    description: 'Adds verified contact details scraped from the business website.',
    stages: ['places_search', 'place_details', 'site_scrape', 'email_verify'],
    creditsPerLead: 3,
    includesContacts: true,
    includesSignals: false,
  },
  signals: {
    id: 'signals',
    label: 'Signals',
    description: 'Adds ad, hiring and registry checks, then ranks by why-now evidence.',
    stages: [
      'places_search',
      'place_details',
      'site_scrape',
      'email_verify',
      'augment_ads',
      'augment_jobs',
      'augment_registry',
    ],
    creditsPerLead: 6,
    includesContacts: true,
    includesSignals: true,
  },
  campaign: {
    id: 'campaign',
    label: 'Campaign',
    description: 'Everything, plus mobile numbers and a drafted opening line.',
    stages: [
      'places_search',
      'place_details',
      'site_scrape',
      'email_verify',
      'augment_ads',
      'augment_jobs',
      'augment_registry',
      'mobile_lookup',
      'llm_opener',
    ],
    creditsPerLead: 12,
    includesContacts: true,
    includesSignals: true,
  },
};

export function levelRank(level: EnrichmentLevel): number {
  return ENRICHMENT_LEVELS.indexOf(level);
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export type PlanId = 'trial' | 'starter' | 'pro' | 'agency';

export type ExportFormat = 'csv' | 'google_sheets' | 'webhook';

export interface Plan {
  id: PlanId;
  label: string;
  /** Monthly price in cents. Integer, always. */
  priceCents: number;
  creditsIncluded: number;
  levels: EnrichmentLevel[];
  exports: ExportFormat[];
  maxLeadsPerSearch: number;
  maxWatchlists: number;
  maxWatchlistSize: number;
  /** Trial contacts are masked so the value is visible but not usable. */
  maskContacts: boolean;
  /** Concurrent pipeline runs allowed. Trial is treated as hostile by default. */
  maxConcurrentRuns: number;
  /** Hard ceiling on vendor spend per run, in micros. */
  maxSpendPerRunMicros: number;
}

export const PLANS: Readonly<Record<PlanId, Plan>> = {
  trial: {
    id: 'trial',
    label: 'Free trial',
    priceCents: 0,
    creditsIncluded: 50,
    levels: ['discovery', 'contact'],
    exports: [],
    maxLeadsPerSearch: 25,
    maxWatchlists: 0,
    maxWatchlistSize: 0,
    maskContacts: true,
    maxConcurrentRuns: 1,
    maxSpendPerRunMicros: 500_000, // $0.50
  },
  starter: {
    id: 'starter',
    label: 'Starter',
    priceCents: 4_900,
    creditsIncluded: 1_000,
    levels: ['discovery', 'contact', 'signals'],
    exports: ['csv'],
    maxLeadsPerSearch: 100,
    maxWatchlists: 1,
    maxWatchlistSize: 50,
    maskContacts: false,
    maxConcurrentRuns: 2,
    maxSpendPerRunMicros: 5_000_000, // $5.00
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    priceCents: 14_900,
    creditsIncluded: 5_000,
    levels: ['discovery', 'contact', 'signals', 'campaign'],
    exports: ['csv', 'google_sheets', 'webhook'],
    maxLeadsPerSearch: 250,
    maxWatchlists: 5,
    maxWatchlistSize: 250,
    maskContacts: false,
    maxConcurrentRuns: 4,
    maxSpendPerRunMicros: 25_000_000, // $25.00
  },
  agency: {
    id: 'agency',
    label: 'Agency',
    priceCents: 44_900,
    creditsIncluded: 20_000,
    levels: ['discovery', 'contact', 'signals', 'campaign'],
    exports: ['csv', 'google_sheets', 'webhook'],
    maxLeadsPerSearch: 500,
    maxWatchlists: 25,
    maxWatchlistSize: 1_000,
    maskContacts: false,
    maxConcurrentRuns: 8,
    maxSpendPerRunMicros: 100_000_000, // $100.00
  },
};

export const PLAN_ORDER: readonly PlanId[] = ['trial', 'starter', 'pro', 'agency'];

/** The cheapest plan that grants `level`. Used for upsell payloads. */
export function cheapestPlanFor(level: EnrichmentLevel): PlanId | null {
  for (const id of PLAN_ORDER) {
    if (id === 'trial') continue;
    if (PLANS[id].levels.includes(level)) return id;
  }
  return null;
}

function nextPlanUp(current: PlanId): PlanId | null {
  const index = PLAN_ORDER.indexOf(current);
  return index >= 0 && index < PLAN_ORDER.length - 1 ? (PLAN_ORDER[index + 1] as PlanId) : null;
}

// ---------------------------------------------------------------------------
// Delivery shape
// ---------------------------------------------------------------------------

export interface DeliveredSignal {
  id: SignalId;
  label: string;
  evidence: string;
  sourceUrl: string;
  confidence: number;
}

export interface DeliveredEmail {
  address: string;
  kind: string;
  verification: string;
  sourceUrl: string;
  /** True when `address` has been masked and is not usable for sending. */
  masked: boolean;
}

export interface DeliveredPerson {
  name: string;
  title?: string;
  sourceUrl: string;
}

/** What the buyer is told they are missing, and what unlocks it. */
export interface LockedField {
  field: 'emails' | 'people' | 'signals' | 'whyNow' | 'opener' | 'mobile';
  teaser: string;
  requiresPlan?: PlanId;
  requiresLevel?: EnrichmentLevel;
}

export interface DeliveredLead {
  placeId: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  mapsUrl: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;

  emails?: DeliveredEmail[];
  people?: DeliveredPerson[];

  signals?: DeliveredSignal[];
  whyNow?: string;
  priority?: number;
  grade?: Grade;
  fitScore?: number;
  triggerScore?: number;
  reachabilityScore?: number;
  confidence?: number;
  offerProfileId?: OfferProfileId;

  opener?: string;
  mobile?: string;

  locked: LockedField[];
}

// ---------------------------------------------------------------------------
// Masking
// ---------------------------------------------------------------------------

/**
 * Masks the local part only. The domain is already public from the website
 * field, and keeping it is what makes the teaser persuasive. The full address
 * must never survive anywhere in the payload.
 */
export function maskEmail(address: string): string {
  const at = address.lastIndexOf('@');
  if (at <= 0) return '•'.repeat(Math.max(address.length, 3));
  const local = address.slice(0, at);
  const domain = address.slice(at + 1);
  const head = local.slice(0, 1);
  return `${head}${'•'.repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return '•••-•••-••••';
  const area = digits.slice(0, digits.length === 11 ? 4 : 3);
  return `${area}-•••-••••`;
}

function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  return parts.length > 1 ? `${first} ${'•'.repeat(4)}` : first;
}

// ---------------------------------------------------------------------------
// deliver()
// ---------------------------------------------------------------------------

function toDeliveredSignal(signal: Signal): DeliveredSignal {
  return {
    id: signal.id,
    label: signal.label,
    evidence: signal.evidence,
    sourceUrl: signal.sourceUrl,
    confidence: signal.confidence,
  };
}

/**
 * The single exit point for lead data. Build the response from scratch rather
 * than spreading the ScoredLead and deleting keys — a new field added upstream
 * must default to hidden, not to leaked.
 */
export function deliver(lead: ScoredLead, level: EnrichmentLevel, plan: Plan): DeliveredLead {
  const def = LEVELS[level];
  const { places, site } = lead.profile;
  const locked: LockedField[] = [];

  const delivered: DeliveredLead = {
    placeId: places.placeId,
    name: places.name,
    category: places.primaryCategory,
    address: places.formattedAddress,
    lat: places.lat,
    lng: places.lng,
    mapsUrl: places.source.url,
    locked,
  };

  if (places.website) delivered.website = places.website;
  if (places.rating !== undefined) delivered.rating = places.rating;
  if (places.reviewCount !== undefined) delivered.reviewCount = places.reviewCount;
  if (places.phone) {
    delivered.phone = plan.maskContacts ? maskPhone(places.phone) : places.phone;
  }

  if (def.includesContacts) {
    const emails = site?.emails ?? [];
    delivered.emails = emails.map((email) => ({
      address: plan.maskContacts ? maskEmail(email.address) : email.address,
      kind: email.kind,
      verification: email.verification,
      sourceUrl: email.source.url,
      masked: plan.maskContacts,
    }));

    const people = site?.people ?? [];
    delivered.people = people.map((person) => {
      const entry: DeliveredPerson = {
        name: plan.maskContacts ? maskName(person.name) : person.name,
        sourceUrl: person.source.url,
      };
      if (person.title) entry.title = person.title;
      return entry;
    });

    if (plan.maskContacts) {
      const verified = emails.filter((e) => e.verification === 'valid').length;
      locked.push({
        field: 'emails',
        teaser:
          verified > 0
            ? `${verified} verified contact${verified === 1 ? '' : 's'} at this business`
            : 'Contact details found on their website',
        requiresPlan: nextPlanUp(plan.id) ?? 'starter',
      });
    }
  } else {
    const contactCount = site?.emails?.length ?? 0;
    locked.push({
      field: 'emails',
      teaser:
        contactCount > 0
          ? `${contactCount} contact${contactCount === 1 ? '' : 's'} available at Contact level`
          : 'Contact details available at Contact level',
      requiresLevel: 'contact',
    });
  }

  if (def.includesSignals) {
    delivered.signals = lead.signals.map(toDeliveredSignal);
    delivered.whyNow = lead.whyNow;
    delivered.priority = lead.priority;
    delivered.grade = lead.grade;
    delivered.fitScore = lead.fitScore;
    delivered.triggerScore = lead.triggerScore;
    delivered.reachabilityScore = lead.reachabilityScore;
    delivered.confidence = lead.confidence;
    delivered.offerProfileId = lead.offerProfileId;
  } else if (lead.signals.length > 0) {
    locked.push({
      field: 'signals',
      teaser: `${lead.signals.length} buying signals found — upgrade to see why this business is worth calling first`,
      requiresLevel: 'signals',
    });
  }

  return delivered;
}

// ---------------------------------------------------------------------------
// Quota
// ---------------------------------------------------------------------------

export type QuotaDenialReason =
  | 'level_not_included'
  | 'batch_too_large'
  | 'insufficient_credits'
  | 'watchlists_exhausted';

export interface QuotaRequest {
  plan: Plan;
  level: EnrichmentLevel;
  leadCount: number;
  /** Credits already consumed in the current billing cycle. */
  creditsUsed: number;
  /** Optional top-up credits on the account, beyond the plan allowance. */
  creditsPurchased?: number;
}

export interface QuotaDecision {
  allowed: boolean;
  reason?: QuotaDenialReason;
  /** Plain-English explanation. Safe to show the user verbatim. */
  message?: string;
  creditsRequired: number;
  creditsRemaining: number;
  /** Largest batch that would fit in the remaining balance. */
  maxAffordableLeads: number;
  suggestedPlan?: PlanId;
}

export function creditsFor(level: EnrichmentLevel, leadCount: number): number {
  return LEVELS[level].creditsPerLead * leadCount;
}

export function checkQuota(request: QuotaRequest): QuotaDecision {
  const { plan, level, leadCount, creditsUsed } = request;
  const allowance = plan.creditsIncluded + (request.creditsPurchased ?? 0);
  const creditsRemaining = Math.max(0, allowance - creditsUsed);
  const perLead = LEVELS[level].creditsPerLead;
  const creditsRequired = perLead * leadCount;
  const maxAffordableLeads = Math.floor(creditsRemaining / perLead);

  const base = { creditsRequired, creditsRemaining, maxAffordableLeads };

  if (!plan.levels.includes(level)) {
    const suggested = cheapestPlanFor(level);
    return {
      ...base,
      allowed: false,
      reason: 'level_not_included',
      message: `${LEVELS[level].label} enrichment is not part of ${plan.label}.`,
      ...(suggested ? { suggestedPlan: suggested } : {}),
    };
  }

  if (leadCount > plan.maxLeadsPerSearch) {
    const suggested = nextPlanUp(plan.id);
    return {
      ...base,
      allowed: false,
      reason: 'batch_too_large',
      message: `${plan.label} allows up to ${plan.maxLeadsPerSearch} leads per search. You asked for ${leadCount}.`,
      ...(suggested ? { suggestedPlan: suggested } : {}),
    };
  }

  if (creditsRequired > creditsRemaining) {
    const suggested = nextPlanUp(plan.id);
    return {
      ...base,
      allowed: false,
      reason: 'insufficient_credits',
      message: `This search needs ${creditsRequired} credits and you have ${creditsRemaining} left. You can still run ${maxAffordableLeads} leads at this depth.`,
      ...(suggested ? { suggestedPlan: suggested } : {}),
    };
  }

  return { ...base, allowed: true };
}

// ---------------------------------------------------------------------------
// Watchlists
// ---------------------------------------------------------------------------

export type WatchCadence = 'daily' | 'weekly' | 'monthly';

export type AlertChannel = 'email' | 'slack' | 'webhook';

export interface Watchlist {
  id: string;
  accountId: string;
  name: string;
  /** Google place types to re-run, e.g. ["dentist"]. */
  categories: string[];
  geo: { lat: number; lng: number; radiusMeters: number };
  offerProfileId: OfferProfileId;
  level: EnrichmentLevel;
  cadence: WatchCadence;
  /** Only alert when a business crosses this priority. */
  minPriority: number;
  /** Only alert when one of these signals newly appears. */
  alertOnSignals: SignalId[];
  channels: AlertChannel[];
  /** Destination per channel: email address, Slack webhook, or user webhook URL. */
  destination: string;
  maxLeads: number;
  active: boolean;
  createdAt: string;
  lastRunAt?: string;
}

/**
 * Refreshes cost less than a first run because company-level data is still
 * cached for 30 days; only the volatile fields are re-fetched. Expressed as an
 * integer percentage so credit arithmetic never touches a float.
 */
export const WATCH_REFRESH_COST_PERCENT = 40;

/** Derived. Present because downstream specs refer to it by this name. */
export const WATCH_REFRESH_COST_MULTIPLIER = WATCH_REFRESH_COST_PERCENT / 100;

/** Always rounds up, so a refresh is never free. */
export function watchRefreshCredits(level: EnrichmentLevel, leadCount: number): number {
  return Math.ceil((creditsFor(level, leadCount) * WATCH_REFRESH_COST_PERCENT) / 100);
}

/** Suppression window for a repeat alert on the same place_id + signal. */
export const ALERT_SUPPRESSION_DAYS = 30;
