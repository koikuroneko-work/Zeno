/**
 * Nearby Places Service
 *
 * Fetches real nearby places (shops, restaurants, amenities) from OpenStreetMap
 * via the free Overpass API. No API key needed.
 *
 * Instead of hardcoded prices, each place carries a category-based cost range
 * used to compute an affordability level (safe / medium / danger) relative to
 * the user's daily budget and current-day spending.  The only time a real
 * price string is surfaced is when OSM itself carries a `charge` tag.
 *
 * Labels follow the project guideline: "nearby affordable suggestions" rather
 * than claiming real prices.
 */

export type AffordabilityLevel = 'safe' | 'medium' | 'danger';

export interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  distance: number; // meters
  rating: number; // estimated (OSM doesn't have ratings)
  /** A real OSM price string (e.g. "RM5") when the `charge` tag exists, otherwise null */
  estimatedCost: string | null;
  /** True when the price came from an OSM `charge` or real pricing tag */
  hasRealPrice: boolean;
  /** Minimum cost for this place's category in major currency units (for affordability calc) */
  categoryMinCost: number;
  /** Affordability level — computed by calculateAffordability() from the user's budget */
  affordability: AffordabilityLevel;
  /** Numeric score for sorting by cheapest (lower = more affordable), set by calculateAffordability() */
  affordabilityScore: number;
  latitude: number;
  longitude: number;
  osmType: 'node' | 'way';
  tags: Record<string, string>;
}

// ─── Category cost ranges in USD ─────────────────────────────────────────────
// These are rough internal estimates in USD used ONLY to derive affordability.
// The exchange rate service converts them to the user's local currency at
// render time so the affordability calculation is correct regardless of region.

const CATEGORY_COST_RANGES: Record<string, { min: number; max: number }> = {
  // Food & drink
  restaurant:       { min: 3,    max: 8 },
  fast_food:        { min: 1.5,  max: 4 },
  cafe:             { min: 2,    max: 5 },
  pub:              { min: 4,    max: 10 },
  bar:              { min: 3,    max: 10 },
  food_court:       { min: 1.5,  max: 3.5 },
  bakery:           { min: 1,    max: 3 },
  // Groceries & shopping
  supermarket:      { min: 2,    max: 15 },
  convenience:      { min: 1,    max: 5 },
  grocery:          { min: 1.5,  max: 8 },
  general:          { min: 3,    max: 25 },
  mall:             { min: 3,    max: 40 },
  department_store: { min: 4,    max: 30 },
  clothes:          { min: 3,    max: 25 },
  electronics:      { min: 5,    max: 100 },
  // Health
  pharmacy:         { min: 2,    max: 10 },
  clinic:           { min: 8,    max: 30 },
  dentists:         { min: 10,   max: 40 },
  // Services
  laundry:          { min: 1.5,  max: 4 },
  dry_cleaning:     { min: 2,    max: 5 },
  bank:             { min: 0,    max: 0 },
  post_office:      { min: 0,    max: 3 },
  // Transport
  fuel:             { min: 8,    max: 20 },
  parking:          { min: 0.5,  max: 3 },
  // Fallback
  other:            { min: 1,    max: 10 },
};

// Cache the results so we don't re-query if the user refreshes quickly
let cache: { key: string; data: NearbyPlace[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Category → human-readable category key (for i18n)
const OSM_CATEGORY_MAP: Record<string, string> = {
  // Food & drink
  restaurant: 'dinner',
  fast_food: 'lunch',
  cafe: 'breakfast',
  pub: 'entertainment',
  bar: 'entertainment',
  food_court: 'lunch',
  bakery: 'breakfast',
  // Groceries & shopping
  supermarket: 'groceries',
  convenience: 'groceries',
  grocery: 'groceries',
  general: 'shopping',
  mall: 'shopping',
  department_store: 'shopping',
  clothes: 'shopping',
  electronics: 'shopping',
  // Health
  pharmacy: 'health',
  clinic: 'health',
  dentists: 'health',
  // Services
  laundry: 'other',
  dry_cleaning: 'other',
  bank: 'other',
  post_office: 'other',
  // Transport
  fuel: 'transport',
  parking: 'transport',
};

/**
 * Calculate affordability from a place's category cost and the user's
 * disposable income per day (monthly remaining ÷ days left in month).
 *
 * @param categoryMinCost  Place's minimum cost in major units (e.g. RM10)
 * @param dailyDisposable  How much the user can spend per day in minor units
 *                         (e.g. 33 000 sen = RM33/day from RM1000 / 30 days)
 * @returns                Affordability level and a numeric score (lower = cheaper)
 */
export function calculateAffordability(
  categoryMinCost: number,
  dailyDisposable: number,
): { level: AffordabilityLevel; score: number } {
  if (dailyDisposable <= 0) {
    // Over budget for the month — everything is danger
    return { level: 'danger', score: 100 };
  }

  // Convert category cost (major units) to minor units for comparison
  const costInMinor = categoryMinCost * 100;
  const percentOfDisposable = (costInMinor / dailyDisposable) * 100;

  // A single visit to this place costs X% of what you can spend per day
  if (percentOfDisposable <= 15) {
    return { level: 'safe', score: percentOfDisposable };
  }
  if (percentOfDisposable <= 35) {
    return { level: 'medium', score: percentOfDisposable };
  }
  return { level: 'danger', score: percentOfDisposable };
}

function getCategory(osmTags: Record<string, string>): string {
  const amenity = osmTags.amenity || '';
  const shop = osmTags.shop || '';
  const cuisine = osmTags.cuisine || '';

  // Try amenity first
  if (amenity && OSM_CATEGORY_MAP[amenity]) {
    return OSM_CATEGORY_MAP[amenity];
  }
  // Try shop
  if (shop && OSM_CATEGORY_MAP[shop]) {
    return OSM_CATEGORY_MAP[shop];
  }
  // Try cuisine-based guessing
  if (cuisine) {
    const cuisineLower = cuisine.toLowerCase();
    if (['pizza', 'burger', 'chicken', 'sandwich', 'kebab', 'noodle', 'asian', 'chinese', 'malay'].some(c => cuisineLower.includes(c))) {
      return 'lunch';
    }
    if (['coffee', 'tea', 'cake', 'pastry', 'ice_cream'].some(c => cuisineLower.includes(c))) {
      return 'breakfast';
    }
  }
  return 'other';
}

/** Look up the OSM category key that maps to a given UI category. */
function resolveOsmCategoryKey(uiCategory: string): string {
  for (const [osmKey, uiKey] of Object.entries(OSM_CATEGORY_MAP)) {
    if (uiKey === uiCategory) return osmKey;
  }
  return 'other';
}

/** Get the minimum cost (in USD) for a UI category. */
export function getCategoryMinCostUSD(category: string): number {
  const osmKey = resolveOsmCategoryKey(category);
  const range = CATEGORY_COST_RANGES[osmKey] || CATEGORY_COST_RANGES.other;
  return range.min;
}

/**
 * Try to extract a real price from OSM tags.
 * Some OSM nodes have `charge`, `fee:amount`, or `cost` tags with real prices.
 * Returns null when no real price tag is found.
 */
function extractPriceFromOsmTags(tags: Record<string, string>, currency: string): string | null {
  // `charge` tag is the most common real pricing tag in OSM, e.g. "5 USD" or "3.50"
  if (tags.charge) {
    const charge = tags.charge.trim();
    // If it already contains a currency symbol/code, use as-is
    if (/[A-Z]{3}|[$€£¥]/.test(charge)) {
      return `~${charge}`;
    }
    // Bare number — prepend the user's currency
    if (/^\d+(\.\d+)?$/.test(charge)) {
      return `~${charge} ${currency}`;
    }
    return `~${charge} ${currency}`;
  }

  // `fee:amount`, `cost`, `price` tags (less common but more specific)
  const amount = tags['fee:amount'] || tags.cost || tags.price;
  if (amount) {
    const clean = amount.trim();
    if (/[A-Z]{3}|[$€£¥]/.test(clean)) {
      return `~${clean}`;
    }
    if (/^\d+(\.\d+)?$/.test(clean)) {
      return `~${clean} ${currency}`;
    }
    return `~${clean}`;
  }

  return null;
}

/**
 * Generates a deterministic-ish pseudo-rating based on OSM tags.
 * Real OSM data doesn't include ratings, so we estimate from available signals
 * (review count, stars, cuisine popularity, etc.).
 */
function estimateRating(osmTags: Record<string, string>): number {
  // If OSM has a rating tag (some regions have this), use it
  if (osmTags.rating) {
    const parsed = parseFloat(osmTags.rating);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) return parsed;
  }
  // If there are reviews, estimate: more reviews → likely higher rated
  const reviews = parseInt(osmTags.reviews || osmTags['review:rating'] || '0', 10);
  if (reviews > 100) return 4.2 + Math.random() * 0.5;
  if (reviews > 20) return 3.8 + Math.random() * 0.7;
  if (reviews > 0) return 3.5 + Math.random() * 0.8;
  // No data — random-ish but biased toward 3.5-4.5 (reasonable default range)
  return 3.5 + Math.random() * 1.0;
}

export interface NearbyPlacesResult {
  places: NearbyPlace[];
  source: 'overpass' | 'cache';
}

/**
 * Query OpenStreetMap Overpass API for nearby amenities and shops.
 *
 * @param latitude  User's current latitude
 * @param longitude User's current longitude
 * @param radiusM   Search radius in meters (default 500)
 * @returns         List of nearby places (affordability is not computed here —
 *                  call calculateAffordability() on each place with the user's
 *                  budget data, or use the UI-level helper)
 */
export async function fetchNearbyPlaces(
  latitude: number,
  longitude: number,
  radiusM: number = 500,
  currency: string = 'MYR',
): Promise<NearbyPlacesResult> {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)},${radiusM}`;

  // Check cache
  if (cache && cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return { places: cache.data, source: 'cache' };
  }

  // Overpass QL query: only search for affordable/relevant categories
  // (food, groceries, daily essentials, health) — excludes banks, car shops, etc.
  // Note: avoid `$` anchor in regex — Overpass API chokes on it via POST
  const overpassQuery = `
    [out:json][timeout:15];
    (
      node["amenity"~"^(restaurant|fast_food|cafe|food_court|bakery|pub|bar|pharmacy|marketplace|community_centre)"](around:${radiusM},${latitude},${longitude});
      node["shop"~"^(supermarket|convenience|grocery|greengrocer|butcher|bakery|deli|confectionery|general|variety_store|department_store|mall|clothes|pharmacy|chemist)"](around:${radiusM},${latitude},${longitude});
      way["amenity"~"^(restaurant|fast_food|cafe|food_court|bakery|pub|bar|pharmacy|marketplace|community_centre)"](around:${radiusM},${latitude},${longitude});
      way["shop"~"^(supermarket|convenience|grocery|greengrocer|butcher|bakery|deli|confectionery|general|variety_store|department_store|mall|clothes|pharmacy|chemist)"](around:${radiusM},${latitude},${longitude});
    );
    out center 20;
  `.trim();

  const url = 'https://overpass-api.de/api/interpreter';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Zeno/0.1',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API returned ${response.status}: ${response.statusText}`);
    }

    const json: any = await response.json();
    const elements = json.elements || [];

    const places: NearbyPlace[] = elements
      .filter((el: any) => el.tags && el.tags.name)
      .filter((el: any) => {
        // Exclude private/residential amenities
        const tags = el.tags;
        if (tags.access === 'private' || tags.access === 'no') return false;
        return true;
      })
      .filter((el: any) => {
        // Secondary filter: only keep categories we mapped as affordable/relevant
        const category = getCategory(el.tags);
        return ['groceries', 'lunch', 'breakfast', 'dinner', 'health', 'shopping'].includes(category);
      })
      .map((el: any) => {
        const lat = el.lat || (el.center?.lat) || latitude;
        const lng = el.lon || (el.center?.lon) || longitude;
        const distance = haversineDistance(latitude, longitude, lat, lng);
        const category = getCategory(el.tags);

        // Try real OSM price tag first
        const realPrice = extractPriceFromOsmTags(el.tags, currency);
        const categoryMinCost = getCategoryMinCostUSD(category);

        return {
          id: `${el.type}_${el.id}`,
          name: el.tags.name,
          category,
          distance: Math.round(distance),
          rating: Math.round(estimateRating(el.tags) * 10) / 10,
          estimatedCost: realPrice,
          hasRealPrice: realPrice !== null,
          categoryMinCost,
          // Default affordability (no-budget fallback); override in the UI
          affordability: 'medium' as AffordabilityLevel,
          affordabilityScore: 50,
          latitude: lat,
          longitude: lng,
          osmType: el.type as 'node' | 'way',
          tags: el.tags,
        };
      })
      // Default sort by nearest — UI handles user sort preference
      .sort((a: NearbyPlace, b: NearbyPlace) => a.distance - b.distance)
      .slice(0, 15); // max 15 results

    // Cache results
    cache = { key: cacheKey, data: places, timestamp: Date.now() };

    return { places, source: 'overpass' };
  } catch (error) {
    console.warn('Failed to fetch from Overpass API:', error);
    // If the network request fails, return empty (don't fall back to mock data)
    return { places: [], source: 'overpass' };
  }
}

/**
 * Haversine distance between two points in meters.
 */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
