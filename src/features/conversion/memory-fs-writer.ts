import { FsError, type FsErrorKind } from '@/features/library-scan/fs-adapter';
import { createMemoryFs, type MemoryFs, type MemoryTree } from '@/features/library-scan/memory-fs';

import type { CreatedFile, WritableFs } from './fs-writer';

/**
 * In-memory `WritableFs` sharing one mutable tree with a `MemoryFs`, for tests.
 *
 * The two halves must observe the same tree. The executor's success check is
 * "create the marker, then list the directory again and confirm it is there",
 * which proves nothing if writes land where the reads cannot see them. So both
 * are built over a single `MemoryTree` object, mutated in place.
 *
 * URIs stay opaque, as in `createMemoryFs`: a created file's handle is minted
 * here and resolvable only because it was handed out. A URI assembled by string
 * concatenation resolves nowhere and fails loudly — the same outcome a fabricated
 * SAF child URI produces on a device, rather than silently hitting the tree root.
 */

export type MemoryWriterOptions = {
  /**
   * Paths (relative to the root, `/`-joined) whose *write* fails, keyed by
   * either the file being created/deleted or its parent directory.
   *
   * Separate from `createMemoryFs`'s read failures on purpose: a directory that
   * lists fine but refuses writes is exactly what a read-only folder looks like,
   * and that asymmetry has to be expressible.
   */
  failures?: Record<string, FsErrorKind>;
  /**
   * Simulates a provider that renames on create: requested name -> landed name.
   *
   * This is the `.download_complete` -> `download_complete` hazard the
   * executor's landed-name check exists to catch, so it must be reproducible
   * without a device.
   */
  renameOnCreate?: Record<string, string>;
};

export type MemoryWriter = WritableFs & {
  /** Requested names, in order, for asserting what was attempted. */
  createdNames: string[];
  /** Paths that were deleted, in order. */
  deletedPaths: string[];
};

function isTree(value: string | MemoryTree): value is MemoryTree {
  return typeof value !== 'string';
}

/**
 * Builds a read/write pair over one shared tree.
 *
 * Returns both halves and the tree, so a test can assert the final on-disk shape
 * directly instead of inferring it from the reported results.
 */
export function createMemoryFsPair(
  tree: MemoryTree,
  options: MemoryWriterOptions & {
    rootUri?: string;
    /** Read-side failures, forwarded to `createMemoryFs`. */
    readFailures?: Record<string, FsErrorKind>;
  } = {},
): { fs: MemoryFs; writer: MemoryWriter; tree: MemoryTree } {
  const fs = createMemoryFs(tree, {
    ...(options.rootUri === undefined ? {} : { rootUri: options.rootUri }),
    ...(options.readFailures === undefined ? {} : { failures: options.readFailures }),
  });
  return { fs, writer: createMemoryWriter(tree, fs, options), tree };
}

export function createMemoryWriter(
  tree: MemoryTree,
  fs: MemoryFs,
  options: MemoryWriterOptions = {},
): MemoryWriter {
  const failures = options.failures ?? {};
  const renameOnCreate = options.renameOnCreate ?? {};
  const createdNames: string[] = [];
  const deletedPaths: string[] = [];

  /** Handles for files created here; listings resolve through `fs.pathOf`. */
  const createdUris = new Map<string, string>();
  let minted = 0;

  /**
   * Resolves a URI to its tree path.
   *
   * Only two sources are valid: a URI a listing handed out (`fs.pathOf`) or one
   * minted by a create here. Anything else was never granted.
   */
  function pathFor(uri: string): string {
    const created = createdUris.get(uri);
    if (created !== undefined) {
      return created;
    }
    const listed = fs.pathOf(uri);
    if (listed === undefined) {
      throw new FsError('permission-revoked');
    }
    return listed;
  }

  function nodeAt(path: string): string | MemoryTree | undefined {
    if (path === '') {
      return tree;
    }
    let current: string | MemoryTree = tree;
    for (const segment of path.split('/')) {
      if (!isTree(current)) {
        return undefined;
      }
      const next: string | MemoryTree | undefined = current[segment];
      if (next === undefined) {
        return undefined;
      }
      current = next;
    }
    return current;
  }

  function checkFailure(path: string): void {
    const kind = failures[path];
    if (kind !== undefined) {
      throw new FsError(kind);
    }
  }

  async function createFileIn(dirUri: string, name: string): Promise<CreatedFile> {
    const dirPath = pathFor(dirUri);
    createdNames.push(name);

    const requestedPath = dirPath === '' ? name : `${dirPath}/${name}`;
    checkFailure(requestedPath);
    checkFailure(dirPath);

    const parent = nodeAt(dirPath);
    if (parent === undefined) {
      throw new FsError('not-found');
    }
    if (!isTree(parent)) {
      throw new FsError('io-error');
    }

    // The provider gets the last word on the name. That is the whole hazard.
    const landedName = renameOnCreate[name] ?? name;
    if (parent[landedName] !== undefined) {
      throw new FsError('already-exists');
    }

    // Markers are empty files; their meaning is the name.
    parent[landedName] = '';

    minted += 1;
    const uri = `memory://created/${minted}`;
    createdUris.set(uri, dirPath === '' ? landedName : `${dirPath}/${landedName}`);

    return { uri, landedName };
  }

  async function deleteFile(uri: string): Promise<void> {
    const path = pathFor(uri);
    checkFailure(path);

    const segments = path.split('/');
    const name = segments.pop() as string;
    const parent = nodeAt(segments.join('/'));

    if (parent === undefined || !isTree(parent) || parent[name] === undefined) {
      throw new FsError('not-found');
    }

    delete parent[name];
    createdUris.delete(uri);
    deletedPaths.push(path);
  }

  return { createFileIn, deleteFile, createdNames, deletedPaths };
}
