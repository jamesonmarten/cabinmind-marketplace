import { OFFER_PROFILE_IDS, OFFER_PROFILES } from './offer-profiles';
import { computeConfidence, scoreBatch, scoreLead } from './score';
import { SIGNAL_KIND } from './signals';
import type { OfferProfileId, SignalId } from './types';
import {
  ALL_FIXTURES,
  cedarSmiles,
  discoveryOnly,
  lakeviewHvac,
  northsideDental,
  pineRidgeAuto,
} from '../__fixtures__/profiles';

function order(offer: OfferProfileId): string[] {
  return scoreBatch(ALL_FIXTURES, offer).map((lead) => lead.placeId);
}

describe('offer profiles', () => {
  it('prices every signal for every offer', () => {
    const signalIds = Object.keys(SIGNAL_KIND) as SignalId[];
    for (const id of OFFER_PROFILE_IDS) {
      const { weights } = OFFER_PROFILES[id];
      expect(Object.keys(weights).sort()).toEqual([...signalIds].sort());
    }
  });

  it('keeps weights inside the documented 0-100 range', () => {
    for (const id of OFFER_PROFILE_IDS) {
      for (const weight of Object.values(OFFER_PROFILES[id].weights)) {
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('rank order is stable and deterministic', () => {
  it.each(OFFER_PROFILE_IDS)('%s produces the same order twice', (offer) => {
    expect(order(offer)).toEqual(order(offer));
  });

  it('breaks ties on placeId so snapshots do not wobble', () => {
    const batch = scoreBatch([pineRidgeAuto, pineRidgeAuto], 'general');
    expect(batch.map((l) => l.placeId)).toEqual([
      'place_pine_ridge_auto',
      'place_pine_ridge_auto',
    ]);
  });
});

/**
 * The core demo moment: the same businesses, the same city, a different thing
 * being sold, and a visibly different ranking. If this breaks, the product
 * stops being differentiated from a Google Maps scrape.
 */
describe('the offer changes the ranking', () => {
  it('ranks the derelict GoDaddy site first for a website seller', () => {
    expect(order('websites')[0]).toBe('place_northside_dental');
  });

  it('ranks the ad-spending, hiring, untracked operator first for an ads seller', () => {
    expect(order('paid_ads')[0]).toBe('place_lakeview_hvac');
  });

  it('ranks the business with no booking flow first for a booking vendor', () => {
    const top = order('booking_software')[0];
    expect(top).toBe('place_lakeview_hvac');
    expect(order('booking_software')).not.toEqual(order('websites'));
  });

  it('ranks the unclaimed, barely-reviewed listing first for a reputation seller', () => {
    expect(order('reputation')[0]).toBe('place_cedar_smiles');
  });

  it('produces a materially different order for websites vs paid ads', () => {
    expect(order('websites')).not.toEqual(order('paid_ads'));
  });

  it.each(['websites', 'local_seo', 'reputation'] as const)(
    'puts the business that needs nothing last for %s',
    (offer) => {
      const qualified = scoreBatch(ALL_FIXTURES, offer).filter((l) => !l.disqualified);
      expect(qualified[qualified.length - 1]?.placeId).toBe('place_pine_ridge_auto');
    },
  );

  it('ranks the business without booking above the one that already has it', () => {
    const ranked = order('booking_software');
    expect(ranked.indexOf('place_lakeview_hvac')).toBeLessThan(
      ranked.indexOf('place_pine_ridge_auto'),
    );
  });

  it('still ranks a busy shop above a dead one for a staffing seller', () => {
    // Correct, and the reason the previous assertion is offer-scoped: a
    // staffing seller does not care that a law firm's website is down.
    const ranked = order('staffing');
    expect(ranked.indexOf('place_pine_ridge_auto')).toBeLessThan(
      ranked.indexOf('place_harbor_law'),
    );
  });
});

describe('disqualification', () => {
  it('drops a business with no website from a paid-ads search', () => {
    const lead = scoreLead(cedarSmiles, 'paid_ads');
    expect(lead.disqualified).toBe(true);
    expect(lead.disqualifiedBy).toContain('no_website');
    expect(lead.priority).toBe(0);
    expect(lead.grade).toBe('D');
  });

  it('keeps that same business for a reputation seller', () => {
    const lead = scoreLead(cedarSmiles, 'reputation');
    expect(lead.disqualified).toBe(false);
    expect(lead.priority).toBeGreaterThan(0);
  });
});

describe('whyNow', () => {
  it('is copied verbatim from a signal that has a sourceUrl', () => {
    const lead = scoreLead(northsideDental, 'websites');
    const match = lead.signals.find((s) => s.evidence === lead.whyNow);
    expect(match).toBeDefined();
    expect(match?.sourceUrl).toMatch(/^https?:\/\//);
  });

  it('leads with a trigger, not a fit fact', () => {
    const lead = scoreLead(lakeviewHvac, 'paid_ads');
    const match = lead.signals.find((s) => s.evidence === lead.whyNow);
    expect(match?.kind).toBe('trigger');
  });

  it('changes when the offer changes', () => {
    expect(scoreLead(lakeviewHvac, 'paid_ads').whyNow).not.toBe(
      scoreLead(lakeviewHvac, 'staffing').whyNow,
    );
  });

  it('falls back to a fit fact rather than inventing urgency', () => {
    const lead = scoreLead(pineRidgeAuto, 'websites');
    expect(lead.signals.some((s) => s.kind === 'trigger')).toBe(false);
    const match = lead.signals.find((s) => s.evidence === lead.whyNow);
    expect(match?.kind).toBe('fit');
    expect(lead.whyNow).not.toContain('undefined');
  });

  it('says so honestly when there is no evidence at all', () => {
    const lead = scoreLead(discoveryOnly, 'websites');
    expect(lead.signals).toHaveLength(0);
    expect(lead.whyNow).toContain('no timing signals');
    expect(lead.whyNow).toContain('Birch Lane Barbers');
    expect(lead.triggerScore).toBe(0);
  });
});

describe('sub-scores', () => {
  it('keeps every score inside 0-100', () => {
    for (const offer of OFFER_PROFILE_IDS) {
      for (const lead of scoreBatch(ALL_FIXTURES, offer)) {
        for (const score of [
          lead.fitScore,
          lead.triggerScore,
          lead.reachabilityScore,
          lead.priority,
        ]) {
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('scores reachability higher when a named owner and verified email exist', () => {
    const reachable = scoreLead(northsideDental, 'websites').reachabilityScore;
    const unreachable = scoreLead(cedarSmiles, 'websites').reachabilityScore;
    expect(reachable).toBeGreaterThan(unreachable);
  });

  it('gives a discovery-only profile visibly lower confidence', () => {
    expect(computeConfidence(discoveryOnly)).toBeLessThan(computeConfidence(northsideDental));
    expect(computeConfidence(discoveryOnly)).toBeCloseTo(0.4, 5);
  });

  it('damps priority for thin evidence so it cannot outrank a thorough lead', () => {
    const thin = { ...northsideDental, stagesCompleted: ['places_search', 'place_details'] as const };
    const thinLead = scoreLead({ ...thin, stagesCompleted: [...thin.stagesCompleted] }, 'websites');
    const fullLead = scoreLead(northsideDental, 'websites');
    expect(thinLead.priority).toBeLessThan(fullLead.priority);
  });
});

describe('grades', () => {
  it('awards A only to a lead with strong timing evidence', () => {
    const lead = scoreLead(northsideDental, 'websites');
    expect(lead.grade).toBe('A');
    expect(lead.triggerScore).toBeGreaterThan(75);
  });

  it('does not award A to a business with nothing wrong', () => {
    expect(scoreLead(pineRidgeAuto, 'websites').grade).not.toBe('A');
  });
});
