import { MAX_MANIFEST_BYTES, parseAcf } from './acf-parser';
import { classify, type DirectoryFacts } from './classify';
import { FsError, type FsEntry, type ReadOnlyFs } from './fs-adapter';
import { isSafeInstallDir } from './install-dir';
import type { ScannedGame } from './types';

/**
 * Walks a granted Steam library directory and reports what can be adapted.
 *
 * Deliberately shallow: only the granted directory's own entries are considered
 * manifests, and only `common/<installdir>` is looked at per game. A user who
 * grants a parent directory gets an empty result rather than a recursive crawl.
 *
 * Everything reaches disk through `ReadOnlyFs`, so all of the branches below are
 * exercised in `__tests__/scanner.test.ts` without a device.
 */

/** `appmanifest_<digits>.acf`, matched case-insensitively against entry names. */
const MANIFEST_NAME = /^appmanifest_(\d+)\.acf$/i;

const COMMON_DIR = 'common';
const MARKER_COMPLETE = '.download_complete';
const MARKER_IN_PROGRESS = '.download_in_progress';

/** Lets the caller abandon a scan whose results nobody wants any more. */
export type CancelToken = {
  readonly cancelled: boolean;
};

export type ScanOptions = {
  fs: ReadOnlyFs;
  /** The granted directory. Expected to be the `steamapps` folder itself. */
  rootUri: string;
  /** Called as each manifest is finished, with the running count. */
  onProgress?: (discovered: number) => void;
  token?: CancelToken;
};

export type ScanResult =
  | { kind: 'ok'; games: ScannedGame[] }
  /** Cancelled mid-flight. Carries no partial list on purpose. */
  | { kind: 'cancelled' }
  /** The granted directory itself could not be enumerated. */
  | { kind: 'unreadable' }
  /** The grant is no longer valid. */
  | { kind: 'permission-revoked' };

/** Maps a directory-level failure onto the result the card renders. */
function toFailure(error: unknown): ScanResult {
  if (error instanceof FsError && error.kind === 'permission-revoked') {
    return { kind: 'permission-revoked' };
  }
  // A missing root is "unreadable", not "revoked": the spec routes a moved or
  // deleted directory to the scan-failed state.
  return { kind: 'unreadable' };
}

export async function scanLibrary(options: ScanOptions): Promise<ScanResult> {
  const { fs, rootUri, onProgress, token } = options;

  let rootEntries: FsEntry[];
  try {
    rootEntries = await fs.listDirectory(rootUri);
  } catch (error) {
    return toFailure(error);
  }

  const manifests = rootEntries.filter(
    (entry) => !entry.isDirectory && MANIFEST_NAME.test(entry.name),
  );

  // `common/` is listed at most once per scan and its entries reused for every
  // game, so a large library does not re-enumerate it per manifest.
  let commonEntries: FsEntry[] | null | undefined;

  async function loadCommonEntries(): Promise<FsEntry[] | null> {
    if (commonEntries !== undefined) {
      return commonEntries;
    }
    const commonEntry = rootEntries.find(
      (entry) => entry.isDirectory && entry.name.toLowerCase() === COMMON_DIR,
    );
    if (commonEntry === undefined) {
      commonEntries = null;
      return null;
    }
    try {
      commonEntries = await fs.listDirectory(commonEntry.uri);
    } catch {
      // An unreadable `common/` is not a failed scan: every game simply ends up
      // "cannot adapt", which the list still explains row by row.
      commonEntries = null;
    }
    return commonEntries;
  }

  const games: ScannedGame[] = [];

  for (const manifest of manifests) {
    if (token?.cancelled === true) {
      return { kind: 'cancelled' };
    }

    let text: string;
    try {
      text = await fs.readTextFile(manifest.uri, MAX_MANIFEST_BYTES);
    } catch (error) {
      if (error instanceof FsError && error.kind === 'permission-revoked') {
        // The grant died mid-scan; the whole result is void.
        return { kind: 'permission-revoked' };
      }
      // One unreadable manifest is a row, not a failed scan.
      text = '';
    }

    const parsed = parseAcf(text);
    const facts = await gatherFacts(parsed, loadCommonEntries, fs);
    const { status, reason } = classify(parsed, facts);

    const appId = parsed.ok ? parsed.fields.appId : '';
    const installDir = parsed.ok ? parsed.fields.installDir : '';
    const name = parsed.ok && parsed.fields.name !== '' ? parsed.fields.name : appId;

    games.push({
      id: manifest.name,
      appId,
      // Falls back to the manifest's own name so an unreadable row is still
      // identifiable in the list.
      name: name !== '' ? name : manifest.name,
      installDir,
      status,
      ...(reason === undefined ? {} : { reason }),
    });

    onProgress?.(games.length);
  }

  if (token?.cancelled === true) {
    return { kind: 'cancelled' };
  }

  return { kind: 'ok', games };
}

/**
 * Collects what `classify` needs about one game's folder.
 *
 * The folder is located case-insensitively (shared storage is case-insensitive,
 * so an exact-name lookup proves nothing) and its *real* name is handed to the
 * classifier, which compares it verbatim against `installdir`.
 */
async function gatherFacts(
  parsed: ReturnType<typeof parseAcf>,
  loadCommonEntries: () => Promise<FsEntry[] | null>,
  fs: ReadOnlyFs,
): Promise<DirectoryFacts> {
  const absent: DirectoryFacts = {
    commonMissing: true,
    actualDirName: null,
    dirEmpty: false,
    hasDownloadComplete: false,
    hasDownloadInProgress: false,
  };

  // Nothing to look for: the classifier decides on the manifest alone.
  if (!parsed.ok || !isSafeInstallDir(parsed.fields.installDir)) {
    return absent;
  }

  const entries = await loadCommonEntries();
  if (entries === null) {
    return absent;
  }

  const wanted = parsed.fields.installDir.toLowerCase();
  const match = entries.find(
    (entry) => entry.isDirectory && entry.name.toLowerCase() === wanted,
  );
  if (match === undefined) {
    return { ...absent, commonMissing: false };
  }

  let gameEntries: FsEntry[];
  try {
    gameEntries = await fs.listDirectory(match.uri);
  } catch {
    // Present but unreadable. Reported as empty, which lands on "needs
    // attention" — accurate enough, and never claims it is ready to adapt.
    return {
      commonMissing: false,
      actualDirName: match.name,
      dirEmpty: true,
      hasDownloadComplete: false,
      hasDownloadInProgress: false,
    };
  }

  return {
    commonMissing: false,
    actualDirName: match.name,
    dirEmpty: gameEntries.length === 0,
    hasDownloadComplete: gameEntries.some((entry) => entry.name === MARKER_COMPLETE),
    hasDownloadInProgress: gameEntries.some((entry) => entry.name === MARKER_IN_PROGRESS),
  };
}
