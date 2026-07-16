import type { ExpoConfig } from '@expo/config-types';

// The following fields are valid at runtime in Expo SDK 52 but missing from
// @expo/config-types@57 type defs, so we extend the type to include them:
//  - newArchEnabled: enables RN New Architecture (on by default in RN 0.76)
//  - splash: native splash screen config consumed by expo-splash-screen
type ZenoExpoConfig = ExpoConfig & {
  newArchEnabled?: boolean;
  splash?: {
    image: string;
    resizeMode?: 'cover' | 'contain';
    backgroundColor?: string | 'transparent';
  };
};

const config: ZenoExpoConfig = {
  name: 'Zeno',
  slug: 'zeno',
  version: '0.1.0',
  // Main launcher icon (home screen). Prebuild generates mipmap-* density variants.
  icon: './assets/icon.png',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  scheme: 'zeno',
  // Native splash is intentionally transparent: it acts only as an OS-level
  // bridge until JS loads, then hides immediately. The branded, animated React
  // splash (below) is the real startup the user sees — no icon-on-white flash.
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: 'transparent',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.zeno.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Zeno needs your location to find nearby affordable food and shopping options.',
    },
  },
  android: {
    // Adaptive icon for better compression
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.zeno.app',
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'POST_NOTIFICATIONS',
      'SCHEDULE_EXACT_ALARM',
    ],
    intentFilters: [],
  },
  web: {
    bundler: 'metro',
  },
  // Notifications plugin with icons
  plugins: [
    'expo-router',
    'expo-sqlite',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Allow $(PRODUCT_NAME) to use your location.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#ffffff',
        sounds: ['./assets/notification.wav'],
        androidExactAlarm: true,
      },
    ],
  ],
  extra: {
    eas: {
      projectId: 'zeno-prod',
    },
  },
};

export default config;
