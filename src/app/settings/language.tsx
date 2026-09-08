import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PagePadding, SectionGap } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { LOCALE_PREFERENCES, type LocalePreference } from '@/i18n/resolve-locale';

const LABEL_KEYS: Record<LocalePreference, string> = {
  system: 'settings.language.system',
  'zh-Hans': 'settings.language.zhHans',
  en: 'settings.language.en',
};

export default function LanguageSettingsScreen() {
  const { preference, setPreference, t } = useI18n();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: PagePadding, gap: SectionGap }}>
        <Text className="text-2xl font-bold text-foreground">
          {t('settings.language.title')}
        </Text>

        <View className="overflow-hidden rounded-card bg-surface">
          {LOCALE_PREFERENCES.map((option, index) => {
            const isSelected = option === preference;
            return (
              <TouchableOpacity
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setPreference(option)}
                className={`h-14 flex-row items-center justify-between px-4 ${
                  index > 0 ? 'border-t border-separator' : ''
                }`}
              >
                <Text className="text-base text-foreground">{t(LABEL_KEYS[option])}</Text>
                {/* Checkmark plus bold weight, so selection is not colour-only. */}
                {isSelected ? (
                  <Text className="text-base font-bold text-accent">✓</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
