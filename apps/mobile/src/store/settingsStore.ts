import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/i18n';
import { Locale } from 'shared';
import { currencyResolver } from '@/utils/currencyResolver';

interface SettingsState {
  language: Locale;
  currency: string;
  monthStartDay: number;
  dailyBudget: number;
  aiEnabled: boolean;
  nearbyEnabled: boolean;
  reminderEnabled: boolean;
  currencyInitialized: boolean;
  setLanguage: (language: Locale) => void;
  setCurrency: (currency: string) => void;
  setMonthStartDay: (day: number) => void;
  setDailyBudget: (budget: number) => void;
  setAiEnabled: (enabled: boolean) => void;
  setNearbyEnabled: (enabled: boolean) => void;
  setReminderEnabled: (enabled: boolean) => void;
  initializeCurrency: () => Promise<void>;
  resetSettings: () => void;
}

const safeStorage =
  AsyncStorage && typeof AsyncStorage.setItem === 'function'
    ? createJSONStorage(() => AsyncStorage)
    : undefined;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: (i18n.language as Locale) || 'en',
      currency: 'USD',
      monthStartDay: 1,
      dailyBudget: 0,
      aiEnabled: false,
      nearbyEnabled: false,
      reminderEnabled: true,
      currencyInitialized: false,
      setLanguage: (language) => {
        set({ language });
        i18n.changeLanguage(language);
      },
      setCurrency: (currency) => set({ currency }),
      setMonthStartDay: (day) => set({ monthStartDay: day }),
      setDailyBudget: (budget) => set({ dailyBudget: budget }),
      setAiEnabled: (enabled) => set({ aiEnabled: enabled }),
      setNearbyEnabled: (enabled) => set({ nearbyEnabled: enabled }),
      setReminderEnabled: (enabled) => set({ reminderEnabled: enabled }),
      initializeCurrency: async () => {
        const resolvedCurrency = await currencyResolver.getCurrencyCode();
        set({ currency: resolvedCurrency, currencyInitialized: true });
      },
      resetSettings: () => set({
        language: 'en',
        currency: 'USD',
        monthStartDay: 1,
        dailyBudget: 0,
        aiEnabled: false,
        nearbyEnabled: false,
        reminderEnabled: true,
        currencyInitialized: false,
      }),
    }),
    {
      name: 'settings-storage',
      ...(safeStorage ? { storage: safeStorage } : {}),
      onRehydrateStorage: () => (state) => {
        if (state?.language && i18n.language !== state.language) {
          i18n.changeLanguage(state.language);
        }
        // Only initialize currency on first launch (when currencyInitialized is false)
        if (state && !state.currencyInitialized) {
          state.initializeCurrency?.().catch(console.error);
        }
      },
    }
  )
);
