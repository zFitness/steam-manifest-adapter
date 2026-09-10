import { Button, Chip, Dialog } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';

import type {
  ConversionItemResult,
  ConversionOutcome,
} from '@/features/conversion/types';
import { useTranslate } from '@/i18n/provider';

/** Taller batches scroll inside the dialog instead of pushing it off screen. */
const RESULT_LIST_MAX_HEIGHT = 320;

const OUTCOME_COLOR: Record<
  ConversionOutcome,
  'success' | 'default' | 'warning' | 'danger'
> = {
  success: 'success',
  alreadyAdapted: 'default',
  skipped: 'warning',
  failed: 'danger',
};

const OUTCOME_LABEL_KEY: Record<ConversionOutcome, string> = {
  success: 'status.success',
  alreadyAdapted: 'status.alreadyAdapted',
  skipped: 'status.skipped',
  failed: 'status.failed',
};

/**
 * One row per game the batch touched: status chip, name (AppID as fallback),
 * and the reason whenever the outcome carries one.
 */
function ResultRow({ item }: { item: ConversionItemResult }) {
  const t = useTranslate();

  // `rolledBack` only ever rides along on a failure, and it changes what the
  // user should do next, so it is appended to the reason rather than shown alone.
  const reasonText =
    item.reason === undefined
      ? null
      : item.rolledBack === undefined
        ? t(`convert.result.reason.${item.reason}`)
        : t('convert.result.reasonWithRollback', {
            reason: t(`convert.result.reason.${item.reason}`),
            rollback: t(`convert.result.rollback.${item.rolledBack}`),
          });

  return (
    <View className="gap-1 rounded-xl bg-surface-secondary px-3 py-2.5">
      <View className="flex-row items-center gap-2">
        <Chip variant="soft" color={OUTCOME_COLOR[item.outcome]} size="sm">
          <Chip.Label className="text-[10px] font-medium">
            {t(OUTCOME_LABEL_KEY[item.outcome])}
          </Chip.Label>
        </Chip>
        <Text
          numberOfLines={1}
          className="flex-1 text-[13px] font-semibold text-foreground"
        >
          {item.name || item.appId}
        </Text>
      </View>
      {reasonText !== null ? (
        <Text className="text-xs leading-[18px] text-muted">{reasonText}</Text>
      ) : null}
    </View>
  );
}

/**
 * The per-game result list shown when a batch finishes.
 *
 * Replaces the inline summary card: the card had room for counts only, which is
 * exactly how a failed game ended up on screen with no reason attached. Every
 * non-success outcome renders its reason here, and closing the dialog is what
 * triggers the rescan that refreshes the list underneath.
 */
export function ResultDialog({
  isOpen,
  results,
  onClose,
}: {
  isOpen: boolean;
  results: ConversionItemResult[];
  /** Called on any dismissal — close button, backdrop, back gesture. */
  onClose: () => void;
}) {
  const t = useTranslate();

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="mx-auto w-[326px] rounded-3xl bg-surface pb-4 pl-6 pr-6 pt-6">
          <Dialog.Title className="text-center text-xl font-bold text-foreground">
            {t('convert.result.title')}
          </Dialog.Title>

          <ScrollView
            style={{ maxHeight: RESULT_LIST_MAX_HEIGHT }}
            contentContainerStyle={{ gap: 8 }}
            showsVerticalScrollIndicator={false}
            className="mt-4"
            nestedScrollEnabled
          >
            {results.map((item) => (
              <ResultRow key={item.gameId} item={item} />
            ))}
          </ScrollView>

          <Button
            variant="primary"
            onPress={onClose}
            className="mt-4 h-12 w-full rounded-3xl"
          >
            {t('common.close')}
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
