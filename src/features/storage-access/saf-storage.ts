import { Directory } from 'expo-file-system';

import type { PickedDirectory, StorageAccess } from './types';

/**
 * Code Expo's native module reports when the user dismisses the picker.
 * Derived from `PickerCancelledException` — `CodedException` turns the class
 * name into this code (see expo-modules-core `CodedException.inferCode`).
 */
const PICKER_CANCELLED_CODE = 'ERR_PICKER_CANCELLED';

/**
 * Real SAF implementation of `StorageAccess` using Expo FileSystem's
 * `Directory.pickDirectoryAsync()`.
 *
 * On Android this opens the system directory picker
 * (`ACTION_OPEN_DOCUMENT_TREE`) and the native side calls
 * `takePersistableUriPermission` on the result, so the grant is meant to
 * survive app restarts. Android-only by design.
 */
export function createSafStorageAccess(): StorageAccess {
  return { pickDirectory };
}

function isCancellation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === PICKER_CANCELLED_CODE
  );
}

async function pickDirectory(): Promise<PickedDirectory | null> {
  let directory: Directory;

  try {
    directory = await Directory.pickDirectoryAsync();
  } catch (error: unknown) {
    // Dismissing the picker is an ordinary outcome, not a failure.
    if (isCancellation(error)) {
      return null;
    }
    // Anything else means the grant did not happen — the caller shows a
    // retry hint. Deliberately not logged: the message can contain the
    // user's real path.
    throw error;
  }

  return { uri: directory.uri, name: directory.name };
}