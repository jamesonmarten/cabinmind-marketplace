/**
 * Realistic business fixtures for signal and scoring tests.
 *
 * All businesses here are invented. Fixtures must never contain facts about a
 * real company — a test fixture that looks like real data eventually gets
 * demoed as if it were.
 */

import type {
  BusinessProfile,
  ContactEmail,
  ExternalData,
  Person,
  PipelineStage,
  PlacesData,
  SiteData,
  SourceRef,
} from '../signal-engine/types';

/** The single clock value every fixture is evaluated against. */
export const OBSERVED_AT = '2026-03-01T12:00:00.000Z';

export const FULL_STAGES: PipelineStage[] = [
  'places_search',
  'place_details',
  'site_scrape',
  'email_verify',
  'augment_ads',
  'augment_jobs',
  'augment_registry',
];

export function mapsSource(placeId: string): SourceRef {
  return {
    source: 'google_places',
    url: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
    fetchedAt: OBSERVED_AT,
  };
}

export function siteSource(domain: string, path = '/'): SourceRef {
  return {
    source: 'business_site',
    url: `https://${domain}${path}`,
    fetchedAt: OBSERVED_AT,
  };
}

export function makePlaces(overrides: Partial<PlacesData> & { placeId: string; name: string }): PlacesData {
  return {
    primaryCategory: 'dentist',
    categories: ['dentist', 'health'],
    formattedAddress: '100 Main St, Milwaukee, WI 53202',
    lat: 43.0389,
    lng: -87.9065,
    source: mapsSource(overrides.placeId),
    ...overrides,
  };
}

export function makeSite(overrides: Partial<SiteData> & { domain: string }): SiteData {
  return {
    reachable: true,
    source: siteSource(overrides.domain),
    ...overrides,
  };
}

export function makeEmail(
  address: string,
  domain: string,
  overrides: Partial<ContactEmail> = {},
): ContactEmail {
  return {
    address,
    kind: 'generic',
    verification: 'unknown',
    source: siteSource(domain, '/contact'),
    ...overrides,
  };
}

export function makePerson(name: string, title: string, domain: string): Person {
  return { name, title, source: siteSource(domain, '/about') };
}

export function makeProfile(
  places: PlacesData,
  site?: SiteData,
  external?: ExternalData,
  stagesCompleted: PipelineStage[] = FULL_STAGES,
): BusinessProfile {
  const profile: BusinessProfile = { places, stagesCompleted, observedAt: OBSERVED_AT };
  if (site) profile.site = site;
  if (external) profile.external = external;
  return profile;
}

// ---------------------------------------------------------------------------
// Named fixtures
// ---------------------------------------------------------------------------

/** Old GoDaddy site, no cert, untouched for two years. The classic website lead. */
export const northsideDental: BusinessProfile = makeProfile(
  makePlaces({
    placeId: 'place_northside_dental',
    name: 'Northside Family Dental',
    phone: '(414) 555-0142',
    website: 'http://northsidefamilydental.com',
    rating: 4.3,
    reviewCount: 62,
    isClaimed: true,
    hasHours: true,
    hasDescription: true,
    photoCount: 9,
    latestReviewAt: '2026-02-18T00:00:00.000Z',
  }),
  makeSite({
    domain: 'northsidefamilydental.com',
    httpsValid: false,
    hasViewportMeta: false,
    loadMs: 4800,
    hasContactForm: true,
    hasOnlineBooking: false,
    hasLiveChat: false,
    hasBlog: false,
    platform: 'godaddy',
    stack: ['jquery'],
    lastContentUpdateAt: '2024-01-10T00:00:00.000Z',
    emails: [
      makeEmail('info@northsidefamilydental.com', 'northsidefamilydental.com', {
        verification: 'valid',
      }),
    ],
    people: [makePerson('Dr. Alan Reyes', 'Owner', 'northsidefamilydental.com')],
  }),
  {
    runningPaidAds: false,
    openJobCount: 0,
    registeredAt: '2009-06-02T00:00:00.000Z',
    sources: [
      { source: 'meta_ad_library', url: 'https://www.facebook.com/ads/library/?q=northside', fetchedAt: OBSERVED_AT },
      { source: 'state_registry', url: 'https://apps.dfi.wi.gov/apps/corpsearch/Details.aspx?id=1', fetchedAt: OBSERVED_AT },
    ],
  },
);

/** Modern site, already buying ads, hiring, but no analytics installed. */
export const lakeviewHvac: BusinessProfile = makeProfile(
  makePlaces({
    placeId: 'place_lakeview_hvac',
    name: 'Lakeview Heating & Cooling',
    primaryCategory: 'hvac_contractor',
    categories: ['hvac_contractor', 'contractor'],
    phone: '(414) 555-0188',
    website: 'https://lakeviewhvac.com',
    rating: 4.7,
    reviewCount: 214,
    isClaimed: true,
    hasHours: true,
    hasDescription: true,
    photoCount: 24,
    latestReviewAt: '2026-02-26T00:00:00.000Z',
  }),
  makeSite({
    domain: 'lakeviewhvac.com',
    httpsValid: true,
    hasViewportMeta: true,
    loadMs: 1200,
    hasContactForm: true,
    hasOnlineBooking: false,
    hasLiveChat: true,
    hasBlog: true,
    platform: 'wordpress',
    stack: ['jquery', 'wpforms'],
    lastContentUpdateAt: '2026-02-01T00:00:00.000Z',
    locationCount: 3,
    emails: [
      makeEmail('dana@lakeviewhvac.com', 'lakeviewhvac.com', {
        kind: 'personal',
        verification: 'valid',
      }),
    ],
    people: [makePerson('Dana Whitfield', 'Co-Founder', 'lakeviewhvac.com')],
  }),
  {
    runningPaidAds: true,
    adPlatforms: ['meta', 'google'],
    openJobCount: 4,
    jobTitles: ['HVAC Install Technician', 'Service Dispatcher'],
    registeredAt: '2011-03-14T00:00:00.000Z',
    reviewVelocity: { last30: 11, prev30: 4 },
    sources: [
      { source: 'meta_ad_library', url: 'https://www.facebook.com/ads/library/?q=lakeviewhvac', fetchedAt: OBSERVED_AT },
      { source: 'indeed', url: 'https://www.indeed.com/cmp/Lakeview-Heating-&-Cooling/jobs', fetchedAt: OBSERVED_AT },
      { source: 'state_registry', url: 'https://apps.dfi.wi.gov/apps/corpsearch/Details.aspx?id=2', fetchedAt: OBSERVED_AT },
    ],
  },
);

/** No website at all, unclaimed listing, almost no reviews. */
export const cedarSmiles: BusinessProfile = makeProfile(
  makePlaces({
    placeId: 'place_cedar_smiles',
    name: 'Cedar Street Smiles',
    phone: '(414) 555-0117',
    rating: 4.9,
    reviewCount: 6,
    isClaimed: false,
    hasHours: false,
    hasDescription: false,
    photoCount: 1,
    latestReviewAt: '2025-09-02T00:00:00.000Z',
  }),
  undefined,
  {
    runningPaidAds: false,
    openJobCount: 0,
    registeredAt: '2025-04-20T00:00:00.000Z',
    sources: [
      { source: 'state_registry', url: 'https://apps.dfi.wi.gov/apps/corpsearch/Details.aspx?id=3', fetchedAt: OBSERVED_AT },
    ],
  },
);

/** Website is listed on Google but the server does not answer. */
export const harborLaw: BusinessProfile = makeProfile(
  makePlaces({
    placeId: 'place_harbor_law',
    name: 'Harbor Point Law',
    primaryCategory: 'lawyer',
    categories: ['lawyer'],
    phone: '(414) 555-0163',
    website: 'http://harborpointlaw.com',
    rating: 4.1,
    reviewCount: 31,
    isClaimed: true,
    hasHours: true,
    hasDescription: false,
    photoCount: 2,
    latestReviewAt: '2025-10-12T00:00:00.000Z',
  }),
  makeSite({ domain: 'harborpointlaw.com', reachable: false }),
  {
    runningPaidAds: false,
    openJobCount: 0,
    registeredAt: '2014-08-01T00:00:00.000Z',
    sources: [
      { source: 'state_registry', url: 'https://apps.dfi.wi.gov/apps/corpsearch/Details.aspx?id=4', fetchedAt: OBSERVED_AT },
    ],
  },
);

/** Everything already handled. Should rank last for almost every offer. */
export const pineRidgeAuto: BusinessProfile = makeProfile(
  makePlaces({
    placeId: 'place_pine_ridge_auto',
    name: 'Pine Ridge Auto Works',
    primaryCategory: 'car_repair',
    categories: ['car_repair'],
    phone: '(414) 555-0199',
    website: 'https://pineridgeauto.com',
    rating: 4.8,
    reviewCount: 340,
    isClaimed: true,
    hasHours: true,
    hasDescription: true,
    photoCount: 40,
    latestReviewAt: '2026-02-27T00:00:00.000Z',
  }),
  makeSite({
    domain: 'pineridgeauto.com',
    httpsValid: true,
    hasViewportMeta: true,
    loadMs: 900,
    hasContactForm: true,
    hasOnlineBooking: true,
    hasLiveChat: true,
    hasBlog: true,
    platform: 'webflow',
    stack: ['google-analytics', 'meta-pixel'],
    lastContentUpdateAt: '2026-02-20T00:00:00.000Z',
    locationCount: 1,
    emails: [
      makeEmail('service@pineridgeauto.com', 'pineridgeauto.com', { verification: 'valid' }),
    ],
    people: [makePerson('Marcy Hoell', 'Service Advisor', 'pineridgeauto.com')],
  }),
  {
    runningPaidAds: false,
    openJobCount: 0,
    registeredAt: '2003-01-15T00:00:00.000Z',
    reviewVelocity: { last30: 6, prev30: 5 },
    sources: [
      { source: 'meta_ad_library', url: 'https://www.facebook.com/ads/library/?q=pineridgeauto', fetchedAt: OBSERVED_AT },
      { source: 'indeed', url: 'https://www.indeed.com/cmp/Pine-Ridge-Auto-Works/jobs', fetchedAt: OBSERVED_AT },
      { source: 'state_registry', url: 'https://apps.dfi.wi.gov/apps/corpsearch/Details.aspx?id=5', fetchedAt: OBSERVED_AT },
    ],
  },
);

/** Discovery only — nothing but the Places result. Confidence must reflect that. */
export const discoveryOnly: BusinessProfile = makeProfile(
  makePlaces({
    placeId: 'place_discovery_only',
    name: 'Birch Lane Barbers',
    primaryCategory: 'hair_care',
    categories: ['hair_care'],
    phone: '(414) 555-0120',
    website: 'https://birchlanebarbers.com',
    rating: 4.6,
    reviewCount: 48,
  }),
  undefined,
  undefined,
  ['places_search', 'place_details'],
);

export const ALL_FIXTURES: BusinessProfile[] = [
  northsideDental,
  lakeviewHvac,
  cedarSmiles,
  harborLaw,
  pineRidgeAuto,
];
