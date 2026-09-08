import {
  DEFAULT_PREFERENCE,
  isLocalePreference,
  resolveLocale,
} from '../resolve-locale';

describe('resolveLocale', () => {
  describe('preference "system"', () => {
    it('resolves Simplified Chinese system locale to zh-Hans', () => {
      expect(resolveLocale('system', ['zh-Hans-CN'])).toBe('zh-Hans');
      expect(resolveLocale('system', ['zh-CN'])).toBe('zh-Hans');
      expect(resolveLocale('system', ['zh'])).toBe('zh-Hans');
    });

    it('resolves Traditional Chinese system locale to zh-Hans', () => {
      expect(resolveLocale('system', ['zh-Hant-TW'])).toBe('zh-Hans');
      expect(resolveLocale('system', ['zh-TW'])).toBe('zh-Hans');
      expect(resolveLocale('system', ['zh-HK'])).toBe('zh-Hans');
    });

    it('falls back to en for an unsupported system locale', () => {
      expect(resolveLocale('system', ['ja-JP'])).toBe('en');
      expect(resolveLocale('system', ['ja'])).toBe('en');
      expect(resolveLocale('system', ['de-DE'])).toBe('en');
    });

    it('falls back to en when there are no system locales', () => {
      expect(resolveLocale('system', [])).toBe('en');
    });

    it('ignores empty and non-string entries', () => {
      expect(resolveLocale('system', ['', 'zh-CN'])).toBe('zh-Hans');
      expect(
        resolveLocale('system', [undefined as unknown as string, 'ja']),
      ).toBe('en');
    });

    it('normalises underscore separators and casing', () => {
      expect(resolveLocale('system', ['ZH_CN'])).toBe('zh-Hans');
      expect(resolveLocale('system', ['EN_US'])).toBe('en');
    });

    it('picks the first supported locale in the preference list', () => {
      expect(resolveLocale('system', ['ja-JP', 'zh-CN'])).toBe('zh-Hans');
      expect(resolveLocale('system', ['ko-KR', 'en-GB'])).toBe('en');
    });
  });

  describe('explicit preference', () => {
    it('returns English regardless of system locale', () => {
      expect(resolveLocale('en', ['zh-Hans-CN'])).toBe('en');
      expect(resolveLocale('en', [])).toBe('en');
    });

    it('returns Simplified Chinese regardless of system locale', () => {
      expect(resolveLocale('zh-Hans', ['ja-JP'])).toBe('zh-Hans');
      expect(resolveLocale('zh-Hans', [])).toBe('zh-Hans');
    });
  });
});

describe('isLocalePreference', () => {
  it('accepts the three supported preferences', () => {
    expect(isLocalePreference('system')).toBe(true);
    expect(isLocalePreference('zh-Hans')).toBe(true);
    expect(isLocalePreference('en')).toBe(true);
  });

  it('rejects malformed persisted values', () => {
    expect(isLocalePreference('zh-Hant')).toBe(false);
    expect(isLocalePreference('')).toBe(false);
    expect(isLocalePreference(null)).toBe(false);
    expect(isLocalePreference(undefined)).toBe(false);
    expect(isLocalePreference(42)).toBe(false);
    expect(isLocalePreference({ locale: 'en' })).toBe(false);
  });
});

describe('DEFAULT_PREFERENCE', () => {
  it('is "system" so a fresh install follows the device', () => {
    expect(DEFAULT_PREFERENCE).toBe('system');
    expect(isLocalePreference(DEFAULT_PREFERENCE)).toBe(true);
  });
});
