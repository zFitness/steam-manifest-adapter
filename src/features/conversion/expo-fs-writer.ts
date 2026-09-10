import { Directory, File } from 'expo-file-system';

import { FsError } from '@/features/library-scan/fs-adapter';
import { decodeAndTakeLastSegment } from '@/features/library-scan/expo-fs';

import type { CreatedFile, WritableFs } from './fs-writer';

/**
 * The real `WritableFs`, backed by `expo-file-system` over SAF content URIs.
 *
 * Only two operations reach the disk: create a marker file, delete a marker
 * file. Nothing here writes contents — the marker's meaning is its name, and the
 * maintainer's own script creates it with `: >` (an empty file), so there is
 * nothing to write.
 *
 * Three platform details shape this file, all read off the installed package's
 * type definitions rather than assumed:
 *
 * 1. `Directory.createFile(name, mimeType)` is the **only** usable creation path
 *    under SAF. `File.create()` needs a `File` instance already pointing at the
 *    target, which cannot be constructed for a SAF child (see `fs-writer.ts` for
 *    why concatenating a URI does not work), and `File.open(ReadWrite)` is
 *    documented as unsupported for `content://`.
 * 2. `createFile` returns a handle whose `name` is the *entire percent-encoded
 *    document id*, exactly like the read side — hence `decodeAndTakeLastSegment`.
 *    Comparing the raw value would never match `.download_complete`.
 * 3. The provider is free to adjust the display name it was given, usually by
 *    appending an extension inferred from the mime type. `null` is passed to say
 *    "do not infer anything"; whether that is honoured is what the caller's
 *    verification step exists to find out.
 */

/**
 * Mime type passed to `createFile`.
 *
 * Verified on a device (Legion Y700, Android 15): passing `null` does *not*
 * mean "no type" — the Kotlin side (`FileSystemDirectory.createFile`) falls
 * back to `text/plain`, and `DocumentsContract.createDocument` then treats a
 * stem-less name like `.download_complete` as a bare extension and appends
 * `.txt`, so the marker lands as `download_complete.txt` and the consumer
 * never recognises it. `application/octet-stream` maps to no extension in
 * `MimeTypeMap`, so the requested name lands verbatim.
 */
const MARKER_MIME_TYPE = 'application/octet-stream';

/**
 * Maps a platform exception onto our error kinds.
 *
 * **The exact shapes reaching JS are not yet verified on a device** — this
 * carries forward the same open question the read side records: SAF surfaces a
 * lapsed grant as a `SecurityException` and a full volume as an `IOException`,
 * but what survives the bridge into a JS `Error.message` is still unconfirmed.
 * String matching is the pragmatic starting point, deliberately ordered so the
 * more specific writing failures are tested before the catch-all.
 *
 * `read-only` and `no-space` are kept distinct because the spec requires those
 * two to produce different, actionable wording rather than one generic failure.
 *
 * Never logs: the message can contain the user's real path.
 */
function toFsError(error: unknown): FsError {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();

  if (lowered.includes('security') || lowered.includes('permission denied')) {
    return new FsError('permission-revoked');
  }
  if (
    lowered.includes('enospc') ||
    lowered.includes('no space') ||
    lowered.includes('disk full')
  ) {
    return new FsError('no-space');
  }
  if (
    lowered.includes('erofs') ||
    lowered.includes('read-only') ||
    lowered.includes('read only') ||
    lowered.includes('not writable')
  ) {
    return new FsError('read-only');
  }
  if (lowered.includes('already exists') || lowered.includes('eexist')) {
    return new FsError('already-exists');
  }
  if (
    lowered.includes('does not exist') ||
    lowered.includes('not exist') ||
    lowered.includes('enoent') ||
    lowered.includes('no such file')
  ) {
    return new FsError('not-found');
  }
  return new FsError('io-error');
}

export function createExpoFsWriter(): WritableFs {
  async function createFileIn(dirUri: string, name: string): Promise<CreatedFile> {
    try {
      const directory = new Directory(dirUri);
      if (!directory.exists) {
        // The folder went away between locating it and writing to it.
        throw new FsError('not-found');
      }
      const created = directory.createFile(name, MARKER_MIME_TYPE);
      return {
        uri: created.uri,
        // Decoded, because `name` is the whole document id under SAF. The
        // caller compares this against what it asked for.
        landedName: decodeAndTakeLastSegment(created.name),
      };
    } catch (error) {
      throw error instanceof FsError ? error : toFsError(error);
    }
  }

  async function deleteFile(uri: string): Promise<void> {
    try {
      const file = new File(uri);
      if (!file.exists) {
        throw new FsError('not-found');
      }
      file.delete();
    } catch (error) {
      throw error instanceof FsError ? error : toFsError(error);
    }
  }

  return { createFileIn, deleteFile };
}
