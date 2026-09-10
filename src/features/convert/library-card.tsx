import { Button, Card, Checkbox, Spinner } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { CardPadding, LibraryListMaxHeight, ListRowGap } from '@/constants/theme';
import { FolderIcon } from '@/features/convert/chain-icons';
import type { ConvertState } from '@/features/convert/convert-state';
import { GameRow } from '@/features/convert/game-row';
import { LibraryCardMessage } from '@/features/convert/library-card-message';
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
  canReselect,
}: {
  directory: string;
  total: number;
  adaptableCount: number;
  selectedCount: number;
  allSelected: boolean;
  onPickDirectory: () => void;
  onToggleAll: () => void;
  /** Hides the re-pick entry point: changing folders mid-write is not allowed. */
  canReselect: boolean;
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

        {canReselect ? (
          <Button
            variant="outline"
            size="sm"
            onPress={onPickDirectory}
            className="h-8 rounded-2xl px-3"
          >
            {t('convert.library.header.reselect')}
          </Button>
        ) : null}
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

  const adaptableIds = state.games
    .filter((g) => g.status === 'adaptable')
    .map((g) => g.id);
  const adaptableCount = adaptableIds.length;
  // Mirrors the reducer: "select all" covers the adaptable rows only, so the
  // toggle reads as fully selected once those are ticked — regardless of any
  // rows the user picked by hand.
  const allSelected =
    adaptableCount > 0 && adaptableIds.every((id) => state.selected.includes(id));

  // `scanned-has-adaptable` is a misnomer once a scan can find manifests that
  // are all unadaptable: the spec requires the full list in that case too, so
  // the row-by-row reasons are visible. Renaming the status is left to a later
  // change to keep this diff to the scanning work.
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
          // The running count from the scanner, not the finished list: while
          // scanning, `games` is still empty by design.
          description={t('convert.library.scanning.found', {
            count: state.discovered,
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

      {/* Two ways the grant can lapse, told apart by whether a batch had already
          written anything. A revoked *scan* has nothing to show and clears the
          list; a revoked *batch* leaves real changes on disk, and its summary is
          the user's only record of them, so it is kept on screen. */}
      {state.status === 'permission-revoked' ? (
        <View className="gap-3" style={{ paddingVertical: CardPadding.library }}>
          <LibraryCardMessage
            title={t(
              state.results.length > 0
                ? 'convert.library.permissionLostDuringConvert.title'
                : 'convert.library.permissionLost.title',
            )}
            description={t(
              state.results.length > 0
                ? 'convert.library.permissionLostDuringConvert.description'
                : 'convert.library.permissionLost.description',
            )}
            action={
              <CardAction
                variant="primary"
                label={t('convert.library.permissionLost.action')}
                onPress={onPickDirectory}
              />
            }
          />

          {state.summary ? (
            <ConvertedSummary summary={state.summary} onViewResults={onViewResults} />
          ) : null}
        </View>
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
            canReselect={state.status !== 'converting'}
          />

          {state.status === 'converting' ? (
            <View className="gap-1.5 rounded-xl bg-surface-secondary p-3">
              <Text className="text-[13px] font-semibold text-foreground">
                {t('convert.progress.title')}
              </Text>
              <Text className="text-xs text-muted">
                {/* Real completions out of the batch size — not an animation. */}
                {t('convert.progress.counter', {
                  done: state.processed,
                  total: state.batchTotal,
                })}
              </Text>
            </View>
          ) : null}

          {state.status === 'converted' && state.summary ? (
            <ConvertedSummary summary={state.summary} onViewResults={onViewResults} />
          ) : null}

          {/* Only the list scrolls, so the primary button below the card stays
              reachable without scrolling the whole page.

              `nestedScrollEnabled` is required, not optional: this ScrollView
              sits inside the screen's own ScrollView, and on Android nested
              scrolling is off by default, so without it the outer view consumes
              every drag and the list cannot be scrolled at all. */}
          <ScrollView
            style={{ maxHeight: LibraryListMaxHeight }}
            contentContainerStyle={{ gap: ListRowGap }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
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
