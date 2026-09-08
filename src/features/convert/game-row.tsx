import { Checkbox } from 'heroui-native';
import { Pressable, Text, View } from 'react-native';

import { GameStatusChip } from '@/features/convert/game-status-chip';
import { isSelectable, type ScannedGame } from '@/features/library-scan/types';
import { useTranslate } from '@/i18n/provider';

/**
 * One game in the directory card list (board 2:728, and 2:755 for the disabled
 * variant).
 *
 * `notAdaptable` games can never be converted, so their checkbox is disabled and
 * the row does not fire `onToggle` at all — the reducer rejects them too, this
 * only stops the pointless dispatch.
 *
 * Deliberate addition to the board: boards 2:728 / 2:755 show only name, meta
 * and status chip, but the spec requires every non-`adaptable` row to say *why*
 * it is not adaptable rather than relying on the chip's colour. The reason sits
 * under the meta line in the same muted 11px voice so it does not compete with
 * the game name.
 */
export function GameRow({
  game,
  isSelected,
  onToggle,
}: {
  game: ScannedGame;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) {
  const t = useTranslate();
  const selectable = isSelectable(game);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected, disabled: !selectable }}
      accessibilityLabel={game.name}
      disabled={!selectable}
      onPress={() => {
        if (selectable) {
          onToggle(game.id);
        }
      }}
      className="flex-row items-center gap-2.5 rounded-xl bg-surface-secondary p-2.5"
    >
      <Checkbox
        isSelected={isSelected}
        isDisabled={!selectable}
        // The row Pressable owns the hit area; the box must not double-fire.
        onSelectedChange={() => {
          if (selectable) {
            onToggle(game.id);
          }
        }}
      />

      <View className="flex-1 gap-0.5">
        <Text
          numberOfLines={1}
          className="text-[13px] font-semibold text-foreground"
        >
          {game.name}
        </Text>
        <Text numberOfLines={1} className="text-[11px] text-muted">
          {t('convert.library.row.meta', {
            appId: game.appId,
            installDir: game.installDir,
          })}
        </Text>
        {/* `adaptable` rows have nothing to explain, so they carry no reason. */}
        {game.reason === undefined ? null : (
          <Text numberOfLines={2} className="text-[11px] text-muted">
            {t(`convert.reason.${game.reason}`)}
          </Text>
        )}
      </View>

      <GameStatusChip status={game.status} />
    </Pressable>
  );
}
