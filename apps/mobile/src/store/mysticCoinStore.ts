import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MysticCoinState {
  /** Total mystic coins the user has earned */
  coins: number;
  /** ISO date string (YYYY-MM-DD in local timezone) of the last daily coin reward */
  lastRewardDate: string | null;
  /**
   * Award a daily coin if one hasn't been awarded today yet.
   * Returns true if a coin was awarded, false if already awarded today.
   */
  awardDailyCoin: (todayDate: string) => boolean;
  /** Reset all coins (for testing or data reset) */
  resetCoins: () => void;
}

export const useMysticCoinStore = create<MysticCoinState>()(
  persist(
    (set, get) => ({
      coins: 0,
      lastRewardDate: null,

      awardDailyCoin: (todayDate: string) => {
        const { lastRewardDate, coins } = get();
        // Already rewarded today — skip
        if (lastRewardDate === todayDate) return false;
        set({ coins: coins + 1, lastRewardDate: todayDate });
        return true;
      },

      resetCoins: () => set({ coins: 0, lastRewardDate: null }),
    }),
    {
      name: 'mystic-coin-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
