import { Platform } from 'react-native';

/**
 * Non-color design constants. Colors live in `src/global.css` as HeroUI Native
 * semantic variables and are consumed through Uniwind class names
 * (`bg-surface`, `text-muted`, `border-border`), never as JS values.
 *
 * `global.css` itself is imported by `src/app/_layout.tsx` — the CSS entry must
 * hang off the app entry, not off this constants module, or the styles drop out
 * of the bundle whenever nothing imports these constants.
 */

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});

/** Spacing scale, base unit 4. */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 28,
  eight: 32,
} as const;

/** Horizontal page padding. */
export const PagePadding = 20;
/** Gap between top-level page sections. */
export const SectionGap = 20;

export const CardPadding = {
  /** Game directory card (board 2:584). */
  library: 28,
  /** Conversion chain card (board 2:583). */
  chain: 16,
} as const;

/** Gap between rows inside a list. */
export const ListRowGap = 8;

/**
 * Max height of the game list inside the directory card, so the primary button
 * below it stays reachable without scrolling the whole page.
 */
export const LibraryListMaxHeight = 320;

/** Floating tab bar geometry (board 2:58). */
export const TAB_BAR_WIDTH = 350;
export const TAB_BAR_HEIGHT = 64;
/** Gap between the floating tab bar and the safe-area bottom edge. */
export const TAB_BAR_GAP = 12;

export const MaxContentWidth = 800;
