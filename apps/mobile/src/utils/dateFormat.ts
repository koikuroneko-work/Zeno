/**
 * Locale‑aware date formatting.
 *
 * React Native / Hermes on Android ships with limited ICU data, so
 * `toLocaleDateString('zh-CN')` may fall back to Japanese on some devices.
 * Rather than relying on the JS engine's Intl we define every weekday and
 * month label ourselves for all 13 app locales.
 *
 * Keep in sync with the locale list in `src/i18n/index.ts`.
 */

// ---------------------------------------------------------------------------
// Supported locale keys
// ---------------------------------------------------------------------------

type AppLocale =
  | 'en' | 'ms' | 'ja' | 'ko' | 'th'
  | 'zh-Hans' | 'zh-Hant'
  | 'fr' | 'de' | 'es' | 'pt' | 'it' | 'nl';

// ---------------------------------------------------------------------------
// Weekday short names  —  Sunday = index 0
// ---------------------------------------------------------------------------

const WEEKDAYS_SHORT: Record<AppLocale, string[]> = {
  en:       ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ms:       ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'],
  ja:       ['日', '月', '火', '水', '木', '金', '土'],
  ko:       ['일', '월', '화', '수', '목', '금', '토'],
  th:       ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'],
  'zh-Hans': ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  'zh-Hant': ['週日', '週一', '週二', '週三', '週四', '週五', '週六'],
  fr:       ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
  de:       ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'],
  es:       ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'],
  pt:       ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'],
  it:       ['dom.', 'lun.', 'mar.', 'mer.', 'gio.', 'ven.', 'sab.'],
  nl:       ['zo.', 'ma.', 'di.', 'wo.', 'do.', 'vr.', 'za.'],
};

// ---------------------------------------------------------------------------
// Month short names  —  January = index 0
// ---------------------------------------------------------------------------

const MONTHS_SHORT: Record<AppLocale, string[]> = {
  en:       ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ms:       ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
  ja:       ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  ko:       ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  th:       ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
  'zh-Hans': ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  'zh-Hant': ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  fr:       ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  de:       ['Jan.', 'Feb.', 'Mär.', 'Apr.', 'Mai', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'],
  es:       ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'],
  pt:       ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'],
  it:       ['gen.', 'feb.', 'mar.', 'apr.', 'mag.', 'giu.', 'lug.', 'ago.', 'set.', 'ott.', 'nov.', 'dic.'],
  nl:       ['jan.', 'feb.', 'mrt.', 'apr.', 'mei', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'],
};

// ---------------------------------------------------------------------------
// Date‑format patterns
// Tokens: {weekday} {day} {month} {year}
// ---------------------------------------------------------------------------

type PatternFn = (parts: {
  weekday: string;
  day: string;
  month: string;
  year: string;
}) => string;

const PATTERNS: Record<AppLocale, PatternFn> = {
  en:       ({ weekday, month, day, year }) => `${weekday}, ${month} ${day}, ${year}`,
  ms:       ({ weekday, day, month, year }) => `${weekday}, ${day} ${month} ${year}`,
  ja:       ({ year, month, day, weekday }) => `${year}年${month}${day}日(${weekday})`,
  ko:       ({ year, month, day, weekday }) => `${year}년 ${month} ${day}일 (${weekday})`,
  th:       ({ weekday, day, month, year }) => `${weekday} ${day} ${month} ${year}`,
  'zh-Hans': ({ year, month, day, weekday }) => `${year}年${month}${day}日 ${weekday}`,
  'zh-Hant': ({ year, month, day, weekday }) => `${year}年${month}${day}日 ${weekday}`,
  fr:       ({ weekday, day, month, year }) => `${weekday} ${day} ${month} ${year}`,
  de:       ({ weekday, day, month, year }) => `${weekday}, ${day}. ${month} ${year}`,
  es:       ({ weekday, day, month, year }) => `${weekday} ${day} ${month} ${year}`,
  pt:       ({ weekday, day, month, year }) => `${weekday} ${day} ${month} ${year}`,
  it:       ({ weekday, day, month, year }) => `${weekday} ${day} ${month} ${year}`,
  nl:       ({ weekday, day, month, year }) => `${weekday} ${day} ${month} ${year}`,
};

// ---------------------------------------------------------------------------
// Fallback locale — when the current app locale isn't in our table
// ---------------------------------------------------------------------------

const FALLBACK_LOCALE: AppLocale = 'en';

function resolveLocale(locale: string): AppLocale {
  if (locale in WEEKDAYS_SHORT) return locale as AppLocale;
  // i18next may return a longer tag like "zh-Hans-CN" — try the prefix
  const base = locale.split('-').slice(0, 2).join('-') as AppLocale;
  if (base in WEEKDAYS_SHORT) return base;
  return FALLBACK_LOCALE;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Format a `YYYY-MM-DD` date string for the given app locale.
 *
 * Examples (for a Wednesday 15 July 2026):
 *   en:        "Wed, Jul 15, 2026"
 *   ms:        "Rab, 15 Jul 2026"
 *   ja:        "2026年7月15日(水)"
 *   ko:        "2026년 7월 15일 (수)"
 *   zh-Hans:   "2026年7月15日 周三"
 */
export function formatDate(dateStr: string, locale: string): string {
  const appLocale = resolveLocale(locale);
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay(); // 0 = Sunday

  const weekday = WEEKDAYS_SHORT[appLocale][dow];
  const month = MONTHS_SHORT[appLocale][m - 1];
  const day = String(d);
  const year = String(y);

  const pattern = PATTERNS[appLocale] ?? PATTERNS[FALLBACK_LOCALE];
  return pattern({ weekday, day, month, year });
}

/**
 * Format an ISO‑8601 datetime string to show just the time
 * (HH:MM) in the given locale's convention.
 *
 * Uses `toLocaleTimeString` under the hood — time formatting is
 * far less prone to ICU data gaps than date formatting — but keeps
 * the same locale‑aware interface.
 */
export function formatTime(dateStr: string, locale: string): string {
  const appLocale = resolveLocale(locale);
  const date = new Date(dateStr);
  return date.toLocaleTimeString(appLocale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}
