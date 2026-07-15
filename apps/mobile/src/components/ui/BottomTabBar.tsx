import { View, TouchableOpacity, Text } from 'react-native';
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, NavigationState, NavigationProp } from '@react-navigation/native';
import { tabIcons, TabIconName } from '@/design/icons';
import { colors } from '@/design/tokens';
import { useTranslation } from 'react-i18next';

type TabParamList = {
  home: undefined;
  ledger: undefined;
  add: undefined;
  insights: undefined;
  settings: undefined;
};

type TabRouteName = keyof TabParamList;

const tabIconMap: Record<TabRouteName, TabIconName> = {
  home: tabIcons.home,
  ledger: tabIcons.ledger,
  add: tabIcons.add,
  insights: tabIcons.insights,
  settings: tabIcons.settings,
};

const tabLabelKeyMap: Record<TabRouteName, string> = {
  home: 'navigation.home',
  ledger: 'navigation.ledger',
  add: 'navigation.add',
  insights: 'navigation.insights',
  settings: 'navigation.settings',
};

export const BottomTabBar = () => {
  const navigation = useNavigation<NavigationProp<TabParamList>>();
  const { t } = useTranslation();
  const state = navigation.getState() as NavigationState<TabParamList>;
  const routes = state.routes;
  const focused = state.index;

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 56,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderColor: colors.border,
      }}
    >
      {routes.map((route, index) => {
        const isFocused = focused === index;
        const routeName = route.name as TabRouteName;
        const iconName = tabIconMap[routeName] ?? tabIcons.home;
        const labelKey = tabLabelKeyMap[routeName];
        const safeLabelKey = labelKey ?? 'navigation.home';

        return (
          <TouchableOpacity
            key={route.name}
            onPress={() => {
              navigation.navigate(routeName);
            }}
            activeOpacity={0.7}
            style={{ paddingVertical: 8 }}
          >
            <View style={{ alignItems: 'center' }}>
              <MaterialCommunityIcons
                name={iconName as keyof typeof MaterialCommunityIcons.glyphMap}
                size={24}
                color={isFocused ? colors.coral : colors.inkLight}
              />
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 10,
                  color: isFocused ? colors.coral : colors.inkLight,
                }}
              >
                {t(safeLabelKey)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};