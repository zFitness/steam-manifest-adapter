import { isSafeInstallDir } from '../install-dir';

describe('isSafeInstallDir', () => {
  it('accepts a plain folder name', () => {
    expect(isSafeInstallDir('SnowRunner')).toBe(true);
    expect(isSafeInstallDir('dota 2 beta')).toBe(true);
    expect(isSafeInstallDir("Garry's Mod")).toBe(true);
    expect(isSafeInstallDir('Counter-Strike Global Offensive')).toBe(true);
  });

  // Every one of these could otherwise reach outside the granted tree.
  it.each([
    ['a relative traversal', '../../Android/data/x'],
    ['a bare parent reference', '..'],
    ['a current-directory reference', '.'],
    ['an absolute path', '/data/data/x'],
    ['a nested segment', 'a/b'],
    ['a trailing separator', 'SnowRunner/'],
    ['a backslash separator', 'a\\b'],
    ['a windows-style traversal', '..\\..\\x'],
    ['an embedded NUL', 'SnowRunner\u0000/../x'],
    ['an empty string', ''],
  ])('refuses %s', (_label, installDir) => {
    expect(isSafeInstallDir(installDir)).toBe(false);
  });
});
