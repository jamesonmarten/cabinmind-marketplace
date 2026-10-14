/**
 * Signal extractors.
 *
 * Every function here is pure: `BusinessProfile -> Signal | null`. No I/O, no
 * randomness, no clock reads — the one timestamp available is
 * `profile.observedAt`, which the pipeline sets. That is what makes these
 * testable against fixtures without mocks.
 *
 * An extractor returns null when the fact is absent OR unknown. It must never
 * emit a signal that implies we checked something we could not check.
 */

import type {
  BusinessProfile,
  Signal,
  SignalId,
  SignalKind,
  SignalValue,
} from './types';

// ---------------------------------------------------------------------------
// Thresholds — exported so tuning is explicit and testable
// ---------------------------------------------------------------------------

export const THRESHOLDS = {
  /** Below this rating, reputation work is an easy sell. */
  lowRating: 4.0,
  /** A rating is only meaningful once enough people have voted. */
  minReviewsForRating: 8,
  /** Under this count the business is invisible in the local pack. */
  fewReviews: 15,
  /** Over this count the business has real demand and real budget. */
  highReviewVolume: 100,
  /** Days of silence that count as a review drought. */
  reviewDroughtDays: 90,
  /** last30 must exceed prev30 by this multiple to count as a surge. */
  reviewSurgeMultiple: 2,
  /** A surge needs a floor, or 1 -> 3 reviews reads as a trend. */
  reviewSurgeMinimum: 4,
  /** Milliseconds. Above this, speed is a credible complaint. */
  slowSiteMs: 3000,
  /** Days without a content change before the site reads as abandoned. */
  staleContentDays: 365,
  /** A business this new still needs almost everything. */
  newlyRegisteredDays: 548,
  /** A business this old is stable and can sign a real contract. */
  establishedDays: 3650,
  /** Platforms whose users are commonly ready to move to something better. */
  datedPlatforms: ['godaddy', 'wix'] as const,
  /** Script slugs that count as conversion tracking being present. */
  trackingSlugs: [
    'google-analytics',
    'google-tag-manager',
    'meta-pixel',
    'facebook-pixel',
    'google-ads',
    'hotjar',
    'clarity',
  ] as const,
  /** Titles that indicate a person who can actually sign. */
  decisionMakerTitles: [
    'owner',
    'founder',
    'co-founder',
    'president',
    'principal',
    'partner',
    'ceo',
    'managing director',
    'practice manager',
    'general manager',
    'director of marketing',
    'marketing director',
  ] as const,
} as const;

export const SIGNAL_KIND: Readonly<Record<SignalId, SignalKind>> = {
  multi_location: 'fit',
  newly_registered: 'fit',
  established_operator: 'fit',
  high_review_volume: 'fit',

  no_website: 'trigger',
  site_unreachable: 'trigger',
  no_https: 'trigger',
  not_mobile_friendly: 'trigger',
  slow_site: 'trigger',
  dated_platform: 'trigger',
  stale_content: 'trigger',
  no_online_booking: 'trigger',
  no_tracking_pixel: 'trigger',
  low_rating: 'trigger',
  few_reviews: 'trigger',
  review_drought: 'trigger',
  review_surge: 'trigger',
  unclaimed_listing: 'trigger',
  incomplete_listing: 'trigger',
  running_paid_ads: 'trigger',
  hiring: 'trigger',

  decision_maker_named: 'reachability',
  verified_email: 'reachability',
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

/** Whole days from `iso` up to `observedAt`. Null if `iso` is absent or unparseable. */
export function daysSince(iso: string | undefined, observedAt: string): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  const now = Date.parse(observedAt);
  if (Number.isNaN(then) || Number.isNaN(now)) return null;
  return Math.floor((now - then) / MS_PER_DAY);
}

/** "3 months" / "2 years" — for evidence sentences, never for arithmetic. */
export function humanizeDays(days: number): string {
  if (days < 45) return `${days} days`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} month${months === 1 ? '' : 's'}`;
  }
  const years = Math.floor(days / 365);
  const remainder = Math.round((days % 365) / 30);
  if (years === 1 && remainder >= 6) return 'over 18 months';
  return `${years} year${years === 1 ? '' : 's'}`;
}

function hostOf(profile: BusinessProfile): string {
  const domain = profile.site?.domain;
  if (domain) return domain;
  const website = profile.places.website;
  if (!website) return 'their site';
  try {
    return new URL(website).hostname.replace(/^www\./, '');
  } catch {
    return website;
  }
}

function listToSentence(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0] as string;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

interface SignalDraft {
  label: string;
  evidence: string;
  sourceUrl: string;
  confidence: number;
  value?: SignalValue;
}

function signal(id: SignalId, profile: BusinessProfile, draft: SignalDraft): Signal {
  const base: Signal = {
    id,
    kind: SIGNAL_KIND[id],
    label: draft.label,
    evidence: draft.evidence,
    sourceUrl: draft.sourceUrl,
    confidence: draft.confidence,
    observedAt: profile.observedAt,
  };
  return draft.value === undefined ? base : { ...base, value: draft.value };
}

function placesUrl(profile: BusinessProfile): string {
  return profile.places.source.url;
}

function siteUrl(profile: BusinessProfile): string | null {
  return profile.site?.source.url ?? profile.places.website ?? null;
}

/** External data is only trustworthy if the stage that produces it ran. */
function ran(profile: BusinessProfile, stage: BusinessProfile['stagesCompleted'][number]): boolean {
  return profile.stagesCompleted.includes(stage);
}

function externalSourceUrl(profile: BusinessProfile, source: string, fallback: string): string {
  const match = profile.external?.sources.find((s) => s.source === source);
  return match?.url ?? fallback;
}

// ---------------------------------------------------------------------------
// Fit signals
// ---------------------------------------------------------------------------

export function multiLocation(profile: BusinessProfile): Signal | null {
  const count = profile.site?.locationCount;
  if (count === undefined || count < 2) return null;
  const url = siteUrl(profile);
  if (!url) return null;
  return signal('multi_location', profile, {
    label: `${count} locations`,
    evidence: `${profile.places.name} lists ${count} locations on their website, so anything you sell them scales across all ${count}.`,
    sourceUrl: url,
    confidence: 0.85,
    value: count,
  });
}

export function newlyRegistered(profile: BusinessProfile): Signal | null {
  if (!ran(profile, 'augment_registry')) return null;
  const days = daysSince(profile.external?.registeredAt, profile.observedAt);
  if (days === null || days < 0 || days > THRESHOLDS.newlyRegisteredDays) return null;
  return signal('newly_registered', profile, {
    label: 'New business',
    evidence: `${profile.places.name} registered with the state ${humanizeDays(days)} ago, so they are still putting their vendors in place.`,
    sourceUrl: externalSourceUrl(profile, 'state_registry', placesUrl(profile)),
    confidence: 0.9,
    value: profile.external?.registeredAt,
  });
}

export function establishedOperator(profile: BusinessProfile): Signal | null {
  if (!ran(profile, 'augment_registry')) return null;
  const days = daysSince(profile.external?.registeredAt, profile.observedAt);
  if (days === null || days < THRESHOLDS.establishedDays) return null;
  return signal('established_operator', profile, {
    label: `${Math.floor(days / 365)}+ years in business`,
    evidence: `${profile.places.name} has been registered with the state for ${humanizeDays(days)}, so they have survived long enough to have a real budget.`,
    sourceUrl: externalSourceUrl(profile, 'state_registry', placesUrl(profile)),
    confidence: 0.9,
    value: profile.external?.registeredAt,
  });
}

export function highReviewVolume(profile: BusinessProfile): Signal | null {
  const count = profile.places.reviewCount;
  if (count === undefined || count < THRESHOLDS.highReviewVolume) return null;
  return signal('high_review_volume', profile, {
    label: `${count} reviews`,
    evidence: `${profile.places.name} has ${count} Google reviews, which means steady customer volume and the revenue that comes with it.`,
    sourceUrl: placesUrl(profile),
    confidence: 0.95,
    value: count,
  });
}

// ---------------------------------------------------------------------------
// Trigger signals — website
// ---------------------------------------------------------------------------

export function noWebsite(profile: BusinessProfile): Signal | null {
  if (profile.places.website) return null;
  return signal('no_website', profile, {
    label: 'No website',
    evidence: `${profile.places.name} has no website listed on their Google Business Profile — every search for them ends at Google Maps.`,
    sourceUrl: placesUrl(profile),
    confidence: 0.9,
    value: false,
  });
}

export function siteUnreachable(profile: BusinessProfile): Signal | null {
  if (!profile.places.website) return null;
  if (!ran(profile, 'site_scrape')) return null;
  if (profile.site?.reachable !== false) return null;
  return signal('site_unreachable', profile, {
    label: 'Site is down',
    evidence: `The website listed on ${profile.places.name}'s Google profile, ${hostOf(profile)}, did not respond when we checked — anyone who clicks through from Google hits a dead end.`,
    sourceUrl: placesUrl(profile),
    confidence: 0.8,
    value: false,
  });
}

export function noHttps(profile: BusinessProfile): Signal | null {
  const site = profile.site;
  if (!site?.reachable || site.httpsValid !== false) return null;
  const url = siteUrl(profile);
  if (!url) return null;
  return signal('no_https', profile, {
    label: 'No valid HTTPS',
    evidence: `${hostOf(profile)} does not have a valid security certificate, so Chrome shows visitors a "Not secure" warning before they reach the page.`,
    sourceUrl: url,
    confidence: 0.9,
    value: false,
  });
}

export function notMobileFriendly(profile: BusinessProfile): Signal | null {
  const site = profile.site;
  if (!site?.reachable || site.hasViewportMeta !== false) return null;
  const url = siteUrl(profile);
  if (!url) return null;
  return signal('not_mobile_friendly', profile, {
    label: 'Not mobile-friendly',
    evidence: `${hostOf(profile)} has no mobile viewport set, so it loads at desktop width on phones — where most local searches happen.`,
    sourceUrl: url,
    confidence: 0.8,
    value: false,
  });
}

export function slowSite(profile: BusinessProfile): Signal | null {
  const site = profile.site;
  const loadMs = site?.loadMs;
  if (!site?.reachable || loadMs === undefined || loadMs < THRESHOLDS.slowSiteMs) return null;
  const url = siteUrl(profile);
  if (!url) return null;
  const seconds = (loadMs / 1000).toFixed(1);
  return signal('slow_site', profile, {
    label: `${seconds}s load`,
    evidence: `${hostOf(profile)} took ${seconds} seconds to load when we checked, which is slow enough that a meaningful share of visitors leave before it finishes.`,
    sourceUrl: url,
    confidence: 0.7,
    value: loadMs,
  });
}

export function datedPlatform(profile: BusinessProfile): Signal | null {
  const site = profile.site;
  const platform = site?.platform;
  if (!site?.reachable || platform === undefined) return null;
  const dated: readonly string[] = THRESHOLDS.datedPlatforms;
  if (!dated.includes(platform)) return null;
  const url = siteUrl(profile);
  if (!url) return null;
  const pretty = platform === 'godaddy' ? 'GoDaddy Website Builder' : 'Wix';
  return signal('dated_platform', profile, {
    label: pretty,
    evidence: `${hostOf(profile)} is built on ${pretty}, a drag-and-drop builder they are likely paying a monthly fee for and cannot easily extend.`,
    sourceUrl: url,
    confidence: 0.85,
    value: platform,
  });
}

export function staleContent(profile: BusinessProfile): Signal | null {
  const site = profile.site;
  if (!site?.reachable) return null;
  const days = daysSince(site.lastContentUpdateAt, profile.observedAt);
  if (days === null || days < THRESHOLDS.staleContentDays) return null;
  const url = siteUrl(profile);
  if (!url) return null;
  return signal('stale_content', profile, {
    label: `Untouched ${humanizeDays(days)}`,
    evidence: `Nothing on ${hostOf(profile)} has been updated in ${humanizeDays(days)} — whoever built it is no longer maintaining it.`,
    sourceUrl: url,
    confidence: 0.7,
    value: site.lastContentUpdateAt,
  });
}

export function noOnlineBooking(profile: BusinessProfile): Signal | null {
  const site = profile.site;
  if (!site?.reachable || site.hasOnlineBooking !== false) return null;
  const url = siteUrl(profile);
  if (!url) return null;
  return signal('no_online_booking', profile, {
    label: 'No online booking',
    evidence: `There is no way to book an appointment on ${hostOf(profile)} — every customer has to call during business hours.`,
    sourceUrl: url,
    confidence: 0.8,
    value: false,
  });
}

export function noTrackingPixel(profile: BusinessProfile): Signal | null {
  const site = profile.site;
  if (!site?.reachable || site.stack === undefined) return null;
  const tracking: readonly string[] = THRESHOLDS.trackingSlugs;
  if (site.stack.some((slug) => tracking.includes(slug))) return null;
  return signal('no_tracking_pixel', profile, {
    label: 'No analytics',
    evidence: `${hostOf(profile)} has no analytics or ad pixel installed, so they currently have no way to tell which of their marketing is working.`,
    sourceUrl: siteUrl(profile) ?? placesUrl(profile),
    confidence: 0.75,
    value: false,
  });
}

// ---------------------------------------------------------------------------
// Trigger signals — reputation
// ---------------------------------------------------------------------------

export function lowRating(profile: BusinessProfile): Signal | null {
  const { rating, reviewCount, name } = profile.places;
  if (rating === undefined || reviewCount === undefined) return null;
  if (reviewCount < THRESHOLDS.minReviewsForRating) return null;
  if (rating >= THRESHOLDS.lowRating) return null;
  return signal('low_rating', profile, {
    label: `${rating.toFixed(1)}★`,
    evidence: `${name} is rated ${rating.toFixed(1)} stars across ${reviewCount} Google reviews, which puts them below the threshold most people filter by when choosing a local business.`,
    sourceUrl: placesUrl(profile),
    confidence: 0.95,
    value: rating,
  });
}

export function fewReviews(profile: BusinessProfile): Signal | null {
  const { reviewCount, name } = profile.places;
  if (reviewCount === undefined || reviewCount >= THRESHOLDS.fewReviews) return null;
  return signal('few_reviews', profile, {
    label: `Only ${reviewCount} reviews`,
    evidence: `${name} has only ${reviewCount} Google review${reviewCount === 1 ? '' : 's'}, which is usually not enough to rank in the local three-pack for their category.`,
    sourceUrl: placesUrl(profile),
    confidence: 0.95,
    value: reviewCount,
  });
}

export function reviewDrought(profile: BusinessProfile): Signal | null {
  const days = daysSince(profile.places.latestReviewAt, profile.observedAt);
  if (days === null || days < THRESHOLDS.reviewDroughtDays) return null;
  return signal('review_drought', profile, {
    label: `No reviews in ${humanizeDays(days)}`,
    evidence: `${profile.places.name} has not received a Google review in ${humanizeDays(days)}, so nobody is asking their customers for one.`,
    sourceUrl: placesUrl(profile),
    confidence: 0.85,
    value: days,
  });
}

export function reviewSurge(profile: BusinessProfile): Signal | null {
  const velocity = profile.external?.reviewVelocity;
  if (!velocity) return null;
  const { last30, prev30 } = velocity;
  if (last30 < THRESHOLDS.reviewSurgeMinimum) return null;
  if (last30 < prev30 * THRESHOLDS.reviewSurgeMultiple) return null;
  return signal('review_surge', profile, {
    label: 'Growing fast',
    evidence: `${profile.places.name} picked up ${last30} Google reviews in the last 30 days, up from ${prev30} the month before — they are busy and expanding right now.`,
    sourceUrl: placesUrl(profile),
    confidence: 0.8,
    value: last30,
  });
}

export function unclaimedListing(profile: BusinessProfile): Signal | null {
  if (profile.places.isClaimed !== false) return null;
  return signal('unclaimed_listing', profile, {
    label: 'Unclaimed listing',
    evidence: `${profile.places.name}'s Google Business Profile is unclaimed, which means nobody is managing how they appear in local search or who can edit it.`,
    sourceUrl: placesUrl(profile),
    confidence: 0.9,
    value: false,
  });
}

export function incompleteListing(profile: BusinessProfile): Signal | null {
  const { hasHours, hasDescription, photoCount, name } = profile.places;
  if (hasHours === undefined && hasDescription === undefined && photoCount === undefined) {
    return null;
  }
  const missing: string[] = [];
  if (hasHours === false) missing.push('no opening hours');
  if (hasDescription === false) missing.push('no business description');
  if (photoCount !== undefined && photoCount < 3) {
    missing.push(photoCount === 0 ? 'no photos' : `only ${photoCount} photos`);
  }
  if (missing.length === 0) return null;
  return signal('incomplete_listing', profile, {
    label: 'Incomplete listing',
    evidence: `${name}'s Google listing has ${listToSentence(missing)}, so Google has less to rank them on than their competitors do.`,
    sourceUrl: placesUrl(profile),
    confidence: 0.85,
    value: missing.length,
  });
}

// ---------------------------------------------------------------------------
// Trigger signals — spend and growth
// ---------------------------------------------------------------------------

export function runningPaidAds(profile: BusinessProfile): Signal | null {
  if (!ran(profile, 'augment_ads')) return null;
  if (profile.external?.runningPaidAds !== true) return null;
  const platforms = profile.external.adPlatforms ?? [];
  const pretty = platforms.map((p) => (p === 'meta' ? 'Meta' : 'Google'));
  const where = pretty.length > 0 ? ` on ${listToSentence(pretty)}` : '';
  const fallbackSource = platforms.includes('meta')
    ? 'meta_ad_library'
    : 'google_ads_transparency';
  return signal('running_paid_ads', profile, {
    label: pretty.length > 0 ? `Ads on ${pretty.join(' + ')}` : 'Running ads',
    evidence: `${profile.places.name} is currently running paid ads${where}, so they already have a marketing budget and someone approving spend.`,
    sourceUrl: externalSourceUrl(profile, fallbackSource, placesUrl(profile)),
    confidence: 0.9,
    value: true,
  });
}

export function hiring(profile: BusinessProfile): Signal | null {
  if (!ran(profile, 'augment_jobs')) return null;
  const count = profile.external?.openJobCount;
  if (count === undefined || count < 1) return null;
  const titles = profile.external?.jobTitles ?? [];
  const forRoles = titles.length > 0 ? `, including ${listToSentence(titles.slice(0, 2))}` : '';
  return signal('hiring', profile, {
    label: `${count} open role${count === 1 ? '' : 's'}`,
    evidence: `${profile.places.name} has ${count} open job posting${count === 1 ? '' : 's'}${forRoles} — they are growing and spending money to keep up.`,
    sourceUrl: externalSourceUrl(profile, 'indeed', placesUrl(profile)),
    confidence: 0.85,
    value: count,
  });
}

// ---------------------------------------------------------------------------
// Reachability signals
// ---------------------------------------------------------------------------

export function decisionMakerNamed(profile: BusinessProfile): Signal | null {
  const people = profile.site?.people ?? [];
  const titles: readonly string[] = THRESHOLDS.decisionMakerTitles;
  const match = people.find((person) => {
    const title = person.title?.toLowerCase();
    return title !== undefined && titles.some((t) => title.includes(t));
  });
  if (!match) return null;
  return signal('decision_maker_named', profile, {
    label: match.title ?? 'Decision maker',
    evidence: `${match.name} is listed as ${match.title} on ${hostOf(profile)}, so you can open with a name instead of "to whom it may concern".`,
    sourceUrl: match.source.url,
    confidence: 0.8,
    value: match.name,
  });
}

export function verifiedEmail(profile: BusinessProfile): Signal | null {
  const emails = profile.site?.emails ?? [];
  const verified = emails.find((e) => e.verification === 'valid');
  if (!verified) return null;
  const personal = verified.kind === 'personal';
  return signal('verified_email', profile, {
    label: personal ? 'Verified direct email' : 'Verified email',
    evidence: personal
      ? `We verified a direct email address for someone at ${profile.places.name} that accepts mail, so your first message reaches a person rather than a shared inbox.`
      : `We verified a working contact address for ${profile.places.name}, so your first message will not bounce.`,
    sourceUrl: verified.source.url,
    confidence: 0.9,
    value: verified.kind,
  });
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export type SignalExtractor = (profile: BusinessProfile) => Signal | null;

/** All 23 extractors, in the order they are evaluated. */
export const EXTRACTORS: Readonly<Record<SignalId, SignalExtractor>> = {
  multi_location: multiLocation,
  newly_registered: newlyRegistered,
  established_operator: establishedOperator,
  high_review_volume: highReviewVolume,

  no_website: noWebsite,
  site_unreachable: siteUnreachable,
  no_https: noHttps,
  not_mobile_friendly: notMobileFriendly,
  slow_site: slowSite,
  dated_platform: datedPlatform,
  stale_content: staleContent,
  no_online_booking: noOnlineBooking,
  no_tracking_pixel: noTrackingPixel,
  low_rating: lowRating,
  few_reviews: fewReviews,
  review_drought: reviewDrought,
  review_surge: reviewSurge,
  unclaimed_listing: unclaimedListing,
  incomplete_listing: incompleteListing,
  running_paid_ads: runningPaidAds,
  hiring: hiring,

  decision_maker_named: decisionMakerNamed,
  verified_email: verifiedEmail,
};

/** Run every extractor. Order is stable, which keeps snapshot tests meaningful. */
export function extractSignals(profile: BusinessProfile): Signal[] {
  const out: Signal[] = [];
  for (const id of Object.keys(EXTRACTORS) as SignalId[]) {
    const result = EXTRACTORS[id](profile);
    if (result !== null) out.push(result);
  }
  return out;
}
