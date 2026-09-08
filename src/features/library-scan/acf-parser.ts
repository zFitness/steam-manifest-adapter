/**
 * Reads the five fields the adapter needs out of a Steam `appmanifest_*.acf`.
 *
 * Pure string in, result out — no filesystem access, so every branch is unit
 * testable. ACF is external, untrusted input: nothing here throws, and callers
 * get a discriminated result they must handle.
 */

/** Manifests are a few KB in practice; anything larger is treated as malformed. */
export const MAX_MANIFEST_BYTES = 1024 * 1024;

export type AcfFields = {
  appId: string;
  /** Empty when the manifest omits `name` — callers fall back to the appid. */
  name: string;
  installDir: string;
  /** Raw text, not a number: `4` means fully installed, anything else does not. */
  stateFlags: string;
  buildId: string;
};

export type AcfParseResult =
  | { ok: true; fields: AcfFields }
  /** The text is not a usable manifest at all (empty, truncated, binary, oversized). */
  | { ok: false; failure: 'unparsable' }
  /** Parsed, but `appid` or `installdir` is missing — nothing can be located. */
  | { ok: false; failure: 'missing-fields' };

/**
 * `"key"<whitespace>"value"` — the shape Valve's text VDF uses for scalars, and
 * the shape WinNative itself writes. Only scalar lines are of interest, so
 * nested blocks (`InstalledDepots` and friends) never match.
 */
const SCALAR_LINE = /"([^"]+)"[ \t]+"([^"]*)"/;

const WANTED = ['appid', 'name', 'installdir', 'stateflags', 'buildid'] as const;

type WantedKey = (typeof WANTED)[number];

function isWanted(key: string): key is WantedKey {
  return (WANTED as readonly string[]).includes(key);
}

/**
 * Parses manifest text.
 *
 * The first occurrence of each key wins: a nested block cannot shadow a
 * top-level field, and none of the five keys repeat inside the blocks real
 * manifests contain.
 */
export function parseAcf(text: string): AcfParseResult {
  // Guard before doing any work: an oversized string is already a red flag, and
  // the caller is expected to have checked the file size first.
  if (text.length > MAX_MANIFEST_BYTES) {
    return { ok: false, failure: 'unparsable' };
  }

  const found = new Map<WantedKey, string>();

  for (const line of text.split('\n')) {
    const match = SCALAR_LINE.exec(line);
    if (match === null) {
      continue;
    }
    const key = match[1].toLowerCase();
    if (isWanted(key) && !found.has(key)) {
      found.set(key, match[2]);
    }
  }

  // No scalar line matched at all: empty file, binary junk, or a manifest cut
  // off before its first field.
  if (found.size === 0) {
    return { ok: false, failure: 'unparsable' };
  }

  const appId = found.get('appid') ?? '';
  const installDir = found.get('installdir') ?? '';

  // Without these two there is nothing to locate on disk.
  if (appId === '' || installDir === '') {
    return { ok: false, failure: 'missing-fields' };
  }

  return {
    ok: true,
    fields: {
      appId,
      name: found.get('name') ?? '',
      installDir,
      stateFlags: found.get('stateflags') ?? '',
      buildId: found.get('buildid') ?? '',
    },
  };
}
