/**
 * Domain types for a library scan. Pure data — nothing here touches the
 * filesystem, and nothing here is platform specific.
 */

/** Per-game adaptability, mapped to the four `status.*` labels in the UI. */
export type GameStatus =
  | 'adaptable'
  | 'alreadyAdapted'
  | 'needsAttention'
  | 'notAdaptable';

/**
 * Why a game is not `adaptable`. A stable code, not a sentence: the UI turns it
 * into localised copy via `convert.reason.<code>`, so no real path ever reaches
 * a string here.
 */
export type ScanReason =
  /** `.download_complete` is already there. */
  | 'already-marked'
  /** `StateFlags` is not 4 (or missing / non-numeric). */
  | 'state-flags-incomplete'
  /**
   * The folder was found, but its real name differs from `installdir` — the
   * target platform's case-sensitive lookup would not find it.
   */
  | 'dir-name-mismatch'
  /** The folder exists but has nothing in it. */
  | 'dir-empty'
  /** A `.download_in_progress` marker was left behind. */
  | 'stale-in-progress'
  /** No folder matches `installdir`, not even case-insensitively. */
  | 'dir-missing'
  /** The manifest could not be read or parsed. */
  | 'manifest-unreadable'
  /** The manifest parsed but lacks `appid` or `installdir`. */
  | 'manifest-missing-fields'
  /** `installdir` is not a plain single folder name. */
  | 'manifest-invalid-installdir'
  /**
   * A Steam platform component (appid 228980, Steamworks Common
   * Redistributables), not a user game. Steam installs it automatically and it
   * means nothing to the target platform as a "game", so it is never adapted.
   */
  | 'steam-shared-component';

export type ScannedGame = {
  /** Stable per-row identity: the manifest file name, which is unique per library. */
  id: string;
  /** Empty only when the manifest was unreadable. */
  appId: string;
  /** The manifest's `name`, or the appid when it had none. */
  name: string;
  /** The manifest's `installdir`, or an empty string when unusable. */
  installDir: string;
  status: GameStatus;
  /** Present for every status except `adaptable`. */
  reason?: ScanReason;
};

/** A game may only be selected for conversion when it is not `notAdaptable`. */
export function isSelectable(game: { status: GameStatus }): boolean {
  return game.status !== 'notAdaptable';
}

/** Only `adaptable` games are ticked by default. */
export function isDefaultSelected(game: { status: GameStatus }): boolean {
  return game.status === 'adaptable';
}
