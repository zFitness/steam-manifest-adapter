/**
 * Path boundary for the `installdir` field.
 *
 * SAF hands out opaque `content://` tree URIs, so there is no trustworthy
 * absolute path to normalise and prefix-compare against. Instead the manifest's
 * `installdir` must be a plain single folder name; anything else is refused.
 * Combined with listing-only navigation (a game folder is only ever reached by
 * matching a name against `common/`'s own entries), that makes escaping the
 * granted tree impossible rather than merely unlikely.
 *
 * Real Steam manifests only ever use single segments here, so this is stricter
 * without being lossy.
 */

/** True when `installdir` is a plain folder name safe to append to `common/`. */
export function isSafeInstallDir(installDir: string): boolean {
  if (installDir === '') {
    return false;
  }
  // `.` and `..` resolve to the parent or to `common/` itself.
  if (installDir === '.' || installDir === '..') {
    return false;
  }
  // Any separator means more than one segment — including a leading one, which
  // would otherwise look absolute.
  if (installDir.includes('/') || installDir.includes('\\')) {
    return false;
  }
  // A NUL can truncate the name inside a native call.
  if (installDir.includes('\u0000')) {
    return false;
  }
  return true;
}
