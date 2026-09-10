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
      {/*
        `I18nProvider` must sit above `HeroUINativeProvider`: the latter renders
        heroui's `PortalHost`, and heroui's `Portal` is not a React portal — it
        stores its children in an external store and re-renders them under the
        host. Portalled content (e.g. `Select.Content`) therefore reads context
        from the host's position in the tree, not from where it was written, so
        anything calling `useI18n()` inside a portal throws unless the provider
        is an ancestor of `PortalHost`.
      */}
      <I18nProvider>
        <HeroUINativeProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <SplashGate />
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="game-detail" options={{ presentation: 'modal' }} />
              <Stack.Screen name="conversion-result" />
              <Stack.Screen name="help" />
              <Stack.Screen name="settings/language" />
            </Stack>
          </ThemeProvider>
        </HeroUINativeProvider>
      </I18nProvider>
    </GestureHandlerRootView>
  );
}
