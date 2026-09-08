import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import en from '@/locales/en.json';
import zhHans from '@/locales/zh-Hans.json';

import { readPreference, writePreference } from './preference-store';
import {
  DEFAULT_PREFERENCE,
  FALLBACK_LOCALE,
  resolveLocale,
  type LocalePreference,
  type ResolvedLocale,
} from './resolve-locale';

const i18n = new I18n(
  { en, 'zh-Hans': zhHans },
  {
    defaultLocale: FALLBACK_LOCALE,
    enableFallback: true,
    // i18n-js splits the scope on `defaultSeparator` (default `"."`) and walks
    // a nested object tree. Our catalogues use flat dotted keys (e.g.
    // `"about.title": "..."`), so splitting would produce
    // `translations['zh-Hans']['about']` → undefined.  Setting the separator to
    // a NUL char makes `t(key)` treat the whole key as a literal lookup.
    // If you change this back to `"."`, you must also convert the JSON
    // catalogues to nested objects, which requires renaming 7 keys that have
    // path collisions (see `result.nextSteps` / `about.help` / `about.settings`
    // and their children).
    defaultSeparator: '\u0000',
  },
);

// Custom missing-translation strategy: readable in dev, silent in prod.
// The default `messageStrategy` uses `defaultSeparator` to join locale + scope,
// which would produce invisible characters with the NUL separator above.
i18n.missingTranslation.register('readable', (_i18n, scope) =>
  __DEV__ ? `[MISSING] ${String(scope)}` : '',
);
i18n.missingBehavior = 'readable';

export { i18n };

export type TranslateOptions = Record<string, unknown>;

type I18nContextValue = {
  /** What the user picked; `'system'` defers to the device. */
  preference: LocalePreference;
  /** The locale actually being rendered. */
  resolvedLocale: ResolvedLocale;
  setPreference: (next: LocalePreference) => void;
  t: (key: string, options?: TranslateOptions) => string;
  /** False until the persisted preference has been read. */
  isReady: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LocalePreference>(DEFAULT_PREFERENCE);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readPreference().then((stored) => {
      if (!cancelled) {
        setPreferenceState(stored);
        setIsReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // `getLocales()` is a synchronous native read; keep it out of render.
  const systemLocales = useMemo(
    () => getLocales().map((locale) => locale.languageTag),
    [],
  );

  const resolvedLocale = useMemo(
    () => resolveLocale(preference, systemLocales),
    [preference, systemLocales],
  );

  const setPreference = useCallback((next: LocalePreference) => {
    // Update state first so the tree repaints immediately; persistence is
    // fire-and-forget and must not gate the UI.
    setPreferenceState(next);
    void writePreference(next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      preference,
      resolvedLocale,
      setPreference,
      // `locale` is passed per call rather than mutating `i18n.locale`, so this
      // stays a pure render and the memo key (resolvedLocale) is what drives
      // consumers to re-render on a language switch.
      // `locale` is spread last so a caller cannot override the resolved one.
      // Note: `options.scope` is unusable here because i18n-js joins it with
      // `defaultSeparator`, which is a NUL char (see the I18n construction).
      t: (key: string, options?: TranslateOptions) =>
        i18n.t(key, { ...options, locale: resolvedLocale }),
      isReady,
    }),
    [preference, resolvedLocale, setPreference, isReady],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside an I18nProvider');
  }
  return context;
}

/** Shorthand for components that only need the translate function. */
export function useTranslate() {
  return useI18n().t;
}
