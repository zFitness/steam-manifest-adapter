import en from '@/locales/en.json';
import zhHans from '@/locales/zh-Hans.json';

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

type CatalogueValue = string | Record<string, string>;
type Catalogue = Record<string, CatalogueValue>;

/**
 * CLDR plural categories each locale must supply when a key uses plural forms.
 * i18n-js looks up `one` before `other` and does NOT fall back between them, so
 * an English plural object missing `one` would surface as a missing translation
 * at count 1.
 */
const REQUIRED_PLURAL_CATEGORIES: Record<string, string[]> = {
  en: ['one', 'other'],
  // Chinese has no plural inflection; catalogues use plain strings instead.
  'zh-Hans': [],
};

const CATALOGUES: Record<string, Catalogue> = {
  en: en as Catalogue,
  'zh-Hans': zhHans as Catalogue,
};

function isPlural(value: CatalogueValue): value is Record<string, string> {
  return typeof value === 'object' && value !== null;
}

/** All leaf strings for a key, whether it is a plain string or a plural object. */
function leafValues(value: CatalogueValue): string[] {
  return isPlural(value) ? Object.values(value) : [value];
}

/** Union of interpolation variables across every plural form of a key. */
function placeholders(value: CatalogueValue): string[] {
  const vars = leafValues(value).flatMap((text) =>
    [...text.matchAll(PLACEHOLDER)].map((m) => m[1]),
  );
  return [...new Set(vars)].sort();
}

describe('locale catalogues', () => {
  const enKeys = Object.keys(en).sort();
  const zhKeys = Object.keys(zhHans).sort();

  it('have identical key sets', () => {
    expect(zhKeys).toEqual(enKeys);
  });

  it('have no duplicate keys after parsing', () => {
    expect(new Set(enKeys).size).toBe(enKeys.length);
    expect(new Set(zhKeys).size).toBe(zhKeys.length);
  });

  it('have no empty or whitespace-only values', () => {
    for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
      for (const [key, value] of Object.entries(catalogue)) {
        for (const [index, text] of leafValues(value).entries()) {
          const label = isPlural(value)
            ? `${locale}:${key}.${Object.keys(value)[index]}`
            : `${locale}:${key}`;
          expect(typeof text).toBe('string');
          expect(`${label}=${text.trim()}`).not.toBe(`${label}=`);
        }
      }
    }
  });

  it('use the same interpolation placeholders per key', () => {
    for (const key of enKeys) {
      const enValue = (en as Catalogue)[key];
      const zhValue = (zhHans as Catalogue)[key];
      expect({ key, vars: placeholders(zhValue) }).toEqual({
        key,
        vars: placeholders(enValue),
      });
    }
  });

  it('supply every plural category the locale requires', () => {
    for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
      const required = REQUIRED_PLURAL_CATEGORIES[locale];
      for (const [key, value] of Object.entries(catalogue)) {
        if (!isPlural(value)) {
          continue;
        }
        expect(required.length).toBeGreaterThan(0);
        expect({ locale, key, forms: Object.keys(value).sort() }).toEqual({
          locale,
          key,
          forms: [...required].sort(),
        });
      }
    }
  });

  it('only use plural objects for keys that interpolate a count', () => {
    for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
      for (const [key, value] of Object.entries(catalogue)) {
        if (isPlural(value)) {
          expect({ locale, key, hasCount: placeholders(value).includes('count') }).toEqual(
            { locale, key, hasCount: true },
          );
        }
      }
    }
  });

  it('only use flat keys under the agreed namespaces', () => {
    const allowed = [
      'app',
      'common',
      'tabs',
      'convert',
      'status',
      'detail',
      'confirm',
      'result',
      'about',
      'settings',
      'help',
    ];
    // Plural categories live one level below a key, so only the top-level
    // catalogue keys take part in namespace validation.
    for (const key of enKeys) {
      expect(allowed).toContain(key.split('.')[0]);
    }
  });
});
