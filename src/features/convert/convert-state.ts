import {
  FIXTURE_DIRECTORY,
  FIXTURE_GAMES,
  isDefaultSelected,
  isSelectable,
  type FixtureGame,
} from '@/fixtures/games';

/**
 * The eight states the game-directory card can be in. One card, one state —
 * never split into separate directory / result screens.
 */
export type ConvertStatus =
  | 'no-directory'
  | 'scanning'
  | 'scanned-has-adaptable'
  | 'scanned-empty'
  | 'scan-failed'
  | 'permission-revoked'
  | 'converting'
  | 'converted';

export type ConvertState = {
  status: ConvertStatus;
  directory: string | null;
  games: FixtureGame[];
  /** Ids of games ticked for conversion. */
  selected: string[];
  /** Games processed so far, while `status === 'converting'`. */
  processed: number;
  summary: { success: number; alreadyAdapted: number; skipped: number; failed: number } | null;
};

export type ConvertEvent =
  | { type: 'pick-directory' }
  | { type: 'scan-succeeded'; games: FixtureGame[] }
  | { type: 'scan-found-nothing' }
  | { type: 'scan-failed' }
  | { type: 'permission-revoked' }
  | { type: 'toggle-game'; id: string }
  | { type: 'toggle-all' }
  | { type: 'start-conversion' }
  | { type: 'conversion-progressed'; processed: number }
  | { type: 'conversion-finished' }
  | { type: 'reset' }
  // Dev-only shortcut for the state switcher.
  | { type: 'dev-goto'; status: ConvertStatus };

export const initialConvertState: ConvertState = {
  status: 'no-directory',
  directory: null,
  games: [],
  selected: [],
  processed: 0,
  summary: null,
};

function defaultSelection(games: FixtureGame[]): string[] {
  return games.filter(isDefaultSelected).map((game) => game.id);
}

function summarise(games: FixtureGame[], selected: string[]) {
  const chosen = games.filter((game) => selected.includes(game.id));
  return {
    success: chosen.filter((g) => g.status === 'adaptable').length,
    alreadyAdapted: chosen.filter((g) => g.status === 'alreadyAdapted').length,
    skipped: chosen.filter((g) => g.status === 'needsAttention').length,
    failed: chosen.filter((g) => g.status === 'notAdaptable').length,
  };
}

/** Fake state used by the dev-only state switcher. */
function devState(status: ConvertStatus): ConvertState {
  const scanned = {
    ...initialConvertState,
    status,
    directory: FIXTURE_DIRECTORY,
    games: FIXTURE_GAMES,
    selected: defaultSelection(FIXTURE_GAMES),
  };

  switch (status) {
    case 'no-directory':
      return initialConvertState;
    case 'scanning':
      return { ...initialConvertState, status, directory: FIXTURE_DIRECTORY };
    case 'scanned-empty':
      return { ...initialConvertState, status, directory: FIXTURE_DIRECTORY };
    case 'scan-failed':
    case 'permission-revoked':
      // Must not keep the previous list around.
      return { ...initialConvertState, status, directory: FIXTURE_DIRECTORY };
    case 'converting':
      return { ...scanned, processed: 2 };
    case 'converted':
      return {
        ...scanned,
        processed: scanned.selected.length,
        summary: summarise(FIXTURE_GAMES, scanned.selected),
      };
    default:
      return scanned;
  }
}

export function convertReducer(state: ConvertState, event: ConvertEvent): ConvertState {
  switch (event.type) {
    case 'pick-directory':
      return { ...initialConvertState, status: 'scanning', directory: FIXTURE_DIRECTORY };

    case 'scan-succeeded':
      return {
        ...state,
        status: 'scanned-has-adaptable',
        games: event.games,
        selected: defaultSelection(event.games),
        processed: 0,
        summary: null,
      };

    case 'scan-found-nothing':
      return { ...state, status: 'scanned-empty', games: [], selected: [] };

    case 'scan-failed':
      return { ...state, status: 'scan-failed', games: [], selected: [] };

    case 'permission-revoked':
      return { ...state, status: 'permission-revoked', games: [], selected: [] };

    case 'toggle-game': {
      const game = state.games.find((g) => g.id === event.id);
      // Games that cannot be adapted are never selectable.
      if (!game || !isSelectable(game)) {
        return state;
      }
      const selected = state.selected.includes(event.id)
        ? state.selected.filter((id) => id !== event.id)
        : [...state.selected, event.id];
      return { ...state, selected };
    }

    case 'toggle-all': {
      const selectable = state.games.filter(isSelectable).map((g) => g.id);
      const allSelected = selectable.length > 0 && selectable.length === state.selected.length;
      // "Select all" never ticks `notAdaptable` rows.
      return { ...state, selected: allSelected ? [] : selectable };
    }

    case 'start-conversion':
      if (state.selected.length === 0) {
        return state;
      }
      return { ...state, status: 'converting', processed: 0, summary: null };

    case 'conversion-progressed':
      return { ...state, processed: event.processed };

    case 'conversion-finished':
      return {
        ...state,
        status: 'converted',
        processed: state.selected.length,
        summary: summarise(state.games, state.selected),
      };

    case 'reset':
      return initialConvertState;

    case 'dev-goto':
      return devState(event.status);

    default:
      return state;
  }
}
