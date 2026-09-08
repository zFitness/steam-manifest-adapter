/**
 * Platform-layer contract for letting the user grant access to a device
 * directory. The domain layer never imports this file's implementations —
 * only `convert.tsx` (the screen) talks to a `StorageAccess`.
 */

/** A directory the user picked and granted access to. */
export type PickedDirectory = {
  /**
   * The opaque, platform-specific handle for the directory (a SAF
   * `content://` tree URI on Android). Persist this; never render it.
   */
  uri: string;
  /**
   * The human-readable directory name (e.g. `steamapps`). This is what the UI
   * shows — the raw `uri` must never reach the screen or a log.
   */
  name: string;
};

export type StorageAccess = {
  /**
   * Opens the system directory picker.
   *
   * Resolves to `null` when the user dismisses the picker — cancelling is an
   * ordinary outcome, so the caller must leave the UI untouched rather than
   * show an error.
   *
   * Rejects when the platform refused to grant access. That is a distinct,
   * user-visible outcome: the caller shows a retryable hint and persists
   * nothing.
   */
  pickDirectory: () => Promise<PickedDirectory | null>;
};
