import { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius } from '@/design/tokens';
import { useTransactionStore } from '@/store/transactionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { calculateMonthlySummary } from 'shared';
import { formatCurrency } from '@/utils/currencyFormatter';
import type { Transaction } from 'shared';

// Format date to YYYY-MM for month comparison
function getYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Get date range for "this week" (Monday to Sunday)
function getThisWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Get date range for "last week"
function getLastWeekRange(): { start: Date; end: Date } {
  const { start: thisWeekStart } = getThisWeekRange();
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
  return { start: lastWeekStart, end: lastWeekEnd };
}

// Calculate total for a date range
function sumForDateRange(
  transactions: { type: string; amountMinor: number; occurredAt: string }[],
  start: Date,
  end: Date,
  type: 'expense' | 'income'
): number {
  return transactions
    .filter((t) => {
      const d = new Date(t.occurredAt);
      return t.type === type && d >= start && d <= end;
    })
    .reduce((sum, t) => sum + Math.abs(t.amountMinor), 0);
}

// Calculate today's totals
function sumForDay(
  transactions: { type: string; amountMinor: number; occurredAt: string }[],
  date: Date,
  type: 'expense' | 'income'
): number {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return sumForDateRange(transactions, startOfDay, endOfDay, type);
}


export default function InsightsScreen() {
  const { t } = useTranslation();
  const transactions = useTransactionStore(s => s.transactions);
  const { monthStartDay, currency } = useSettingsStore();

  // Memoize all calculations — only re-run when transactions or monthStartDay change.
  // Without this the entire chain (5+ filter/reduce passes) runs on every render.
  const calculations = useMemo(() => {
    const now = new Date();
    const thisMonth = getYearMonth(now);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = getYearMonth(lastMonthDate);

    const txs: Transaction[] = transactions;
    const thisMonthSummary = calculateMonthlySummary(txs, thisMonth, monthStartDay);
    const lastMonthSummary = calculateMonthlySummary(txs, lastMonth, monthStartDay);

    const monthlyDiff = thisMonthSummary.totalExpenseMinor - lastMonthSummary.totalExpenseMinor;
    const monthlyDiffPercent =
      lastMonthSummary.totalExpenseMinor > 0
        ? Math.round((Math.abs(monthlyDiff) / lastMonthSummary.totalExpenseMinor) * 100)
        : 0;

    const { start: thisWeekStart, end: thisWeekEnd } = getThisWeekRange();
    const { start: lastWeekStart, end: lastWeekEnd } = getLastWeekRange();
    const thisWeekExpense = sumForDateRange(txs, thisWeekStart, thisWeekEnd, 'expense');
    const lastWeekExpense = sumForDateRange(txs, lastWeekStart, lastWeekEnd, 'expense');
    const weeklyDiff = thisWeekExpense - lastWeekExpense;
    const weeklyDiffPercent =
      lastWeekExpense > 0
        ? Math.round((Math.abs(weeklyDiff) / lastWeekExpense) * 100)
        : 0;

    const todayExpense = sumForDay(txs, now, 'expense');
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayExpense = sumForDay(txs, yesterday, 'expense');
    const dailyDiff = todayExpense - yesterdayExpense;

    const categoryBreakdown = thisMonthSummary.topCategories.map(c => ({
      categoryId: c.categoryId,
      total: c.totalMinor,
    }));
    const totalCategoryExpense = categoryBreakdown.reduce((sum, c) => sum + c.total, 0);
    const maxCategory = categoryBreakdown[0]?.total || 1;

    return {
      thisMonthSummary,
      lastMonthSummary,
      monthlyDiff, monthlyDiffPercent,
      thisWeekExpense, lastWeekExpense,
      weeklyDiff, weeklyDiffPercent,
      todayExpense, yesterdayExpense, dailyDiff,
      categoryBreakdown, totalCategoryExpense, maxCategory,
    };
  }, [transactions, monthStartDay]);

  const {
    thisMonthSummary, lastMonthSummary,
    monthlyDiff, monthlyDiffPercent,
    lastWeekExpense,
    weeklyDiff, weeklyDiffPercent,
    todayExpense, yesterdayExpense, dailyDiff,
    categoryBreakdown, totalCategoryExpense, maxCategory,
  } = calculations;

  const renderComparisonStatement = (
    diff: number,
    percent: number,
    greaterKey: string,
    lessKey: string,
    equalKey: string,
    noPrevKey: string,
    prevAmount: number
  ): string => {
    if (prevAmount === 0) return t(noPrevKey);
    if (diff === 0) return t(equalKey);
    if (diff > 0) return t(greaterKey, { percent });
    return t(lessKey, { percent });
  };

  const hasData = transactions.length > 0;

  if (!hasData) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, padding: 16 }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: '600',
            color: colors.ink,
            marginBottom: 16,
          }}
        >
          {t('insights.title')}
        </Text>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.inkLight, fontSize: 16 }}>
            {t('insights.noData')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      {/* Header */}
      <Text
        style={{
          fontSize: 20,
          fontWeight: '600',
          color: colors.ink,
          marginBottom: 24,
        }}
      >
        {t('insights.title')}
      </Text>

      {/* Monthly Summary Card */}
      <View
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.ink,
            marginBottom: spacing.md,
          }}
        >
          {t('insights.monthly')}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: colors.inkLight }}>{t('dashboard.income')}</Text>
          <Text style={{ fontWeight: '600', color: colors.mint }}>
            +{formatCurrency(thisMonthSummary.totalIncomeMinor, currency)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: colors.inkLight }}>{t('dashboard.expenses')}</Text>
          <Text style={{ fontWeight: '600', color: colors.coral }}>
            -{formatCurrency(thisMonthSummary.totalExpenseMinor, currency)}
          </Text>
        </View>
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: 8,
            marginTop: 4,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.ink, fontWeight: '600' }}>
              {t('dashboard.remaining')}
            </Text>
            <Text
              style={{
                fontWeight: '700',
                color: thisMonthSummary.remainingMinor >= 0 ? colors.mint : colors.coral,
              }}
            >
              {thisMonthSummary.remainingMinor >= 0 ? '+' : ''}
              {formatCurrency(thisMonthSummary.remainingMinor, currency)}
            </Text>
          </View>
        </View>
      </View>

      {/* Month Comparison Statement */}
      <View
        style={{
          backgroundColor:
            monthlyDiff > 0 ? colors.coral + '20' : colors.mint + '20',
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <Text style={{ color: colors.ink, fontSize: 14, textAlign: 'center' }}>
          {renderComparisonStatement(
            monthlyDiff,
            monthlyDiffPercent,
            'insights.compare.higher',
            'insights.compare.lower',
            'insights.compare.equal',
            'insights.compare.noPrevious',
            lastMonthSummary.totalExpenseMinor
          )}
        </Text>
      </View>

      {/* Category Breakdown */}
      <View
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.ink,
            marginBottom: spacing.md,
          }}
        >
          {t('insights.categoryBreakdown')}
        </Text>
        {categoryBreakdown.length === 0 ? (
          <Text style={{ color: colors.inkLight }}>{t('insights.noData')}</Text>
        ) : (
          categoryBreakdown.map(({ categoryId, total }) => {
            const percent =
              totalCategoryExpense > 0
                ? Math.round((total / totalCategoryExpense) * 100)
                : 0;
            return (
              <View key={categoryId} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: colors.ink, fontSize: 14 }}>
                    {t(`transactions.${categoryId}`, { defaultValue: categoryId })}
                  </Text>
                  <Text style={{ color: colors.inkLight, fontSize: 14 }}>
                    -{formatCurrency(total, currency)} ({percent}%)
                  </Text>
                </View>
                {/* Category bar */}
                <View
                  style={{
                    height: 8,
                    backgroundColor: colors.border,
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: 8,
                      width: `${(total / maxCategory) * 100}%`,
                      backgroundColor: colors.coral,
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Weekly Comparison */}
      <View
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.ink,
            marginBottom: spacing.sm,
          }}
        >
          {t('insights.compare.week')}
        </Text>
        <Text style={{ color: colors.inkLight, fontSize: 14 }}>
          {renderComparisonStatement(
            weeklyDiff,
            weeklyDiffPercent,
            'insights.compare.higher',
            'insights.compare.lower',
            'insights.compare.equal',
            'insights.compare.noPrevious',
            lastWeekExpense
          )}
        </Text>
      </View>

      {/* Today's Comparison */}
      <View
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.ink,
            marginBottom: spacing.sm,
          }}
        >
          {t('insights.compare.day')}
        </Text>
        <Text style={{ color: colors.inkLight, fontSize: 14 }}>
          {yesterdayExpense === 0 && todayExpense === 0
            ? t('insights.compare.noPrevious')
            : dailyDiff === 0
            ? t('insights.compare.equal')
            : dailyDiff > 0
            ? t('insights.compare.todayHigher', {
                amount: formatCurrency(dailyDiff, currency),
              })
            : t('insights.compare.todayLower', {
                amount: formatCurrency(Math.abs(dailyDiff), currency),
              })}
        </Text>
      </View>
    </ScrollView>
  );
}