/**
 * Maps currency code (ISO 4217) to a display symbol.
 * Used as the primary source for currency symbols to guarantee
 * correct output across all locales (avoids Intl.NumberFormat
 * rendering "MYR" instead of "RM" on Hermes).
 * Keep in sync with the supported currencies in the app.
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  MYR: 'RM',
  JPY: '¥',
  KRW: '₩',
  SGD: 'S$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'Fr',
  HKD: 'HK$',
  TWD: 'NT$',
  IDR: 'Rp',
  THB: '฿',
  CNY: 'CN¥',
  INR: '₹',
  MXN: 'MX$',
  BRL: 'R$',
  NZD: 'NZ$',
};

/** Currencies that use 0 decimal places (minor-to-major division is 1, not 100). */
const NO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW']);

/**
 * Format an amount in minor units (cents) as a positive display string
 * with the currency symbol.
 *
 * Uses our curated CURRENCY_SYMBOLS map for the symbol and
 * Intl.NumberFormat (style: 'decimal') for locale-aware grouping
 * and decimal separators. This avoids Intl.NumberFormat rendering
 * the wrong symbol (e.g. "MYR 10.00" instead of "RM 10.00") on
 * Hermes where the locale-currency pair isn't well-supported.
 *
 * @param amountMinor  Amount in minor units (e.g. cents). Always shown as positive.
 * @param currency     ISO 4217 currency code (e.g. 'USD', 'MYR')
 * @param locale       BCP-47 locale tag used for grouping/symbol (defaults to 'en').
 */
export function formatCurrency(amountMinor: number, currency: string, locale = 'en'): string {
  const amount = Math.abs(amountMinor) / 100;
  const symbol = CURRENCY_SYMBOLS[currency];

  // If we have a curated symbol, use it with locale-aware number formatting.
  if (symbol) {
    const noDecimal = NO_DECIMAL_CURRENCIES.has(currency);
    try {
      const numberPart = new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: noDecimal ? 0 : 2,
        maximumFractionDigits: noDecimal ? 0 : 2,
      }).format(noDecimal ? Math.floor(amount) : amount);
      return `${symbol}${numberPart}`;
    } catch {
      const formatted = noDecimal ? Math.floor(amount).toFixed(0) : amount.toFixed(2);
      return `${symbol}${formatted}`;
    }
  }

  // No curated symbol — delegate to Intl.NumberFormat as a best-effort display.
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Format a positive amount in minor units as a display string (no sign).
 */
export function formatAmountMinor(amountMinor: number, currency: string, locale = 'en'): string {
  return formatCurrency(amountMinor, currency, locale);
}

export type SignedType = 'income' | 'expense' | 'transfer' | 'adjustment';

/**
 * Format an amount with a leading sign derived from the transaction type.
 * Expenses are shown with a minus, income with a plus, transfers neutral.
 * The stored amountMinor is always non-negative; the sign is a render-time
 * concern only.
 */
export function formatSignedCurrency(
  amountMinor: number,
  type: SignedType,
  currency: string,
  locale = 'en'
): string {
  const base = formatCurrency(Math.abs(amountMinor), currency, locale);
  if (type === 'expense') return `-${base}`;
  if (type === 'income') return `+${base}`;
  return base;
}
