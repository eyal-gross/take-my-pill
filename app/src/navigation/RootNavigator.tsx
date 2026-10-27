import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HomeScreen } from '../screens/HomeScreen';
import { OnboardingScreen } from '../screens/Onboarding/OnboardingScreen';
import { QuietTimeScreen } from '../screens/QuietTimeScreen';
import { QuietTimesScreen } from '../screens/QuietTimesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TesterScreen } from '../screens/TesterScreen';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/useTheme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const onboarded = useAppStore((s) => s.onboarded);
  const language = useAppStore((s) => s.language);
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'fade_from_bottom',
      }}
    >
      {!onboarded ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: language === 'he' ? 'slide_from_left' : 'slide_from_right', gestureEnabled: language !== 'he' }} />
          <Stack.Screen name="QuietTimes" component={QuietTimesScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="QuietTime" component={QuietTimeScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Tester" component={TesterScreen} options={{ presentation: 'modal' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
