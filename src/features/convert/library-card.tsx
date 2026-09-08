import { Button, Card, Checkbox, Spinner } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { CardPadding, LibraryListMaxHeight, ListRowGap } from '@/constants/theme';
import { FolderIcon } from '@/features/convert/chain-icons';
import type { ConvertState } from '@/features/convert/convert-state';
import { GameRow } from '@/features/convert/game-row';
import { LibraryCardMessage } from '@/features/convert/library-card-message';
import { isSelectable } from '@/fixtures/games';
import { useTranslate } from '@/i18n/provider';

type LibraryCardProps = {
  state: ConvertState;
  onPickDirectory: () => void;
  onCancelScan: () => void;
  onToggleGame: (id: string) => void;
  onToggleAll: () => void;
  onViewResults: () => void;
};

/** Pill button used by the card's own actions (board 2:503 / 2:521). */
function CardAction({
  label,
  variant,
  onPress,
}: {
  label: string;
  variant: 'primary' | 'outline';
  onPress: () => void;
}) {
  return (
    <Button
      variant={variant}
      onPress={onPress}
      className="h-[52px] w-full rounded-pill"
    >
      {label}
    </Button>
  );
}

/**
 * Card header for the list state (board 2:710): where the games came from, how
 * many there are, and the select-all row.
 */
function ListHeader({
  directory,
  total,
  adaptableCount,
  selectedCount,
  allSelected,
  onPickDirectory,
  onToggleAll,
}: {
  directory: string;
  total: number;
  adaptableCount: number;
  selectedCount: number;
  allSelected: boolean;
  onPickDirectory: () => void;
  onToggleAll: () => void;
}) {
  const t = useTranslate();
  const accent = String(useCSSVariable('--accent') ?? '#5B5FEF');

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-surface-secondary">
          <FolderIcon color={accent} size={20} />
        </View>

        <View className="flex-1 gap-0.5">
          {/* Middle-truncated: the tail of a Steam path is the useful part. */}
          <Text
            numberOfLines={1}
            ellipsizeMode="middle"
            className="text-[13px] font-semibold text-foreground"
          >
            {directory}
          </Text>
          <Text numberOfLines={1} className="text-[11px] text-muted">
            {t('convert.library.header.games', { count: total })}
            {' · '}
            {t('convert.library.header.adaptable', { count: adaptableCount })}
          </Text>
        </View>

        <Button
          variant="outline"
          size="sm"
          onPress={onPickDirectory}
          className="h-8 rounded-2xl px-3"
        >
          {t('convert.library.header.reselect')}
        </Button>
      </View>

      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <Checkbox isSelected={allSelected} onSelectedChange={onToggleAll} />
          <Text className="text-[13px] text-foreground">
            {allSelected ? t('common.deselectAll') : t('common.selectAll')}
          </Text>
        </View>
        <Text className="text-xs text-muted">
          {t('convert.library.header.selected', { count: selectedCount })}
        </Text>
      </View>
    </View>
  );
}

/** Four-way outcome summary shown after a run (task 4.5). */
function ConvertedSummary({
  summary,
  onViewResults,
}: {
  summary: NonNullable<ConvertState['summary']>;
  onViewResults: () => void;
}) {
  const t = useTranslate();

  const rows: { key: string; label: string; value: number }[] = [
    { key: 'success', label: t('status.success'), value: summary.success },
    {
      key: 'alreadyAdapted',
      label: t('status.alreadyAdapted'),
      value: summary.alreadyAdapted,
    },
    { key: 'skipped', label: t('status.skipped'), value: summary.skipped },
    { key: 'failed', label: t('status.failed'), value: summary.failed },
  ];

  return (
    <View className="gap-2.5 rounded-xl bg-surface-secondary p-3">
      <Text className="text-[13px] font-semibold text-foreground">
        {t('convert.done.title')}
      </Text>

      <View className="flex-row flex-wrap gap-x-4 gap-y-1">
        {rows.map((row) => (
          <Text key={row.key} className="text-xs text-muted">
            {t('convert.done.summaryItem', {
              label: row.label,
              count: row.value,
            })}
          </Text>
        ))}
      </View>

      <Button variant="ghost" size="sm" onPress={onViewResults} className="self-start">
        {t('convert.done.viewResults')}
      </Button>
    </View>
  );
}

/**
 * The single game-directory card. Every one of the eight states in
 * `ConvertStatus` renders here — this is never split into separate screens.
 */
export function LibraryCard({
  state,
  onPickDirectory,
  onCancelScan,
  onToggleGame,
  onToggleAll,
  onViewResults,
}: LibraryCardProps) {
  const t = useTranslate();
  const folderStroke = String(useCSSVariable('--muted-tertiary') ?? '#747584');

  const selectable = state.games.filter(isSelectable);
  const allSelected =
    selectable.length > 0 && selectable.length === state.selected.length;
  const adaptableCount = state.games.filter((g) => g.status === 'adaptable').length;

  const showList =
    state.status === 'scanned-has-adaptable' ||
    state.status === 'converting' ||
    state.status === 'converted';

  return (
    <Card
      className="rounded-card border border-border bg-surface"
      style={{ paddingHorizontal: CardPadding.library }}
    >
      {state.status === 'no-directory' ? (
        <LibraryCardMessage
          icon={<FolderIcon color={folderStroke} />}
          title={t('convert.library.empty.title')}
          description={t('convert.library.empty.description')}
          action={
            <CardAction
              variant="primary"
              label={t('convert.library.empty.action')}
              onPress={onPickDirectory}
            />
          }
        />
      ) : null}

      {state.status === 'scanning' ? (
        <LibraryCardMessage
          icon={<Spinner size="lg" />}
          title={t('convert.library.scanning.title')}
          description={t('convert.library.scanning.found', {
            count: state.games.length,
          })}
          action={
            <CardAction
              variant="outline"
              label={t('convert.library.scanning.cancel')}
              onPress={onCancelScan}
            />
          }
        />
      ) : null}

      {state.status === 'scan-failed' ? (
        <LibraryCardMessage
          title={t('convert.library.failed.title')}
          description={t('convert.library.failed.description')}
          action={
            <CardAction
              variant="primary"
              label={t('convert.library.failed.action')}
              onPress={onPickDirectory}
            />
          }
        />
      ) : null}

      {state.status === 'scanned-empty' ? (
        <LibraryCardMessage
          title={t('convert.library.noResults.title')}
          description={t('convert.library.noResults.description')}
          action={
            <CardAction
              variant="primary"
              label={t('convert.library.noResults.action')}
              onPress={onPickDirectory}
            />
          }
        />
      ) : null}

      {state.status === 'permission-revoked' ? (
        <LibraryCardMessage
          title={t('convert.library.permissionLost.title')}
          description={t('convert.library.permissionLost.description')}
          action={
            <CardAction
              variant="primary"
              label={t('convert.library.permissionLost.action')}
              onPress={onPickDirectory}
            />
          }
        />
      ) : null}

      {showList && state.directory ? (
        <View className="gap-3" style={{ paddingVertical: CardPadding.library }}>
          <ListHeader
            directory={state.directory}
            total={state.games.length}
            adaptableCount={adaptableCount}
            selectedCount={state.selected.length}
            allSelected={allSelected}
            onPickDirectory={onPickDirectory}
            onToggleAll={onToggleAll}
          />

          {state.status === 'converting' ? (
            <View className="gap-1.5 rounded-xl bg-surface-secondary p-3">
              <Text className="text-[13px] font-semibold text-foreground">
                {t('convert.progress.title')}
              </Text>
              <Text className="text-xs text-muted">
                {t('convert.progress.counter', {
                  done: state.processed,
                  total: state.selected.length,
                })}
              </Text>
            </View>
          ) : null}

          {state.status === 'converted' && state.summary ? (
            <ConvertedSummary summary={state.summary} onViewResults={onViewResults} />
          ) : null}

          {/* Only the list scrolls, so the primary button below the card stays
              reachable without scrolling the whole page. */}
          <ScrollView
            style={{ maxHeight: LibraryListMaxHeight }}
            contentContainerStyle={{ gap: ListRowGap }}
            showsVerticalScrollIndicator={false}
          >
            {state.games.map((game) => (
              <GameRow
                key={game.id}
                game={game}
                isSelected={state.selected.includes(game.id)}
                onToggle={onToggleGame}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </Card>
  );
}
