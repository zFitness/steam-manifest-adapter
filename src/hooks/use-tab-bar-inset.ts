import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SectionGap, TAB_BAR_GAP, TAB_BAR_HEIGHT } from '@/constants/theme';

/**
 * Bottom padding a scroll container needs so its last section clears the
 * floating tab bar, which sits outside the layout flow and would otherwise
 * cover it.
 */
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + TAB_BAR_GAP + TAB_BAR_HEIGHT + SectionGap;
}
