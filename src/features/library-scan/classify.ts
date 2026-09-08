import type { AcfParseResult } from './acf-parser';
import { isSafeInstallDir } from './install-dir';
import type { GameStatus, ScanReason } from './types';

/**
 * Turns a parsed manifest plus a set of on-disk facts into one of the four
 * statuses. Pure logic: the caller gathers the facts, this decides what they
 * mean, so every branch is unit testable without a filesystem.
 *
 * The rules mirror the shell script the maintainer already uses
 * (`import-external-steam-acf.sh`): `StateFlags` 4 means fully installed,
 * `.download_complete` is the marker that matters, and a game folder whose name
 * differs from `installdir` gets flagged rather than touched.
 *
 * On the casing rule: shared storage on Android is case-*insensitive* (verified
 * on device — `ls .../common/snowrunner/` reaches `SnowRunner`), so "can we find
 * the folder by its exact name" is always true and cannot drive this check. The
 * warning is instead about the *downstream* consumer: the target platform looks
 * the folder up with a case-sensitive `Files.exists()`, so a folder named
 * `snowrunner` for an `installdir` of `SnowRunner` would adapt "successfully"
 * yet still be invisible there. Hence we compare the real on-disk name verbatim.
 */

/** What the scanner observed about the game folder on disk. */
export type DirectoryFacts = {
  /** `common/` itself is missing, so no game folder can exist. */
  commonMissing: boolean;
  /**
   * The folder's real name as the platform reports it, or `null` when `common/`
   * holds nothing matching `installdir` even case-insensitively.
   *
   * Compared verbatim against `installdir`: equal means fine, different means a
   * `dir-name-mismatch` warning. Never used to decide *existence* — a non-null
   * value is what existence means here.
   */
  actualDirName: string | null;
  /** The folder exists but contains nothing. */
  dirEmpty: boolean;
  hasDownloadComplete: boolean;
  hasDownloadInProgress: boolean;
};

export type Classification = {
  status: GameStatus;
  reason?: ScanReason;
};

/** `4` is Steam's "fully installed" flag; nothing else may be adapted by default. */
const FULLY_INSTALLED = 4;

function isFullyInstalled(stateFlags: string): boolean {
  if (stateFlags === '') {
    return false;
  }
  const parsed = Number(stateFlags);
  return Number.isInteger(parsed) && parsed === FULLY_INSTALLED;
}

/**
 * Decides the status. Order matters and is checked top-down: `notAdaptable`
 * first (nothing can be done), then `alreadyAdapted` (the work is done), then
 * `needsAttention` (deliberately skipped), and only what is left is `adaptable`.
 */
export function classify(
  parsed: AcfParseResult,
  facts: DirectoryFacts,
): Classification {
  // 1. notAdaptable — the manifest itself is unusable.
  if (!parsed.ok) {
    return {
      status: 'notAdaptable',
      reason:
        parsed.failure === 'missing-fields'
          ? 'manifest-missing-fields'
          : 'manifest-unreadable',
    };
  }

  // 1. notAdaptable — `installdir` could take us outside the granted tree.
  if (!isSafeInstallDir(parsed.fields.installDir)) {
    return { status: 'notAdaptable', reason: 'manifest-invalid-installdir' };
  }

  // 1. notAdaptable — nothing on disk answers to `installdir` at all. A folder
  //    found under a different casing is recoverable, so it reaches step 3.
  if (facts.commonMissing || facts.actualDirName === null) {
    return { status: 'notAdaptable', reason: 'dir-missing' };
  }

  // 2. alreadyAdapted — the marker the target looks for is already present.
  if (facts.hasDownloadComplete) {
    return { status: 'alreadyAdapted', reason: 'already-marked' };
  }

  // 3. needsAttention — reachable but deliberately not adapted by default.
  //    Checked in the order the spec lists them, so the reason shown is stable
  //    when several apply at once.
  if (!isFullyInstalled(parsed.fields.stateFlags)) {
    return { status: 'needsAttention', reason: 'state-flags-incomplete' };
  }
  if (facts.actualDirName !== parsed.fields.installDir) {
    // Found it, but under a different name than the manifest declares — the
    // target platform's case-sensitive lookup would miss it. Renaming is the
    // user's call: this tool never renames a game folder.
    return { status: 'needsAttention', reason: 'dir-name-mismatch' };
  }
  if (facts.dirEmpty) {
    return { status: 'needsAttention', reason: 'dir-empty' };
  }
  if (facts.hasDownloadInProgress) {
    return { status: 'needsAttention', reason: 'stale-in-progress' };
  }

  // 4. adaptable — fully installed, folder name matches verbatim and is
  //    non-empty, no marker yet. No reason: there is nothing to explain.
  return { status: 'adaptable' };
}
