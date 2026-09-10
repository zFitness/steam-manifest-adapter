import Constants from 'expo-constants';
import { Link } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { PagePadding, SectionGap } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTranslate } from '@/i18n/provider';

const REPOSITORY_URL = 'https://github.com/zFitness/steam-manifest-adapter';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-sm text-foreground">{value}</Text>
    </View>
  );
}

export default function AboutScreen() {
  const t = useTranslate();
  const bottomInset = useTabBarInset();
  const version = Constants.expoConfig?.version ?? '1.0.0';

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
          <Text className="text-base font-semibold text-foreground">
            {t('about.appInfo')}
          </Text>
          <InfoRow label={t('about.info.name')} value={t('app.name')} />
          <InfoRow label={t('about.info.version')} value={t('about.version', { version })} />
          <InfoRow label={t('about.info.license')} value="MIT" />
          <InfoRow label={t('about.info.developer')} value="zFitness" />
          <ExternalLink href={REPOSITORY_URL} className="text-sm text-link">
            github.com/zFitness/steam-manifest-adapter
          </ExternalLink>
        </View>

        <View className="gap-2 rounded-card bg-surface p-4">
          <Text className="text-base font-semibold text-foreground">{t('about.help')}</Text>
          <Link href="/help" className="text-sm text-link">
            {t('help.title')}
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
      </ScrollView>
    </SafeAreaView>
  );
}
