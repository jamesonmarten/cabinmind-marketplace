/**
 * Data contracts for the entire lead pipeline.
 *
 * Every factual field about a real business must arrive here from an API
 * response or a scraped page, and must carry a sourceUrl the user can click.
 * Nothing in this file may be produced by a language model.
 */

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

/** Where a fact came from. Required on every block of sourced data. */
export interface SourceRef {
  /** Short slug identifying the adapter that produced the fact. */
  source: SourceId;
  /** A URL a human can open to confirm the fact independently. */
  url: string;
  /** ISO-8601 timestamp of when we actually fetched it. */
  fetchedAt: string;
}

export type SourceId =
  | 'google_places'
  | 'business_site'
  | 'meta_ad_library'
  | 'google_ads_transparency'
  | 'indeed'
  | 'careers_page'
  | 'state_registry'
  | 'email_verifier';

// ---------------------------------------------------------------------------
// Discovery: Google Places
// ---------------------------------------------------------------------------

export interface PlacesData {
  /** Google place_id. The canonical identity key for a business everywhere. */
  placeId: string;
  name: string;
  /** Primary Google place type, e.g. "dentist". */
  primaryCategory: string;
  categories: string[];
  formattedAddress: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  isClaimed?: boolean;
  hasHours?: boolean;
  photoCount?: number;
  hasDescription?: boolean;
  /** ISO-8601 timestamp of the most recent review we can see. */
  latestReviewAt?: string;
  permanentlyClosed?: boolean;
  source: SourceRef;
}

// ---------------------------------------------------------------------------
// Enrichment: the business's own website
// ---------------------------------------------------------------------------

export type SitePlatform =
  | 'wordpress'
  | 'wix'
  | 'squarespace'
  | 'godaddy'
  | 'shopify'
  | 'webflow'
  | 'custom'
  | 'unknown';

export type EmailKind = 'personal' | 'role' | 'generic';

export type VerificationStatus = 'valid' | 'risky' | 'invalid' | 'unknown';

export interface ContactEmail {
  address: string;
  /** personal = jane@, role = sales@, generic = info@/contact@. */
  kind: EmailKind;
  verification: VerificationStatus;
  source: SourceRef;
}

export interface Person {
  name: string;
  title?: string;
  email?: string;
  source: SourceRef;
}

export interface SiteData {
  domain: string;
  /** False means we tried and the site did not answer. Never throw for this. */
  reachable: boolean;
  /** True only if the certificate actually validated, not merely https:// in the URL. */
  httpsValid?: boolean;
  hasViewportMeta?: boolean;
  /** Time to first byte plus HTML parse, in milliseconds. */
  loadMs?: number;
  hasContactForm?: boolean;
  hasOnlineBooking?: boolean;
  hasLiveChat?: boolean;
  hasBlog?: boolean;
  platform?: SitePlatform;
  /** Detected third-party script slugs, e.g. ["google-analytics", "meta-pixel"]. */
  stack?: string[];
  /** ISO-8601, from sitemap lastmod or visible post dates. */
  lastContentUpdateAt?: string;
  emails?: ContactEmail[];
  people?: Person[];
  locationCount?: number;
  source: SourceRef;
}

// ---------------------------------------------------------------------------
// Augmentation: ads, jobs, registry, review history
// ---------------------------------------------------------------------------

export type AdPlatform = 'meta' | 'google';

export type LicenseStatus = 'active' | 'delinquent' | 'expired' | 'unknown';

export interface ReviewVelocity {
  /** Reviews received in the 30 days before observedAt. */
  last30: number;
  /** Reviews received in the 30 days before that, for comparison. */
  prev30: number;
}

/**
 * Every field is optional on purpose. A source being down must yield an absent
 * field, never a false value — a missing fact and a disproven fact are
 * different things and we must not present one as the other.
 */
export interface ExternalData {
  runningPaidAds?: boolean;
  adPlatforms?: AdPlatform[];
  openJobCount?: number;
  jobTitles?: string[];
  /** ISO-8601 date the entity was registered with the state. */
  registeredAt?: string;
  licenseStatus?: LicenseStatus;
  reviewVelocity?: ReviewVelocity;
  sources: SourceRef[];
}

// ---------------------------------------------------------------------------
// Pipeline bookkeeping
// ---------------------------------------------------------------------------

export type PipelineStage =
  | 'places_search'
  | 'place_details'
  | 'site_scrape'
  | 'augment_ads'
  | 'augment_jobs'
  | 'augment_registry'
  | 'email_verify'
  | 'mobile_lookup'
  | 'llm_opener';

/**
 * The complete input to scoring. Assembled by the pipeline, consumed by pure
 * functions — which is why observedAt lives here rather than being read from
 * the clock inside an extractor.
 */
export interface BusinessProfile {
  places: PlacesData;
  site?: SiteData;
  external?: ExternalData;
  /** Stages that actually succeeded, so confidence is auditable. */
  stagesCompleted: PipelineStage[];
  /** ISO-8601. The single clock read for this profile. */
  observedAt: string;
}

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

export type SignalId =
  // Fit — who this business is. Slow-moving facts.
  | 'multi_location'
  | 'newly_registered'
  | 'established_operator'
  | 'high_review_volume'
  // Trigger — why they would buy now. Fast-moving facts.
  | 'no_website'
  | 'site_unreachable'
  | 'no_https'
  | 'not_mobile_friendly'
  | 'slow_site'
  | 'dated_platform'
  | 'stale_content'
  | 'no_online_booking'
  | 'no_tracking_pixel'
  | 'low_rating'
  | 'few_reviews'
  | 'review_drought'
  | 'review_surge'
  | 'unclaimed_listing'
  | 'incomplete_listing'
  | 'running_paid_ads'
  | 'hiring'
  // Reachability — can the user actually start a conversation.
  | 'decision_maker_named'
  | 'verified_email';

export type SignalKind = 'fit' | 'trigger' | 'reachability';

export type SignalValue = string | number | boolean;

export interface Signal {
  id: SignalId;
  kind: SignalKind;
  /** Short human label for a UI chip. */
  label: string;
  /**
   * A complete sentence a salesperson could paste into an email unedited.
   * Must restate the proven fact, not characterise it.
   */
  evidence: string;
  /** Click-through proof for the claim in `evidence`. */
  sourceUrl: string;
  /** 0..1. Degrades when the underlying data is partial or indirect. */
  confidence: number;
  /** The proven value the evidence is built from. */
  value?: SignalValue;
  observedAt: string;
}

// ---------------------------------------------------------------------------
// Scoring output
// ---------------------------------------------------------------------------

export type Grade = 'A' | 'B' | 'C' | 'D';

export interface ScoredLead {
  placeId: string;
  name: string;
  profile: BusinessProfile;
  signals: Signal[];
  /** 0..100. How well this business matches who the seller sells to. */
  fitScore: number;
  /** 0..100. How much evidence there is that now is the moment. */
  triggerScore: number;
  /** 0..100. How easily the seller can open a conversation. */
  reachabilityScore: number;
  /** 0..100. The single ranking number. */
  priority: number;
  grade: Grade;
  /** One sentence, assembled verbatim from proven signal evidence. */
  whyNow: string;
  /** 0..1. How much of the intended enrichment actually succeeded. */
  confidence: number;
  offerProfileId: OfferProfileId;
  /** True when a disqualifying signal fired for this offer. Priority is forced to 0. */
  disqualified: boolean;
  /** Which signals disqualified it, so the filter is auditable rather than silent. */
  disqualifiedBy: SignalId[];
}

// ---------------------------------------------------------------------------
// Offers — what the *seller* sells
// ---------------------------------------------------------------------------

export type OfferProfileId =
  | 'websites'
  | 'local_seo'
  | 'reputation'
  | 'paid_ads'
  | 'booking_software'
  | 'pos_payments'
  | 'staffing'
  | 'general';

export interface OfferProfile {
  id: OfferProfileId;
  label: string;
  /** Plain-English description of the seller, shown in the UI. */
  description: string;
  /**
   * Relative weight per signal, 0-100. Deliberately a total record rather than
   * a partial one: adding a SignalId then fails to compile until every offer
   * has priced it, which is the only reliable way to stop new signals from
   * silently defaulting to zero.
   */
  weights: Record<SignalId, number>;
  /** Signals that, if present, disqualify the lead for this offer outright. */
  disqualifyingSignals: SignalId[];
}
