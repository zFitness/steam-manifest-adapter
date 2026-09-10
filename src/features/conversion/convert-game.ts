import { FsError, type FsEntry, type ReadOnlyFs } from '@/features/library-scan/fs-adapter';
import { isSafeInstallDir } from '@/features/library-scan/install-dir';
import { isSelectable } from '@/features/library-scan/types';

import type { WritableFs } from './fs-writer';
import {
  MARKER_COMPLETE,
  MARKER_IN_PROGRESS,
  type ConversionItemResult,
  type ConversionReason,
  type ConvertibleGame,
} from './types';

/**
 * Adapts one game: clear a stale `.download_in_progress`, create
 * `.download_complete`, and nothing else.
 *
 * Pure orchestration — every disk access goes through the injected `ReadOnlyFs` /
 * `WritableFs`, so the branches that matter most here (deleted but not created,
 * created under the wrong name, rollback itself failing) are all reachable
 * without a device.
 *
 * The order is delete-then-create, matching the maintainer's own script. It needs
 * rollback either way, so the tiebreaker is which intermediate state survives a
 * killed process better: with this order it is "neither marker present", which is
 * indistinguishable from a game that never finished downloading. The reverse
 * order would leave both markers present, which reads as a contradiction.
 *
 * Success means the marker was created *and* read back under exactly the
 * requested name. A provider is free to rename what it creates, and the consumer
 * matches filenames exactly, so trusting a call that merely did not throw would
 * produce the worst possible outcome: a green result and nothing recognisable on
 * disk.
 */

/** What the executor needs to know about a located game folder. */
export type LocatedDirectory = {
  /** Handle for the folder, obtained from listing `common/`. */
  uri: string;
  /** Its real on-disk name, used as the batch-level dedupe key. */
  actualName: string;
};

export type ConvertGameOptions = {
  fs: ReadOnlyFs;
  writer: WritableFs;
  game: ConvertibleGame;
  /**
   * Locates the game's folder *now*, rather than reusing a handle from the scan.
   *
   * Time passes between scanning and confirming, so the folder may have been
   * moved or deleted. Re-locating turns that into an ordinary "not found" result
   * instead of a write against a stale handle, whose failure shape is unknown.
   * Resolves to `null` when nothing matches `installdir`.
   */
  locate: (installDir: string) => Promise<LocatedDirectory | null>;
  /**
   * Asks whether this run has already marked the folder just located.
   *
   * Several manifests can point at one folder, so this short-circuits to
   * "already adapted" before any file operation instead of creating a second
   * marker. Optional: without it the re-listing below reaches the same verdict,
   * just less directly.
   */
  isDirectoryMarked?: (actualName: string) => boolean;
};

/**
 * A game's outcome plus the folder it resolved to.
 *
 * The folder name rides along so the batch can record which folders it has
 * marked, without having to locate the same game a second time.
 */
export type ConvertGameReport = {
  result: ConversionItemResult;
  /** Real on-disk folder name, or `null` when nothing was located. */
  directoryName: string | null;
};

/** Maps a platform error onto the reason to report for this game. */
function reasonFor(error: unknown, fallback: ConversionReason): ConversionReason {
  if (!(error instanceof FsError)) {
    return fallback;
  }
  switch (error.kind) {
    case 'permission-revoked':
      return 'permission-revoked';
    case 'read-only':
      return 'read-only';
    case 'no-space':
      return 'no-space';
    case 'not-found':
      // The folder was there a moment ago; the volume went away under us.
      return 'storage-unavailable';
    case 'already-exists':
    case 'io-error':
      return fallback;
    default:
      return fallback;
  }
}

/** True when the batch must stop rather than continue to the next game. */
export function isBatchFatal(error: unknown): boolean {
  return error instanceof FsError && error.kind === 'permission-revoked';
}

function findMarker(entries: FsEntry[], name: string): FsEntry | undefined {
  // Compared verbatim: the consumer's lookup is case-sensitive, so a folder
  // holding `.DOWNLOAD_COMPLETE` does not already satisfy anything.
  return entries.find((entry) => !entry.isDirectory && entry.name === name);
}

export async function convertGame(
  options: ConvertGameOptions,
): Promise<ConvertGameReport> {
  const { fs, writer, game, locate, isDirectoryMarked } = options;

  const identity = { gameId: game.id, appId: game.appId, name: game.name };
  const report = (
    directoryName: string | null,
    outcome: ConversionItemResult['outcome'],
    reason?: ConversionReason,
    rolledBack?: ConversionItemResult['rolledBack'],
  ): ConvertGameReport => ({
    directoryName,
    result: {
      ...identity,
      outcome,
      ...(reason === undefined ? {} : { reason }),
      ...(rolledBack === undefined ? {} : { rolledBack }),
    },
  });

  // A row that was never adaptable is skipped outright. Checked here and not
  // only at the call site: this is the one code path that deletes files, and its
  // correctness must not depend on the caller having filtered properly.
  if (!isSelectable(game)) {
    return report(null, 'skipped', 'not-adaptable');
  }

  // Path boundary, re-verified independently of the scan's own classification.
  // A single folder name plus listing-only navigation is what makes escaping the
  // granted tree impossible; it costs nothing to confirm before writing.
  if (!isSafeInstallDir(game.installDir)) {
    return report(null, 'skipped', 'invalid-installdir');
  }

  let directory: LocatedDirectory | null;
  try {
    directory = await locate(game.installDir);
  } catch (error) {
    if (isBatchFatal(error)) {
      throw error;
    }
    return report(null, 'failed', reasonFor(error, 'io-error'));
  }
  if (directory === null) {
    // Nothing was attempted, so there is nothing to roll back.
    return report(null, 'failed', 'dir-missing');
  }

  const directoryName = directory.actualName;

  // Another manifest in this same run already marked this folder. Stop before
  // touching anything rather than creating a second marker.
  if (isDirectoryMarked?.(directoryName) === true) {
    return report(directoryName, 'alreadyAdapted', 'already-marked');
  }

  // Facts as they stand *before* anything is touched. Both drive the decision
  // below and tell the rollback what it would have to restore.
  let entries: FsEntry[];
  try {
    entries = await fs.listDirectory(directory.uri);
  } catch (error) {
    if (isBatchFatal(error)) {
      throw error;
    }
    return report(directoryName, 'failed', reasonFor(error, 'io-error'));
  }

  const existingComplete = findMarker(entries, MARKER_COMPLETE);
  const staleInProgress = findMarker(entries, MARKER_IN_PROGRESS);

  // Idempotent: the marker is already there, so the work is done. Creating it
  // again would only risk a duplicate under a provider-chosen name.
  if (existingComplete !== undefined) {
    return report(directoryName, 'alreadyAdapted', 'already-marked');
  }

  // Step 1 of 2. Nothing has changed yet if this fails.
  let deletedInProgress = false;
  if (staleInProgress !== undefined) {
    try {
      await writer.deleteFile(staleInProgress.uri);
      deletedInProgress = true;
    } catch (error) {
      if (isBatchFatal(error)) {
        throw error;
      }
      return report(directoryName, 'failed', reasonFor(error, 'delete-marker-failed'));
    }
  }

  /**
   * Puts this game back the way it was found, and reports whether that worked.
   *
   * Scoped to this game and this run only: markers other games already earned
   * stay untouched, which is what the spec requires.
   */
  const rollback = async (created: { uri: string } | null): Promise<'restored' | 'incomplete'> => {
    let complete = true;

    if (created !== null) {
      try {
        await writer.deleteFile(created.uri);
      } catch {
        complete = false;
      }
    }

    if (deletedInProgress) {
      try {
        const restored = await writer.createFileIn(directory.uri, MARKER_IN_PROGRESS);
        // Restoring it under some other name would leave a stray file behind
        // and still not be the marker that was removed.
        if (restored.landedName !== MARKER_IN_PROGRESS) {
          complete = false;
          try {
            await writer.deleteFile(restored.uri);
          } catch {
            // Nothing further to try; already reported as incomplete.
          }
        }
      } catch {
        complete = false;
      }
    }

    return complete ? 'restored' : 'incomplete';
  };

  // Step 2 of 2.
  let created: { uri: string; landedName: string };
  try {
    created = await writer.createFileIn(directory.uri, MARKER_COMPLETE);
  } catch (error) {
    if (isBatchFatal(error)) {
      throw error;
    }
    return report(
      directoryName,
      'failed',
      reasonFor(error, 'create-marker-failed'),
      await rollback(null),
    );
  }

  // The call returned, but the provider may have renamed the file. An exact
  // match is the only acceptable outcome.
  if (created.landedName !== MARKER_COMPLETE) {
    return report(directoryName, 'failed', 'marker-name-mismatch', await rollback(created));
  }

  // Read back what is actually on disk. The create reported the right name, but
  // this is the only evidence that the marker is really there under it.
  try {
    const after = await fs.listDirectory(directory.uri);
    if (findMarker(after, MARKER_COMPLETE) === undefined) {
      return report(
        directoryName,
        'failed',
        'create-marker-failed',
        await rollback(created),
      );
    }
  } catch (error) {
    if (isBatchFatal(error)) {
      throw error;
    }
    // The write may well have landed, but that cannot be confirmed — and an
    // unverified success is exactly what must not be reported.
    return report(
      directoryName,
      'failed',
      reasonFor(error, 'create-marker-failed'),
      await rollback(created),
    );
  }

  return report(directoryName, 'success');
}
