import { useMemo, useEffect, useState, useRef } from 'react';
import { useTransactionStore } from '@/store/transactionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useMysticCoinStore } from '@/store/mysticCoinStore';

/**
 * Returns today's date as YYYY-MM-DD in the device's local timezone.
 * Used for both filtering today's transactions and tracking the
 * daily coin reward boundary.
 */
function getLocalDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Check whether an ISO-8601 datetime string falls on the same calendar
 * day as the device's local date.  Converts the stored UTC instant to
 * local time before comparing.
 */
function isSameLocalDay(isoDate: string): boolean {
  const d = new Date(isoDate);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export type ChallengeStatus = 'no-budget' | 'normal' | 'warning' | 'danger';

export interface DailyChallengeResult {
  /** Daily budget in minor units (0 means unset). */
  dailyBudget: number;
  /** Today's total expenses in minor units. */
  todayExpenses: number;
  /** Percentage of budget used (0–100). */
  percent: number;
  /** Visual / status classification. */
  status: ChallengeStatus;
  /** Amount remaining in minor units (never negative). */
  remaining: number;
  /** Total mystic coins the user has ever earned. */
  coins: number;
  /** True if a coin was just awarded this render cycle. */
  coinJustAwarded: boolean;
  /** The user's currency code for formatting. */
  currency: string;
  /** True when a daily budget has been configured (> 0). */
  hasBudget: boolean;
}

/**
 * Tracks daily spending against the user's daily budget and auto-awards
 * a mystic coin when the user is within budget on a new day.
 */
export function useDailyChallenge(): DailyChallengeResult {
  const transactions = useTransactionStore((s) => s.transactions);
  const dailyBudget = useSettingsStore((s) => s.dailyBudget);
  const currency = useSettingsStore((s) => s.currency);
  const coins = useMysticCoinStore((s) => s.coins);
  const awardDailyCoin = useMysticCoinStore((s) => s.awardDailyCoin);

  const todayDateStr = getLocalDateString();
  const [coinJustAwarded, setCoinJustAwarded] = useState(false);
  // Guard to only attempt coin award once per hook lifecycle (the effect
  // re-runs when todayExpenses changes, but awardDailyCoin guards the
  // date boundary internally).
  const hasAttemptedAward = useRef(false);

  // --- Today's expenses ---------------------------------------------------
  const todayExpenses = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'expense' && isSameLocalDay(t.occurredAt))
        .reduce((sum, t) => sum + Math.abs(t.amountMinor), 0),
    [transactions],
  );

  // --- Status and progress ------------------------------------------------
  const { percent, status, remaining } = useMemo(() => {
    if (!dailyBudget || dailyBudget <= 0) {
      return { percent: 0, status: 'no-budget' as ChallengeStatus, remaining: 0 };
    }
    const pct = Math.min(100, Math.round((todayExpenses / dailyBudget) * 100));
    const rem = Math.max(0, dailyBudget - todayExpenses);

    let st: ChallengeStatus;
    if (pct >= 90) st = 'danger';
    else if (pct >= 60) st = 'warning';
    else st = 'normal';

    return { percent: pct, status: st, remaining: rem };
  }, [todayExpenses, dailyBudget]);

  // --- Auto-award coin ----------------------------------------------------
  // Award a mystic coin when the user is within budget on a new day.
  // The `awardDailyCoin` call is idempotent — it only awards when
  // lastRewardDate !== today.
  useEffect(() => {
    if (hasAttemptedAward.current) return;
    if (!dailyBudget || dailyBudget <= 0) return;
    if (todayExpenses > dailyBudget) return;

    const awarded = awardDailyCoin(todayDateStr);
    if (!awarded) {
      hasAttemptedAward.current = true;
      return;
    }

    setCoinJustAwarded(true);
    // Clear the celebration message after 4 seconds
    const timer = setTimeout(() => setCoinJustAwarded(false), 4000);

    hasAttemptedAward.current = true;
    return () => clearTimeout(timer);
  }, [dailyBudget, todayExpenses, todayDateStr, awardDailyCoin]);

  return {
    dailyBudget,
    todayExpenses,
    percent,
    status,
    remaining,
    coins,
    coinJustAwarded,
    currency,
    hasBudget: dailyBudget > 0,
  };
}
