import type { FsError } from '@/features/library-scan/fs-adapter';

/**
 * Platform-layer contract for the *write* half of adapting a game: the two
 * marker files, and nothing else.
 *
 * Deliberately separate from `ReadOnlyFs` rather than an extension of it. That
 * interface documents itself as read-only and the scanner leans on it as a
 * static guarantee that scanning can never touch the disk. Folding write methods
 * in would remove the only thing stopping a future misplaced call inside
 * `scanner.ts`. Both are injected together into the conversion executor, so the
 * write capability exists exactly where writes are intended and nowhere else.
 *
 * Navigation carries the same hard SAF constraint as the read side: **children
 * are only ever reached through a parent handle, never by building a URI
 * string**. Appending `/SnowRunner` to a tree URI does not yield a valid child
 * URI — it silently resolves back to the tree root. Hence `createFileIn` takes
 * the *parent directory's* URI plus a name, mirroring
 * `DocumentsContract.createDocument`, and `deleteFile` only accepts a URI that a
 * listing (or a create) previously handed out.
 *
 * Errors are the shared `FsError` from `library-scan/fs-adapter.ts`, extended
 * with `read-only` / `no-space` / `already-exists` for this side. It carries no
 * path by design: its message may reach a log, and a real path must not.
 */

/** What `createFileIn` actually produced. */
export type CreatedFile = {
  /** Handle for the new file. The only valid way to delete it again. */
  uri: string;
  /**
   * The name the file **actually landed under**, which is not necessarily the
   * name that was requested.
   *
   * `DocumentsContract.createDocument` lets the provider adjust the display
   * name — typically by appending an extension inferred from the mime type. For
   * a name like `.download_complete` (an extension with no stem) the result is
   * genuinely unpredictable. The caller compares this verbatim against what it
   * asked for and treats any difference as a failure, because the consumer of
   * these markers matches the filename exactly.
   */
  landedName: string;
};

export type WritableFs = {
  /**
   * Creates a file directly inside `dirUri`.
   *
   * `dirUri` must be a URI obtained from a listing — never one assembled by
   * concatenation. Reports the name the file landed under so the caller can
   * verify it; a rejected or renamed creation is the caller's problem to
   * classify, not this layer's to paper over.
   *
   * Throws `FsError`: `read-only` when the directory cannot be written,
   * `no-space` when the device is full, `already-exists` when the name is
   * taken, `permission-revoked` when the grant lapsed, `io-error` otherwise.
   */
  createFileIn: (dirUri: string, name: string) => Promise<CreatedFile>;
  /**
   * Deletes the file at `uri`.
   *
   * Throws `FsError` — `not-found` when it is already gone, `read-only` when it
   * cannot be removed, `permission-revoked` when the grant lapsed, `io-error`
   * otherwise.
   */
  deleteFile: (uri: string) => Promise<void>;
};

/** Re-exported so callers of this module need only one import for errors. */
export type { FsError };
