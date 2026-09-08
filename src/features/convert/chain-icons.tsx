import Svg, { Path, Rect } from 'react-native-svg';

type ChainIconProps = {
  /** Stroke colour, read from a theme token by the caller. */
  color: string;
  size?: number;
};

/**
 * Source platform: a handheld device with a manifest sheet (board 2:486).
 * Drawn by hand — no third-party logo is reproduced anywhere in this app.
 */
export function SourceDeviceIcon({ color, size = 20 }: ChainIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect
        x={3.5}
        y={2.5}
        width={13}
        height={15}
        rx={2.5}
        stroke={color}
        strokeWidth={1.6}
      />
      <Path
        d="M7 6.5H13M7 9.5H13M7 12.5H10.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Direction of the conversion, source to target (board 2:494). */
export function ChainArrowIcon({ color, size = 20 }: ChainIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M3.5 10H15M10.5 5.5L15 10L10.5 14.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Target platform: a desktop window (board 2:496). */
export function TargetWindowIcon({ color, size = 20 }: ChainIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect
        x={2.5}
        y={3.5}
        width={15}
        height={13}
        rx={2.5}
        stroke={color}
        strokeWidth={1.6}
      />
      <Path d="M2.5 7.5H17.5" stroke={color} strokeWidth={1.6} />
      <Path
        d="M5.5 5.5H6.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Folder outline for the empty-directory state (board 2:503). */
export function FolderIcon({ color, size = 64 }: ChainIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M8 18a4 4 0 0 1 4-4h12l5 6h23a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V18Z"
        stroke={color}
        strokeWidth={3}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Small info glyph for helper rows (board 2:52). */
export function InfoIcon({ color, size = 16 }: ChainIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M8 14.5A6.5 6.5 0 1 0 8 1.5a6.5 6.5 0 0 0 0 13Z"
        stroke={color}
        strokeWidth={1.4}
      />
      <Path
        d="M8 7.25V11"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M8 5.4h.01"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
