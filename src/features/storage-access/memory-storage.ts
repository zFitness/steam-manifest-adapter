import type { PickedDirectory, StorageAccess } from './types';

/**
 * In-memory `StorageAccess` for tests and for stepping through the flow
 * without a device picker. Covers all three outcomes the real SAF
 * implementation can produce: a grant, a cancel, and a refused grant.
 */
export class MemoryStorageAccess implements StorageAccess {
  private outcome:
    | { kind: 'granted'; directory: PickedDirectory }
    | { kind: 'cancelled' }
    | { kind: 'failed'; error: Error } = { kind: 'cancelled' };

  /** The user picked a directory and the platform granted access. */
  grants(directory: PickedDirectory): this {
    this.outcome = { kind: 'granted', directory };
    return this;
  }

  /** The user dismissed the picker. */
  cancels(): this {
    this.outcome = { kind: 'cancelled' };
    return this;
  }

  /** The platform refused to grant access to the picked directory. */
  fails(error: Error = new Error('permission not granted')): this {
    this.outcome = { kind: 'failed', error };
    return this;
  }

  async pickDirectory(): Promise<PickedDirectory | null> {
    if (this.outcome.kind === 'failed') {
      throw this.outcome.error;
    }
    return this.outcome.kind === 'granted' ? this.outcome.directory : null;
  }
}