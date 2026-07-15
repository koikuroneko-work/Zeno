import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './locales/en.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ms from './locales/ms.json';
import th from './locales/th.json';
import zhHans from './locales/zh-Hans.json';
import zhHant from './locales/zh-Hant.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import { DEFAULT_LOCALE } from 'shared';

const resources = {
  en: { translation: en },
  ja: { translation: ja },
  ko: { translation: ko },
  ms: { translation: ms },
  th: { translation: th },
  'zh-Hans': { translation: zhHans },
  'zh-Hant': { translation: zhHant },
  fr: { translation: fr },
  de: { translation: de },
  es: { translation: es },
  pt: { translation: pt },
  it: { translation: it },
  nl: { translation: nl },
};

const deviceLocale = getLocales()[0]?.languageCode || DEFAULT_LOCALE;
const supported = Object.keys(resources);
const initialLanguage = supported.includes(deviceLocale) ? deviceLocale : DEFAULT_LOCALE;

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
