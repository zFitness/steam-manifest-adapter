import en from '@/locales/en.json';
import zhHans from '@/locales/zh-Hans.json';

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function placeholders(value: string): string[] {
  return [...value.matchAll(PLACEHOLDER)].map((m) => m[1]).sort();
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
    for (const [locale, catalogue] of [
      ['en', en],
      ['zh-Hans', zhHans],
    ] as const) {
      for (const [key, value] of Object.entries(catalogue)) {
        expect(typeof value).toBe('string');
        expect(`${locale}:${key}=${(value as string).trim()}`).not.toBe(
          `${locale}:${key}=`,
        );
      }
    }
  });

  it('use the same interpolation placeholders per key', () => {
    for (const key of enKeys) {
      const enValue = (en as Record<string, string>)[key];
      const zhValue = (zhHans as Record<string, string>)[key];
      expect({ key, vars: placeholders(zhValue) }).toEqual({
        key,
        vars: placeholders(enValue),
      });
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
      'guide',
    ];
    for (const key of enKeys) {
      expect(allowed).toContain(key.split('.')[0]);
    }
  });
});
