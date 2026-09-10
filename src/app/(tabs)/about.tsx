import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';

import { ExternalLink } from '@/components/external-link';
import { UiIcon, type UiIconName } from '@/components/ui-icon';
import { PagePadding, SectionGap } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useI18n, useTranslate } from '@/i18n/provider';
import type { ResolvedLocale } from '@/i18n/resolve-locale';

const REPOSITORY_URL = 'https://github.com/zFitness/steam-manifest-adapter';
const ISSUES_URL = `${REPOSITORY_URL}/issues`;
const LICENSE_URL = `${REPOSITORY_URL}/blob/master/LICENSE`;

const LANGUAGE_LABEL_KEYS: Record<ResolvedLocale, string> = {
  'zh-Hans': 'settings.language.zhHans',
  en: 'settings.language.en',
};

/**
 * Single list entry (boards 2:415 / 2:438): accent icon on the left, optional
 * trailing value, and a chevron when the row navigates somewhere. Rows with a
 * real `onPress` report the button role; link rows get it from `Link` itself.
 */
function EntryRow({
  icon,
  label,
  value,
  showsChevron = false,
  onPress,
}: {
  icon: UiIconName;
  label: string;
  value?: string;
  showsChevron?: boolean;
  onPress?: () => void;
}) {
  const accent = String(useCSSVariable('--accent') ?? '#5B5FEF');
  const mutedTertiary = String(useCSSVariable('--muted-tertiary') ?? '#747584');

  const body = (
    <View className="min-h-14 flex-row items-center justify-between gap-3 px-4 py-3">
      <View className="flex-1 flex-row items-center gap-3">
        <UiIcon name={icon} size={22} color={accent} />
        <Text className="shrink text-[15px] font-medium text-foreground">{label}</Text>
      </View>
      {value ? <Text className="text-[13px] text-muted">{value}</Text> : null}
      {showsChevron ? (
        <UiIcon name="chevron-right" size={18} color={mutedTertiary} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <View className="rounded-[14px] border border-border bg-surface">
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          className="active:opacity-70"
        >
          {body}
        </Pressable>
      </View>
    );
  }

  return <View className="rounded-[14px] border border-border bg-surface">{body}</View>;
}

/** Section heading above a group of entries (boards 2:414 / 2:437). */
function SectionTitle({ title }: { title: string }) {
  return <Text className="px-1 text-sm font-semibold text-muted">{title}</Text>;
}

export default function AboutScreen() {
  const t = useTranslate();
  const { resolvedLocale } = useI18n();
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

        {/* App identity card (board 2:404): icon, name, tagline, intro. */}
        <View className="items-center gap-3 rounded-2xl border border-border bg-surface p-5">
          <Image
            source={require('@/assets/images/icon.png')}
            style={{ width: 64, height: 64, borderRadius: 16 }}
            contentFit="contain"
            accessibilityLabel={t('app.name')}
          />
          <Text className="text-center text-lg font-bold text-foreground">
            {t('app.name')}
          </Text>
          <Text className="text-center text-xs text-muted">
            {t('about.version', { version })}
          </Text>
          <Text className="text-center text-[13px] leading-5 text-muted">
            {t('about.intro')}
          </Text>
        </View>

        {/* Help & docs (board 2:414+). */}
        <View className="gap-2">
          <SectionTitle title={t('about.help.section')} />
          <Link href="/help" asChild>
            <EntryRow icon="book-open" label={t('help.title')} showsChevron />
          </Link>
        </View>

        {/* Settings (board 2:437+): the language row shows the resolved
            language, not the raw preference, so "follow system" reads as the
            language actually in use. */}
        <View className="gap-2">
          <SectionTitle title={t('about.settings')} />
          <Link href="/settings/language" asChild>
            <EntryRow
              icon="languages"
              label={t('about.settings.language')}
              value={t(LANGUAGE_LABEL_KEYS[resolvedLocale])}
            />
          </Link>
        </View>

        {/* Project links (design folds licence + feedback into the settings
            group; a separate group keeps them scannable). */}
        <View className="gap-2">
          <SectionTitle title={t('about.project')} />
          <ExternalLink href={REPOSITORY_URL} asChild>
            <EntryRow icon="github" label={t('about.links.github')} showsChevron />
          </ExternalLink>
          <ExternalLink href={LICENSE_URL} asChild>
            <EntryRow
              icon="scale-icon"
              label={t('about.links.license')}
              value="MIT"
              showsChevron
            />
          </ExternalLink>
          <ExternalLink href={ISSUES_URL} asChild>
            <EntryRow
              icon="message-circle-warning"
              label={t('about.links.feedback')}
              showsChevron
            />
          </ExternalLink>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
