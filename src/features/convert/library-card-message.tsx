import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { CardPadding } from '@/constants/theme';

/**
 * Centred informational layout for the game-directory card (board 2:503).
 *
 * Used by every state that has no game list to show: no directory, scanning,
 * scan failed, nothing found, permission revoked. `title` and `description` are
 * required so no state can ever degrade into a bare icon with no explanation.
 */
export function LibraryCardMessage({
  icon,
  title,
  description,
  action,
}: {
  /** 64x64 icon slot. */
  icon?: ReactNode;
  title: string;
  description: string;
  /** Single primary action. Omitted for states with nothing to act on. */
  action?: ReactNode;
}) {
  return (
    <View
      className="items-center gap-4"
      style={{ paddingVertical: CardPadding.library }}
    >
      {icon ? (
        <View className="h-16 w-16 items-center justify-center">{icon}</View>
      ) : null}

      <View className="items-center gap-1.5">
        <Text className="text-center text-[15px] font-semibold text-foreground">
          {title}
        </Text>
        <Text className="text-center text-sm leading-[20px] text-muted">
          {description}
        </Text>
      </View>

      {action ? <View className="w-full items-stretch">{action}</View> : null}
    </View>
  );
}
