import { Link } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PagePadding, SectionGap } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTranslate } from '@/i18n/provider';

export default function AboutScreen() {
  const t = useTranslate();
  const bottomInset = useTabBarInset();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{
          padding: PagePadding,
          gap: SectionGap,
          paddingBottom: bottomInset,
        }}
      >
        <Text className="text-2xl font-bold text-foreground">{t('about.title')}</Text>

        <View className="gap-2 rounded-card bg-surface p-4">
          <Text className="text-base font-semibold text-foreground">{t('about.help')}</Text>
          <Link href="/guide/winnative" className="text-sm text-link">
            {t('about.help.winnative')}
          </Link>
          <Link href="/guide/gaishi" className="text-sm text-link">
            {t('about.help.gaishi')}
          </Link>
          <Link href="/guide/troubleshooting" className="text-sm text-link">
            {t('about.help.troubleshooting')}
          </Link>
        </View>

        <View className="gap-2 rounded-card bg-surface p-4">
          <Text className="text-base font-semibold text-foreground">
            {t('about.settings')}
          </Text>
          <Link href="/settings/language" className="text-sm text-link">
            {t('about.settings.language')}
          </Link>
        </View>

        <View className="gap-2 rounded-card bg-surface-tertiary p-4">
          <Text className="text-sm font-semibold text-foreground">
            {t('about.disclaimer.title')}
          </Text>
          <Text className="text-xs leading-[20px] text-muted">
            {t('about.disclaimer.body')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
