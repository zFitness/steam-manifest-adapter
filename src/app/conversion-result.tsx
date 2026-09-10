/**
 * Per-game results for the last batch.
 *
 * Scope note: this change only makes the route reachable and gives it a way back.
 * The laid-out per-game list from canvas 07 (`2:322`) — status icons, the
 * grouped stat tiles, the next-steps panel — is deliberately left to a following
 * change. What is here is the count and a plain list, enough to confirm the
 * entry point works end to end without pre-empting that layout work.
 */

import { router } from 'expo-router';
import { Button } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PagePadding, SectionGap } from '@/constants/theme';
import { getLastResults } from '@/features/conversion/results-store';
import { useTranslate } from '@/i18n/provider';

export default function ConversionResultScreen() {
  const t = useTranslate();
  // Read once on mount: a batch is finished by the time this route opens, so
  // there is nothing left to subscribe to.
  const results = getLastResults();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: PagePadding, gap: SectionGap }}>
        <Text className="text-2xl font-bold text-foreground">{t('result.title')}</Text>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            {t('result.perItem')}
          </Text>

          {results.map((item) => (
            <Text key={item.gameId} className="text-[13px] text-muted">
              {item.name}
              {' · '}
              {t(`status.${item.outcome}`)}
              {item.reason === undefined ? '' : ` · ${t(`result.reason.${item.reason}`)}`}
              {item.rolledBack === undefined
                ? ''
                : ` · ${t(`result.rollback.${item.rolledBack}`)}`}
            </Text>
          ))}
        </View>

        <Button variant="outline" onPress={() => router.back()} className="rounded-pill">
          {t('common.back')}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
