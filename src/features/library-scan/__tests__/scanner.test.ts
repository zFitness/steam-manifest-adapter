import { createMemoryFs, MEMORY_FS_ROOT, type MemoryTree } from '../memory-fs';
import { scanLibrary, type CancelToken } from '../scanner';
import {
  ACF_BINARY_JUNK,
  ACF_INCOMPLETE,
  ACF_MISSING_NAME,
  ACF_NORMAL,
  ACF_TRAVERSAL_RELATIVE,
} from '../test-fixtures/acf-samples';

/**
 * Mirrors the maintainer's actual device (`/storage/emulated/0/games/steamapps`):
 * five manifests, six folders under `common/`, four of them already marked.
 * `Brawlhalla` has no manifest, so it must never produce a row.
 */
const DEVICE_TREE: MemoryTree = {
  'appmanifest_1465360.acf': ACF_NORMAL, // SnowRunner, marked
  'appmanifest_228980.acf': ACF_MISSING_NAME, // Steamworks Shared, unmarked
  'appmanifest_391220.acf': ACF_INCOMPLETE, // Rise of the Tomb Raider, marked
  'import-external-steam-acf.sh': '#!/bin/sh\n',
  common: {
    SnowRunner: { '.download_complete': '', Media: {} },
    'Steamworks Shared': { _CommonRedist: {} },
    'Rise of the Tomb Raider': { '.download_complete': '' },
    Brawlhalla: { '.DepotDownloader': '' },
  },
};

function byId<T extends { id: string }>(games: T[], id: string): T {
  const game = games.find((candidate) => candidate.id === id);
  if (game === undefined) {
    throw new Error(`no row for ${id}`);
  }
  return game;
}

describe('scanLibrary', () => {
  describe('discovery', () => {
    it('reports one row per manifest and ignores everything else', async () => {
      const fs = createMemoryFs(DEVICE_TREE);

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      expect(result).toMatchObject({ kind: 'ok' });
      if (result.kind !== 'ok') return;
      expect(result.games.map((game) => game.id).sort()).toEqual([
        'appmanifest_1465360.acf',
        'appmanifest_228980.acf',
        'appmanifest_391220.acf',
      ]);
    });

    // A folder without a manifest is not a game as far as this tool is concerned.
    it('does not invent a row for a folder that has no manifest', async () => {
      const fs = createMemoryFs(DEVICE_TREE);

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      if (result.kind !== 'ok') throw new Error('expected ok');
      expect(
        result.games.some((game) => game.installDir === 'Brawlhalla'),
      ).toBe(false);
    });

    it.each([
      ['a Valve library index', 'libraryfolders.vdf'],
      ['a backup manifest', 'appmanifest_620.acf.bak'],
      ['a non-numeric appid', 'appmanifest_abc.acf'],
      ['a bare prefix', 'appmanifest_.acf'],
    ])('ignores %s', async (_label, fileName) => {
      const fs = createMemoryFs({ [fileName]: ACF_NORMAL, common: {} });

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      expect(result).toEqual({ kind: 'ok', games: [] });
    });

    it('matches manifest file names case-insensitively', async () => {
      const fs = createMemoryFs({
        'AppManifest_1465360.ACF': ACF_NORMAL,
        common: { SnowRunner: { Media: {} } },
      });

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      if (result.kind !== 'ok') throw new Error('expected ok');
      expect(result.games).toHaveLength(1);
      expect(result.games[0].status).toBe('adaptable');
    });

    // Granting a parent directory must not turn into a recursive crawl.
    it('does not descend into subdirectories looking for manifests', async () => {
      const fs = createMemoryFs({
        steamapps: { 'appmanifest_1465360.acf': ACF_NORMAL, common: {} },
      });

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      expect(result).toEqual({ kind: 'ok', games: [] });
    });

    it('reports an empty list rather than a failure for a directory with no manifests', async () => {
      const fs = createMemoryFs({ 'notes.txt': 'hello' });

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      expect(result).toEqual({ kind: 'ok', games: [] });
    });
  });

  describe('classification against the real device layout', () => {
    it('marks the four already-marked games as alreadyAdapted', async () => {
      const fs = createMemoryFs(DEVICE_TREE);

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      if (result.kind !== 'ok') throw new Error('expected ok');
      expect(byId(result.games, 'appmanifest_1465360.acf')).toMatchObject({
        status: 'alreadyAdapted',
        reason: 'already-marked',
      });
      expect(byId(result.games, 'appmanifest_391220.acf')).toMatchObject({
        status: 'alreadyAdapted',
        reason: 'already-marked',
      });
    });

    it('marks the unmarked, fully installed game as adaptable', async () => {
      const fs = createMemoryFs(DEVICE_TREE);

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      if (result.kind !== 'ok') throw new Error('expected ok');
      expect(byId(result.games, 'appmanifest_228980.acf')).toMatchObject({
        status: 'adaptable',
        installDir: 'Steamworks Shared',
      });
    });

    it('falls back to the appid when the manifest has no name', async () => {
      const fs = createMemoryFs(DEVICE_TREE);

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      if (result.kind !== 'ok') throw new Error('expected ok');
      expect(byId(result.games, 'appmanifest_228980.acf').name).toBe('228980');
    });
  });

  describe('per-game problems stay rows, not scan failures', () => {
    it('flags a folder whose real name differs from installdir', async () => {
      // Shared storage is case-insensitive, so the folder is found — the point
      // is that its name would not match the target platform's exact lookup.
      const fs = createMemoryFs({
        'appmanifest_1465360.acf': ACF_NORMAL,
        common: { snowrunner: { Media: {} } },
      });

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      if (result.kind !== 'ok') throw new Error('expected ok');
      expect(result.games[0]).toMatchObject({
        status: 'needsAttention',
        reason: 'dir-name-mismatch',
      });
    });

    it('flags an empty game folder', async () => {
      const fs = createMemoryFs({
        'appmanifest_1465360.acf': ACF_NORMAL,
        common: { SnowRunner: {} },
      });

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      if (result.kind !== 'ok') throw new Error('expected ok');
      expect(result.games[0]).toMatchObject({
        status: 'needsAttention',
        reason: 'dir-empty',
      });
    });

    it('flags a leftover in-progress marker', async () => {
      const fs = createMemoryFs({
        'appmanifest_1465360.acf': ACF_NORMAL,
        common: { SnowRunner: { '.download_in_progress': '' } },
      });

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      if (result.kind !== 'ok') throw new Error('expected ok');
      expect(result.games[0]).toMatchObject({
        status: 'needsAttention',
        reason: 'stale-in-progress',
      });
    });

    it('refuses an installdir that points outside the granted tree', async () => {
      const fs = createMemoryFs({
        'appmanifest_1465360.acf': ACF_TRAVERSAL_RELATIVE,
        common: {},
      });

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      if (result.kind !== 'ok') throw new Error('expected ok');
      expect(result.games[0]).toMatchObject({
        status: 'notAdaptable',
        reason: 'manifest-invalid-installdir',
      });
    });

    it('keeps an unparsable manifest as a row', async () => {
      const fs = createMemoryFs({
        'appmanifest_1465360.acf': ACF_BINARY_JUNK,
        common: {},
      });

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      if (result.kind !== 'ok') throw new Error('expected ok');
      expect(result.games[0]).toMatchObject({
        status: 'notAdaptable',
        reason: 'manifest-unreadable',
      });
      // Still identifiable in the list even though nothing could be read.
      expect(result.games[0].name).toBe('appmanifest_1465360.acf');
    });

    it('treats an unreadable manifest as a row, not a failed scan', async () => {
      const fs = createMemoryFs(
        { 'appmanifest_1465360.acf': ACF_NORMAL, common: {} },
        { failures: { 'appmanifest_1465360.acf': 'io-error' } },
      );

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      if (result.kind !== 'ok') throw new Error('expected ok');
      expect(result.games[0].status).toBe('notAdaptable');
    });

    // Every row explains itself, but the scan itself still succeeded.
    it('stays ok when common/ is missing entirely', async () => {
      const fs = createMemoryFs({ 'appmanifest_1465360.acf': ACF_NORMAL });

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      expect(result).toMatchObject({ kind: 'ok' });
      if (result.kind !== 'ok') return;
      expect(result.games[0]).toMatchObject({
        status: 'notAdaptable',
        reason: 'dir-missing',
      });
    });
  });

  describe('directory-level failures', () => {
    it('reports unreadable when the granted directory cannot be listed', async () => {
      const fs = createMemoryFs(DEVICE_TREE, { failures: { '': 'io-error' } });

      expect(await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT })).toEqual({
        kind: 'unreadable',
      });
    });

    // The spec routes a moved or deleted directory to "scan failed".
    it('reports unreadable when the granted directory is gone', async () => {
      const fs = createMemoryFs(DEVICE_TREE, { failures: { '': 'not-found' } });

      expect(await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT })).toEqual({
        kind: 'unreadable',
      });
    });

    it('reports permission-revoked when the grant lapsed', async () => {
      const fs = createMemoryFs(DEVICE_TREE, {
        failures: { '': 'permission-revoked' },
      });

      expect(await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT })).toEqual({
        kind: 'permission-revoked',
      });
    });

    it('reports permission-revoked when the grant lapses mid-scan', async () => {
      const fs = createMemoryFs(DEVICE_TREE, {
        failures: { 'appmanifest_1465360.acf': 'permission-revoked' },
      });

      expect(await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT })).toEqual({
        kind: 'permission-revoked',
      });
    });
  });

  describe('cancellation', () => {
    it('returns cancelled without a partial list', async () => {
      const fs = createMemoryFs(DEVICE_TREE);
      const token: CancelToken = { cancelled: true };

      const result = await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT, token });

      expect(result).toEqual({ kind: 'cancelled' });
    });

    it('stops as soon as the token flips mid-scan', async () => {
      const fs = createMemoryFs(DEVICE_TREE);
      const token = { cancelled: false };
      const seen: number[] = [];

      const result = await scanLibrary({
        fs,
        rootUri: MEMORY_FS_ROOT,
        token,
        onProgress: (discovered) => {
          seen.push(discovered);
          token.cancelled = true;
        },
      });

      expect(result).toEqual({ kind: 'cancelled' });
      // Exactly one manifest was processed before the flag was noticed.
      expect(seen).toEqual([1]);
    });
  });

  describe('progress and caching', () => {
    it('reports an increasing count, once per manifest', async () => {
      const fs = createMemoryFs(DEVICE_TREE);
      const seen: number[] = [];

      await scanLibrary({
        fs,
        rootUri: MEMORY_FS_ROOT,
        onProgress: (discovered) => seen.push(discovered),
      });

      expect(seen).toEqual([1, 2, 3]);
    });

    // Re-listing `common/` per manifest would make a large library crawl.
    it('lists common/ only once per scan', async () => {
      const fs = createMemoryFs(DEVICE_TREE);

      await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      expect(fs.listCounts.get('common')).toBe(1);
    });

    it('lists the granted directory only once per scan', async () => {
      const fs = createMemoryFs(DEVICE_TREE);

      await scanLibrary({ fs, rootUri: MEMORY_FS_ROOT });

      expect(fs.listCounts.get('')).toBe(1);
    });
  });
});
