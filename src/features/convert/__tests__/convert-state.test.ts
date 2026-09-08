import type { ScannedGame } from '@/features/library-scan/types';

import {
  convertReducer,
  initialConvertState,
  type ConvertState,
  type ConvertStatus,
} from '../convert-state';

const ALL_STATUSES: ConvertStatus[] = [
  'no-directory',
  'scanning',
  'scanned-has-adaptable',
  'scanned-empty',
  'scan-failed',
  'permission-revoked',
  'converting',
  'converted',
];

const PICKED = 'content://com.android.externalstorage.documents/tree/primary%3AGames';

/** One row per status, so selection rules can be checked in every direction. */
const GAMES: ScannedGame[] = [
  {
    id: 'appmanifest_1465360.acf',
    appId: '1465360',
    name: 'SnowRunner',
    installDir: 'SnowRunner',
    status: 'adaptable',
  },
  {
    id: 'appmanifest_228980.acf',
    appId: '228980',
    name: 'Steamworks Common Redistributables',
    installDir: 'Steamworks Shared',
    status: 'adaptable',
  },
  {
    id: 'appmanifest_725340.acf',
    appId: '725340',
    name: 'Lines X Free',
    installDir: 'Lines X Free',
    status: 'alreadyAdapted',
    reason: 'already-marked',
  },
  {
    id: 'appmanifest_391220.acf',
    appId: '391220',
    name: 'Rise of the Tomb Raider',
    installDir: 'Rise of the Tomb Raider',
    status: 'needsAttention',
    reason: 'state-flags-incomplete',
  },
  {
    id: 'appmanifest_943960.acf',
    appId: '943960',
    name: '3Buttons',
    installDir: '3Buttons',
    status: 'notAdaptable',
    reason: 'dir-missing',
  },
];

/** Enters the scanning state, mirroring a real grant. */
function scanning(scanId = 1): ConvertState {
  return convertReducer(initialConvertState, {
    type: 'pick-directory',
    directory: PICKED,
    scanId,
  });
}

/** A completed scan, reached the only way the UI can reach it. */
function scanned(): ConvertState {
  const state = scanning();
  return convertReducer(state, {
    type: 'scan-succeeded',
    scanId: state.scanId,
    games: GAMES,
  });
}

describe('convertReducer', () => {
  it('starts with no directory selected', () => {
    expect(initialConvertState.status).toBe('no-directory');
    expect(initialConvertState.games).toEqual([]);
    expect(initialConvertState.selected).toEqual([]);
  });

  it('can reach all eight states via the dev switcher', () => {
    for (const status of ALL_STATUSES) {
      const next = convertReducer(initialConvertState, { type: 'dev-goto', status });
      expect(next.status).toBe(status);
    }
  });

  describe('picking a directory', () => {
    it('enters scanning with the directory it was handed', () => {
      const state = scanning();

      expect(state.status).toBe('scanning');
      expect(state.directory).toBe(PICKED);
    });

    it('starts scanning from a clean slate when re-picking after a scan', () => {
      const state = convertReducer(scanned(), {
        type: 'pick-directory',
        directory: PICKED,
        scanId: 2,
      });

      expect(state.status).toBe('scanning');
      expect(state.directory).toBe(PICKED);
      // A stale list must not show through the scanning state.
      expect(state.games).toEqual([]);
      expect(state.selected).toEqual([]);
      expect(state.summary).toBeNull();
      expect(state.discovered).toBe(0);
    });

    it('returns to no-directory when the grant fails, keeping no directory', () => {
      const state = convertReducer(initialConvertState, {
        type: 'pick-directory-failed',
      });

      expect(state.status).toBe('no-directory');
      expect(state.directory).toBeNull();
    });

    // A failed grant must not leave a half-populated card behind.
    it('drops any previous scan result when the grant fails', () => {
      const state = convertReducer(scanned(), { type: 'pick-directory-failed' });

      expect(state.status).toBe('no-directory');
      expect(state.directory).toBeNull();
      expect(state.games).toEqual([]);
      expect(state.selected).toEqual([]);
      expect(state.summary).toBeNull();
    });
  });

  describe('scan progress', () => {
    it('tracks the discovered count while scanning', () => {
      const state = scanning();

      const progressed = convertReducer(state, {
        type: 'scan-progressed',
        scanId: state.scanId,
        discovered: 3,
      });

      expect(progressed.discovered).toBe(3);
      expect(progressed.status).toBe('scanning');
    });

    it('ignores progress from a scan that is no longer current', () => {
      const state = scanning();

      const progressed = convertReducer(state, {
        type: 'scan-progressed',
        scanId: state.scanId - 1,
        discovered: 99,
      });

      expect(progressed.discovered).toBe(0);
    });
  });

  // A scan cannot be recalled once started, so stale results must be dropped
  // rather than rendered. These pin that down for every scan outcome.
  describe('stale scan results', () => {
    it('discards a result whose id does not match the current scan', () => {
      const state = scanning();

      const next = convertReducer(state, {
        type: 'scan-succeeded',
        scanId: state.scanId - 1,
        games: GAMES,
      });

      expect(next.status).toBe('scanning');
      expect(next.games).toEqual([]);
    });

    it('discards a result that arrives after the scan was cancelled', () => {
      const state = scanning();
      const cancelled = convertReducer(state, { type: 'cancel-scan' });

      const late = convertReducer(cancelled, {
        type: 'scan-succeeded',
        scanId: state.scanId,
        games: GAMES,
      });

      expect(late.status).toBe('no-directory');
      expect(late.games).toEqual([]);
      expect(late.selected).toEqual([]);
    });

    it('discards a result from the scan a newer pick superseded', () => {
      const first = scanning();
      const second = convertReducer(first, {
        type: 'pick-directory',
        directory: PICKED,
        scanId: first.scanId + 1,
      });

      const late = convertReducer(second, {
        type: 'scan-succeeded',
        scanId: first.scanId,
        games: GAMES,
      });

      expect(late.status).toBe('scanning');
      expect(late.games).toEqual([]);
    });

    it.each(['scan-failed', 'permission-revoked', 'scan-found-nothing'] as const)(
      'discards a stale %s',
      (type) => {
        const state = scanning();
        const cancelled = convertReducer(state, { type: 'cancel-scan' });

        const late = convertReducer(cancelled, { type, scanId: state.scanId });

        expect(late.status).toBe('no-directory');
      },
    );
  });

  describe('cancelling a scan', () => {
    it('returns to no-directory without a partial list', () => {
      const state = convertReducer(scanning(), { type: 'cancel-scan' });

      expect(state.status).toBe('no-directory');
      expect(state.games).toEqual([]);
      expect(state.directory).toBeNull();
      expect(state.discovered).toBe(0);
    });

    it('does nothing when no scan is running', () => {
      const state = scanned();

      expect(convertReducer(state, { type: 'cancel-scan' })).toBe(state);
    });
  });

  describe('default selection', () => {
    it('ticks only adaptable games', () => {
      const state = scanned();
      const adaptable = GAMES.filter((g) => g.status === 'adaptable');
      expect(state.selected).toHaveLength(adaptable.length);
      expect(state.selected.sort()).toEqual(adaptable.map((g) => g.id).sort());
    });

    it('does not tick alreadyAdapted, needsAttention or notAdaptable', () => {
      const state = scanned();
      for (const game of GAMES) {
        if (game.status !== 'adaptable') {
          expect(state.selected).not.toContain(game.id);
        }
      }
    });
  });

  describe('toggle-all', () => {
    /**
     * A finished scan already has every adaptable row ticked, so the *first*
     * "select all" tap is a deselect. These start from an empty selection when
     * they need to exercise the selecting direction.
     */
    function nothingSelected(): ConvertState {
      return { ...scanned(), selected: [] };
    }

    it('never selects notAdaptable games', () => {
      const state = convertReducer(nothingSelected(), { type: 'toggle-all' });
      const blocked = GAMES.filter((g) => g.status === 'notAdaptable');
      expect(blocked.length).toBeGreaterThan(0);
      for (const game of blocked) {
        expect(state.selected).not.toContain(game.id);
      }
    });

    // "Select all" is the bulk form of the default selection, not "tick
    // everything tickable": sweeping in alreadyAdapted / needsAttention rows
    // would re-mark games the user never singled out.
    it('selects only adaptable games', () => {
      const state = convertReducer(nothingSelected(), { type: 'toggle-all' });
      const adaptable = GAMES.filter((g) => g.status === 'adaptable');

      expect(state.selected.sort()).toEqual(adaptable.map((g) => g.id).sort());
    });

    it.each(['alreadyAdapted', 'needsAttention'] as const)(
      'does not select %s games',
      (status) => {
        const state = convertReducer(nothingSelected(), { type: 'toggle-all' });
        const game = GAMES.find((g) => g.status === status)!;

        expect(state.selected).not.toContain(game.id);
      },
    );

    // The default selection is already the full adaptable set, so one tap clears.
    it('clears the selection when every adaptable game is already selected', () => {
      const cleared = convertReducer(scanned(), { type: 'toggle-all' });

      expect(cleared.selected).toEqual([]);
    });

    // Deselecting all must not undo a deliberate per-row choice.
    it('keeps a hand-picked row when clearing the adaptable ones', () => {
      const manual = GAMES.find((g) => g.status === 'needsAttention')!;
      const withManual = convertReducer(scanned(), {
        type: 'toggle-game',
        id: manual.id,
      });

      const cleared = convertReducer(withManual, { type: 'toggle-all' });

      expect(cleared.selected).toEqual([manual.id]);
    });

    // A hand-picked row is already selected, so selecting all must union rather
    // than replace.
    it('keeps a hand-picked row when selecting the adaptable ones', () => {
      const manual = GAMES.find((g) => g.status === 'alreadyAdapted')!;
      const onlyManual: ConvertState = { ...scanned(), selected: [manual.id] };

      const state = convertReducer(onlyManual, { type: 'toggle-all' });

      expect(state.selected).toContain(manual.id);
      for (const game of GAMES.filter((g) => g.status === 'adaptable')) {
        expect(state.selected).toContain(game.id);
      }
    });
  });

  describe('toggle-game', () => {
    it('ignores notAdaptable games', () => {
      const blocked = GAMES.find((g) => g.status === 'notAdaptable')!;
      const state = convertReducer(scanned(), { type: 'toggle-game', id: blocked.id });
      expect(state.selected).not.toContain(blocked.id);
    });

    it('unticks an already ticked game', () => {
      const target = GAMES.find((g) => g.status === 'adaptable')!;
      const state = convertReducer(scanned(), { type: 'toggle-game', id: target.id });
      expect(state.selected).not.toContain(target.id);
    });

    it('ticks a selectable game that was not ticked by default', () => {
      const target = GAMES.find((g) => g.status === 'needsAttention')!;
      const state = convertReducer(scanned(), { type: 'toggle-game', id: target.id });
      expect(state.selected).toContain(target.id);
    });
  });

  describe('failure states', () => {
    it.each(['scan-failed', 'permission-revoked'] as const)(
      '%s drops the previous game list',
      (type) => {
        // Reached from a running scan, which is the only way these occur.
        const state = scanning();
        const next = convertReducer(state, { type, scanId: state.scanId });

        expect(next.status).toBe(type);
        expect(next.games).toEqual([]);
        expect(next.selected).toEqual([]);
      },
    );

    it('scanned-empty drops the previous game list', () => {
      const state = scanning();
      const next = convertReducer(state, {
        type: 'scan-found-nothing',
        scanId: state.scanId,
      });

      expect(next.status).toBe('scanned-empty');
      expect(next.games).toEqual([]);
      expect(next.selected).toEqual([]);
    });
  });

  describe('conversion', () => {
    it('refuses to start with an empty selection', () => {
      const empty = { ...scanned(), selected: [] };
      const state = convertReducer(empty, { type: 'start-conversion' });
      expect(state.status).toBe('scanned-has-adaptable');
    });

    it('starts when at least one game is selected', () => {
      const state = convertReducer(scanned(), { type: 'start-conversion' });
      expect(state.status).toBe('converting');
      expect(state.processed).toBe(0);
    });

    it('summarises per-status counts rather than an overall failure', () => {
      // Hand-pick the non-adaptable rows too, so the summary has something to
      // report in every bucket — "select all" alone only covers adaptable ones.
      const withOthers = GAMES.filter((g) => g.status !== 'notAdaptable').reduce(
        (acc, game) => convertReducer(acc, { type: 'toggle-game', id: game.id }),
        scanned(),
      );
      const start = convertReducer(withOthers, { type: 'toggle-all' });
      const converting = convertReducer(start, { type: 'start-conversion' });
      const done = convertReducer(converting, { type: 'conversion-finished' });

      expect(done.status).toBe('converted');
      expect(done.summary).not.toBeNull();
      const total =
        done.summary!.success +
        done.summary!.alreadyAdapted +
        done.summary!.skipped +
        done.summary!.failed;
      expect(total).toBe(done.selected.length);
      // A partial failure must not read as a total failure.
      expect(done.summary!.success).toBeGreaterThan(0);
    });
  });
});
