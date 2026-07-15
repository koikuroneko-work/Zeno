import { getLocales, getCalendars } from 'expo-localization';
import * as Location from 'expo-location';

// Currency mapping from country/region codes to currency codes
const COUNTRY_TO_CURRENCY_MAP: Record<string, string> = {
  // Asia
  MY: 'MYR', // Malaysia
  SG: 'SGD', // Singapore
  ID: 'IDR', // Indonesia
  TH: 'THB', // Thailand
  JP: 'JPY', // Japan
  KR: 'KRW', // South Korea
  CN: 'CNY', // China
  IN: 'INR', // India
  PH: 'PHP', // Philippines
  VN: 'VND', // Vietnam
  // Americas
  US: 'USD', // United States
  CA: 'CAD', // Canada
  MX: 'MXN', // Mexico
  BR: 'BRL', // Brazil
  // Europe
  GB: 'GBP', // United Kingdom
  DE: 'EUR', // Germany
  FR: 'EUR', // France
  IT: 'EUR', // Italy
  ES: 'EUR', // Spain
  NL: 'EUR', // Netherlands
  AT: 'EUR', // Austria
  BE: 'EUR', // Belgium
  FI: 'EUR', // Finland
  GR: 'EUR', // Greece
  IE: 'EUR', // Ireland
  PT: 'EUR', // Portugal
  // Oceania
  AU: 'AUD', // Australia
  NZ: 'NZD', // New Zealand
};

// Maps IANA timezone IDs to ISO 3166-1 alpha-2 country codes.
// Used as a fallback when device locale currency doesn't match the user's actual location.
// Key timezones likely to be encountered are included; most IANA zones resolve through
// one of these via the zoneinfo 'backward' links (e.g. Asia/Kuala_Lumpur is the canonical
// for the myAsia/* aliases).
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  // Malaysia / Singapore / Brunei / Indonesia (western)
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Singapore': 'SG',
  'Asia/Brunei': 'BN',
  'Asia/Jakarta': 'ID',
  'Asia/Pontianak': 'ID',
  // East Asia
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Shanghai': 'CN',
  'Asia/Taipei': 'TW',
  'Asia/Hong_Kong': 'HK',
  'Asia/Macau': 'MO',
  // Southeast Asia
  'Asia/Bangkok': 'TH',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Phnom_Penh': 'KH',
  'Asia/Vientiane': 'LA',
  'Asia/Yangon': 'MM',
  'Asia/Manila': 'PH',
  // South Asia
  'Asia/Kolkata': 'IN',
  'Asia/Colombo': 'LK',
  'Asia/Dhaka': 'BD',
  'Asia/Kathmandu': 'NP',
  'Asia/Karachi': 'PK',
  // Middle East
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW',
  'Asia/Bahrain': 'BH',
  'Asia/Muscat': 'OM',
  'Asia/Tehran': 'IR',
  'Asia/Jerusalem': 'IL',
  // Oceania
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Adelaide': 'AU',
  'Australia/Darwin': 'AU',
  'Pacific/Auckland': 'NZ',
  'Pacific/Fiji': 'FJ',
  // Europe
  'Europe/London': 'GB',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Vienna': 'AT',
  'Europe/Zurich': 'CH',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI',
  'Europe/Dublin': 'IE',
  'Europe/Lisbon': 'PT',
  'Europe/Athens': 'GR',
  'Europe/Moscow': 'RU',
  'Europe/Istanbul': 'TR',
  // North America
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Montreal': 'CA',
  'America/Mexico_City': 'MX',
  // South America
  'America/Sao_Paulo': 'BR',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Santiago': 'CL',
  'America/Bogota': 'CO',
  'America/Lima': 'PE',
};

/**
 * Resolves the default currency based on device and location signals.
 * Priority order:
 * 1. Manual currency override (from settings)
 * 2. GPS location → reverse geocode → country → currency
 *    (uses the same location permission the Nearby feature needs;
 *     silently skipped if permission hasn't been granted yet)
 * 3. Device timezone → country → currency mapping (via expo-localization
 *    native API, works on Hermes/Android)
 * 4. Device locale currencyCode if available (phone language setting)
 * 5. Device region code → currency mapping
 * 6. Fallback to USD
 */
export class CurrencyResolver {
  private static instance: CurrencyResolver;
  private manualCurrencyOverride: string | null = null;
  private locationCurrencyCache: string | null = null;

  private constructor() {}

  public static getInstance(): CurrencyResolver {
    if (!CurrencyResolver.instance) {
      CurrencyResolver.instance = new CurrencyResolver();
    }
    return CurrencyResolver.instance;
  }

  public setManualCurrencyOverride(currency: string | null): void {
    this.manualCurrencyOverride = currency;
  }

  /** Clear in-memory cache (useful when testing). */
  public clearCache(): void {
    this.locationCurrencyCache = null;
  }

  public async getCurrencyCode(): Promise<string> {
    // 1. Manual override
    if (this.manualCurrencyOverride) {
      return this.manualCurrencyOverride;
    }

    // 2. GPS location → reverse geocode → country → currency
    // This is the most reliable signal for the user's physical location.
    // Only fires if location permission was already granted (e.g. from onboarding).
    // Uses Nominatim (free OpenStreetMap API, no key needed) — same family as Overpass
    // which powers the Nearby feature.
    const locationCurrency = await this.resolveCurrencyFromLocation();
    if (locationCurrency) {
      return locationCurrency;
    }

    // 3. Device timezone → country → currency mapping
    // Timezone is a good secondary indicator of physical location regardless of
    // phone language/region settings (e.g. Japanese language but in Malaysia).
    // Uses expo-localization's native getCalendars() which works on Hermes/Android
    // (unlike Intl.DateTimeFormat which can fail on Hermes).
    try {
      const calendars = getCalendars();
      const timezone = calendars[0]?.timeZone;
      if (timezone && timezone in TIMEZONE_TO_COUNTRY) {
        const country = TIMEZONE_TO_COUNTRY[timezone];
        if (country in COUNTRY_TO_CURRENCY_MAP) {
          return COUNTRY_TO_CURRENCY_MAP[country];
        }
      }
    } catch (error) {
      console.warn('Failed to get currency from timezone:', error);
    }

    // 4. Device locale currencyCode from expo-localization
    // This typically reflects the phone language setting (e.g. Japanese → JPY).
    try {
      const locales = getLocales();
      const locale = locales[0];
      if (locale?.currencyCode) {
        return locale.currencyCode.toUpperCase();
      }
    } catch (error) {
      console.warn('Failed to get currency from device locale:', error);
    }

    // 5. Device region code to currency mapping
    try {
      const locales = getLocales();
      const locale = locales[0];
      const region = locale?.regionCode || locale?.languageRegionCode || null;
      if (region && region.length === 2) {
        const upperRegion = region.toUpperCase();
        if (upperRegion in COUNTRY_TO_CURRENCY_MAP) {
          return COUNTRY_TO_CURRENCY_MAP[upperRegion];
        }
      }
    } catch (error) {
      console.warn('Failed to get region for currency:', error);
    }

    // 6. Fallback to USD
    return 'USD';
  }

  /**
   * Uses GPS coordinates + Nominatim reverse geocoding to determine the user's
   * country code, then maps it to a currency.
   *
   * Silently returns null if location permission hasn't been granted, if the
   * network request fails, or if the country isn't in our map.
   *
   * Results are cached in-memory so this only fires once per session.
   */
  private async resolveCurrencyFromLocation(): Promise<string | null> {
    if (this.locationCurrencyCache) {
      return this.locationCurrencyCache;
    }

    try {
      // Only proceed if location permission is already granted
      const permissionStatus = await Location.getForegroundPermissionsAsync();
      if (permissionStatus.status !== 'granted') {
        return null;
      }

      // Get current GPS position
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low, // Low accuracy is faster, good enough for country resolution
      });
      const { latitude, longitude } = pos.coords;

      // Reverse geocode via Nominatim (free, no API key — OpenStreetMap family)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=3&accept-language=en`,
        {
          headers: { 'User-Agent': 'Zeno/0.1' },
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const countryCode = data?.address?.country_code?.toUpperCase();

      if (countryCode && countryCode in COUNTRY_TO_CURRENCY_MAP) {
        this.locationCurrencyCache = COUNTRY_TO_CURRENCY_MAP[countryCode];
        return this.locationCurrencyCache;
      }

      return null;
    } catch (error) {
      // Don't log aborts (timeouts) as warnings
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null;
      }
      console.warn('Failed to resolve currency from location:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const currencyResolver = CurrencyResolver.getInstance();
