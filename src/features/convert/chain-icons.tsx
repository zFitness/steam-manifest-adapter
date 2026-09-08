import Svg, { Path } from 'react-native-svg';

type ChainIconProps = {
  /** Stroke colour, read from a theme token by the caller. */
  color: string;
  size?: number;
};

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
