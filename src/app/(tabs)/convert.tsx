import { useReducer } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PagePadding, SectionGap } from '@/constants/theme';
import {
  convertReducer,
  initialConvertState,
  type ConvertStatus,
} from '@/features/convert/convert-state';
import { DevStateSwitcher } from '@/features/convert/dev-state-switcher';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTranslate } from '@/i18n/provider';

export default function ConvertScreen() {
  const t = useTranslate();
  const bottomInset = useTabBarInset();
  const [state, dispatch] = useReducer(convertReducer, initialConvertState);

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
          <Text className="text-2xl font-bold text-foreground">{t('convert.title')}</Text>
          <Text className="text-sm leading-[22px] text-muted">{t('convert.subtitle')}</Text>
          <Text className="text-xs text-success">{t('convert.safetyNote')}</Text>
        </View>

        <DevStateSwitcher
          current={state.status}
          onSelect={(status: ConvertStatus) => dispatch({ type: 'dev-goto', status })}
        />

        {/* Card content per state lands in tasks 5.2 onwards. */}
        <View className="gap-2 rounded-card bg-surface p-4">
          <Text className="text-sm text-muted">status: {state.status}</Text>
          <Text className="text-sm text-muted">
            {t('convert.library.header.games', { count: state.games.length })} ·{' '}
            {t('convert.library.header.selected', { count: state.selected.length })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
