import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';

import en from './en.json';
import zh from './zh.json';
import ja from './ja.json';
import ko from './ko.json';
import es from './es.json';
import fr from './fr.json';
import de from './de.json';
import pt from './pt.json';

const translations = { en, zh, ja, ko, es, fr, de, pt };

const LOCALE_KEY = 'worldclock_locale';

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
];

function detectInitialLocale() {
  // 1. Try saved preference
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved && translations[saved]) return saved;
  } catch (_) {}

  // 2. Auto-detect from browser language
  const browserLang = navigator.language?.slice(0, 2);
  if (translations[browserLang]) return browserLang;

  return 'en';
}

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(detectInitialLocale);

  // Persist locale to both browser localStorage and SDK storage
  useEffect(() => {
    try { localStorage.setItem(LOCALE_KEY, locale); } catch (_) {}
    (async () => {
      try {
        const bridge = await waitForEvenAppBridge();
        await bridge.setLocalStorage(LOCALE_KEY, locale);
      } catch (_) {}
    })();
  }, [locale]);

  // Reconcile with SDK storage on mount (authoritative source)
  useEffect(() => {
    (async () => {
      try {
        const bridge = await waitForEvenAppBridge();
        const saved = await bridge.getLocalStorage(LOCALE_KEY);
        if (saved && translations[saved] && saved !== locale) {
          setLocaleState(saved);
        }
      } catch (_) {}
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setLocale = useCallback((code) => {
    if (translations[code]) setLocaleState(code);
  }, []);

  const t = useCallback((key) => {
    return translations[locale]?.[key] || translations.en[key] || key;
  }, [locale]);

  // Translate moon phase from English (returned by useWorldClock) to current locale
  const moonPhaseKey = {
    'New Moon': 'moon.newMoon',
    'Waxing Crescent': 'moon.waxingCrescent',
    'First Quarter': 'moon.firstQuarter',
    'Waxing Gibbous': 'moon.waxingGibbous',
    'Full Moon': 'moon.fullMoon',
    'Waning Gibbous': 'moon.waningGibbous',
    'Last Quarter': 'moon.lastQuarter',
    'Waning Crescent': 'moon.waningCrescent',
  };

  const tMoon = useCallback((englishPhase) => {
    const key = moonPhaseKey[englishPhase];
    return key ? t(key) : englishPhase;
  }, [t]);

  // Translate offset — "Same time" needs localization, other offsets (+5h, -3h) are universal
  const tOffset = useCallback((offset) => {
    return offset === 'Same time' ? t('time.sameTime') : offset;
  }, [t]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, tMoon, tOffset, languages: LANGUAGES }}>
      {children}
    </LocaleContext.Provider>
  );
}

export default function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>');
  return ctx;
}
