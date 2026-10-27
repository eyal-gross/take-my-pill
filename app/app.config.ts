import { ExpoConfig, ConfigContext } from 'expo/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Take My Pill — Expo config.
 *
 * - runtimeVersion: bump ONLY when native code / native deps / plugins change. A bump means a new
 *   TestFlight build; everything else ships as an OTA update on the `preview` channel.
 * - The AlarmKit core is injected into the app target by plugins/withPillAlarmNative.js.
 * - The custom alarm sounds (assets/sounds/gentle.caf, tone.caf) are copied into the bundle by the
 *   expo-notifications plugin when the files exist. They are not in the public repo (see README).
 */
// Your own Expo / Apple identifiers. Set them in app/.env (see app/.env.example); Expo loads it for this file.
const PROJECT_ID = process.env.EXPO_PROJECT_ID ?? 'YOUR_EAS_PROJECT_ID';
const OWNER = process.env.EXPO_OWNER ?? 'your-expo-account';
const BUNDLE_ID = process.env.IOS_BUNDLE_ID ?? 'com.example.takemypill';
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID ?? 'YOUR_APPLE_TEAM_ID';
const GENTLE_SOUND = './assets/sounds/gentle.caf';
const hasGentleSound = fs.existsSync(path.join(__dirname, GENTLE_SOUND));
// The original tone at alarm volume ("Gentle" in Settings). See "Alarm sounds" in the README.
const TONE_SOUND = './assets/sounds/tone.caf';
const hasToneSound = fs.existsSync(path.join(__dirname, TONE_SOUND));

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Take My Pill',
  slug: 'take-my-pill',
  owner: OWNER,
  version: '1.0.0',
  runtimeVersion: '1.0.3',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'takemypill',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  platforms: ['ios'],
  updates: {
    url: `https://u.expo.dev/${PROJECT_ID}`,
    fallbackToCacheTimeout: 0,
    checkAutomatically: 'ON_LOAD',
  },
  ios: {
    bundleIdentifier: BUNDLE_ID,
    appleTeamId: APPLE_TEAM_ID,
    supportsTablet: false,
    infoPlist: {
      NSAlarmKitUsageDescription:
        'Take My Pill rings a real alarm at your chosen times so you never miss your pill, even in silent mode.',
      NSSupportsLiveActivities: true,
      ITSAppUsesNonExemptEncryption: false,
      CFBundleAllowMixedLocalizations: true,
      CFBundleLocalizations: ['en', 'he'],
      CFBundleDevelopmentRegion: 'en',
    },
    entitlements: {
      'com.apple.developer.usernotifications.time-sensitive': true,
    },
  },
  plugins: [
    ['expo-build-properties', { ios: { deploymentTarget: '26.1' } }],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 160,
        resizeMode: 'contain',
        backgroundColor: '#FAF7F2',
        dark: { backgroundColor: '#15121D' },
      },
    ],
    'expo-font',
    'expo-localization',
    '@react-native-community/datetimepicker',
    ['expo-notifications', { sounds: [...(hasGentleSound ? [GENTLE_SOUND] : []), ...(hasToneSound ? [TONE_SOUND] : [])] }],
    './plugins/withPillAlarmNative.js',
    './plugins/withMinDeploymentTarget.js',
    // Widget extension for the snooze countdown (targets/snooze). Uses ios.appleTeamId.
    '@bacons/apple-targets',
  ],
  extra: {
    eas: { projectId: PROJECT_ID },
    // Read natively by expo-localization before JS runs: never mirror the layout for RTL system
    // languages. Direction is handled manually in useDir(). Takes effect on the next build.
    supportsRTL: false,
  },
});
