import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';

import { AboutIcon, ConvertIcon } from '@/components/tab-icons';
import { useTranslate } from '@/i18n/provider';
import { TAB_BAR_GAP, TAB_BAR_HEIGHT, TAB_BAR_WIDTH } from '@/constants/theme';

const ICONS = {
  convert: ConvertIcon,
  about: AboutIcon,
} as const;

const LABEL_KEYS = {
  convert: 'tabs.convert',
  about: 'tabs.about',
} as const;

type TabName = keyof typeof ICONS;

function isTabName(name: string): name is TabName {
  return name in ICONS;
}

/**
 * Floating capsule tab bar (board 2:58).
 *
 * The selected tab is marked by an --accent fill, a heavier label weight and a
 * filled icon at once, so it stays distinguishable without relying on colour.
 */
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const t = useTranslate();
  // SVG strokes need literal colour values, so these two tokens are read from
  // the theme rather than applied as class names like everything else.
  const accentForeground = String(useCSSVariable('--accent-foreground') ?? '#FFFFFF');
  const mutedTertiary = String(useCSSVariable('--muted-tertiary') ?? '#747584');

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 items-center"
      style={{ bottom: insets.bottom + TAB_BAR_GAP }}
    >
      <View
        className="flex-row rounded-4xl border border-border bg-surface p-1 shadow-surface"
        style={{ width: TAB_BAR_WIDTH, height: TAB_BAR_HEIGHT }}
      >
        {state.routes.map((route, index) => {
          if (!isTabName(route.name)) {
            return null;
          }

          const isSelected = state.index === index;
          const Icon = ICONS[route.name];

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={t(LABEL_KEYS[route.name])}
              onPress={() => {
                if (!isSelected) {
                  navigation.navigate(route.name);
                }
              }}
              className={`flex-1 items-center justify-center gap-0.5 rounded-pill ${
                isSelected ? 'bg-accent' : 'bg-transparent'
              }`}
            >
              <Icon
                color={isSelected ? accentForeground : mutedTertiary}
                filled={isSelected}
              />
              <Text
                className={`text-[11px] ${
                  isSelected
                    ? 'font-semibold text-accent-foreground'
                    : 'font-medium text-muted-tertiary'
                }`}
              >
                {t(LABEL_KEYS[route.name])}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
