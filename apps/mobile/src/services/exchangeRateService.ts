/**
 * Exchange Rate Service
 *
 * Fetches live exchange rates from the free open.er-api.com (no key needed)
 * and caches them in memory for 1 hour so we don't hit the API on every render.
 *
 * All rates are relative to USD (the base currency for category cost ranges).
 */

let cache: { rates: Record<string, number>; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get the exchange rate from USD → `targetCurrency`.
 *
 * @returns Rate (e.g. 4.7 for MYR means 1 USD = 4.7 MYR).
 *          Returns 1 if the API is unreachable (falls back to treating
 *          the cost as USD-equivalent, which is a safe default).
 */
export async function getExchangeRate(targetCurrency: string): Promise<number> {
  if (!targetCurrency || targetCurrency === 'USD') return 1;

  const code = targetCurrency.toUpperCase();

  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.rates[code] ?? 1;
  }

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'User-Agent': 'Zeno/0.1' },
    });
    if (response.ok) {
      const data: any = await response.json();
      if (data?.rates) {
        cache = { rates: data.rates, timestamp: Date.now() };
        return data.rates[code] ?? 1;
      }
    }
  } catch {
    // API unreachable — treat as USD-equivalent
  }

  return 1;
}

/**
 * Clear the cached exchange rate so the next call fetches fresh data.
 */
export function clearExchangeRateCache(): void {
  cache = null;
}
