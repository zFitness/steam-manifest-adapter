import { Chip } from 'heroui-native';

import type { GameStatus } from '@/fixtures/games';
import { useTranslate } from '@/i18n/provider';

/**
 * Colour per status. Board 2:735 (adaptable, green) and 2:761 (needs attention,
 * amber) pin two of them; the other two follow the same semantic mapping.
 */
const CHIP_COLOR: Record<GameStatus, 'success' | 'default' | 'warning' | 'danger'> = {
  adaptable: 'success',
  alreadyAdapted: 'default',
  needsAttention: 'warning',
  notAdaptable: 'danger',
};

const LABEL_KEY: Record<GameStatus, string> = {
  adaptable: 'status.adaptable',
  alreadyAdapted: 'status.alreadyAdapted',
  needsAttention: 'status.needsAttention',
  notAdaptable: 'status.notAdaptable',
};

/**
 * Status label for a game row (board 2:735 / 2:761).
 *
 * Each of the four statuses carries its own wording, so the distinction
 * survives greyscale and does not rest on colour alone.
 */
export function GameStatusChip({ status }: { status: GameStatus }) {
  const t = useTranslate();

  return (
    <Chip variant="soft" color={CHIP_COLOR[status]} size="sm">
      <Chip.Label className="text-[10px] font-medium">
        {t(LABEL_KEY[status])}
      </Chip.Label>
    </Chip>
  );
}
