/**
 * Money utilities
 * Store money in minor units (integer) to avoid floating-point errors.
 */

export type CurrencyCode = string;

export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

export function toMinor(amount: number, currency: CurrencyCode): Money {
  return { amountMinor: Math.round(amount * 100), currency };
}

export function fromMinor(amountMinor: number, currency: CurrencyCode): number {
  return amountMinor / 100;
}

export function formatMoney(
  amountMinor: number,
  currency: CurrencyCode,
  locale: string = 'en'
): string {
  const amount = fromMinor(amountMinor, currency);
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

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error('Currency mismatch');
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error('Currency mismatch');
  return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
}
