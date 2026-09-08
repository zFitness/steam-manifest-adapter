import AsyncStorage from 'expo-sqlite/kv-store';

import { clearDirectory, readDirectory, writeDirectory } from '../directory-store';

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const STORAGE_KEY = 'settings.directoryUri';
const URI = 'content://com.android.externalstorage.documents/tree/primary%3AGames';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('readDirectory', () => {
  it('returns the stored record when the value is well-formed', async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify({ uri: URI, timestamp: 1_700_000_000_000 }),
    );

    await expect(readDirectory()).resolves.toEqual({
      uri: URI,
      timestamp: 1_700_000_000_000,
    });
    expect(storage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('returns null when nothing has been stored yet', async () => {
    storage.getItem.mockResolvedValue(null);

    await expect(readDirectory()).resolves.toBeNull();
  });

  // A corrupted value must never stop the app from starting — the caller just
  // behaves as if no directory was ever chosen.
  it.each([
    ['malformed JSON', 'not json at all'],
    ['a JSON primitive', '"just a string"'],
    ['null', 'null'],
    ['a missing uri', JSON.stringify({ timestamp: 1 })],
    ['an empty uri', JSON.stringify({ uri: '', timestamp: 1 })],
    ['a non-string uri', JSON.stringify({ uri: 42, timestamp: 1 })],
    ['a missing timestamp', JSON.stringify({ uri: URI })],
    ['a non-numeric timestamp', JSON.stringify({ uri: URI, timestamp: 'today' })],
  ])('returns null for %s', async (_label, stored) => {
    storage.getItem.mockResolvedValue(stored);

    await expect(readDirectory()).resolves.toBeNull();
  });

  it('returns null when storage itself throws', async () => {
    storage.getItem.mockRejectedValue(new Error('storage unavailable'));

    await expect(readDirectory()).resolves.toBeNull();
  });
});

describe('writeDirectory', () => {
  it('persists the uri with a timestamp and reports success', async () => {
    storage.setItem.mockResolvedValue(undefined);
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    await expect(writeDirectory(URI)).resolves.toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify({ uri: URI, timestamp: 1_700_000_000_000 }),
    );
  });

  // Only the most recently granted directory is remembered, so a second write
  // targets the same key rather than accumulating entries.
  it('overwrites the previous directory rather than appending', async () => {
    storage.setItem.mockResolvedValue(undefined);

    await writeDirectory('content://tree/A');
    await writeDirectory('content://tree/B');

    expect(storage.setItem).toHaveBeenCalledTimes(2);
    const keys = storage.setItem.mock.calls.map(([key]) => key);
    expect(keys).toEqual([STORAGE_KEY, STORAGE_KEY]);
    const lastValue = storage.setItem.mock.calls[1][1] as string;
    expect(JSON.parse(lastValue).uri).toBe('content://tree/B');
  });

  it('is indistinguishable from a single write when the same directory is re-picked', async () => {
    storage.setItem.mockResolvedValue(undefined);
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    await expect(writeDirectory(URI)).resolves.toBe(true);
    await expect(writeDirectory(URI)).resolves.toBe(true);

    const [first, second] = storage.setItem.mock.calls.map(([, value]) => value);
    expect(first).toBe(second);
  });

  // A lost write must not break the session; it only costs the directory on the
  // next cold start.
  it('reports failure instead of throwing when storage throws', async () => {
    storage.setItem.mockRejectedValue(new Error('disk full'));

    await expect(writeDirectory(URI)).resolves.toBe(false);
  });
});

describe('clearDirectory', () => {
  it('removes the stored record', async () => {
    storage.removeItem.mockResolvedValue(undefined);

    await clearDirectory();

    expect(storage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('does not throw when storage throws', async () => {
    storage.removeItem.mockRejectedValue(new Error('storage unavailable'));

    await expect(clearDirectory()).resolves.toBeUndefined();
  });
});
