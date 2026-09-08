import { Directory } from 'expo-file-system';

import { createSafStorageAccess } from '../saf-storage';

jest.mock('expo-file-system', () => ({
  Directory: { pickDirectoryAsync: jest.fn() },
}));

const pickDirectoryAsync = Directory.pickDirectoryAsync as jest.MockedFunction<
  typeof Directory.pickDirectoryAsync
>;

/** Mirrors the shape of the `CodedError` the native module rejects with. */
function codedError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createSafStorageAccess().pickDirectory', () => {
  it('returns the uri and the human-readable name of the granted directory', async () => {
    pickDirectoryAsync.mockResolvedValue({
      uri: 'content://com.android.externalstorage.documents/tree/primary%3AGames',
      name: 'Games',
    } as Directory);

    await expect(createSafStorageAccess().pickDirectory()).resolves.toEqual({
      uri: 'content://com.android.externalstorage.documents/tree/primary%3AGames',
      name: 'Games',
    });
  });

  // Dismissing the picker is an ordinary outcome. It must resolve to null so the
  // caller can leave the card untouched instead of showing an error.
  it('resolves to null when the user dismisses the picker', async () => {
    pickDirectoryAsync.mockRejectedValue(
      codedError('ERR_PICKER_CANCELLED', 'The file picker was cancelled by the user'),
    );

    await expect(createSafStorageAccess().pickDirectory()).resolves.toBeNull();
  });

  // A refused grant is a distinct, user-visible outcome and must stay
  // distinguishable from a cancel.
  it('rejects when the platform refused to grant access', async () => {
    const failure = codedError('ERR_UNABLE_TO_READ', 'permission not granted');
    pickDirectoryAsync.mockRejectedValue(failure);

    await expect(createSafStorageAccess().pickDirectory()).rejects.toBe(failure);
  });

  it('rejects on a plain error that carries no code', async () => {
    const failure = new Error('native module unavailable');
    pickDirectoryAsync.mockRejectedValue(failure);

    await expect(createSafStorageAccess().pickDirectory()).rejects.toBe(failure);
  });
});
