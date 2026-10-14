/**
 * Scoring: fit + trigger + reachability -> priority, grade, whyNow.
 *
 * Pure. Deterministic. Given the same profile and offer it must always produce
 * the same ordering, because the ordering is what we ask users to trust.
 *
 * `whyNow` is assembled by copying a proven evidence sentence verbatim. It is
 * never generated. A model may later rewrite it for tone, but the fact it
 * states always originates here.
 */

import { getOfferProfile } from './offer-profiles';
import { extractSignals, SIGNAL_KIND } from './signals';
import type {
  BusinessProfile,
  Grade,
  OfferProfileId,
  ScoredLead,
  Signal,
  SignalId,
} from './types';

/** How the three sub-scores combine. Trigger dominates: timing is the product. */
export const SCORE_WEIGHTS = {
  fit: 0.3,
  trigger: 0.55,
  reachability: 0.15,
} as const;

/**
 * A business that merely matches the requested category already has a passable
 * fit, so fit starts here rather than at zero.
 */
export const FIT_BASELINE = 45;

/**
 * How many simultaneous signals of each kind constitute a "perfect" lead. Used
 * to normalise. Summing every possible weight instead would be wrong — several
 * signals are mutually exclusive (a business cannot be both newly registered
 * and a ten-year operator), so that denominator is unreachable and every lead
 * would score low.
 */
export const SATURATION = {
  fit: 2,
  trigger: 4,
} as const;

export const GRADE_THRESHOLDS: ReadonlyArray<{ min: number; grade: Grade }> = [
  { min: 75, grade: 'A' },
  { min: 55, grade: 'B' },
  { min: 35, grade: 'C' },
  { min: 0, grade: 'D' },
];

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function sumTopWeights(weights: Record<SignalId, number>, kind: 'fit' | 'trigger'): number {
  const applicable = (Object.keys(SIGNAL_KIND) as SignalId[])
    .filter((id) => SIGNAL_KIND[id] === kind)
    .map((id) => weights[id])
    .sort((a, b) => b - a)
    .slice(0, SATURATION[kind]);
  const total = applicable.reduce((acc, weight) => acc + weight, 0);
  return total > 0 ? total : 1;
}

/** weight x confidence, so an uncertain fact contributes less than a certain one. */
function contribution(signal: Signal, weights: Record<SignalId, number>): number {
  return weights[signal.id] * signal.confidence;
}

/**
 * How much of the intended enrichment actually succeeded. Exposed on every lead
 * so a user can tell a thin result from a thorough one rather than guessing.
 */
export function computeConfidence(profile: BusinessProfile): number {
  let score = 0.4;
  if (profile.stagesCompleted.includes('site_scrape')) {
    score += profile.site?.reachable ? 0.3 : 0.15;
  }
  if (profile.stagesCompleted.includes('augment_ads')) score += 0.1;
  if (profile.stagesCompleted.includes('augment_jobs')) score += 0.1;
  if (profile.stagesCompleted.includes('augment_registry')) score += 0.1;
  if (profile.stagesCompleted.includes('email_verify')) score += 0.05;
  return Math.min(1, round(score * 100) / 100);
}

/**
 * Can the user actually start a conversation tomorrow morning? Deliberately a
 * fixed ladder rather than offer weights — a phone number is worth the same to
 * everyone.
 */
export function computeReachability(profile: BusinessProfile, signals: Signal[]): number {
  let score = 0;
  const emails = profile.site?.emails ?? [];

  const hasVerified = signals.some((s) => s.id === 'verified_email');
  const hasPersonal = emails.some((e) => e.kind === 'personal');
  if (hasVerified) score += hasPersonal ? 35 : 25;
  else if (emails.length > 0) score += 20;

  if (signals.some((s) => s.id === 'decision_maker_named')) score += 25;
  if (profile.places.phone) score += 20;
  if (profile.site?.hasContactForm) score += 15;
  if (profile.site?.reachable) score += 10;

  return clamp(score);
}

export function gradeFor(priority: number): Grade {
  for (const band of GRADE_THRESHOLDS) {
    if (priority >= band.min) return band.grade;
  }
  return 'D';
}

/**
 * The headline. Copied verbatim from the highest-contributing trigger signal so
 * that every word on the card is already backed by a sourceUrl.
 */
function buildWhyNow(ranked: Signal[], profile: BusinessProfile): string {
  const topTrigger = ranked.find((s) => s.kind === 'trigger');
  if (topTrigger) return topTrigger.evidence;
  const topFit = ranked.find((s) => s.kind === 'fit');
  if (topFit) return topFit.evidence;
  return `We found no timing signals for ${profile.places.name}. They match the category you asked for, but nothing we can verify suggests they are in market right now.`;
}

export function scoreLead(profile: BusinessProfile, offerProfileId: OfferProfileId): ScoredLead {
  const offer = getOfferProfile(offerProfileId);
  const { weights } = offer;
  const signals = extractSignals(profile);

  // Rank by contribution so both whyNow and the UI chip order reflect what
  // actually drove the score for this specific offer.
  const ranked = [...signals].sort((a, b) => {
    const delta = contribution(b, weights) - contribution(a, weights);
    return delta !== 0 ? delta : a.id.localeCompare(b.id);
  });

  const fitRaw = ranked
    .filter((s) => s.kind === 'fit')
    .reduce((acc, s) => acc + contribution(s, weights), 0);
  const triggerRaw = ranked
    .filter((s) => s.kind === 'trigger')
    .reduce((acc, s) => acc + contribution(s, weights), 0);

  const fitFill = Math.min(1, fitRaw / sumTopWeights(weights, 'fit'));
  const triggerFill = Math.min(1, triggerRaw / sumTopWeights(weights, 'trigger'));

  const fitScore = round(clamp(FIT_BASELINE + (100 - FIT_BASELINE) * fitFill));
  const triggerScore = round(clamp(100 * triggerFill));
  const reachabilityScore = computeReachability(profile, signals);
  const confidence = computeConfidence(profile);

  const disqualifiedBy = offer.disqualifyingSignals.filter((id) =>
    signals.some((s) => s.id === id),
  );

  const blended =
    SCORE_WEIGHTS.fit * fitScore +
    SCORE_WEIGHTS.trigger * triggerScore +
    SCORE_WEIGHTS.reachability * reachabilityScore;

  // Thin evidence should not outrank thorough evidence at the same raw score.
  const damped = blended * (0.75 + 0.25 * confidence);
  const priority = disqualifiedBy.length > 0 ? 0 : round(clamp(damped));

  return {
    placeId: profile.places.placeId,
    name: profile.places.name,
    profile,
    signals: ranked,
    fitScore,
    triggerScore,
    reachabilityScore,
    priority,
    grade: disqualifiedBy.length > 0 ? 'D' : gradeFor(priority),
    whyNow: buildWhyNow(ranked, profile),
    confidence,
    offerProfileId,
    disqualified: disqualifiedBy.length > 0,
    disqualifiedBy,
  };
}

/**
 * Score and rank. Ties break on placeId so the order is stable across runs —
 * snapshot tests assert order, and a wobbling tie would make them useless.
 */
export function scoreBatch(
  profiles: readonly BusinessProfile[],
  offerProfileId: OfferProfileId,
): ScoredLead[] {
  return profiles
    .map((profile) => scoreLead(profile, offerProfileId))
    .sort((a, b) => {
      const delta = b.priority - a.priority;
      return delta !== 0 ? delta : a.placeId.localeCompare(b.placeId);
    });
}
