/**
 * AI Advice Service
 *
 * Gathers the user's transaction data and sends it to the backend API
 * which generates real AI-powered financial advice (via Anthropic Claude).
 * Falls back to a local data-driven mock when the backend is unreachable
 * (e.g. during development without the API server running).
 *
 * No API keys ever touch the mobile app — all AI calls happen server-side.
 * All mock/local advice text uses i18n for translation.
 */

import type { Transaction } from 'shared';
import type { AiAdvicePayload, AiAdviceResponse } from 'shared';
import { formatCurrency } from '@/utils/currencyFormatter';
import i18n from '@/i18n';

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const ADVICE_ENDPOINT = `${API_BASE}/v1/ai/advice`;

/* ------------------------------------------------------------------ */
/*  Aggregation helpers                                                */
/* ------------------------------------------------------------------ */

function sumAmount(txns: Transaction[]): number {
  return txns.reduce((s, t) => s + Math.abs(t.amountMinor), 0);
}

function getCurrentMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getPreviousMonthBounds() {
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return {
    start: new Date(prevYear, prevMonth, 1),
    end: new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999),
  };
}

/* ------------------------------------------------------------------ */
/*  Build payload from transaction data                                */
/* ------------------------------------------------------------------ */

export function buildAdvicePayload(
  transactions: Transaction[],
  currency: string,
  dailyBudget: number,
): AiAdvicePayload | null {
  if (transactions.length < 3) return null;

  const monthStart = getCurrentMonthStart();
  const monthTx = transactions.filter((t) => new Date(t.occurredAt) >= monthStart);
  const cmExpenses = monthTx.filter((t) => t.type === 'expense');
  const cmIncome = monthTx.filter((t) => t.type === 'income');

  if (cmExpenses.length === 0 && cmIncome.length === 0) return null;

  const totalExpenseMinor = sumAmount(cmExpenses);
  const totalIncomeMinor = sumAmount(cmIncome);
  const daysIntoMonth = Math.max(1, Math.round((Date.now() - monthStart.getTime()) / 86_400_000));
  const dailyAverageMinor = Math.round(totalExpenseMinor / daysIntoMonth);

  // Category breakdown
  const catMap = new Map<string, { name: string; total: number }>();
  for (const t of cmExpenses) {
    const existing = catMap.get(t.categoryId);
    if (existing) {
      existing.total += Math.abs(t.amountMinor);
    } else {
      catMap.set(t.categoryId, { name: i18n.t('transactions.' + t.categoryId), total: Math.abs(t.amountMinor) });
    }
  }

  const categoryTotals = [...catMap.entries()]
    .map(([categoryId, { name, total }]) => ({
      categoryId,
      categoryName: name,
      totalMinor: total,
    }))
    .sort((a, b) => b.totalMinor - a.totalMinor);

  const topCat = categoryTotals[0];
  const topCategoryName = topCat?.categoryName;
  const topCategoryPercent = topCat && totalExpenseMinor > 0
    ? Math.round((topCat.totalMinor / totalExpenseMinor) * 100)
    : undefined;

  // Previous month
  const { start: pmStart, end: pmEnd } = getPreviousMonthBounds();
  const prevMonthExpenseMinor = sumAmount(
    transactions.filter((t) => {
      const d = new Date(t.occurredAt);
      return t.type === 'expense' && d >= pmStart && d <= pmEnd;
    }),
  );

  return {
    currency,
    language: i18n.language,
    totalIncomeMinor,
    totalExpenseMinor,
    categoryTotals,
    dailyAverageMinor,
    transactionCount: cmExpenses.length + cmIncome.length,
    topCategoryName,
    topCategoryPercent,
    prevMonthExpenseMinor: prevMonthExpenseMinor > 0 ? prevMonthExpenseMinor : undefined,
    hasBudget: dailyBudget > 0,
    dailyBudgetMinor: dailyBudget > 0 ? dailyBudget * 100 : undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Call backend API — falls back to local mock on failure             */
/* ------------------------------------------------------------------ */

export async function fetchAiAdvice(
  transactions: Transaction[],
  currency: string,
  dailyBudget: number,
): Promise<AiAdviceResponse> {
  const payload = buildAdvicePayload(transactions, currency, dailyBudget);
  if (!payload) {
    return {
      analysis: i18n.t('ai.advice.analysisDefault'),
      advice: [],
      motivation: i18n.t('ai.advice.motivationDefault'),
    };
  }

  try {
    const response = await fetch(ADVICE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`AI advice API returned ${response.status}, using local fallback`);
      return generateLocalAdvice(payload);
    }

    const json: any = await response.json();
    return json.data as AiAdviceResponse;
  } catch (err) {
    console.warn('AI advice API unreachable, using local fallback:', err);
    return generateLocalAdvice(payload);
  }
}

/* ------------------------------------------------------------------ */
/*  Local fallback — data-driven logic with i18n translations          */
/* ------------------------------------------------------------------ */

function generateLocalAdvice(payload: AiAdvicePayload): AiAdviceResponse {
  const { t } = i18n;
  const cur = payload.currency;
  const {
    totalIncomeMinor, totalExpenseMinor, dailyAverageMinor,
    categoryTotals, topCategoryName, topCategoryPercent,
    prevMonthExpenseMinor,
  } = payload;

  const ratio = totalIncomeMinor > 0 ? (totalExpenseMinor / totalIncomeMinor) * 100 : 0;
  const advice: AiAdviceResponse['advice'] = [];

  // Income health
  if (totalIncomeMinor > 0) {
    if (ratio > 100) {
      advice.push({
        icon: '🚨',
        title: t('ai.advice.incomeExceedsTitle'),
        detail: t('ai.advice.incomeExceedsDetail', {
          amount: fmt(totalExpenseMinor, cur),
          percent: ratio.toFixed(0),
        }),
      });
    } else if (ratio > 70) {
      advice.push({
        icon: '⚠️',
        title: t('ai.advice.watchSpendingTitle'),
        detail: t('ai.advice.watchSpendingDetail', {
          percent: ratio.toFixed(0),
        }),
      });
    } else {
      advice.push({
        icon: '✅',
        title: t('ai.advice.healthyFinancesTitle'),
        detail: t('ai.advice.healthyFinancesDetail', {
          percent: ratio.toFixed(0),
        }),
      });
    }
  }

  // Top category
  if (topCategoryName && topCategoryPercent && topCategoryPercent > 35) {
    advice.push({
      icon: '🎯',
      title: t('ai.advice.topCategoryTitle', { category: topCategoryName }),
      detail: t('ai.advice.topCategoryDetail', {
        category: topCategoryName,
        percent: topCategoryPercent,
        amount: fmt(Math.round(totalExpenseMinor * 0.1 * topCategoryPercent / 100), cur),
      }),
    });
  }

  // Daily spending
  if (dailyAverageMinor > 0) {
    const projected = Math.round(dailyAverageMinor * 30);
    const trendNote = projected > totalExpenseMinor
      ? t('ai.advice.dailyPaceFaster')
      : t('ai.advice.dailyPaceSteady');
    advice.push({
      icon: '📊',
      title: t('ai.advice.dailyPaceTitle'),
      detail: t('ai.advice.dailyPaceDetail', {
        dailyAvg: fmt(Math.round(dailyAverageMinor), cur),
        projected: fmt(projected, cur),
        trendNote,
      }),
    });
  }

  // Savings tip from 2nd category
  if (categoryTotals.length >= 2) {
    const second = categoryTotals[1];
    const saveAmount = Math.round(second.totalMinor * 0.15);
    if (saveAmount > 100) {
      advice.push({
        icon: '🏦',
        title: t('ai.advice.saveOnTitle', { category: second.categoryName }),
        detail: t('ai.advice.saveOnDetail', {
          category: second.categoryName,
          amount: fmt(saveAmount, cur),
        }),
      });
    }
  }

  // Month comparison
  if (prevMonthExpenseMinor && prevMonthExpenseMinor > 0 && totalExpenseMinor > 0) {
    const change = Math.round(((totalExpenseMinor - prevMonthExpenseMinor) / prevMonthExpenseMinor) * 100);
    if (Math.abs(change) >= 5) {
      advice.push({
        icon: change > 0 ? '📈' : '📉',
        title: change > 0 ? t('ai.advice.spendingUpTitle') : t('ai.advice.spendingDownTitle'),
        detail: change > 0
          ? t('ai.advice.spendingUpDetail', { percent: change })
          : t('ai.advice.spendingDownDetail', { percent: Math.abs(change) }),
      });
    }
  }

  // Motivation
  let motivationKey = 'ai.advice.motivationDefault';
  if (ratio < 50) motivationKey = 'ai.advice.motivationExcellent';
  else if (ratio > 100) motivationKey = 'ai.advice.motivationOverspend';

  // Analysis
  let analysisKey = 'ai.advice.analysisDefault';
  let analysisParams: Record<string, string> = {};
  if (totalExpenseMinor === 0) {
    analysisKey = 'ai.advice.analysisNoExpenses';
  } else if (totalIncomeMinor === 0) {
    analysisKey = 'ai.advice.analysisNoIncome';
    analysisParams = { amount: fmt(totalExpenseMinor, cur) };
  } else if (ratio > 100) {
    analysisKey = 'ai.advice.analysisOverspend';
    analysisParams = {
      amount: fmt(totalExpenseMinor, cur),
      income: fmt(totalIncomeMinor, cur),
      percent: ratio.toFixed(0),
    };
  } else if (ratio > 70) {
    analysisKey = 'ai.advice.analysisModerate';
    analysisParams = {
      amount: fmt(totalExpenseMinor, cur),
      income: fmt(totalIncomeMinor, cur),
      percent: ratio.toFixed(0),
    };
  } else {
    analysisKey = 'ai.advice.analysisGreat';
    analysisParams = {
      amount: fmt(totalExpenseMinor, cur),
      income: fmt(totalIncomeMinor, cur),
      percent: ratio.toFixed(0),
    };
  }

  return {
    analysis: t(analysisKey, analysisParams),
    advice,
    motivation: t(motivationKey),
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(amountMinor: number, currency: string): string {
  return formatCurrency(amountMinor, currency);
}
