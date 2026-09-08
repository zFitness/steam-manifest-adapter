/**
 * Fixed ACF samples for the parser, classifier and scanner tests.
 *
 * The field shape mirrors a real manifest read off a device
 * (`appmanifest_1465360.acf`, SnowRunner) so the samples cannot drift into a
 * shape Steam never writes. Tabs between key and value are deliberate.
 */

/** Fully installed (`StateFlags` 4), with the nested blocks real manifests carry. */
export const ACF_NORMAL = `"AppState"
{
	"appid"		"1465360"
	"Universe"		"1"
	"name"		"SnowRunner"
	"StateFlags"		"4"
	"installdir"		"SnowRunner"
	"LastUpdated"		"1786975783"
	"SizeOnDisk"		"72786974349"
	"buildid"		"23474939"
	"InstalledDepots"
	{
		"228989"
		{
			"manifest"		"5753583882400741046"
			"size"		"25674515"
		}
	}
	"SharedDepots"
	{
		"228989"		"228980"
	}
	"UserConfig"
	{
		"language"		"schinese"
	}
}
`;

/** `StateFlags` 6 — downloading / not fully installed. */
export const ACF_INCOMPLETE = `"AppState"
{
	"appid"		"391220"
	"name"		"Rise of the Tomb Raider"
	"StateFlags"		"6"
	"installdir"		"Rise of the Tomb Raider"
	"buildid"		"9575745"
}
`;

/** `StateFlags` present but not a number. */
export const ACF_STATE_FLAGS_NOT_A_NUMBER = `"AppState"
{
	"appid"		"725340"
	"name"		"Lines X Free"
	"StateFlags"		"pending"
	"installdir"		"Lines X Free"
}
`;

/** `StateFlags` omitted entirely. */
export const ACF_NO_STATE_FLAGS = `"AppState"
{
	"appid"		"943960"
	"name"		"Brawlhalla"
	"installdir"		"Brawlhalla"
}
`;

/** No `appid` — nothing can be located. */
export const ACF_MISSING_APPID = `"AppState"
{
	"name"		"Portal 2"
	"StateFlags"		"4"
	"installdir"		"Portal 2"
}
`;

/** No `installdir` — nothing can be located. */
export const ACF_MISSING_INSTALLDIR = `"AppState"
{
	"appid"		"620"
	"name"		"Portal 2"
	"StateFlags"		"4"
}
`;

/** `installdir` present but empty, which is as unusable as omitting it. */
export const ACF_EMPTY_INSTALLDIR = `"AppState"
{
	"appid"		"620"
	"name"		"Portal 2"
	"StateFlags"		"4"
	"installdir"		""
}
`;

/** No `name`, but everything needed to locate the game — must still classify. */
export const ACF_MISSING_NAME = `"AppState"
{
	"appid"		"228980"
	"StateFlags"		"4"
	"installdir"		"Steamworks Shared"
}
`;

/** Keys in unexpected casing — matching must be case-insensitive. */
export const ACF_MIXED_CASE_KEYS = `"AppState"
{
	"AppID"		"620"
	"NAME"		"Portal 2"
	"stateflags"		"4"
	"InstallDir"		"Portal 2"
	"BuildID"		"1234"
}
`;

export const ACF_EMPTY = '';

/** Cut off before the first scalar field ever appears. */
export const ACF_TRUNCATED = `"AppState"
{
	"appi`;

/** Not text VDF at all. */
export const ACF_BINARY_JUNK = '\u0000\u0001\u0002\u00ff\u00fe not a manifest \u0000';

/** A nested block whose scalar keys must not be mistaken for top-level fields. */
export const ACF_NESTED_ONLY_KEYS = `"AppState"
{
	"appid"		"570"
	"name"		"Dota 2"
	"StateFlags"		"4"
	"installdir"		"dota 2 beta"
	"MountedConfig"
	{
		"name"		"should not win"
		"installdir"		"should not win either"
	}
}
`;

/** Path traversal attempts — each must be refused by the installdir guard. */
export const ACF_TRAVERSAL_RELATIVE = `"AppState"
{
	"appid"		"1"
	"name"		"Traversal Relative"
	"StateFlags"		"4"
	"installdir"		"../../Android/data/x"
}
`;

export const ACF_TRAVERSAL_DOTDOT = `"AppState"
{
	"appid"		"2"
	"name"		"Traversal DotDot"
	"StateFlags"		"4"
	"installdir"		".."
}
`;

export const ACF_TRAVERSAL_ABSOLUTE = `"AppState"
{
	"appid"		"3"
	"name"		"Traversal Absolute"
	"StateFlags"		"4"
	"installdir"		"/data/data/x"
}
`;

export const ACF_TRAVERSAL_NESTED_SEGMENT = `"AppState"
{
	"appid"		"4"
	"name"		"Traversal Nested"
	"StateFlags"		"4"
	"installdir"		"a/b"
}
`;

/** Oversized manifest: padded past the parser's byte ceiling. */
export const ACF_OVERSIZED = `"AppState"
{
	"appid"		"5"
	"name"		"Oversized"
	"StateFlags"		"4"
	"installdir"		"Oversized"
	"Padding"		"${'x'.repeat(1024 * 1024)}"
}
`;
