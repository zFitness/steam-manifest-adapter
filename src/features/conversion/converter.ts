import { type FsEntry, type ReadOnlyFs } from '@/features/library-scan/fs-adapter';

import { convertGame, isBatchFatal, type LocatedDirectory } from './convert-game';
import type { WritableFs } from './fs-writer';
import type {
  ConversionItemResult,
  ConversionRunResult,
  ConvertibleGame,
} from './types';

/**
 * Runs a batch of games through `convertGame`, one at a time.
 *
 * Sequential by design. Concurrent writes into one SAF tree are unverified, the
 * progress figure the UI shows has to mean "games actually finished", and error
 * isolation falls out for free when nothing overlaps.
 *
 * Two things are batch-level rather than per-game:
 *
 * - `common/` is listed at most once and its entries reused, so a large library
 *   does not re-enumerate it per game.
 * - A lapsed grant stops the run. It is not "this game failed" but "the whole
 *   tree is gone", and continuing would just produce a row of identical
 *   failures. Every other error stays confined to the game that hit it.
 */

const COMMON_DIR = 'common';

export type ConvertOptions = {
  fs: ReadOnlyFs;
  writer: WritableFs;
  /** The granted directory — the `steamapps` folder itself. */
  rootUri: string;
  /** The games the user ticked, in the order they should be processed. */
  games: ConvertibleGame[];
  /** Called after each game finishes, with the running count of processed games. */
  onProgress?: (processed: number) => void;
};

export async function convertGames(options: ConvertOptions): Promise<ConversionRunResult> {
  const { fs, writer, rootUri, games, onProgress } = options;

  // Listed lazily and only once: a batch of entirely unadaptable rows never
  // needs it at all.
  let commonEntries: FsEntry[] | null | undefined;

  async function loadCommonEntries(): Promise<FsEntry[] | null> {
    if (commonEntries !== undefined) {
      return commonEntries;
    }
    try {
      const rootEntries = await fs.listDirectory(rootUri);
      const commonEntry = rootEntries.find(
        (entry) => entry.isDirectory && entry.name.toLowerCase() === COMMON_DIR,
      );
      if (commonEntry === undefined) {
        commonEntries = null;
        return null;
      }
      commonEntries = await fs.listDirectory(commonEntry.uri);
      return commonEntries;
    } catch (error) {
      // A lapsed grant is the whole tree going away, so it must reach the batch
      // loop rather than being recorded as one game's problem.
      if (isBatchFatal(error)) {
        throw error;
      }
      // Anything else is remembered as "no `common/`", which keeps the promise
      // that it is listed at most once and lands every game on "folder not
      // found" — the same way the scanner treats an unreadable `common/`.
      commonEntries = null;
      return null;
    }
  }

  /**
   * Finds a game's folder under `common/`.
   *
   * Located case-insensitively because shared storage on Android is
   * case-insensitive, so an exact-name lookup would prove nothing about
   * existence. The folder's *real* name comes back with it, since that is what
   * identifies the folder for deduplication.
   */
  async function locate(installDir: string): Promise<LocatedDirectory | null> {
    const entries = await loadCommonEntries();
    if (entries === null) {
      return null;
    }
    const wanted = installDir.toLowerCase();
    const match = entries.find(
      (entry) => entry.isDirectory && entry.name.toLowerCase() === wanted,
    );
    if (match === undefined) {
      return null;
    }
    return { uri: match.uri, actualName: match.name };
  }

  /**
   * Folders this run has already marked, keyed by real on-disk name.
   *
   * Several manifests can legitimately share one folder — Steam's shared
   * redistributables directory is referenced by multiple appids, and the
   * maintainer's own library has two manifests pointing at `Steamworks Shared`.
   * The first to get there earns `success`; the rest are `alreadyAdapted`.
   *
   * Keyed on the real folder name rather than the manifests' `installdir`, since
   * two manifests may spell that differently yet resolve to the same folder.
   *
   * This is only a shortcut, not the thing that makes the behaviour correct:
   * `convertGame` re-lists the folder and would find the marker anyway. It saves
   * a round trip and makes "who got there first" explainable. Because only
   * successes are recorded, a first manifest that *failed* leaves the set clean,
   * so the next one is judged on the folder's true state — as the spec requires.
   */
  const markedDirectories = new Set<string>();

  const results: ConversionItemResult[] = [];

  for (const game of games) {
    let result: ConversionItemResult;

    try {
      const report = await convertGame({
        fs,
        writer,
        game,
        locate,
        isDirectoryMarked: (actualName) => markedDirectories.has(actualName),
      });
      result = report.result;
      // Only successes are recorded. A first manifest that failed leaves the set
      // clean, so a later one sharing the folder is judged on the folder's real
      // state rather than inheriting a verdict.
      if (report.result.outcome === 'success' && report.directoryName !== null) {
        markedDirectories.add(report.directoryName);
      }
    } catch (error) {
      if (isBatchFatal(error)) {
        // Stop here. Games not yet started get no entry, because nothing was
        // attempted for them; what already finished is kept and reported.
        results.push({
          gameId: game.id,
          appId: game.appId,
          name: game.name,
          outcome: 'failed',
          reason: 'permission-revoked',
        });
        onProgress?.(results.length);
        return { results, abortedBy: 'permission-revoked' };
      }
      // `convertGame` reports its own failures; anything escaping is unexpected.
      result = {
        gameId: game.id,
        appId: game.appId,
        name: game.name,
        outcome: 'failed',
        reason: 'io-error',
      };
    }

    results.push(result);
    // One dispatch per finished game, so the count the UI renders is the number
    // of games whose disk operations are actually done.
    onProgress?.(results.length);
  }

  return { results };
}
