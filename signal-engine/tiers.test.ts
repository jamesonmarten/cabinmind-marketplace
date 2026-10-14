import { scoreLead } from './score';
import {
  ENRICHMENT_LEVELS,
  LEVELS,
  PLANS,
  STAGE_COST_MICROS,
  checkQuota,
  cheapestPlanFor,
  creditsFor,
  deliver,
  estimateCostMicros,
  maskEmail,
  maskPhone,
  watchRefreshCredits,
} from './tiers';
import type { EnrichmentLevel } from './tiers';
import { lakeviewHvac, northsideDental } from '../__fixtures__/profiles';

const lead = scoreLead(northsideDental, 'websites');
const hvacLead = scoreLead(lakeviewHvac, 'paid_ads');

describe('levels', () => {
  it('never runs a paid stage below the level that includes it', () => {
    expect(LEVELS.contact.stages).not.toContain('augment_ads');
    expect(LEVELS.contact.stages).not.toContain('augment_jobs');
    expect(LEVELS.contact.stages).not.toContain('augment_registry');
    expect(LEVELS.signals.stages).not.toContain('mobile_lookup');
    expect(LEVELS.signals.stages).not.toContain('llm_opener');
    expect(LEVELS.campaign.stages).toContain('mobile_lookup');
  });

  it('gets strictly more expensive with depth', () => {
    for (let i = 1; i < ENRICHMENT_LEVELS.length; i += 1) {
      const prev = LEVELS[ENRICHMENT_LEVELS[i - 1] as EnrichmentLevel];
      const curr = LEVELS[ENRICHMENT_LEVELS[i] as EnrichmentLevel];
      expect(curr.creditsPerLead).toBeGreaterThan(prev.creditsPerLead);
      expect(curr.stages.length).toBeGreaterThanOrEqual(prev.stages.length);
    }
  });
});

describe('cost arithmetic stays integral', () => {
  it('keeps every per-stage cost an integer number of micros', () => {
    for (const cost of Object.values(STAGE_COST_MICROS)) {
      expect(Number.isInteger(cost)).toBe(true);
    }
  });

  it('accumulates exactly across a large batch', () => {
    const micros = estimateCostMicros(LEVELS.signals.stages, 2_000);
    expect(Number.isInteger(micros)).toBe(true);
    expect(micros).toBe(
      LEVELS.signals.stages.reduce((acc, s) => acc + STAGE_COST_MICROS[s], 0) * 2_000,
    );
  });
});

describe('masking', () => {
  it('never leaves the original address recoverable', () => {
    const masked = maskEmail('jane.doe@acme.com');
    expect(masked).not.toContain('jane.doe');
    expect(masked.startsWith('j')).toBe(true);
    expect(masked.endsWith('@acme.com')).toBe(true);
  });

  it('masks short local parts without revealing their length', () => {
    expect(maskEmail('jo@acme.com')).toBe('j••@acme.com');
  });

  it('keeps only the area code of a phone number', () => {
    expect(maskPhone('(414) 555-0142')).toBe('414-•••-••••');
    expect(maskPhone('(414) 555-0142')).not.toContain('0142');
  });
});

describe('deliver() redaction', () => {
  it('omits signals and scores entirely at discovery level', () => {
    const out = deliver(lead, 'discovery', PLANS.starter);
    expect(out.signals).toBeUndefined();
    expect(out.priority).toBeUndefined();
    expect(out.grade).toBeUndefined();
    expect(out.whyNow).toBeUndefined();
    expect(out.emails).toBeUndefined();
    expect(JSON.stringify(out)).not.toContain('triggerScore');
  });

  it('includes contacts but still no scoring at contact level', () => {
    const out = deliver(lead, 'contact', PLANS.starter);
    expect(out.emails).toBeDefined();
    expect(out.signals).toBeUndefined();
    expect(out.priority).toBeUndefined();
  });

  it('includes signals, whyNow and scores at signals level', () => {
    const out = deliver(lead, 'signals', PLANS.pro);
    expect(out.signals?.length).toBeGreaterThan(0);
    expect(out.whyNow).toBe(lead.whyNow);
    expect(out.grade).toBe(lead.grade);
  });

  it('never leaks the raw profile, however deep the level', () => {
    for (const level of ENRICHMENT_LEVELS) {
      const serialized = JSON.stringify(deliver(lead, level, PLANS.agency));
      expect(serialized).not.toContain('stagesCompleted');
      expect(serialized).not.toContain('"profile"');
      expect(serialized).not.toContain('observedAt');
    }
  });

  it('tells the buyer what is locked and what unlocks it', () => {
    const out = deliver(lead, 'discovery', PLANS.starter);
    const emailLock = out.locked.find((l) => l.field === 'emails');
    expect(emailLock?.requiresLevel).toBe('contact');
    const signalLock = out.locked.find((l) => l.field === 'signals');
    expect(signalLock?.requiresLevel).toBe('signals');
    expect(signalLock?.teaser).toContain('buying signals');
  });
});

describe('trial accounts', () => {
  const trialOut = deliver(lead, 'contact', PLANS.trial);
  const serialized = JSON.stringify(trialOut);

  it('contains no unmasked email anywhere in the serialized payload', () => {
    const realEmails = (northsideDental.site?.emails ?? []).map((e) => e.address);
    expect(realEmails.length).toBeGreaterThan(0);
    for (const address of realEmails) {
      expect(serialized).not.toContain(address);
    }
  });

  it('contains no unmasked phone number anywhere in the serialized payload', () => {
    const phone = northsideDental.places.phone as string;
    expect(serialized).not.toContain(phone);
    expect(serialized).not.toContain('5550142');
  });

  it('marks every delivered email as masked', () => {
    for (const email of trialOut.emails ?? []) {
      expect(email.masked).toBe(true);
    }
  });

  it('still shows the teaser and an upgrade target', () => {
    const lock = trialOut.locked.find((l) => l.field === 'emails');
    expect(lock?.requiresPlan).toBe('starter');
    expect(lock?.teaser).toContain('verified contact');
  });

  it('cannot reach campaign level at all', () => {
    expect(PLANS.trial.levels).not.toContain('campaign');
    expect(PLANS.trial.levels).not.toContain('signals');
  });
});

describe('checkQuota', () => {
  it('allows a search that fits', () => {
    const decision = checkQuota({
      plan: PLANS.starter,
      level: 'signals',
      leadCount: 50,
      creditsUsed: 0,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.creditsRequired).toBe(creditsFor('signals', 50));
  });

  it('blocks a level the plan does not include and names the cheapest upgrade', () => {
    const decision = checkQuota({
      plan: PLANS.trial,
      level: 'signals',
      leadCount: 10,
      creditsUsed: 0,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('level_not_included');
    expect(decision.suggestedPlan).toBe('starter');
    expect(cheapestPlanFor('campaign')).toBe('pro');
  });

  it('blocks an oversized batch', () => {
    const decision = checkQuota({
      plan: PLANS.trial,
      level: 'contact',
      leadCount: 500,
      creditsUsed: 0,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('batch_too_large');
  });

  it('blocks on credits and says how many leads would still fit', () => {
    const decision = checkQuota({
      plan: PLANS.starter,
      level: 'signals',
      leadCount: 100,
      creditsUsed: 970,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('insufficient_credits');
    expect(decision.creditsRemaining).toBe(30);
    expect(decision.maxAffordableLeads).toBe(5);
    expect(decision.message).toContain('5 leads');
  });

  it('counts purchased top-up credits toward the allowance', () => {
    const decision = checkQuota({
      plan: PLANS.starter,
      level: 'signals',
      leadCount: 100,
      creditsUsed: 970,
      creditsPurchased: 1_000,
    });
    expect(decision.allowed).toBe(true);
  });

  it('never returns a fractional credit requirement', () => {
    for (const level of ENRICHMENT_LEVELS) {
      const decision = checkQuota({
        plan: PLANS.agency,
        level,
        leadCount: 37,
        creditsUsed: 0,
      });
      expect(Number.isInteger(decision.creditsRequired)).toBe(true);
      expect(Number.isInteger(decision.maxAffordableLeads)).toBe(true);
    }
  });
});

describe('watchlist refresh pricing', () => {
  it('costs less than a first run but is never free', () => {
    const full = creditsFor('signals', 10);
    const refresh = watchRefreshCredits('signals', 10);
    expect(refresh).toBeLessThan(full);
    expect(refresh).toBeGreaterThan(0);
    expect(Number.isInteger(refresh)).toBe(true);
  });

  it('rounds up for a single lead', () => {
    expect(watchRefreshCredits('discovery', 1)).toBe(1);
  });
});

describe('a second offer delivers a different headline for the same business', () => {
  it('changes whyNow in the delivered payload, not just internally', () => {
    const asAds = deliver(hvacLead, 'signals', PLANS.pro);
    const asStaffing = deliver(scoreLead(lakeviewHvac, 'staffing'), 'signals', PLANS.pro);
    expect(asAds.whyNow).not.toBe(asStaffing.whyNow);
  });
});
