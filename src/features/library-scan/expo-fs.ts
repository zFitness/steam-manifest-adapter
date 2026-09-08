import { Directory, File } from 'expo-file-system';

import { FsError, type FsEntry, type ReadOnlyFs } from './fs-adapter';

/**
 * The real `ReadOnlyFs`, backed by `expo-file-system` over SAF content URIs.
 *
 * Read-only throughout: this change never creates, moves or deletes anything.
 *
 * Two platform details shape this file, both verified against the installed
 * package and a device rather than assumed:
 *
 * 1. `Directory.list()` is the only way to reach a child of a granted tree. The
 *    native `listAsRecords` hands back just `{ isDirectory, uri }`, and those
 *    URIs are the sole valid handles — see `fs-adapter.ts` for why building one
 *    by concatenation cannot work.
 * 2. `entry.name` from expo is `Paths.basename(uri)`, which on SAF returns the
 *    *entire percent-encoded document id* (`primary%3Agames%2F…%2FSnowRunner`),
 *    not the display name. `decodeAndTakeLastSegment` fixes that, otherwise
 *    every filename comparison in the scanner would silently fail.
 */

/**
 * Recovers an entry's own name from a SAF content URI.
 *
 * `Paths.basename` stops at the last `/` in the *raw* URI, but a SAF document id
 * encodes its path separators as `%2F`, so the basename is the whole id. Decode
 * first, then take the final segment.
 */
function decodeAndTakeLastSegment(rawName: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawName);
  } catch {
    // Malformed escape: fall back to the raw value rather than throwing, so one
    // odd entry cannot abort the whole listing.
    decoded = rawName;
  }
  const segments = decoded.split('/').filter((segment) => segment.length > 0);
  return segments.length > 0 ? segments[segments.length - 1] : decoded;
}

/**
 * Maps a platform exception onto our three-way error.
 *
 * The mapping is a starting point, not a verified truth: SAF surfaces a lapsed
 * grant as a `SecurityException` and a deleted directory as a missing document,
 * but the exact shapes reaching JS still need a device (tasks 6.10).
 *
 * `not-found` is kept separate from `permission-revoked` on purpose — the spec
 * routes a moved/deleted directory to "scan failed", not "grant lapsed".
 */
function toFsError(error: unknown): FsError {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();

  if (lowered.includes('security') || lowered.includes('permission')) {
    return new FsError('permission-revoked');
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

export function createExpoFs(): ReadOnlyFs {
  async function listDirectory(uri: string): Promise<FsEntry[]> {
    let entries: (Directory | File)[];
    try {
      const directory = new Directory(uri);
      if (!directory.exists) {
        // Distinguish "gone" from "unreadable" before list() blurs them.
        throw new FsError('not-found');
      }
      entries = directory.list();
    } catch (error) {
      throw error instanceof FsError ? error : toFsError(error);
    }

    return entries.map((entry) => ({
      name: decodeAndTakeLastSegment(entry.name),
      isDirectory: entry instanceof Directory,
      uri: entry.uri,
    }));
  }

  async function readTextFile(uri: string, maxBytes: number): Promise<string> {
    try {
      const file = new File(uri);
      if (!file.exists) {
        throw new FsError('not-found');
      }
      // Check the declared size before pulling bytes into memory, so a bogus
      // multi-gigabyte "manifest" cannot take the app down.
      if (file.size > maxBytes) {
        throw new FsError('io-error');
      }
      return await file.text();
    } catch (error) {
      throw error instanceof FsError ? error : toFsError(error);
    }
  }

  return { listDirectory, readTextFile };
}
