import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/design/tokens';

// Get icon name based on route and focus state
function getIconName(route: string, focused: boolean): keyof typeof Ionicons.glyphMap {
  switch (route) {
    case 'index':
      return focused ? 'home' : 'home-outline';
    case 'ledger':
      return focused ? 'list' : 'list-outline';
    case 'add':
      return focused ? 'add-circle' : 'add-circle-outline';
    case 'ai':
      return focused ? 'sparkles' : 'sparkles-outline';
    case 'nearby':
      return focused ? 'location' : 'location-outline';
    case 'insights':
      return focused ? 'bar-chart' : 'bar-chart-outline';
    case 'settings':
      return focused ? 'settings' : 'settings-outline';
    default:
      return 'information-circle-outline';
  }
}

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.inkLight,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerShown: false,
        tabBarIcon: ({ focused }: { focused: boolean }) => (
          <Ionicons
            name={getIconName(route.name, focused)}
            size={24}
            color={focused ? colors.coral : colors.inkLight}
          />
        )
      })}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarLabel: t('navigation.home') }}
      />
      <Tabs.Screen
        name="ledger"
        options={{ tabBarLabel: t('navigation.ledger') }}
      />
      <Tabs.Screen
        name="add"
        options={{ tabBarLabel: t('navigation.add') }}
      />
      <Tabs.Screen
        name="ai"
        options={{ tabBarLabel: t('navigation.ai') }}
      />
      <Tabs.Screen
        name="nearby"
        options={{ tabBarLabel: t('navigation.nearby') }}
      />
      <Tabs.Screen
        name="insights"
        options={{ tabBarLabel: t('navigation.insights') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ tabBarLabel: t('navigation.settings') }}
      />
    </Tabs>
  );
}