import {
  isDefaultSelected,
  isSelectable,
  type ScannedGame,
} from '@/features/library-scan/types';

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
  games: ScannedGame[];
  /** Ids of games ticked for conversion. */
  selected: string[];
  /** Manifests found so far, while `status === 'scanning'`. */
  discovered: number;
  /** Games processed so far, while `status === 'converting'`. */
  processed: number;
  summary: { success: number; alreadyAdapted: number; skipped: number; failed: number } | null;
  /**
   * Identifies the scan whose results this state will accept.
   *
   * A scan is asynchronous and cannot be called back: cancelling one, or picking
   * another directory while one runs, leaves the old scan still in flight. Every
   * scan event carries the id it was started with, and the reducer drops any
   * that no longer matches — that is what keeps a cancelled scan's late results
   * from reappearing on screen.
   */
  scanId: number;
};

export type ConvertEvent =
  /**
   * Starts a scan. The caller supplies the id so it can tag that scan's own
   * events; the reducer never invents one, which keeps "which scan is current"
   * decidable from the outside.
   */
  | { type: 'pick-directory'; directory: string; scanId: number }
  | { type: 'pick-directory-failed' }
  | { type: 'scan-progressed'; scanId: number; discovered: number }
  | { type: 'scan-succeeded'; scanId: number; games: ScannedGame[] }
  | { type: 'scan-found-nothing'; scanId: number }
  | { type: 'scan-failed'; scanId: number }
  | { type: 'permission-revoked'; scanId: number }
  /** Abandons the running scan: its id is retired, so its result is ignored. */
  | { type: 'cancel-scan' }
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
  discovered: 0,
  processed: 0,
  summary: null,
  scanId: 0,
};

function defaultSelection(games: ScannedGame[]): string[] {
  return games.filter(isDefaultSelected).map((game) => game.id);
}

function summarise(games: ScannedGame[], selected: string[]) {
  const chosen = games.filter((game) => selected.includes(game.id));
  return {
    success: chosen.filter((g) => g.status === 'adaptable').length,
    alreadyAdapted: chosen.filter((g) => g.status === 'alreadyAdapted').length,
    skipped: chosen.filter((g) => g.status === 'needsAttention').length,
    failed: chosen.filter((g) => g.status === 'notAdaptable').length,
  };
}

/**
 * A small sample used only by the dev-only state switcher, so `converting` and
 * `converted` can still be inspected before conversion itself is real.
 *
 * Deliberately typed as `ScannedGame`, not a separate fixture shape: there is no
 * parallel fake data table to drift out of sync with the real scanner output.
 * One row per status, which is all the switcher needs.
 */
const DEV_SAMPLE_DIRECTORY = 'steamapps';

const DEV_SAMPLE_GAMES: ScannedGame[] = [
  {
    id: 'appmanifest_1465360.acf',
    appId: '1465360',
    name: 'SnowRunner',
    installDir: 'SnowRunner',
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

/** Fake state used by the dev-only state switcher. */
function devState(status: ConvertStatus): ConvertState {
  const scanned = {
    ...initialConvertState,
    status,
    directory: DEV_SAMPLE_DIRECTORY,
    games: DEV_SAMPLE_GAMES,
    selected: defaultSelection(DEV_SAMPLE_GAMES),
  };

  switch (status) {
    case 'no-directory':
      return initialConvertState;
    case 'scanning':
      return {
        ...initialConvertState,
        status,
        directory: DEV_SAMPLE_DIRECTORY,
        discovered: 3,
      };
    case 'scanned-empty':
      return { ...initialConvertState, status, directory: DEV_SAMPLE_DIRECTORY };
    case 'scan-failed':
    case 'permission-revoked':
      // Must not keep the previous list around.
      return { ...initialConvertState, status, directory: DEV_SAMPLE_DIRECTORY };
    case 'converting':
      return { ...scanned, processed: 2 };
    case 'converted':
      return {
        ...scanned,
        processed: scanned.selected.length,
        summary: summarise(DEV_SAMPLE_GAMES, scanned.selected),
      };
    default:
      return scanned;
  }
}

/**
 * Whether a scan event still belongs to the scan the UI is waiting for.
 *
 * Anything else is the tail end of a cancelled or superseded scan and must not
 * touch the screen.
 */
function isCurrentScan(state: ConvertState, event: { scanId: number }): boolean {
  return state.scanId === event.scanId && state.status === 'scanning';
}

export function convertReducer(state: ConvertState, event: ConvertEvent): ConvertState {
  switch (event.type) {
    case 'pick-directory':
      // Adopting the new id retires whatever scan may still be running.
      return {
        ...initialConvertState,
        status: 'scanning',
        directory: event.directory,
        scanId: event.scanId,
      };

    case 'pick-directory-failed':
      return { ...initialConvertState, status: 'no-directory', scanId: state.scanId };

    case 'cancel-scan':
      if (state.status !== 'scanning') {
        return state;
      }
      // Back to square one. Moving off the running scan's id is what makes its
      // eventual result get discarded rather than rendered.
      return {
        ...initialConvertState,
        status: 'no-directory',
        scanId: state.scanId + 1,
      };

    case 'scan-progressed':
      if (!isCurrentScan(state, event)) {
        return state;
      }
      return { ...state, discovered: event.discovered };

    case 'scan-succeeded':
      if (!isCurrentScan(state, event)) {
        return state;
      }
      return {
        ...state,
        status: 'scanned-has-adaptable',
        games: event.games,
        selected: defaultSelection(event.games),
        processed: 0,
        summary: null,
      };

    case 'scan-found-nothing':
      if (!isCurrentScan(state, event)) {
        return state;
      }
      return { ...state, status: 'scanned-empty', games: [], selected: [] };

    case 'scan-failed':
      if (!isCurrentScan(state, event)) {
        return state;
      }
      return { ...state, status: 'scan-failed', games: [], selected: [] };

    case 'permission-revoked':
      if (!isCurrentScan(state, event)) {
        return state;
      }
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
      // "Select all" is the bulk entry point for the *default* selection, so it
      // only ever covers `adaptable` rows. Ticking an `alreadyAdapted` or
      // `needsAttention` row stays a deliberate, per-row decision — sweeping
      // them in would silently re-mark games the user never singled out.
      const adaptable = state.games.filter(isDefaultSelected).map((g) => g.id);
      const allSelected =
        adaptable.length > 0 && adaptable.every((id) => state.selected.includes(id));

      if (allSelected) {
        // Clearing only lets go of the adaptable rows; anything the user picked
        // by hand survives.
        return {
          ...state,
          selected: state.selected.filter((id) => !adaptable.includes(id)),
        };
      }
      // Union, so hand-picked rows are not dropped on the way in.
      return {
        ...state,
        selected: [...new Set([...state.selected, ...adaptable])],
      };
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
      // Keeps the id counter moving so a scan in flight cannot resurface.
      return { ...initialConvertState, scanId: state.scanId + 1 };

    case 'dev-goto':
      return devState(event.status);

    default:
      return state;
  }
}
