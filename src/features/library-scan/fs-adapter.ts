/**
 * Platform-layer contract for the read-only filesystem access a scan needs.
 *
 * The domain layer (parser, classifier, scanner) talks only to this interface,
 * so every scan branch — missing folders, casing mismatches, revoked grants —
 * can be exercised in a unit test without a device. Implementations live in
 * `expo-fs.ts` (real, SAF-backed) and `memory-fs.ts` (tests).
 *
 * Read-only by design: this change never creates, modifies or deletes a file.
 *
 * Navigation is listing-only, and that is a hard constraint rather than a
 * preference. The granted directory is a SAF *tree* URI, whose children are
 * reachable only via `DocumentsContract.buildDocumentUriUsingTree` with a
 * provider-defined opaque document id — appending `/SnowRunner` to a tree URI
 * does not produce a valid child URI, it silently resolves back to the tree
 * root. `expo-file-system` does not bridge SAF's `findFile` to JS, so the only
 * way down is `listDirectory` and matching on `name`. Hence: no `childUri`, no
 * `fileExists`, and every entry carries the `uri` needed to descend further.
 */

/** How a filesystem operation failed. Callers map these onto card states. */
export type FsErrorKind =
  /** The target is not there. Expected during a scan, not a failure. */
  | 'not-found'
  /** The grant for this tree is no longer valid. */
  | 'permission-revoked'
  /** Anything else: unreadable media, ejected SD card, platform error. */
  | 'io-error';

/**
 * The error every `ReadOnlyFs` implementation throws, so callers never have to
 * inspect platform-specific exception shapes.
 *
 * Deliberately carries no path: the message may reach a log, and a real path
 * must not.
 */
export class FsError extends Error {
  readonly kind: FsErrorKind;

  constructor(kind: FsErrorKind) {
    super(`filesystem operation failed: ${kind}`);
    this.name = 'FsError';
    this.kind = kind;
  }
}

/** One entry inside a directory, as reported by the platform. */
export type FsEntry = {
  /**
   * The entry's own name, as the platform reports it — no path, no separators.
   *
   * Casing is significant: it is compared verbatim against a manifest's
   * `installdir` to warn about directories the target platform would fail to
   * find. See `classify`'s `dir-name-mismatch`.
   */
  name: string;
  isDirectory: boolean;
  /**
   * Opaque handle for descending into this entry. The only valid way to reach
   * a child of a SAF tree — never construct one by string concatenation.
   */
  uri: string;
};

export type ReadOnlyFs = {
  /**
   * Lists the direct children of a directory.
   *
   * Throws `FsError` — `not-found` when the directory is gone,
   * `permission-revoked` when the grant lapsed, `io-error` otherwise.
   */
  listDirectory: (uri: string) => Promise<FsEntry[]>;
  /**
   * Reads a file as text, refusing anything larger than `maxBytes` with an
   * `io-error` rather than pulling it into memory.
   */
  readTextFile: (uri: string, maxBytes: number) => Promise<string>;
};
