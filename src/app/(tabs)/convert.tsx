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
  type ConvertStatus,
} from '@/features/convert/convert-state';
import { DevStateSwitcher } from '@/features/convert/dev-state-switcher';
import { LibraryCard } from '@/features/convert/library-card';
import { writeDirectory } from '@/features/storage-access/directory-store';
import { createSafStorageAccess } from '@/features/storage-access/saf-storage';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTranslate } from '@/i18n/provider';

const storageAccess = createSafStorageAccess();

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
  const mutedTertiary = String(useCSSVariable('--muted-tertiary') ?? '#747584');

  const isBusy = state.status === 'converting';
  // The finished state has its own summary and "view results" entry point, so it
  // does not get the primary button back.
  const showPrimaryAction =
    state.status === 'scanned-has-adaptable' || isBusy;
  const canConvert =
    state.status === 'scanned-has-adaptable' && state.selected.length > 0;

  const handlePickDirectory = useCallback(async () => {
    if (pickInFlight.current) {
      return;
    }
    pickInFlight.current = true;

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
      // The readable name is what reaches the card — never the `content://` URI.
      dispatch({ type: 'pick-directory', directory: picked.name });
    } catch {
      // The grant did not happen. Nothing was persisted; offer a retry.
      setCancelledMessage(false);
      setPermissionDenied(true);
      dispatch({ type: 'pick-directory-failed' });
    } finally {
      pickInFlight.current = false;
    }
  }, []);

  const handleCancelScan = useCallback(() => {
    dispatch({ type: 'reset' });
    setCancelledMessage(true);
    setPermissionDenied(false);
  }, []);

  const handleToggleGame = useCallback((id: string) => {
    dispatch({ type: 'toggle-game', id });
  }, []);

  const handleToggleAll = useCallback(() => {
    dispatch({ type: 'toggle-all' });
  }, []);

  const handleStartConversion = useCallback(() => {
    setDialogOpen(false);
    dispatch({ type: 'start-conversion' });
  }, []);

  const handleDevGoto = useCallback(
    (status: ConvertStatus) => {
      setCancelledMessage(false);
      setPermissionDenied(false);
      dispatch({ type: 'dev-goto', status });
    },
    [],
  );

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
          <Text className="text-xs text-success">{t('convert.safetyNote')}</Text>
        </View>

        <DevStateSwitcher current={state.status} onSelect={handleDevGoto} />

        <ChainCard />

        <View className="gap-3">
          <LibraryCard
            state={state}
            onPickDirectory={handlePickDirectory}
            onCancelScan={handleCancelScan}
            onToggleGame={handleToggleGame}
            onToggleAll={handleToggleAll}
            onViewResults={() => {}}
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
                    total: state.selected.length,
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
                onPress={handleStartConversion}
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