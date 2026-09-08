import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PagePadding, SectionGap } from '@/constants/theme';
import { useTranslate } from '@/i18n/provider';

const GUIDE_SLUGS = ['winnative', 'gaishi', 'troubleshooting'] as const;
type GuideSlug = (typeof GUIDE_SLUGS)[number];

function isGuideSlug(value: string | undefined): value is GuideSlug {
  return value !== undefined && (GUIDE_SLUGS as readonly string[]).includes(value);
}

export default function GuideScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useTranslate();

  const title = isGuideSlug(slug) ? t(`guide.${slug}.title`) : t('guide.notFound');

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: PagePadding, gap: SectionGap }}>
        <Text className="text-[26px] font-bold text-foreground">{title}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
