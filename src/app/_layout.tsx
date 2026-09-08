import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { HeroUINativeProvider } from 'heroui-native';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { I18nProvider, useI18n } from '@/i18n/provider';

SplashScreen.preventAutoHideAsync();

/**
 * Holds the splash screen until the persisted language preference has loaded,
 * so the first paint is never in the wrong language.
 */
function SplashGate() {
  const { isReady } = useI18n();

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <I18nProvider>
            <SplashGate />
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="game-detail" options={{ presentation: 'modal' }} />
              <Stack.Screen name="conversion-result" />
              <Stack.Screen name="guide/[slug]" />
              <Stack.Screen name="settings/language" />
            </Stack>
          </I18nProvider>
        </ThemeProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
