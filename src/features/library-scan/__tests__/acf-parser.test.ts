import {
  ACF_BINARY_JUNK,
  ACF_EMPTY,
  ACF_EMPTY_INSTALLDIR,
  ACF_INCOMPLETE,
  ACF_MISSING_APPID,
  ACF_MISSING_INSTALLDIR,
  ACF_MISSING_NAME,
  ACF_MIXED_CASE_KEYS,
  ACF_NESTED_ONLY_KEYS,
  ACF_NORMAL,
  ACF_NO_STATE_FLAGS,
  ACF_OVERSIZED,
  ACF_TRUNCATED,
} from '../test-fixtures/acf-samples';

import { MAX_MANIFEST_BYTES, parseAcf } from '../acf-parser';

describe('parseAcf', () => {
  it('reads the five fields out of a normal manifest', () => {
    const result = parseAcf(ACF_NORMAL);

    expect(result).toEqual({
      ok: true,
      fields: {
        appId: '1465360',
        name: 'SnowRunner',
        installDir: 'SnowRunner',
        stateFlags: '4',
        buildId: '23474939',
      },
    });
  });

  it('keeps StateFlags as raw text so non-4 values survive verbatim', () => {
    const result = parseAcf(ACF_INCOMPLETE);

    expect(result.ok).toBe(true);
    expect(result.ok && result.fields.stateFlags).toBe('6');
  });

  // Nested blocks (InstalledDepots, UserConfig, ...) are noise for this parser.
  it('ignores nested blocks', () => {
    const result = parseAcf(ACF_NORMAL);

    expect(result.ok).toBe(true);
    expect(result.ok && result.fields.installDir).toBe('SnowRunner');
  });

  // The first occurrence wins, so a nested "name" cannot shadow the real one.
  it('does not let a nested block override a top-level field', () => {
    const result = parseAcf(ACF_NESTED_ONLY_KEYS);

    expect(result.ok).toBe(true);
    expect(result.ok && result.fields.name).toBe('Dota 2');
    expect(result.ok && result.fields.installDir).toBe('dota 2 beta');
  });

  it('matches keys case-insensitively', () => {
    const result = parseAcf(ACF_MIXED_CASE_KEYS);

    expect(result).toEqual({
      ok: true,
      fields: {
        appId: '620',
        name: 'Portal 2',
        installDir: 'Portal 2',
        stateFlags: '4',
        buildId: '1234',
      },
    });
  });

  it('succeeds without a name, leaving it empty for the caller to substitute', () => {
    const result = parseAcf(ACF_MISSING_NAME);

    expect(result.ok).toBe(true);
    expect(result.ok && result.fields.name).toBe('');
    expect(result.ok && result.fields.appId).toBe('228990');
  });

  it('reports missing StateFlags as empty rather than failing', () => {
    const result = parseAcf(ACF_NO_STATE_FLAGS);

    expect(result.ok).toBe(true);
    expect(result.ok && result.fields.stateFlags).toBe('');
  });

  // Without appid or installdir there is nothing to locate on disk.
  it.each([
    ['a missing appid', ACF_MISSING_APPID],
    ['a missing installdir', ACF_MISSING_INSTALLDIR],
    ['an empty installdir', ACF_EMPTY_INSTALLDIR],
  ])('reports missing-fields for %s', (_label, sample) => {
    expect(parseAcf(sample)).toEqual({ ok: false, failure: 'missing-fields' });
  });

  it.each([
    ['an empty file', ACF_EMPTY],
    ['truncated text', ACF_TRUNCATED],
    ['binary junk', ACF_BINARY_JUNK],
  ])('reports unparsable for %s', (_label, sample) => {
    expect(parseAcf(sample)).toEqual({ ok: false, failure: 'unparsable' });
  });

  // Oversized input must be refused outright, not parsed hopefully.
  it('refuses input larger than the byte ceiling', () => {
    expect(ACF_OVERSIZED.length).toBeGreaterThan(MAX_MANIFEST_BYTES);

    expect(parseAcf(ACF_OVERSIZED)).toEqual({ ok: false, failure: 'unparsable' });
  });

  it('never throws, whatever it is handed', () => {
    for (const sample of [ACF_EMPTY, ACF_BINARY_JUNK, ACF_TRUNCATED, ACF_OVERSIZED]) {
      expect(() => parseAcf(sample)).not.toThrow();
    }
  });
});
