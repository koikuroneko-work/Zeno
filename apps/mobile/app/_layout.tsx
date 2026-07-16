import { Stack } from 'expo-router';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, Animated, StatusBar, Image } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '@/design/tokens';
import { useSettingsStore } from '@/store/settingsStore';
import '@/i18n';

// Keep native splash visible while we prepare
SplashScreen.preventAutoHideAsync();

// Tell the OS how to handle incoming notifications (foreground + background).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const PERMISSIONS_SHOWN_KEY = 'permissionsOnboardingShown';

type PermissionStep = 'notifications' | 'location' | 'done';

export default function RootLayout() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [showPermissions, setShowPermissions] = useState(false);
  const [step, setStep] = useState<PermissionStep>('notifications');
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [skipping, setSkipping] = useState(false);

  // ═══ Splash animation refs ═══
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  // ═══ Kick off splash spring animation ═══
  const animateSplash = useCallback(
    (onComplete?: () => void) => {
      Animated.sequence([
        // Logo bounces in with spring
        Animated.parallel([
          Animated.spring(logoScale, {
            toValue: 1,
            tension: 80,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        // Tagline fades in after logo settles
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Native splash no longer needed — hide it at animation end so the
        // React splash takes over seamlessly.
        SplashScreen.hideAsync().catch(() => {});
        // Keep the finished (animated) React splash visible for a short beat so
        // the logo/tagline motion actually reads, then transition to the app.
        // Bounded and fast — not the old fixed 1.4s floor.
        setTimeout(() => onComplete?.(), 350);
      });
    },
    [logoScale, logoOpacity, taglineOpacity],
  );

  // Check if permission onboarding has been shown before
  useEffect(() => {
    // Reveal the app once the splash animation finishes. A safety timeout
    // guarantees we never get stuck on the splash if the animation callback is
    // missed (max wait ~1.5s on slow devices, instead of a fixed 1.4s floor on
    // every launch).
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      setLoading(false);
    };
    const safety = setTimeout(reveal, 1500);

    // Hide the native (transparent) splash immediately so the animated React
    // splash is the only thing visible from the first frame — no icon-on-white
    // flash. The native splash is just an OS bridge now.
    SplashScreen.hideAsync().catch(() => {});

    // Kick off the splash animation immediately on mount — don't wait for the
    // async storage/notification work below, which would delay the logo motion.
    animateSplash(reveal);

    (async () => {
      try {
        // Create Android notification channel (required for Android 8+)
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
          await Notifications.setNotificationChannelAsync('reminders', {
            name: 'Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: 'notification.wav',
          });
        }

        // Currency is initialized once via the settings store's
        // onRehydrateStorage hook on first launch — no need to trigger it here
        // (avoids a duplicate GPS + network resolution on startup).

        const shown = await AsyncStorage.getItem(PERMISSIONS_SHOWN_KEY);
        if (shown !== 'true') {
          setShowPermissions(true);
        }
      } catch {
        // If we can't read storage, just show the app
      }
    })();

    return () => clearTimeout(safety);
  }, [animateSplash]);

  const handleRequestNotifications = async () => {
    if (!Device.isDevice) {
      // Skip notifications on emulator
      setNotificationsGranted(false);
      setStep('location');
      return;
    }

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationsGranted(status === 'granted');
    } catch {
      // Permission request failed, continue anyway
    }
    setStep('location');
  };

  const handleRequestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === 'granted');
    } catch {
      // Permission request failed, continue anyway
    }
    setStep('done');
  };

  const handleFinish = async () => {
    setSkipping(true);
    try {
      await AsyncStorage.setItem(PERMISSIONS_SHOWN_KEY, 'true');
    } catch {
      // Non-critical, continue
    }
    // Re-detect currency now that location permission might have been granted.
    // On first launch, initializeCurrency() runs before onboarding, when location
    // permission hasn't been granted yet. Once the user finishes onboarding, we
    // re-run detection so GPS-based resolution can work.
    if (locationGranted) {
      const settingsState = useSettingsStore.getState();
      if (settingsState.currencyInitialized) {
        settingsState.initializeCurrency().catch(console.error);
      }
    }
    setShowPermissions(false);
    setSkipping(false);
  };

  // Show animated splash while loading
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {/* Diagonal accent shape */}
        <View style={{
          position: 'absolute',
          top: -120,
          right: -80,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: colors.mint,
          opacity: 0.3,
        }} />
        <View style={{
          position: 'absolute',
          bottom: -60,
          left: -60,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: colors.butter,
          opacity: 0.25,
        }} />

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          {/* Animated logo area */}
          <Animated.View style={{
            alignItems: 'center',
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
            marginBottom: 24,
          }}>
            <View
              style={{
                width: 120,
                height: 120,
                marginBottom: 20,
                borderRadius: 24,
                justifyContent: 'center',
                alignItems: 'center',
                // Subtle shadow for depth
                shadowColor: colors.ink,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Image
                source={require('../assets/splash-icon.png')}
                style={{ width: 120, height: 120 }}
              />
            </View>
            <Text style={{
              fontSize: 32,
              fontWeight: '800',
              color: colors.ink,
              letterSpacing: -0.5,
            }}>Zeno</Text>
          </Animated.View>

          {/* Tagline that fades in after logo */}
          <Animated.View style={{ opacity: taglineOpacity }}>
            <Text style={{
              fontSize: 15,
              color: colors.inkLight,
              textAlign: 'center',
              lineHeight: 22,
            }}>
              {t('onboarding.subtitle')}
            </Text>
          </Animated.View>
        </View>

        {/* Bottom loading indicator */}
        <Animated.View style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          alignItems: 'center',
          opacity: taglineOpacity,
        }}>
          <ActivityIndicator size="small" color={colors.coral} />
        </Animated.View>
      </View>
    );
  }

  // Show permission onboarding on first launch
  if (showPermissions) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.ink, textAlign: 'center', marginBottom: 16 }}>
          Zeno
        </Text>
        <Text style={{ fontSize: 16, color: colors.inkLight, textAlign: 'center', marginBottom: 48 }}>
          {t('onboarding.subtitle')}
        </Text>

        {step === 'notifications' && (
          <View>
            <View style={{
              backgroundColor: colors.surfaceAlt,
              borderRadius: 16,
              padding: 24,
              marginBottom: 32,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 40, marginBottom: 16 }}>🔔</Text>
              <Text style={{ fontSize: 20, fontWeight: '600', color: colors.ink, marginBottom: 8 }}>
                {t('dashboard.reminder')}
              </Text>
              <Text style={{ fontSize: 14, color: colors.inkLight, textAlign: 'center' }}>
                {t('onboarding.notificationPrompt')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleRequestNotifications}
              style={{
                backgroundColor: colors.coral,
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ color: colors.surface, fontWeight: '700', fontSize: 16 }}>
                {t('onboarding.enableNotifications')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setNotificationsGranted(false); setStep('location'); }}
              style={{ paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: colors.inkLight, fontSize: 14 }}>
                {t('onboarding.skip')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'location' && (
          <View>
            <View style={{
              backgroundColor: colors.surfaceAlt,
              borderRadius: 16,
              padding: 24,
              marginBottom: 32,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 40, marginBottom: 16 }}>📍</Text>
              <Text style={{ fontSize: 20, fontWeight: '600', color: colors.ink, marginBottom: 8 }}>
                {t('nearby.title')}
              </Text>
              <Text style={{ fontSize: 14, color: colors.inkLight, textAlign: 'center' }}>
                {t('nearby.permissionBody')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleRequestLocation}
              style={{
                backgroundColor: colors.coral,
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ color: colors.surface, fontWeight: '700', fontSize: 16 }}>
                {t('onboarding.enableLocation')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setLocationGranted(false); setStep('done'); }}
              style={{ paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: colors.inkLight, fontSize: 14 }}>
                {t('onboarding.skip')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'done' && (
          <View>
            <View style={{
              backgroundColor: colors.surfaceAlt,
              borderRadius: 16,
              padding: 24,
              marginBottom: 32,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 40, marginBottom: 16 }}>🎉</Text>
              <Text style={{ fontSize: 20, fontWeight: '600', color: colors.ink, marginBottom: 8 }}>
                {t('onboarding.welcome')}
              </Text>
              <Text style={{ fontSize: 14, color: colors.inkLight, textAlign: 'center' }}>
                {notificationsGranted && `${t('onboarding.notificationsEnabled')}  `}
                {locationGranted && t('onboarding.locationEnabled')}
                {!notificationsGranted && !locationGranted && t('onboarding.permissionsLater')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleFinish}
              disabled={skipping}
              style={{
                backgroundColor: colors.coral,
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: 'center',
                opacity: skipping ? 0.7 : 1,
              }}
            >
              <Text style={{ color: colors.surface, fontWeight: '700', fontSize: 16 }}>
                {skipping ? t('common.loading') : t('onboarding.done')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Normal app layout
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
