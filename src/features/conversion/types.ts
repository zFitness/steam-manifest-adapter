/**
 * Domain types for adapting games. Pure data — nothing here touches the
 * filesystem, and nothing here is platform specific.
 */

import type { ScannedGame } from '@/features/library-scan/types';

/** The marker the target platform looks for to consider a game installed. */
export const MARKER_COMPLETE = '.download_complete';

/** The marker a half-finished download leaves behind, which must be cleared. */
export const MARKER_IN_PROGRESS = '.download_in_progress';

/**
 * The four outcomes a game can end with. Deliberately not collapsed into
 * success/failure: the spec requires "already adapted" and "skipped" to read
 * differently from a real failure, because the user's next action differs.
 */
export type ConversionOutcome = 'success' | 'alreadyAdapted' | 'skipped' | 'failed';

/**
 * Why a game did not end up `success`. A stable code, not a sentence: the UI
 * turns it into localised copy via `result.reason.<code>`, so no real path ever
 * reaches a string here.
 *
 * Kept separate from `ScanReason` rather than merged into one enum. The two
 * spaces are only adjacent in concept and do not actually overlap — scanning has
 * no notion of a read-only volume or a full disk, and adapting has no notion of
 * an unparseable manifest. Merging them would leave both sides with exhaustive
 * checks that no longer prove anything.
 */
export type ConversionReason =
  /** The row was not adaptable to begin with, so nothing was attempted. */
  | 'not-adaptable'
  /** `installdir` is not a plain single folder name. Nothing was attempted. */
  | 'invalid-installdir'
  /** No folder matched `installdir` at write time — moved or deleted since the scan. */
  | 'dir-missing'
  /** The game folder already had `.download_complete`. */
  | 'already-marked'
  /** A stale `.download_in_progress` could not be removed. */
  | 'delete-marker-failed'
  /** Creating `.download_complete` failed. */
  | 'create-marker-failed'
  /**
   * The marker was created but landed under a different name than requested.
   *
   * Distinct from `create-marker-failed` because the call *succeeded* — the
   * provider renamed it. The consumer matches the filename exactly, so this is
   * still a failure, just one with a different cause to report.
   */
  | 'marker-name-mismatch'
  /** The target folder cannot be written to. */
  | 'read-only'
  /** Not enough free space to create the marker. */
  | 'no-space'
  /** The volume became unreachable — ejected SD card, unmounted media. */
  | 'storage-unavailable'
  /** The directory grant lapsed. Aborts the batch rather than one game. */
  | 'permission-revoked'
  /** Anything else the platform reported. */
  | 'io-error';

/**
 * Whether a failed game was left as it was found.
 *
 * Separate from `reason` because "it failed but your folder is untouched" and
 * "it failed and I could not put it back" call for completely different user
 * action, while the underlying reason may be identical. The UI combines the two.
 */
export type RollbackState =
  /** Everything this game changed was undone. */
  | 'restored'
  /** Something could not be undone; the folder needs the user's attention. */
  | 'incomplete';

export type ConversionItemResult = {
  /** Matches `ScannedGame.id` (the manifest file name) so rows can be joined. */
  gameId: string;
  appId: string;
  name: string;
  outcome: ConversionOutcome;
  /** Present for every outcome except `success`. */
  reason?: ConversionReason;
  /** Only ever present on a `failed` item that changed something first. */
  rolledBack?: RollbackState;
};

/** Why a batch stopped before processing every game it was given. */
export type ConversionAbort = 'permission-revoked';

export type ConversionRunResult = {
  /** One entry per game handed in, in the order they were processed. */
  results: ConversionItemResult[];
  /**
   * Set when the batch stopped early. Games after the stopping point have no
   * entry in `results`, because nothing was attempted for them.
   */
  abortedBy?: ConversionAbort;
};

/** The subset of a scanned row the executor needs. */
export type ConvertibleGame = Pick<
  ScannedGame,
  'id' | 'appId' | 'name' | 'installDir' | 'status'
>;
