import { FsError, type FsEntry, type FsErrorKind, type ReadOnlyFs } from './fs-adapter';

/**
 * In-memory `ReadOnlyFs` built from a plain object tree, for tests.
 *
 * A string leaf is a file's contents; a nested object is a directory. Failures
 * are injected per-path, which is how the revoked-grant and unreadable-media
 * branches get covered without a device.
 *
 * Entry URIs are deliberately **opaque**: they are minted by `listDirectory`
 * and carry no readable path. This mirrors SAF, where a child is reachable only
 * through the document id its parent's listing handed out — and it means any
 * attempt to build a child URI by string concatenation fails loudly here
 * instead of silently resolving to the tree root on a device.
 */

export type MemoryTree = {
  [name: string]: string | MemoryTree;
};

export type MemoryFsOptions = {
  /** Root URI the tree is mounted at. Mimics a SAF tree URI by default. */
  rootUri?: string;
  /**
   * Paths (relative to the root, `/`-joined) that fail instead of resolving.
   * An empty key targets the root itself.
   */
  failures?: Record<string, FsErrorKind>;
};

export type MemoryFs = ReadOnlyFs & {
  /** How many times each directory was listed, for asserting caching. */
  listCounts: Map<string, number>;
};

const DEFAULT_ROOT = 'content://com.android.externalstorage.documents/tree/primary%3Agames';

function isTree(value: string | MemoryTree): value is MemoryTree {
  return typeof value !== 'string';
}

export function createMemoryFs(
  tree: MemoryTree,
  options: MemoryFsOptions = {},
): MemoryFs {
  const rootUri = options.rootUri ?? DEFAULT_ROOT;
  const failures = options.failures ?? {};
  const listCounts = new Map<string, number>();

  // Opaque handles, both directions. Only URIs minted here are resolvable.
  const uriToPath = new Map<string, string>([[rootUri, '']]);
  const pathToUri = new Map<string, string>([['', rootUri]]);

  function uriFor(path: string): string {
    const existing = pathToUri.get(path);
    if (existing !== undefined) {
      return existing;
    }
    const uri = `${rootUri}/document/doc-${pathToUri.size}`;
    pathToUri.set(path, uri);
    uriToPath.set(uri, path);
    return uri;
  }

  /** Resolves a minted URI back to its tree key. */
  function toPath(uri: string): string {
    const path = uriToPath.get(uri);
    if (path === undefined) {
      // A URI we never handed out. On a device this is what a fabricated child
      // URI amounts to: not a valid document under this grant.
      throw new FsError('permission-revoked');
    }
    return path;
  }

  function checkFailure(path: string): void {
    const kind = failures[path];
    if (kind !== undefined) {
      throw new FsError(kind);
    }
  }

  /** Resolves a path to its node, or `undefined` when nothing is there. */
  function resolve(path: string): string | MemoryTree | undefined {
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

  async function listDirectory(uri: string): Promise<FsEntry[]> {
    const path = toPath(uri);
    checkFailure(path);
    listCounts.set(path, (listCounts.get(path) ?? 0) + 1);

    const node = resolve(path);
    if (node === undefined) {
      throw new FsError('not-found');
    }
    if (!isTree(node)) {
      throw new FsError('io-error');
    }

    return Object.entries(node).map(([name, child]) => ({
      name,
      isDirectory: isTree(child),
      uri: uriFor(path === '' ? name : `${path}/${name}`),
    }));
  }

  async function readTextFile(uri: string, maxBytes: number): Promise<string> {
    const path = toPath(uri);
    checkFailure(path);

    const node = resolve(path);
    if (node === undefined) {
      throw new FsError('not-found');
    }
    if (isTree(node)) {
      throw new FsError('io-error');
    }
    if (node.length > maxBytes) {
      throw new FsError('io-error');
    }
    return node;
  }

  return {
    listDirectory,
    readTextFile,
    listCounts,
  };
}

/** The root URI `createMemoryFs` mounts at when none is given. */
export const MEMORY_FS_ROOT = DEFAULT_ROOT;
