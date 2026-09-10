import Lucide from '@react-native-vector-icons/lucide';
import type { TextStyle } from 'react-native';

/**
 * Semantic icon layer over @react-native-vector-icons/lucide.
 *
 * Business code references icons by their UI meaning (`chevron-right`,
 * `book-open`), never by glyph-set names, so the underlying icon set can be
 * swapped or upgraded by editing this file alone. Each mapping keeps its
 * Lucide glyph name in a comment for traceability.
 */
const ICON_MAP = {
  'chevron-right': 'chevron-right', // Lucide: chevron-right
  'book-open': 'book-open', // Lucide: book-open
  'folder-search': 'folder-search', // Lucide: folder-search
  'circle-help': 'circle-help', // Lucide: circle-help
  languages: 'languages', // Lucide: languages
  github: 'code-xml', // Lucide: code-xml (brand glyphs were removed from Lucide)
  'scale-icon': 'scale', // Lucide: scale
  'message-circle-warning': 'message-circle-warning', // Lucide: message-circle-warning
  'shield-alert': 'shield-alert', // Lucide: shield-alert
  'circle-info': 'info', // Lucide: info
  warning: 'triangle-alert', // Lucide: triangle-alert
  success: 'circle-check', // Lucide: circle-check
  error: 'circle-x', // Lucide: circle-x
  close: 'x', // Lucide: x
  back: 'arrow-left', // Lucide: arrow-left
  download: 'download', // Lucide: download
  check: 'check', // Lucide: check
  file: 'file', // Lucide: file
  'external-link': 'external-link', // Lucide: external-link
} as const;

export type UiIconName = keyof typeof ICON_MAP;

type UiIconProps = {
  name: UiIconName;
  /** Icon size in dp. Defaults to 20 to match the design's entry rows. */
  size?: number;
  /**
   * Icon colour. Pass an explicit value (e.g. from `useCSSVariable`) — the
   * glyph font cannot resolve CSS variables on its own.
   */
  color?: TextStyle['color'];
  /**
   * Set true only when the icon carries meaning on its own (icon-only
   * button); leave false when a text label sits next to it.
   */
  accessible?: boolean;
  accessibilityLabel?: string;
};

export function UiIcon({
  name,
  size = 20,
  color,
  accessible = false,
  accessibilityLabel,
}: UiIconProps) {
  return (
    <Lucide
      name={ICON_MAP[name]}
      size={size}
      color={color}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
