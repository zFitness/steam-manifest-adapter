import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PagePadding, SectionGap } from '@/constants/theme';
import { useTranslate } from '@/i18n/provider';

export default function ConversionResultScreen() {
  const t = useTranslate();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: PagePadding, gap: SectionGap }}>
        <Text className="text-2xl font-bold text-foreground">{t('result.title')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
