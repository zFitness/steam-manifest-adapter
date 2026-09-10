import { Image } from 'expo-image';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PagePadding, SectionGap } from '@/constants/theme';
import { useTranslate } from '@/i18n/provider';

export default function HelpScreen() {
  const t = useTranslate();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: PagePadding, gap: SectionGap }}>
        <Text className="text-2xl font-bold text-foreground">{t('help.title')}</Text>

        <View className="gap-2 rounded-card bg-surface p-4">
          <Text className="text-base font-semibold text-foreground">
            {t('help.gaishi.title')}
          </Text>
          <Text className="text-sm leading-[22px] text-muted">
            {t('help.gaishi.step1')}
          </Text>
          <Image
            source={require('@/assets/images/guide-gaishi-storage.jpg')}
            style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }}
            contentFit="contain"
          />
        </View>

        <View className="gap-2 rounded-card bg-surface p-4">
          <Text className="text-base font-semibold text-foreground">
            {t('help.winnative.title')}
          </Text>
          <Text className="text-sm leading-[22px] text-muted">
            {t('help.winnative.step1')}
          </Text>
          <Text className="text-sm leading-[22px] text-muted">
            {t('help.winnative.step2')}
          </Text>
          <Image
            source={require('@/assets/images/guide-winnative-common.jpg')}
            style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }}
            contentFit="contain"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
