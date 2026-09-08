import AsyncStorage from 'expo-sqlite/kv-store';

const STORAGE_KEY = 'settings.directoryUri';

/** The persisted record for the most recently granted directory. */
export type StoredDirectory = {
  /** The SAF tree URI the grant applies to. Never rendered in the UI. */
  uri: string;
  /** When the grant was recorded, in milliseconds since the epoch. */
  timestamp: number;
};

function isStoredDirectory(value: unknown): value is StoredDirectory {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<StoredDirectory>;
  return (
    typeof candidate.uri === 'string' &&
    candidate.uri.length > 0 &&
    typeof candidate.timestamp === 'number' &&
    Number.isFinite(candidate.timestamp)
  );
}

/**
 * Reads the persisted directory grant.
 *
 * Any failure — storage unavailable, malformed JSON, or a value that is not a
 * well-formed record — resolves to `null` rather than throwing, so a corrupted
 * value cannot stop the app from starting. The caller then simply behaves as
 * if no directory was ever chosen.
 */
export async function readDirectory(): Promise<StoredDirectory | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(stored);
    return isStoredDirectory(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Persists the directory grant, replacing any previous one — the app only ever
 * remembers the most recently granted directory, so writing the same directory
 * twice is indistinguishable from writing it once.
 *
 * Resolves to `true` when the write landed and `false` when it was lost.
 * Failures are never thrown: losing the write only costs the directory on the
 * next cold start, and the current session must continue regardless.
 */
export async function writeDirectory(uri: string): Promise<boolean> {
  try {
    const record: StoredDirectory = { uri, timestamp: Date.now() };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/** Forgets the persisted directory grant. Failures are swallowed by design. */
export async function clearDirectory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to recover: the stale value is only read through
    // `readDirectory`, which tolerates anything it finds.
  }
}
