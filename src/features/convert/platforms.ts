import type { ImageSourcePropType } from 'react-native';

/**
 * Single source of truth for the platforms that can appear on either end of the
 * conversion chain (board 2:486 / 2:496).
 *
 * The icons are the real launcher icons pulled off a device, so a platform is
 * recognisable at a glance instead of sharing one generic glyph. Adding a
 * platform means adding an entry here plus its `convert.platform.*` string —
 * `chain-card.tsx` renders whatever this module exports.
 */
export type PlatformId = 'gaishi' | 'winnative' | 'gamenative';

export type Platform = {
  id: PlatformId;
  /** Flat i18n key; never a hard-coded display name. */
  labelKey: string;
  /**
   * Bundled launcher icon, or `null` when we have none. A missing icon is a
   * layout concern for the caller, not a reason to ship a placeholder logo.
   */
  icon: ImageSourcePropType | null;
  /**
   * `false` means the platform is listed but cannot be picked yet. The reason is
   * stated in words next to the row rather than implied by dimming alone.
   */
  supported: boolean;
};

const GAISHI: Platform = {
  id: 'gaishi',
  labelKey: 'convert.platform.gaishi',
  icon: require('@/assets/images/platforms/gaishi.png'),
  supported: true,
};

const WINNATIVE: Platform = {
  id: 'winnative',
  labelKey: 'convert.platform.winnative',
  icon: require('@/assets/images/platforms/winnative.png'),
  supported: true,
};

const GAMENATIVE: Platform = {
  id: 'gamenative',
  labelKey: 'convert.platform.gamenative',
  icon: null,
  supported: false,
};

/** Platforms games can be read from, in display order. */
export const SOURCE_PLATFORMS: readonly Platform[] = [GAISHI];

/** Platforms games can be adapted for, in display order. */
export const TARGET_PLATFORMS: readonly Platform[] = [WINNATIVE, GAMENATIVE];

/** Current source selection — only one option exists today. */
export const DEFAULT_SOURCE = GAISHI;

/** Current target selection — GameNative is not selectable yet. */
export const DEFAULT_TARGET = WINNATIVE;
