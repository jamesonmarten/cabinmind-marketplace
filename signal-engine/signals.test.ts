import {
  EXTRACTORS,
  SIGNAL_KIND,
  daysSince,
  extractSignals,
  humanizeDays,
} from './signals';
import type { BusinessProfile, SignalId } from './types';
import {
  OBSERVED_AT,
  cedarSmiles,
  discoveryOnly,
  harborLaw,
  lakeviewHvac,
  makePlaces,
  makeProfile,
  makeSite,
  northsideDental,
  pineRidgeAuto,
} from '../__fixtures__/profiles';

function ids(profile: BusinessProfile): SignalId[] {
  return extractSignals(profile).map((s) => s.id);
}

describe('extractor registry', () => {
  it('exposes exactly 23 extractors', () => {
    expect(Object.keys(EXTRACTORS)).toHaveLength(23);
  });

  it('classifies every extractor', () => {
    for (const id of Object.keys(EXTRACTORS) as SignalId[]) {
      expect(SIGNAL_KIND[id]).toBeDefined();
    }
  });

  it('is pure — the same profile yields identical output every time', () => {
    expect(extractSignals(northsideDental)).toEqual(extractSignals(northsideDental));
  });
});

describe('date helpers', () => {
  it('counts whole days up to observedAt', () => {
    expect(daysSince('2026-02-01T12:00:00.000Z', OBSERVED_AT)).toBe(28);
  });

  it('returns null rather than guessing when the date is missing', () => {
    expect(daysSince(undefined, OBSERVED_AT)).toBeNull();
    expect(daysSince('not-a-date', OBSERVED_AT)).toBeNull();
  });

  it('reads naturally in evidence sentences', () => {
    expect(humanizeDays(12)).toBe('12 days');
    expect(humanizeDays(90)).toBe('3 months');
    expect(humanizeDays(780)).toBe('2 years');
  });
});

describe('every signal carries verifiable provenance', () => {
  it.each([
    ['northsideDental', northsideDental],
    ['lakeviewHvac', lakeviewHvac],
    ['cedarSmiles', cedarSmiles],
    ['harborLaw', harborLaw],
    ['pineRidgeAuto', pineRidgeAuto],
  ])('%s', (_name, profile) => {
    const signals = extractSignals(profile);
    expect(signals.length).toBeGreaterThan(0);
    for (const signal of signals) {
      expect(signal.sourceUrl).toMatch(/^https?:\/\//);
      expect(signal.confidence).toBeGreaterThan(0);
      expect(signal.confidence).toBeLessThanOrEqual(1);
      expect(signal.observedAt).toBe(OBSERVED_AT);
      // Evidence must be a pasteable sentence, not a fragment or a template.
      expect(signal.evidence.trim()).toMatch(/[.!?]$/);
      expect(signal.evidence).not.toMatch(/\{\{|\}\}|undefined|NaN|\[object/);
      expect(signal.evidence.split(' ').length).toBeGreaterThan(6);
    }
  });
});

describe('website signals', () => {
  it('flags a dated builder, missing cert, no viewport and stale content together', () => {
    expect(ids(northsideDental)).toEqual(
      expect.arrayContaining([
        'dated_platform',
        'no_https',
        'not_mobile_friendly',
        'slow_site',
        'stale_content',
        'no_online_booking',
        'no_tracking_pixel',
      ]),
    );
  });

  it('fires no_website only when Google has no website on file', () => {
    expect(ids(cedarSmiles)).toContain('no_website');
    expect(ids(northsideDental)).not.toContain('no_website');
  });

  it('separates "listed but dead" from "never had one"', () => {
    expect(ids(harborLaw)).toContain('site_unreachable');
    expect(ids(harborLaw)).not.toContain('no_website');
    expect(ids(cedarSmiles)).not.toContain('site_unreachable');
  });

  it('stays silent about the site when the scrape never ran', () => {
    const signals = ids(discoveryOnly);
    expect(signals).not.toContain('no_https');
    expect(signals).not.toContain('not_mobile_friendly');
    expect(signals).not.toContain('no_tracking_pixel');
    expect(signals).not.toContain('site_unreachable');
  });

  it('does not flag a healthy modern site', () => {
    const signals = ids(pineRidgeAuto);
    for (const id of ['no_https', 'not_mobile_friendly', 'slow_site', 'dated_platform', 'stale_content', 'no_online_booking', 'no_tracking_pixel'] as SignalId[]) {
      expect(signals).not.toContain(id);
    }
  });

  it('treats a present analytics tag as tracking installed', () => {
    expect(ids(pineRidgeAuto)).not.toContain('no_tracking_pixel');
    expect(ids(lakeviewHvac)).toContain('no_tracking_pixel');
  });
});

describe('reputation signals', () => {
  it('ignores rating until enough people have voted', () => {
    const thinButLowlyRated = makeProfile(
      makePlaces({
        placeId: 'p_thin',
        name: 'Thin Sample Cafe',
        rating: 2.5,
        reviewCount: 3,
      }),
    );
    expect(ids(thinButLowlyRated)).not.toContain('low_rating');
    expect(ids(thinButLowlyRated)).toContain('few_reviews');
  });

  it('fires low_rating once the sample is large enough', () => {
    const rated = makeProfile(
      makePlaces({ placeId: 'p_rated', name: 'Rated Cafe', rating: 3.4, reviewCount: 40 }),
    );
    expect(ids(rated)).toContain('low_rating');
  });

  it('reports a review drought in human terms', () => {
    const signal = EXTRACTORS.review_drought(harborLaw);
    expect(signal).not.toBeNull();
    expect(signal?.evidence).toContain('has not received a Google review in');
  });

  it('requires both a multiple and a floor before calling it a surge', () => {
    expect(ids(lakeviewHvac)).toContain('review_surge');
    expect(ids(pineRidgeAuto)).not.toContain('review_surge');

    const tinyBump = makeProfile(
      makePlaces({ placeId: 'p_bump', name: 'Tiny Bump Co', rating: 4.5, reviewCount: 30 }),
      undefined,
      { reviewVelocity: { last30: 3, prev30: 1 }, sources: [] },
    );
    expect(ids(tinyBump)).not.toContain('review_surge');
  });

  it('lists exactly what is missing from an incomplete listing', () => {
    const signal = EXTRACTORS.incomplete_listing(cedarSmiles);
    expect(signal?.evidence).toContain('no opening hours');
    expect(signal?.evidence).toContain('no business description');
    expect(signal?.evidence).toContain('only 1 photos');
  });
});

describe('augmentation signals fail closed', () => {
  it('emits no ads or hiring signal when those stages did not run', () => {
    const noAugment = makeProfile(
      lakeviewHvac.places,
      lakeviewHvac.site,
      lakeviewHvac.external,
      ['places_search', 'place_details', 'site_scrape'],
    );
    const signals = ids(noAugment);
    expect(signals).not.toContain('running_paid_ads');
    expect(signals).not.toContain('hiring');
    expect(signals).not.toContain('newly_registered');
    expect(signals).not.toContain('established_operator');
  });

  it('names the platforms it actually proved', () => {
    const signal = EXTRACTORS.running_paid_ads(lakeviewHvac);
    expect(signal?.evidence).toContain('Meta and Google');
    expect(signal?.sourceUrl).toContain('facebook.com/ads/library');
  });

  it('cites the open roles it found', () => {
    const signal = EXTRACTORS.hiring(lakeviewHvac);
    expect(signal?.evidence).toContain('4 open job postings');
    expect(signal?.evidence).toContain('HVAC Install Technician');
  });
});

describe('fit signals', () => {
  it('treats recent registration and long tenure as mutually exclusive', () => {
    expect(ids(cedarSmiles)).toContain('newly_registered');
    expect(ids(cedarSmiles)).not.toContain('established_operator');
    expect(ids(northsideDental)).toContain('established_operator');
    expect(ids(northsideDental)).not.toContain('newly_registered');
  });

  it('counts multi-location operators only above one site', () => {
    expect(ids(lakeviewHvac)).toContain('multi_location');
    expect(ids(pineRidgeAuto)).not.toContain('multi_location');
  });
});

describe('reachability signals', () => {
  it('only names a person whose title can sign a contract', () => {
    expect(ids(northsideDental)).toContain('decision_maker_named');
    expect(ids(lakeviewHvac)).toContain('decision_maker_named');
    // "Service Advisor" is not a decision maker.
    expect(ids(pineRidgeAuto)).not.toContain('decision_maker_named');
  });

  it('requires an actually verified address', () => {
    expect(ids(northsideDental)).toContain('verified_email');

    const unverified = makeProfile(
      makePlaces({ placeId: 'p_unver', name: 'Unverified Co', website: 'https://unver.com' }),
      makeSite({
        domain: 'unver.com',
        emails: [
          {
            address: 'hello@unver.com',
            kind: 'generic',
            verification: 'risky',
            source: { source: 'business_site', url: 'https://unver.com/contact', fetchedAt: OBSERVED_AT },
          },
        ],
      }),
    );
    expect(ids(unverified)).not.toContain('verified_email');
  });
});
