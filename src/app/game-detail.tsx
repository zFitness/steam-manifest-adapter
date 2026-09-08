import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PagePadding, SectionGap } from '@/constants/theme';
import { useTranslate } from '@/i18n/provider';

export default function GameDetailScreen() {
  const t = useTranslate();

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView contentContainerStyle={{ padding: PagePadding, gap: SectionGap }}>
        <Text className="text-xl font-bold text-foreground">{t('detail.title')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
