/**
 * Offer profiles — signal weights keyed to what the *seller* sells.
 *
 * This file is the product. Two users searching the same category in the same
 * city get different rankings because they sell different things, and the
 * ranking has to be defensible to a skeptical buyer in one sentence.
 *
 * Weights are 0-100 and relative within a profile. The rule of thumb used
 * throughout: 90-100 means "this signal alone justifies the call", 50-70 means
 * "worth mentioning on the call", under 30 means "nice to know, not a reason".
 */

import type { OfferProfile, OfferProfileId, SignalId } from './types';

export const OFFER_PROFILE_IDS: readonly OfferProfileId[] = [
  'websites',
  'local_seo',
  'reputation',
  'paid_ads',
  'booking_software',
  'pos_payments',
  'staffing',
  'general',
];

// ---------------------------------------------------------------------------

const websites: OfferProfile = {
  id: 'websites',
  label: 'Websites',
  description: 'You build or redesign websites for local businesses.',
  weights: {
    // Fit
    multi_location: 55,
    newly_registered: 65,
    established_operator: 25,
    high_review_volume: 30,
    // Trigger — the whole pitch lives here
    no_website: 100,
    site_unreachable: 95,
    dated_platform: 85,
    not_mobile_friendly: 80,
    no_https: 75,
    stale_content: 70,
    slow_site: 60,
    no_online_booking: 30,
    no_tracking_pixel: 25,
    incomplete_listing: 15,
    unclaimed_listing: 10,
    low_rating: 10,
    few_reviews: 10,
    review_drought: 5,
    review_surge: 40,
    running_paid_ads: 45,
    hiring: 35,
    // Reachability
    decision_maker_named: 35,
    verified_email: 40,
  },
  disqualifyingSignals: [],
};

const localSeo: OfferProfile = {
  id: 'local_seo',
  label: 'Local SEO',
  description: 'You get local businesses found in Google search and Maps.',
  weights: {
    multi_location: 70,
    newly_registered: 50,
    established_operator: 30,
    high_review_volume: 20,

    unclaimed_listing: 95,
    incomplete_listing: 90,
    few_reviews: 85,
    stale_content: 75,
    review_drought: 70,
    not_mobile_friendly: 60,
    slow_site: 55,
    low_rating: 50,
    site_unreachable: 45,
    no_https: 45,
    no_website: 40,
    no_tracking_pixel: 40,
    dated_platform: 35,
    no_online_booking: 20,
    running_paid_ads: 55,
    review_surge: 30,
    hiring: 25,

    decision_maker_named: 35,
    verified_email: 40,
  },
  disqualifyingSignals: [],
};

const reputation: OfferProfile = {
  id: 'reputation',
  label: 'Reputation',
  description: 'You help local businesses collect and manage customer reviews.',
  weights: {
    multi_location: 55,
    newly_registered: 30,
    established_operator: 35,
    high_review_volume: 25,

    low_rating: 100,
    review_drought: 95,
    few_reviews: 90,
    unclaimed_listing: 60,
    incomplete_listing: 40,
    review_surge: 20,
    no_online_booking: 10,
    no_website: 15,
    site_unreachable: 15,
    no_https: 10,
    not_mobile_friendly: 10,
    slow_site: 10,
    dated_platform: 10,
    stale_content: 20,
    no_tracking_pixel: 10,
    running_paid_ads: 40,
    hiring: 20,

    decision_maker_named: 35,
    verified_email: 40,
  },
  disqualifyingSignals: [],
};

const paidAds: OfferProfile = {
  id: 'paid_ads',
  label: 'Paid Ads',
  description: 'You run Google or Meta ad campaigns for local businesses.',
  weights: {
    multi_location: 70,
    newly_registered: 55,
    established_operator: 45,
    high_review_volume: 50,

    // Already buying demand is the strongest qualifier: budget is proven.
    no_tracking_pixel: 95,
    running_paid_ads: 85,
    not_mobile_friendly: 65,
    slow_site: 60,
    review_surge: 60,
    hiring: 55,
    no_online_booking: 50,
    no_https: 40,
    dated_platform: 35,
    low_rating: 30,
    stale_content: 25,
    few_reviews: 25,
    incomplete_listing: 20,
    unclaimed_listing: 20,
    review_drought: 15,
    no_website: 0,
    site_unreachable: 0,

    decision_maker_named: 40,
    verified_email: 45,
  },
  // You cannot buy traffic to a destination that does not exist.
  disqualifyingSignals: ['no_website', 'site_unreachable'],
};

const bookingSoftware: OfferProfile = {
  id: 'booking_software',
  label: 'Booking Software',
  description: 'You sell online scheduling or appointment software.',
  weights: {
    multi_location: 75,
    newly_registered: 45,
    established_operator: 35,
    high_review_volume: 60,

    no_online_booking: 100,
    review_surge: 65,
    hiring: 55,
    running_paid_ads: 50,
    not_mobile_friendly: 50,
    no_website: 45,
    dated_platform: 40,
    low_rating: 35,
    review_drought: 30,
    slow_site: 25,
    site_unreachable: 25,
    stale_content: 20,
    no_tracking_pixel: 20,
    few_reviews: 20,
    no_https: 20,
    incomplete_listing: 15,
    unclaimed_listing: 15,

    decision_maker_named: 40,
    verified_email: 45,
  },
  disqualifyingSignals: [],
};

const posPayments: OfferProfile = {
  id: 'pos_payments',
  label: 'POS & Payments',
  description: 'You sell point-of-sale hardware or payment processing.',
  weights: {
    multi_location: 85,
    newly_registered: 80,
    established_operator: 40,
    high_review_volume: 70,

    review_surge: 65,
    hiring: 60,
    no_online_booking: 45,
    running_paid_ads: 35,
    dated_platform: 30,
    no_website: 20,
    not_mobile_friendly: 15,
    slow_site: 10,
    no_https: 15,
    stale_content: 10,
    site_unreachable: 10,
    no_tracking_pixel: 10,
    low_rating: 15,
    few_reviews: 10,
    review_drought: 10,
    incomplete_listing: 10,
    unclaimed_listing: 10,

    decision_maker_named: 45,
    verified_email: 45,
  },
  disqualifyingSignals: [],
};

const staffing: OfferProfile = {
  id: 'staffing',
  label: 'Staffing',
  description: 'You place candidates or sell recruiting services.',
  weights: {
    multi_location: 65,
    newly_registered: 40,
    established_operator: 35,
    high_review_volume: 55,

    hiring: 100,
    review_surge: 70,
    running_paid_ads: 45,
    // Understaffing shows up in service complaints before it shows up anywhere else.
    low_rating: 40,
    review_drought: 20,
    no_online_booking: 15,
    no_website: 10,
    site_unreachable: 10,
    no_https: 5,
    not_mobile_friendly: 5,
    slow_site: 5,
    dated_platform: 5,
    stale_content: 10,
    no_tracking_pixel: 5,
    few_reviews: 10,
    incomplete_listing: 5,
    unclaimed_listing: 5,

    decision_maker_named: 45,
    verified_email: 45,
  },
  disqualifyingSignals: [],
};

const general: OfferProfile = {
  id: 'general',
  label: 'Something else',
  description: 'You sell something else to local businesses.',
  weights: {
    multi_location: 60,
    newly_registered: 55,
    established_operator: 40,
    high_review_volume: 45,

    no_website: 50,
    site_unreachable: 50,
    dated_platform: 40,
    not_mobile_friendly: 40,
    no_https: 35,
    stale_content: 40,
    slow_site: 35,
    no_online_booking: 35,
    no_tracking_pixel: 35,
    low_rating: 45,
    few_reviews: 45,
    review_drought: 40,
    review_surge: 55,
    unclaimed_listing: 45,
    incomplete_listing: 40,
    running_paid_ads: 55,
    hiring: 55,

    decision_maker_named: 40,
    verified_email: 45,
  },
  disqualifyingSignals: [],
};

// ---------------------------------------------------------------------------

export const OFFER_PROFILES: Readonly<Record<OfferProfileId, OfferProfile>> = {
  websites,
  local_seo: localSeo,
  reputation,
  paid_ads: paidAds,
  booking_software: bookingSoftware,
  pos_payments: posPayments,
  staffing,
  general,
};

export function getOfferProfile(id: OfferProfileId): OfferProfile {
  return OFFER_PROFILES[id];
}

export function isOfferProfileId(value: string): value is OfferProfileId {
  return Object.prototype.hasOwnProperty.call(OFFER_PROFILES, value);
}

/** The heaviest signal for an offer, used to normalise trigger scores. */
export function maxWeight(profile: OfferProfile, ids: readonly SignalId[]): number {
  let max = 0;
  for (const id of ids) {
    const weight = profile.weights[id];
    if (weight > max) max = weight;
  }
  return max;
}
