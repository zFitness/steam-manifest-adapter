import { FIXTURE_GAMES } from '@/fixtures/games';

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

function scanned(): ConvertState {
  return convertReducer(initialConvertState, {
    type: 'scan-succeeded',
    games: FIXTURE_GAMES,
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

  describe('default selection', () => {
    it('ticks only adaptable games', () => {
      const state = scanned();
      const adaptable = FIXTURE_GAMES.filter((g) => g.status === 'adaptable');
      expect(state.selected).toHaveLength(adaptable.length);
      expect(state.selected.sort()).toEqual(adaptable.map((g) => g.id).sort());
    });

    it('does not tick alreadyAdapted, needsAttention or notAdaptable', () => {
      const state = scanned();
      for (const game of FIXTURE_GAMES) {
        if (game.status !== 'adaptable') {
          expect(state.selected).not.toContain(game.id);
        }
      }
    });
  });

  describe('toggle-all', () => {
    it('never selects notAdaptable games', () => {
      const state = convertReducer(scanned(), { type: 'toggle-all' });
      const blocked = FIXTURE_GAMES.filter((g) => g.status === 'notAdaptable');
      expect(blocked.length).toBeGreaterThan(0);
      for (const game of blocked) {
        expect(state.selected).not.toContain(game.id);
      }
    });

    it('selects every selectable game', () => {
      const state = convertReducer(scanned(), { type: 'toggle-all' });
      const selectable = FIXTURE_GAMES.filter((g) => g.status !== 'notAdaptable');
      expect(state.selected).toHaveLength(selectable.length);
    });

    it('clears the selection when everything selectable is already selected', () => {
      const all = convertReducer(scanned(), { type: 'toggle-all' });
      const cleared = convertReducer(all, { type: 'toggle-all' });
      expect(cleared.selected).toEqual([]);
    });
  });

  describe('toggle-game', () => {
    it('ignores notAdaptable games', () => {
      const blocked = FIXTURE_GAMES.find((g) => g.status === 'notAdaptable')!;
      const state = convertReducer(scanned(), { type: 'toggle-game', id: blocked.id });
      expect(state.selected).not.toContain(blocked.id);
    });

    it('unticks an already ticked game', () => {
      const target = FIXTURE_GAMES.find((g) => g.status === 'adaptable')!;
      const state = convertReducer(scanned(), { type: 'toggle-game', id: target.id });
      expect(state.selected).not.toContain(target.id);
    });

    it('ticks a selectable game that was not ticked by default', () => {
      const target = FIXTURE_GAMES.find((g) => g.status === 'needsAttention')!;
      const state = convertReducer(scanned(), { type: 'toggle-game', id: target.id });
      expect(state.selected).toContain(target.id);
    });
  });

  describe('failure states', () => {
    it.each(['scan-failed', 'permission-revoked'] as const)(
      '%s drops the previous game list',
      (type) => {
        const state = convertReducer(scanned(), { type });
        expect(state.games).toEqual([]);
        expect(state.selected).toEqual([]);
      },
    );

    it('scanned-empty drops the previous game list', () => {
      const state = convertReducer(scanned(), { type: 'scan-found-nothing' });
      expect(state.games).toEqual([]);
      expect(state.selected).toEqual([]);
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
      const start = convertReducer(scanned(), { type: 'toggle-all' });
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
