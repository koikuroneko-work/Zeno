export const LOCALES = [
  'en', 'ja', 'ko', 'ms', 'th',
  'zh-Hans', 'zh-Hant',
  'fr', 'de', 'es', 'pt', 'it', 'nl',
] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
