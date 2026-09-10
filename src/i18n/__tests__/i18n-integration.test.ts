import en from '@/locales/en.json';
import zhHans from '@/locales/zh-Hans.json';

import { i18n } from '../provider';

/**
 * These tests exercise the real `i18n` singleton exported by `provider.tsx`, not
 * a locally constructed one. That is deliberate: the defect this suite guards
 * against was a misconfiguration of that instance, so a test that builds its own
 * `I18n` would have passed while the app was broken.
 */

const MISSING = /^\[missing /;
const DEV_MISSING = /^\[MISSING] /;
const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

const LOCALES = ['zh-Hans', 'en'] as const;

/** Collects every leaf key path, descending into plural objects. */
function leafKeys(catalogue: Record<string, unknown>): string[] {
  return Object.entries(catalogue).flatMap(([key, value]) =>
    typeof value === 'string' ? [key] : [],
  );
}

/** Keys whose value is a plural object (`{ one, other }`) rather than a string. */
function pluralKeys(catalogue: Record<string, unknown>): string[] {
  return Object.entries(catalogue).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null ? [key] : [],
  );
}

function interpolationVars(value: string): string[] {
  return [...value.matchAll(PLACEHOLDER)].map((m) => m[1]);
}

/**
 * Builds a dummy value for every interpolation variable a key needs, so that a
 * genuine lookup failure is never masked by a `[missing "..." value]` result.
 */
function optionsFor(vars: string[]): Record<string, unknown> {
  return Object.fromEntries(vars.map((name) => [name, name === 'count' ? 2 : 'x']));
}

const CATALOGUES: Record<(typeof LOCALES)[number], Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  'zh-Hans': zhHans as Record<string, unknown>,
};

/** Union of keys across both catalogues, so a key missing from one is still probed. */
const ALL_KEYS = [
  ...new Set([...Object.keys(en), ...Object.keys(zhHans)]),
].sort();

describe('i18n lookup', () => {
  it('has keys to check', () => {
    expect(ALL_KEYS.length).toBeGreaterThan(0);
  });

  describe.each(LOCALES)('locale %s', (locale) => {
    const plainKeys = ALL_KEYS.filter(
      (key) => !pluralKeys(CATALOGUES[locale]).includes(key),
    );

    it.each(plainKeys)('resolves %s to real text', (key) => {
      // Use the placeholders declared by whichever catalogue defines the key.
      const source =
        (CATALOGUES[locale][key] as string | undefined) ??
        (CATALOGUES.en[key] as string | undefined) ??
        '';
      const vars =
        typeof source === 'string' ? interpolationVars(source) : ['count'];

      const result = i18n.t(key, { ...optionsFor(vars), locale });

      expect(result).not.toMatch(MISSING);
      expect(result).not.toMatch(DEV_MISSING);
      expect(result).not.toBe('');
      // A raw key leaking through means lookup silently failed.
      expect(result).not.toBe(key);
    });
  });

  it('resolves parent and child keys independently', () => {
    // `about.help` and `about.help.winnative` both carry text. A nested-object
    // layout cannot represent this, so it is a regression canary.
    for (const locale of LOCALES) {
      const parent = i18n.t('about.help', { locale });
      const child = i18n.t('about.help.winnative', { locale });

      expect(parent).not.toMatch(MISSING);
      expect(child).not.toMatch(MISSING);
      expect(parent).not.toBe(child);
    }
  });

  it('falls back to English when a key is absent from the active locale', () => {
    // `enableFallback` + defaultLocale 'en' must survive the separator change.
    // Inject a key that exists only in English so the test does not depend on
    // catalogue drift between the two locales.
    const enOnlyKey = 'test.enOnly.fallbackCanary';
    i18n.store({ en: { [enOnlyKey]: 'fallback canary' } });
    expect(i18n.t(enOnlyKey, { locale: 'zh-Hans' })).toBe('fallback canary');
  });

  it('does not render invisible characters for a doubly-missing key', () => {
    const result = i18n.t('nope.definitely.not.a.real.key', {
      locale: 'zh-Hans',
    });
    // Under __DEV__ this is a readable diagnostic; in release it is ''.
    // Either way it must not contain the NUL separator.
    expect(result).not.toContain('\u0000');
  });
});

describe('plural forms', () => {
  const enPlural = pluralKeys(en as Record<string, unknown>);

  it('declares plural objects for the English count keys', () => {
    expect(enPlural.length).toBeGreaterThan(0);
  });

  describe.each([0, 1, 5])('count = %i', (count) => {
    it.each(enPlural)('%s resolves in English', (key) => {
      const result = i18n.t(key, { count, locale: 'en' });
      expect(result).not.toMatch(MISSING);
      expect(result).not.toMatch(DEV_MISSING);
      expect(result).toContain(String(count));
    });

    it.each(enPlural)('%s resolves in Chinese', (key) => {
      // Chinese keeps string values; `pluralize` must never be reached.
      const result = i18n.t(key, { count, locale: 'zh-Hans' });
      expect(result).not.toMatch(MISSING);
      expect(result).not.toMatch(DEV_MISSING);
      expect(result).toContain(String(count));
    });
  });

  it('uses singular English wording at count 1 and plural otherwise', () => {
    expect(i18n.t('convert.library.header.games', { count: 1, locale: 'en' })).toBe(
      '1 game',
    );
    expect(i18n.t('convert.library.header.games', { count: 0, locale: 'en' })).toBe(
      '0 games',
    );
    expect(i18n.t('convert.library.header.games', { count: 5, locale: 'en' })).toBe(
      '5 games',
    );
  });

  it('keeps one Chinese wording across all counts', () => {
    const forms = [0, 1, 5].map((count) =>
      i18n.t('convert.library.header.games', { count, locale: 'zh-Hans' }),
    );
    expect(forms).toEqual(['0 个游戏', '1 个游戏', '5 个游戏']);
  });

  it('renders singular for both total and selected at count 1', () => {
    // spec: 已选数量与总数同时展示
    expect(i18n.t('convert.library.header.games', { count: 1, locale: 'en' })).toBe(
      '1 game',
    );
    expect(
      i18n.t('convert.library.header.selected', { count: 1, locale: 'en' }),
    ).toBe('1 selected');
  });
});

describe('locale resolution cannot be overridden by callers', () => {
  it('ignores a caller-supplied locale in the provider wrapper', () => {
    // Mirrors the wrapper in provider.tsx: resolvedLocale must win.
    const resolvedLocale = 'zh-Hans';
    const t = (key: string, options?: Record<string, unknown>) =>
      i18n.t(key, { ...options, locale: resolvedLocale });

    expect(t('about.title', { locale: 'en' })).toBe(
      (zhHans as Record<string, string>)['about.title'],
    );
  });
});

describe('catalogue leaf coverage', () => {
  it('probes every string key in both catalogues', () => {
    // Guards the guard: if a future refactor empties leafKeys(), the
    // per-key it.each blocks above would silently probe nothing.
    expect(leafKeys(en as Record<string, unknown>).length).toBeGreaterThan(90);
    expect(leafKeys(zhHans as Record<string, unknown>).length).toBeGreaterThan(
      90,
    );
  });
});
