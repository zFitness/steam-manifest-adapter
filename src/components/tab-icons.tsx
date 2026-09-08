import Svg, { Circle, Path } from 'react-native-svg';

type IconProps = {
  /** Stroke/fill colour. */
  color: string;
  /**
   * Selected state. Renders a filled glyph rather than an outline, so the
   * active tab is distinguishable without relying on colour alone.
   */
  filled?: boolean;
  size?: number;
};

/** Convert tab: chevrons pointing right (board 2:60). */
export function ConvertIcon({ color, filled = false, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path
        d="M7.5 5L12.5 10L7.5 15"
        stroke={color}
        strokeWidth={filled ? 2.75 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** About tab: info circle (board 2:64). */
export function AboutIcon({ color, filled = false, size = 20 }: IconProps) {
  if (filled) {
    return (
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Circle cx={10} cy={10} r={8} fill={color} />
        <Circle cx={10} cy={6.4} r={1.15} fill="#FFFFFF" />
        <Path
          d="M10 9.2V13.8"
          stroke="#FFFFFF"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={7.5} stroke={color} strokeWidth={2} fill="none" />
      <Path
        d="M10 6.67V13.33"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
