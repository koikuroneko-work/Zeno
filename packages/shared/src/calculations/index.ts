import { Transaction } from '../schemas';

export interface MonthlySummary {
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  totalTransferMinor: number;
  remainingMinor: number;
  topCategories: { categoryId: string; totalMinor: number }[];
}

export interface BudgetStatus {
  categoryId: string;
  limitMinor: number;
  spentMinor: number;
  percentage: number;
  level: 'safe' | 'attention' | 'high' | 'over';
}

export function getMonthBounds(occurredAt: string, monthStartDay: number = 1) {
  const d = new Date(occurredAt);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based (0=Jan, 11=Dec)

  // Start of the month (monthStartDay of current month at 00:00:00)
  const start = new Date(year, month, monthStartDay);

  // End of the month (day before monthStartDay of next month at 23:59:59.999)
  const end = new Date(year, month + 1, monthStartDay - 1);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function isInMonth(occurredAt: string, targetMonth: string, monthStartDay: number = 1): boolean {
  // Parse the target month/year
  const [targetYearStr, targetMonthStr] = targetMonth.split('-');
  const targetYear = parseInt(targetYearStr, 10);
  const targetMonth0 = parseInt(targetMonthStr, 10) - 1; // Convert to 0-based (0=Jan)

  // Build the [start, end] window for this monthly period using UTC. When
  // monthStartDay > 1 the period spans two calendar months (e.g. Jul 15 - Aug 14),
  // so a pure month/year check would miss the tail dates of the next month.
  const start = new Date(Date.UTC(targetYear, targetMonth0, monthStartDay));
  const end = new Date(Date.UTC(targetYear, targetMonth0 + 1, monthStartDay - 1, 23, 59, 59, 999));

  const occurred = new Date(occurredAt).getTime();
  return occurred >= start.getTime() && occurred <= end.getTime();
}

export function calculateMonthlySummary(
  transactions: Transaction[],
  month: string,
  monthStartDay: number = 1
): MonthlySummary {
  const filtered = transactions.filter((t) => !t.deletedAt && isInMonth(t.occurredAt, month, monthStartDay));

  let totalIncomeMinor = 0;
  let totalExpenseMinor = 0;
  let totalTransferMinor = 0;
  const categoryMap: Record<string, number> = {};

  for (const t of filtered) {
    switch (t.type) {
      case 'income':
        totalIncomeMinor += t.amountMinor;
        break;
      case 'expense':
        totalExpenseMinor += t.amountMinor;
        break;
      case 'transfer':
        totalTransferMinor += t.amountMinor;
        break;
      case 'adjustment':
        // Adjustments can be positive or negative; treat as income/expense
        if (t.amountMinor >= 0) {
          totalIncomeMinor += t.amountMinor;
        } else {
          totalExpenseMinor += Math.abs(t.amountMinor);
        }
        break;
    }
    if (t.type === 'expense') {
      categoryMap[t.categoryId] = (categoryMap[t.categoryId] || 0) + t.amountMinor;
    }
  }

  const remainingMinor = totalIncomeMinor - totalExpenseMinor;
  const topCategories = Object.entries(categoryMap)
    .map(([categoryId, totalMinor]) => ({ categoryId, totalMinor }))
    .sort((a, b) => b.totalMinor - a.totalMinor);

  return { totalIncomeMinor, totalExpenseMinor, totalTransferMinor, remainingMinor, topCategories };
}

export function calculateBudgetStatus(
  transactions: Transaction[],
  budgets: { categoryId: string; limitMinor: number }[],
  month: string,
  monthStartDay: number = 1
): BudgetStatus[] {
  const filtered = transactions.filter((t) => !t.deletedAt && t.type === 'expense' && isInMonth(t.occurredAt, month, monthStartDay));

  const spentByCategory: Record<string, number> = {};
  for (const t of filtered) {
    spentByCategory[t.categoryId] = (spentByCategory[t.categoryId] || 0) + t.amountMinor;
  }

  return budgets.map((b) => {
    const spentMinor = spentByCategory[b.categoryId] || 0;
    const percentage = b.limitMinor > 0 ? (spentMinor / b.limitMinor) * 100 : 0;
    let level: BudgetStatus['level'] = 'safe';
    if (percentage >= 100) level = 'over';
    else if (percentage >= 80) level = 'high';
    else if (percentage >= 50) level = 'attention';

    return {
      categoryId: b.categoryId,
      limitMinor: b.limitMinor,
      spentMinor,
      percentage,
      level,
    };
  });
}
