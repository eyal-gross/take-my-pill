import { Heebo_400Regular, Heebo_500Medium, Heebo_600SemiBold, Heebo_700Bold } from '@expo-google-fonts/heebo';
import { Rubik_500Medium, Rubik_600SemiBold } from '@expo-google-fonts/rubik';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { shallow } from 'zustand/shallow';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Alarms } from './src/services/alarms';
import { Banners, configureBanners } from './src/services/banners';
import { startIntentBridge } from './src/services/intentBridge';
import { reconcile, rescheduleEverything } from './src/services/reconcile';
import { selectScheduleInputs, useAppStore } from './src/store/useAppStore';
import { useTheme } from './src/theme/useTheme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Bump whenever the text baked into scheduled notifications changes (e.g. new reminder lines). */
// 3: build 9 - every alarm rebuilt with iOS Snooze + countdown (replaces build 8's custom snooze).
const CONTENT_VERSION = 3;

export default function App() {
  const theme = useTheme();
  const [fontsLoaded] = useFonts({
    Rubik_500Medium,
    Rubik_600SemiBold,
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_600SemiBold,
    Heebo_700Bold,
  });
  const { hydrated, language } = useAppStore(useShallow((s) => ({ hydrated: s.hydrated, language: s.language })));

  // Boot: notification categories, native strings, listeners, and the store → device sync.
  useEffect(() => {
    if (!hydrated) return;

    configureBanners(language).catch(() => undefined);
    Alarms.syncStrings(language);

    const unsubTookIt = Banners.onTookIt(() => {
      useAppStore.getState().markTaken(new Date());
      Banners.clearDelivered().catch(() => undefined);
    });

    const stopBridge = startIntentBridge((e) => useAppStore.getState().logAlarmEvent(e));

    const unsubStore = useAppStore.subscribe(
      selectScheduleInputs,
      (next, prev) => {
        if (next.language !== prev.language || next.sound !== prev.sound || next.snoozeMinutes !== prev.snoozeMinutes) {
          // Texts, sound and snooze length are baked into each scheduled alarm/banner → rebuild all of them.
          configureBanners(next.language).catch(() => undefined);
          rescheduleEverything();
        } else {
          reconcile();
        }
      },
      { equalityFn: shallow },
    );

    // Banner texts live inside already-scheduled notifications; rebuild them once per content change.
    if (useAppStore.getState().contentVersion !== CONTENT_VERSION) {
      useAppStore.getState().setContentVersion(CONTENT_VERSION);
      rescheduleEverything();
    } else {
      reconcile();
    }

    return () => {
      unsubTookIt();
      stopBridge();
      unsubStore();
    };
    // language is read once at boot on purpose; changes flow through the store subscription above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (fontsLoaded && hydrated) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded, hydrated]);

  if (!fontsLoaded || !hydrated) return null;

  const navTheme = {
    ...(theme.name === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.name === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      primary: theme.colors.accent,
      border: theme.colors.hairline,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Always left-to-right at the navigation level, whatever the iPhone's system language.
            Hebrew direction is handled by the app itself (useDir, slide_from_left, EdgeSwipeBack). */}
        <NavigationContainer theme={navTheme} direction="ltr">
          <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
