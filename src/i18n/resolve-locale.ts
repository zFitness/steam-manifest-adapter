/** User-facing language preference. `'system'` defers to the device locale. */
export type LocalePreference = 'system' | 'zh-Hans' | 'en';

/** A locale we actually ship translations for. */
export type ResolvedLocale = 'zh-Hans' | 'en';

export const LOCALE_PREFERENCES: readonly LocalePreference[] = ['system', 'zh-Hans', 'en'];

export const DEFAULT_PREFERENCE: LocalePreference = 'system';
export const FALLBACK_LOCALE: ResolvedLocale = 'en';

/** Narrows unknown persisted input to a valid preference, else `'system'`. */
export function isLocalePreference(value: unknown): value is LocalePreference {
  return (
    typeof value === 'string' && (LOCALE_PREFERENCES as readonly string[]).includes(value)
  );
}

/**
 * Resolves the locale to render in.
 *
 * An explicit preference wins outright. Under `'system'`, any Chinese region
 * variant (`zh`, `zh-Hans`, `zh-Hant`, `zh-TW`, `zh-HK`, ...) maps to
 * Simplified Chinese; everything else falls back to English.
 *
 * Pure: no React Native or Expo imports, so it is unit-testable in plain Node.
 */
export function resolveLocale(
  preference: LocalePreference,
  systemLocales: readonly string[],
): ResolvedLocale {
  if (preference !== 'system') {
    return preference;
  }

  for (const locale of systemLocales) {
    if (typeof locale !== 'string' || locale.length === 0) {
      continue;
    }
    // Match the language subtag only, so `zh-Hant-TW` and `ZH_CN` both count.
    const language = locale.replace(/_/g, '-').split('-')[0]?.toLowerCase();
    if (language === 'zh') {
      return 'zh-Hans';
    }
    if (language === 'en') {
      return 'en';
    }
  }

  return FALLBACK_LOCALE;
}
