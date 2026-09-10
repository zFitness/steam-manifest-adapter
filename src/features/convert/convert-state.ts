import type {
  ConversionAbort,
  ConversionItemResult,
} from '@/features/conversion/types';
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
  /**
   * How many games the running batch was given.
   *
   * Recorded when the batch starts rather than read from `selected`: the reducer
   * unticks successful rows when it finishes, so a progress figure derived from
   * the selection would have a denominator that changes underneath it.
   */
  batchTotal: number;
  summary: { success: number; alreadyAdapted: number; skipped: number; failed: number } | null;
  /**
   * Per-game outcomes from the last batch, in the order they were processed.
   *
   * Kept alongside `summary` rather than derived from `games`: the row statuses
   * come from the scan and cannot express *why* a write failed or whether the
   * folder was left untouched. This is the only record of that, and what the
   * results screen reads.
   */
  results: ConversionItemResult[];
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
  /**
   * Reports what the batch actually did. Carries the outcomes rather than
   * letting the reducer guess: before this, the summary was inferred from each
   * row's *scan* status, which describes what was attempted, not what happened.
   */
  | { type: 'conversion-finished'; results: ConversionItemResult[]; abortedBy?: ConversionAbort }
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
  batchTotal: 0,
  summary: null,
  results: [],
  scanId: 0,
};

/**
 * Counts the four outcomes actually reported by the batch.
 *
 * Counting `results` and not the selection: a batch can stop early, in which case
 * fewer games have outcomes than were ticked, and the totals must reflect what
 * was really done.
 */
function summarise(results: ConversionItemResult[]) {
  return {
    success: results.filter((r) => r.outcome === 'success').length,
    alreadyAdapted: results.filter((r) => r.outcome === 'alreadyAdapted').length,
    skipped: results.filter((r) => r.outcome === 'skipped').length,
    failed: results.filter((r) => r.outcome === 'failed').length,
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

/**
 * Outcomes matching what a batch over `DEV_SAMPLE_GAMES`'s default selection
 * would report. Only `adaptable` rows are selected by default, so this is one
 * success — enough for the switcher to show a populated summary.
 */
const DEV_SAMPLE_RESULTS: ConversionItemResult[] = [
  {
    gameId: 'appmanifest_1465360.acf',
    appId: '1465360',
    name: 'SnowRunner',
    outcome: 'success',
  },
];

/** Fake state used by the dev-only state switcher. */
function devState(status: ConvertStatus): ConvertState {
  const scanned = {
    ...initialConvertState,
    status,
    directory: DEV_SAMPLE_DIRECTORY,
    games: DEV_SAMPLE_GAMES,
    selected: DEV_SAMPLE_GAMES.filter(isDefaultSelected).map((game) => game.id),
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
      return { ...scanned, processed: 2, batchTotal: scanned.selected.length };
    case 'converted':
      return {
        ...scanned,
        processed: DEV_SAMPLE_RESULTS.length,
        summary: summarise(DEV_SAMPLE_RESULTS),
        results: DEV_SAMPLE_RESULTS,
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
        // Nothing is pre-selected: adapting writes to game folders, so which
        // games get touched must be a deliberate pick, not a default.
        selected: [],
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
      // Mid-batch the list is under a loading overlay and must not change:
      // a row ticked while the writer runs would miss the batch entirely.
      if (state.status === 'converting') {
        return state;
      }
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
      if (state.status === 'converting') {
        return state;
      }
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
      return {
        ...state,
        status: 'converting',
        processed: 0,
        batchTotal: state.selected.length,
        summary: null,
      };

    case 'conversion-progressed':
      return { ...state, processed: event.processed };

    case 'conversion-finished': {
      const { results } = event;
      const succeeded = new Set(
        results.filter((r) => r.outcome === 'success').map((r) => r.gameId),
      );

      // Rows that were written become `alreadyAdapted` in place, without a
      // rescan: the app just did the thing that makes them so, and forcing a
      // rescan to see it would re-read the whole tree to learn what is already
      // known. Rows outside this batch are left exactly as they were.
      const games = state.games.map((game) =>
        succeeded.has(game.id)
          ? ({ ...game, status: 'alreadyAdapted', reason: 'already-marked' } as ScannedGame)
          : game,
      );

      // Successful rows lose their tick — the work is done, and leaving them
      // ticked would invite re-running it. Failures and skips stay ticked so a
      // retry is one tap, which is the whole point of keeping them selected.
      const selected = state.selected.filter((id) => !succeeded.has(id));

      if (event.abortedBy === 'permission-revoked') {
        // Narrows the usual `permission-revoked` handling, which clears the list
        // on the grounds that nothing about it can be trusted. Here part of the
        // batch already completed, and that record is the user's only evidence of
        // what landed on disk, so `games` / `summary` / `results` are kept while
        // the card still asks them to re-pick the directory. See the app-shell
        // delta.
        return {
          ...state,
          status: 'permission-revoked',
          games,
          selected,
          processed: results.length,
          summary: summarise(results),
          results,
        };
      }

      return {
        ...state,
        status: 'converted',
        games,
        selected,
        // The real count of games that finished, which for an ordinary run is
        // every game handed in.
        processed: results.length,
        summary: summarise(results),
        results,
      };
    }

    case 'reset':
      // Keeps the id counter moving so a scan in flight cannot resurface.
      return { ...initialConvertState, scanId: state.scanId + 1 };

    case 'dev-goto':
      return devState(event.status);

    default:
      return state;
  }
}
