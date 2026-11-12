/**
 * lib/placesDiscovery.js
 *
 * Google Places API (New) adapter — the real source of the business list.
 *
 * Discovery used to be "ask an LLM to name 20 companies", which invented roughly
 * 70% of them: plausible names on domains with no DNS record at all. Places
 * returns businesses Google has actually verified, each with a website, address
 * and review history we can cite back to the customer.
 *
 * Returns null (never throws) when unconfigured or failing, so the caller can
 * fall back to the legacy LLM list rather than failing the whole request.
 *
 * Setup: enable "Places API (New)" in Google Cloud, then set
 * GOOGLE_PLACES_API_KEY. Falls back to PAGESPEED_API_KEY if that key's project
 * has Places enabled. Billing: ~$32/1000 Text Search calls at current rates;
 * one call returns up to 20 businesses.
 */

const PLACES_KEY =
  process.env.GOOGLE_PLACES_API_KEY ||
  process.env.PAGESPEED_API_KEY ||
  null;

const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const TIMEOUT_MS = 8000;

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.websiteUri',
  'places.formattedAddress',
  'places.rating',
  'places.userRatingCount',
  'places.primaryTypeDisplayName',
  'places.businessStatus',
  'nextPageToken',
].join(',');

export function isPlacesConfigured() {
  return !!PLACES_KEY;
}

function extractDomain(websiteUri) {
  if (!websiteUri) return null;
  try {
    const host = new URL(websiteUri).hostname.toLowerCase().replace(/^www\./, '');
    // Social/aggregator profiles aren't the business's own mail domain.
    if (/(facebook|instagram|linkedin|twitter|x|yelp|google|wixsite|weebly|squarespace|godaddysites|business\.site)\./.test(host)) {
      return null;
    }
    return host;
  } catch {
    return null;
  }
}

async function searchPage(textQuery, pageToken) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(SEARCH_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 20,
        ...(pageToken ? { pageToken } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 403) {
        console.warn('[places] 403 — enable "Places API (New)" for this key\'s project');
      } else {
        console.warn(`[places] HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn('[places] request failed:', err.name === 'AbortError' ? 'timeout' : err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Discover real businesses for a plain-language query.
 *
 * @param {string} textQuery e.g. "CNC machine shops in Wisconsin"
 * @param {object} [opts]
 * @param {number} [opts.pages] how many 20-result pages to pull (max 3 — Places caps at 60)
 * @returns {Promise<Array|null>} companyMeta-shaped records, or null if unavailable
 */
export async function discoverBusinesses(textQuery, { pages = 2 } = {}) {
  if (!PLACES_KEY) return null;

  const out = [];
  const seenDomains = new Set();
  let pageToken;

  for (let page = 0; page < Math.min(pages, 3); page++) {
    const data = await searchPage(textQuery, pageToken);
    if (!data) return out.length ? out : null;

    for (const place of data.places || []) {
      if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') continue;

      const domain = extractDomain(place.websiteUri);
      if (!domain || seenDomains.has(domain)) continue;
      seenDomains.add(domain);

      const company = place.displayName?.text || '';
      if (!company) continue;

      const rating = typeof place.rating === 'number' ? place.rating : null;
      const reviews = typeof place.userRatingCount === 'number' ? place.userRatingCount : null;

      // Every field below traces to the Places response — nothing is inferred.
      const evidence = [
        rating && reviews ? `${rating}★ from ${reviews} Google reviews` : null,
        place.formattedAddress || null,
      ].filter(Boolean).join(' · ');

      out.push({
        company,
        domain,
        website: place.websiteUri,
        industry: place.primaryTypeDisplayName?.text || '',
        size: '',
        location: place.formattedAddress || '',
        rating,
        review_count: reviews,
        why_fits: `Verified on Google Maps as ${place.primaryTypeDisplayName?.text || 'a local business'}${evidence ? ` — ${evidence}` : ''}`,
        signal: evidence || 'Listed and operating on Google Maps',
        pain_points: '',
        budget_range: '',
        tech: '',
        place_id: place.id || null,
        sourceUrl: place.id ? `https://www.google.com/maps/place/?q=place_id:${place.id}` : place.websiteUri,
      });
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  console.log(`[places] "${textQuery}" → ${out.length} verified businesses with own domains`);
  return out.length ? out : null;
}
