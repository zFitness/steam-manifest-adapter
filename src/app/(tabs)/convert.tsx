import { useCallback, useReducer, useRef, useState } from 'react';
import { Button, Dialog } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';

import { PagePadding, SectionGap } from '@/constants/theme';
import { ChainCard } from '@/features/convert/chain-card';
import { InfoIcon } from '@/features/convert/chain-icons';
import {
  convertReducer,
  initialConvertState,
} from '@/features/convert/convert-state';
import { LibraryCard } from '@/features/convert/library-card';
import { convertGames } from '@/features/conversion/converter';
import { createExpoFsWriter } from '@/features/conversion/expo-fs-writer';
import { createExpoFs } from '@/features/library-scan/expo-fs';
import { scanLibrary } from '@/features/library-scan/scanner';
import { writeDirectory } from '@/features/storage-access/directory-store';
import { createSafStorageAccess } from '@/features/storage-access/saf-storage';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTranslate } from '@/i18n/provider';

const storageAccess = createSafStorageAccess();
const fs = createExpoFs();
const writer = createExpoFsWriter();

export default function ConvertScreen() {
  const t = useTranslate();
  const bottomInset = useTabBarInset();
  const [state, dispatch] = useReducer(convertReducer, initialConvertState);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelledMessage, setCancelledMessage] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  // The picker is a system activity; a second tap while it is up would launch
  // a second one. A ref (not state) because this must not trigger a re-render.
  const pickInFlight = useRef(false);
  // Mutable handle the running scan polls between manifests. Held in a ref so
  // flipping it never waits on a re-render.
  const scanToken = useRef<{ cancelled: boolean } | null>(null);
  // Monotonic source of scan ids. A ref, because minting one must not re-render.
  const nextScanId = useRef(0);
  /**
   * The granted directory's opaque URI.
   *
   * Held separately from `state.directory`, which carries the human-readable name
   * for display. Writing needs the real handle, and the two must not be confused:
   * the URI never reaches the UI.
   */
  const rootUri = useRef<string | null>(null);
  // Adapting writes to disk, so a second concurrent run is not merely wasteful.
  // A ref, because the guard must hold before any re-render happens.
  const convertInFlight = useRef(false);
  const mutedTertiary = String(useCSSVariable('--muted-tertiary') ?? '#747584');

  const isBusy = state.status === 'converting';
  // The finished state has its own summary and "view results" entry point, so it
  // does not get the primary button back.
  const showPrimaryAction =
    state.status === 'scanned-has-adaptable' || isBusy;
  const canConvert =
    state.status === 'scanned-has-adaptable' && state.selected.length > 0;

  /**
   * Runs a scan and reports it under a fresh id.
   *
   * A scan cannot be recalled once started, so every dispatch carries the id it
   * belongs to and the reducer drops anything stale. Cancelling or re-picking
   * therefore needs no coordination here beyond flipping the token.
   */
  const runScan = useCallback(async (rootUri: string, scanId: number) => {
    const token = { cancelled: false };
    scanToken.current = token;

    const result = await scanLibrary({
      fs,
      rootUri,
      token,
      onProgress: (discovered) => {
        dispatch({ type: 'scan-progressed', scanId, discovered });
      },
    });

    // A cancelled scan's outcome is deliberately dropped: the card already
    // returned to its pre-scan state and must not flicker back to a result.
    if (result.kind === 'cancelled') {
      return;
    }
    if (scanToken.current === token) {
      scanToken.current = null;
    }

    switch (result.kind) {
      case 'ok':
        // An empty library is a successful scan, not a failure.
        if (result.games.length === 0) {
          dispatch({ type: 'scan-found-nothing', scanId });
        } else {
          dispatch({ type: 'scan-succeeded', scanId, games: result.games });
        }
        break;
      case 'permission-revoked':
        dispatch({ type: 'permission-revoked', scanId });
        break;
      case 'unreadable':
        dispatch({ type: 'scan-failed', scanId });
        break;
    }
  }, []);

  const handlePickDirectory = useCallback(async () => {
    if (pickInFlight.current) {
      return;
    }
    // Changing the directory mid-write would leave the run writing into a tree
    // the card no longer shows, so the entry point is closed while adapting.
    if (convertInFlight.current) {
      return;
    }
    pickInFlight.current = true;

    // Re-picking abandons whatever is still scanning, so its result cannot
    // land on top of the new directory's.
    if (scanToken.current !== null) {
      scanToken.current.cancelled = true;
      scanToken.current = null;
    }

    try {
      const picked = await storageAccess.pickDirectory();

      // Cancelling is not an error: leave every bit of state as it was, so the
      // card stays exactly where the user left it.
      if (picked === null) {
        return;
      }

      setCancelledMessage(false);
      setPermissionDenied(false);
      // Only the opaque URI is persisted. Losing the write costs the directory
      // on the next cold start but must not interrupt this session.
      await writeDirectory(picked.uri);
      // Kept for the write step, which needs the handle rather than the name.
      rootUri.current = picked.uri;
      // The readable name is what reaches the card — never the `content://` URI.
      // One id per grant, minted here so the scan and the reducer agree on it.
      const scanId = nextScanId.current + 1;
      nextScanId.current = scanId;
      dispatch({ type: 'pick-directory', directory: picked.name, scanId });
      void runScan(picked.uri, scanId);
    } catch {
      // The grant did not happen. Nothing was persisted; offer a retry.
      setCancelledMessage(false);
      setPermissionDenied(true);
      dispatch({ type: 'pick-directory-failed' });
    } finally {
      pickInFlight.current = false;
    }
  }, [runScan]);

  const handleCancelScan = useCallback(() => {
    // Tell the running scan to stop at its next checkpoint, then retire its id
    // so that even a result already on its way is discarded.
    if (scanToken.current !== null) {
      scanToken.current.cancelled = true;
      scanToken.current = null;
    }
    dispatch({ type: 'cancel-scan' });
    setCancelledMessage(true);
    setPermissionDenied(false);
  }, []);

  const handleToggleGame = useCallback((id: string) => {
    dispatch({ type: 'toggle-game', id });
  }, []);

  const handleToggleAll = useCallback(() => {
    dispatch({ type: 'toggle-all' });
  }, []);

  /**
   * Runs the batch and reports what it did.
   *
   * There is no cancel entry point on purpose: each game's write is two file
   * operations with its own rollback, so stopping between games saves nothing
   * worth the ambiguity of a half-reported run.
   */
  const handleStartConversion = useCallback(async () => {
    setDialogOpen(false);

    const root = rootUri.current;
    // Without a handle there is nothing to write into. Should not be reachable —
    // the button only appears after a scan — but the write path must not depend
    // on that being true.
    if (root === null || convertInFlight.current) {
      return;
    }
    convertInFlight.current = true;

    // Snapshotted before dispatching: the reducer clears successful rows out of
    // `selected`, so reading it later would give a shrinking list.
    const chosen = state.games.filter((game) => state.selected.includes(game.id));

    dispatch({ type: 'start-conversion' });

    try {
      const run = await convertGames({
        fs,
        writer,
        rootUri: root,
        games: chosen,
        onProgress: (processed) => {
          dispatch({ type: 'conversion-progressed', processed });
        },
      });

      dispatch({
        type: 'conversion-finished',
        results: run.results,
        ...(run.abortedBy === undefined ? {} : { abortedBy: run.abortedBy }),
      });
    } finally {
      convertInFlight.current = false;
    }
  }, [state.games, state.selected]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{
          padding: PagePadding,
          gap: SectionGap,
          paddingBottom: bottomInset,
        }}
      >
        <View className="gap-1">
          <Text className="text-2xl font-bold text-foreground">
            {t('convert.title')}
          </Text>
          <Text className="text-sm leading-[22px] text-muted">
            {t('convert.subtitle')}
          </Text>
          {/* <Text className="text-xs text-success">{t('convert.safetyNote')}</Text> */}
        </View>

        <ChainCard />

        <View className="gap-3">
          <LibraryCard
            state={state}
            onPickDirectory={handlePickDirectory}
            onCancelScan={handleCancelScan}
            onToggleGame={handleToggleGame}
            onToggleAll={handleToggleAll}
          />

          {state.status === 'no-directory' ? (
            <View className="flex-row items-center gap-1.5 px-1">
              <InfoIcon color={mutedTertiary} size={16} />
              <Text className="text-xs text-muted">
                {t('convert.library.empty.hint')}
              </Text>
            </View>
          ) : null}

          {cancelledMessage ? (
            <Text className="text-xs text-muted-tertiary px-1">
              {t('convert.library.scanning.cancelled')}
            </Text>
          ) : null}

          {/* A refused grant is retryable, so it is an inline hint rather than
              an interrupting dialog. */}
          {permissionDenied ? (
            <Text className="text-xs text-muted-tertiary px-1">
              {t('convert.library.empty.permissionDenied')}
            </Text>
          ) : null}

          {showPrimaryAction ? (
            <Button
              variant={isBusy ? 'ghost' : 'primary'}
              onPress={() => {
                if (canConvert) {
                  setDialogOpen(true);
                }
              }}
              isDisabled={!canConvert}
              className="h-[52px] w-full rounded-pill"
            >
              {isBusy
                ? t('convert.progress.counter', {
                  done: state.processed,
                  total: state.batchTotal,
                })
                : t('convert.action.start', { count: state.selected.length })}
            </Button>
          ) : null}

          {/* A disabled button on its own says nothing about why. */}
          {showPrimaryAction && !canConvert && !isBusy ? (
            <Text className="px-1 text-center text-xs text-muted">
              {t('convert.action.disabledReason')}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <Dialog isOpen={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content className="mx-auto w-[326px] rounded-3xl bg-surface pb-4 pl-6 pr-6 pt-6">
            <View className="h-12 w-12 items-center justify-center self-center rounded-3xl bg-surface-secondary">
              <Text className="text-2xl">📦</Text>
            </View>

            <Dialog.Title className="mt-4 text-center text-xl font-bold text-foreground">
              {t('confirm.title')}
            </Dialog.Title>
            <Dialog.Description className="text-center text-sm leading-5 text-muted">
              {t('confirm.description')}
            </Dialog.Description>

            <View className="mt-4 flex-row items-center justify-between rounded-xl bg-surface-secondary px-2.5 py-3.5">
              <Text className="text-sm text-foreground">
                {t('confirm.selectedCount', { count: state.selected.length })}
              </Text>
              <Text className="text-sm font-semibold text-accent">
                {state.selected.length}
              </Text>
            </View>

            <View className="mt-4 flex-row gap-3">
              <Button
                variant="outline"
                onPress={() => setDialogOpen(false)}
                className="h-12 flex-1 rounded-3xl"
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onPress={() => {
                  void handleStartConversion();
                }}
                className="h-12 flex-1 rounded-3xl"
              >
                {t('confirm.start')}
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </SafeAreaView>
  );
}
