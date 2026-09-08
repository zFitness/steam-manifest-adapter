import { parseAcf } from '../acf-parser';
import { classify, type DirectoryFacts } from '../classify';
import {
  ACF_BINARY_JUNK,
  ACF_EMPTY,
  ACF_INCOMPLETE,
  ACF_MISSING_APPID,
  ACF_MISSING_INSTALLDIR,
  ACF_NORMAL,
  ACF_NO_STATE_FLAGS,
  ACF_OVERSIZED,
  ACF_STATE_FLAGS_NOT_A_NUMBER,
  ACF_TRAVERSAL_ABSOLUTE,
  ACF_TRAVERSAL_DOTDOT,
  ACF_TRAVERSAL_NESTED_SEGMENT,
  ACF_TRAVERSAL_RELATIVE,
} from '../test-fixtures/acf-samples';

/**
 * The happy-path facts: folder found under exactly the declared name, has
 * content, no markers. `ACF_NORMAL` declares `installdir` as `SnowRunner`, so
 * `actualDirName` matches it verbatim.
 */
const READY: DirectoryFacts = {
  commonMissing: false,
  actualDirName: 'SnowRunner',
  dirEmpty: false,
  hasDownloadComplete: false,
  hasDownloadInProgress: false,
};

function facts(overrides: Partial<DirectoryFacts> = {}): DirectoryFacts {
  return { ...READY, ...overrides };
}

describe('classify', () => {
  describe('adaptable', () => {
    it('is adaptable when fully installed, folder matches and no marker exists', () => {
      expect(classify(parseAcf(ACF_NORMAL), facts())).toEqual({
        status: 'adaptable',
      });
    });

    // Nothing to explain, so nothing must be attached.
    it('carries no reason', () => {
      const result = classify(parseAcf(ACF_NORMAL), facts());

      expect(result.reason).toBeUndefined();
    });
  });

  describe('alreadyAdapted', () => {
    it('is alreadyAdapted when the marker is already present', () => {
      expect(
        classify(parseAcf(ACF_NORMAL), facts({ hasDownloadComplete: true })),
      ).toEqual({ status: 'alreadyAdapted', reason: 'already-marked' });
    });

    // The marker is what the target actually reads, so its presence outranks
    // every needsAttention signal.
    it('outranks an incomplete StateFlags', () => {
      expect(
        classify(parseAcf(ACF_INCOMPLETE), facts({ hasDownloadComplete: true })),
      ).toEqual({ status: 'alreadyAdapted', reason: 'already-marked' });
    });

    it('outranks an empty folder and a stale in-progress marker', () => {
      expect(
        classify(
          parseAcf(ACF_NORMAL),
          facts({
            hasDownloadComplete: true,
            dirEmpty: true,
            hasDownloadInProgress: true,
          }),
        ),
      ).toEqual({ status: 'alreadyAdapted', reason: 'already-marked' });
    });
  });

  describe('needsAttention', () => {
    it.each([
      ['StateFlags is 6', ACF_INCOMPLETE],
      ['StateFlags is missing', ACF_NO_STATE_FLAGS],
      ['StateFlags is not a number', ACF_STATE_FLAGS_NOT_A_NUMBER],
    ])('needs attention when %s', (_label, sample) => {
      expect(classify(parseAcf(sample), facts())).toEqual({
        status: 'needsAttention',
        reason: 'state-flags-incomplete',
      });
    });

    // Shared storage is case-insensitive, so the folder *is* reachable — the
    // warning is that the target platform's exact-name lookup would miss it.
    it('needs attention when the real folder name differs in casing', () => {
      expect(
        classify(parseAcf(ACF_NORMAL), facts({ actualDirName: 'snowrunner' })),
      ).toEqual({ status: 'needsAttention', reason: 'dir-name-mismatch' });
    });

    it('needs attention when the folder is empty', () => {
      expect(classify(parseAcf(ACF_NORMAL), facts({ dirEmpty: true }))).toEqual({
        status: 'needsAttention',
        reason: 'dir-empty',
      });
    });

    it('needs attention when a download-in-progress marker is left behind', () => {
      expect(
        classify(parseAcf(ACF_NORMAL), facts({ hasDownloadInProgress: true })),
      ).toEqual({ status: 'needsAttention', reason: 'stale-in-progress' });
    });
  });

  describe('notAdaptable', () => {
    it.each([
      ['an empty manifest', ACF_EMPTY],
      ['binary junk', ACF_BINARY_JUNK],
      ['an oversized manifest', ACF_OVERSIZED],
    ])('cannot adapt %s', (_label, sample) => {
      expect(classify(parseAcf(sample), facts())).toEqual({
        status: 'notAdaptable',
        reason: 'manifest-unreadable',
      });
    });

    it.each([
      ['appid', ACF_MISSING_APPID],
      ['installdir', ACF_MISSING_INSTALLDIR],
    ])('cannot adapt a manifest missing %s', (_label, sample) => {
      expect(classify(parseAcf(sample), facts())).toEqual({
        status: 'notAdaptable',
        reason: 'manifest-missing-fields',
      });
    });

    it.each([
      ['a relative traversal', ACF_TRAVERSAL_RELATIVE],
      ['a bare parent reference', ACF_TRAVERSAL_DOTDOT],
      ['an absolute path', ACF_TRAVERSAL_ABSOLUTE],
      ['a nested segment', ACF_TRAVERSAL_NESTED_SEGMENT],
    ])('cannot adapt an installdir with %s', (_label, sample) => {
      expect(classify(parseAcf(sample), facts())).toEqual({
        status: 'notAdaptable',
        reason: 'manifest-invalid-installdir',
      });
    });

    it('cannot adapt when the game folder does not exist at all', () => {
      expect(
        classify(parseAcf(ACF_NORMAL), facts({ actualDirName: null })),
      ).toEqual({ status: 'notAdaptable', reason: 'dir-missing' });
    });

    it('cannot adapt when common/ itself is missing', () => {
      expect(
        classify(
          parseAcf(ACF_NORMAL),
          facts({ commonMissing: true, actualDirName: null }),
        ),
      ).toEqual({ status: 'notAdaptable', reason: 'dir-missing' });
    });
  });

  // The rules are checked top-down; these pin the order down so a later edit
  // cannot silently reshuffle it.
  describe('precedence', () => {
    it('puts an unusable manifest above every disk fact', () => {
      expect(
        classify(
          parseAcf(ACF_EMPTY),
          facts({ hasDownloadComplete: true, dirEmpty: true }),
        ),
      ).toEqual({ status: 'notAdaptable', reason: 'manifest-unreadable' });
    });

    it('puts an unsafe installdir above a present marker', () => {
      expect(
        classify(parseAcf(ACF_TRAVERSAL_RELATIVE), facts({ hasDownloadComplete: true })),
      ).toEqual({ status: 'notAdaptable', reason: 'manifest-invalid-installdir' });
    });

    it('puts a missing folder above an incomplete StateFlags', () => {
      expect(
        classify(parseAcf(ACF_INCOMPLETE), facts({ actualDirName: null })),
      ).toEqual({ status: 'notAdaptable', reason: 'dir-missing' });
    });

    it('puts an incomplete StateFlags above a name mismatch', () => {
      // ACF_INCOMPLETE declares `Rise of the Tomb Raider`; the lowercased name
      // below genuinely mismatches, so both rules apply and order decides.
      expect(
        classify(
          parseAcf(ACF_INCOMPLETE),
          facts({ actualDirName: 'rise of the tomb raider' }),
        ),
      ).toEqual({ status: 'needsAttention', reason: 'state-flags-incomplete' });
    });

    it('puts a name mismatch above an empty folder', () => {
      expect(
        classify(
          parseAcf(ACF_NORMAL),
          facts({ actualDirName: 'snowrunner', dirEmpty: true }),
        ),
      ).toEqual({ status: 'needsAttention', reason: 'dir-name-mismatch' });
    });

    it('puts an empty folder above a stale in-progress marker', () => {
      expect(
        classify(
          parseAcf(ACF_NORMAL),
          facts({ dirEmpty: true, hasDownloadInProgress: true }),
        ),
      ).toEqual({ status: 'needsAttention', reason: 'dir-empty' });
    });
  });
});
