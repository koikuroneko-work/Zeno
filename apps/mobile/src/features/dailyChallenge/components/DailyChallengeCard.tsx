import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useDailyChallenge, ChallengeStatus } from '../hooks/useDailyChallenge';
import { colors } from '@/design/tokens';
import { formatCurrency } from '@/utils/currencyFormatter';

// ─── Style helpers ───────────────────────────────────────────────────────

interface CardStyle {
  cardBg: string;
  progressBg: string;
  progressFill: string;
  accent: string;
}

function resolveCardStyle(status: ChallengeStatus): CardStyle {
  switch (status) {
    case 'warning':
      return {
        cardBg: '#FFF8E1', // warm yellow tint
        progressBg: '#FFE08233',
        progressFill: colors.butterDark,
        accent: colors.butterDark,
      };
    case 'danger':
      return {
        cardBg: '#FFEBEE', // light red tint
        progressBg: '#E5737333',
        progressFill: colors.danger,
        accent: colors.danger,
      };
    default:
      return {
        cardBg: colors.surfaceAlt,
        progressBg: '#B2DFDB33',
        progressFill: colors.mint,
        accent: colors.mint,
      };
  }
}

function getStatusMessage(status: ChallengeStatus, percent: number, t: Function): string {
  switch (status) {
    case 'warning':
      return t('dailyChallenge.warning60');
    case 'danger':
      return percent >= 100
        ? t('dailyChallenge.overBudget')
        : t('dailyChallenge.warning90');
    default:
      return t('dailyChallenge.underBudget');
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────

/**
 * A slim game-style progress bar with rounded caps and a filled segment.
 */
function ProgressBar({
  percent,
  fillColor,
  trackColor,
}: {
  percent: number;
  fillColor: string;
  trackColor: string;
}) {
  return (
    <View
      style={{
        height: 20,
        backgroundColor: trackColor,
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <View
        style={{
          width: `${Math.min(percent, 100)}%`,
          height: '100%',
          backgroundColor: fillColor,
          borderRadius: 10,
        }}
      />
      {/* Percentage label on the bar */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: percent > 50 ? '#FFFFFF' : colors.ink,
          }}
        >
          {percent}%
        </Text>
      </View>
    </View>
  );
}

/**
 * The coin-just-awarded celebration callout.
 */
function CoinAwardedBanner({ coins }: { coins: number }) {
  return (
    <View
      style={{
        marginTop: 12,
        backgroundColor: '#FFF8E1',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.butter,
      }}
    >
      <Text style={{ fontSize: 16 }}>🪙</Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '700',
          color: colors.ink,
          marginLeft: 8,
        }}
      >
        +1 Mystic Coin! ({coins} total)
      </Text>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export function DailyChallengeCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    dailyBudget,
    todayExpenses,
    percent,
    status,
    remaining,
    coins,
    coinJustAwarded,
    currency,
    hasBudget,
  } = useDailyChallenge();

  const goToSettings = useCallback(() => {
    router.navigate('/(tabs)/settings?openBudget=true');
  }, [router]);

  const style = useMemo(() => resolveCardStyle(status), [status]);

  // ── No-budget placeholder ──────────────────────────────────────────────
  if (!hasBudget) {
    return (
      <View
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: 12,
          padding: 16,
          marginTop: 24,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 22, marginRight: 8 }}>🎯</Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.ink, flex: 1 }}>
            {t('dailyChallenge.title')}
          </Text>
        </View>
        <Text style={{ fontSize: 14, color: colors.inkLight, lineHeight: 20 }}>
          {t('dailyChallenge.noBudget')}
        </Text>
        <TouchableOpacity
          onPress={goToSettings}
          style={{
            marginTop: 12,
            backgroundColor: colors.coral,
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 8,
            alignSelf: 'flex-start',
          }}
        >
          <Text style={{ color: colors.surface, fontWeight: '700', fontSize: 14 }}>
            {t('dailyChallenge.setInSettings')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main challenge card ────────────────────────────────────────────────
  return (
    <View
      style={{
        backgroundColor: style.cardBg,
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
      }}
    >
      {/* Header row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 22, marginRight: 8 }}>🎯</Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.ink }}>
            {t('dailyChallenge.title')}
          </Text>
        </View>
        {/* Coin count badge */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.05)',
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 14, marginRight: 4 }}>🪙</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
            {coins}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <ProgressBar
        percent={percent}
        fillColor={style.progressFill}
        trackColor={style.progressBg}
      />

      {/* Spent / Budget row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 8,
        }}
      >
        <Text style={{ fontSize: 13, color: colors.inkLight }}>
          {t('dailyChallenge.spent')}:{' '}
          <Text style={{ fontWeight: '600', color: colors.ink }}>
            {formatCurrency(todayExpenses, currency)}
          </Text>
        </Text>
        <Text style={{ fontSize: 13, color: colors.inkLight }}>
          {t('dailyChallenge.budget')}:{' '}
          <Text style={{ fontWeight: '600', color: colors.ink }}>
            {formatCurrency(dailyBudget, currency)}
          </Text>
        </Text>
      </View>

      {/* Remaining amount */}
      {remaining > 0 && percent < 100 && (
        <Text style={{ fontSize: 13, color: colors.inkLight, marginTop: 2 }}>
          {t('dailyChallenge.remaining', {
            amount: formatCurrency(remaining, currency),
          })}
        </Text>
      )}

      {/* Coin celebration banner */}
      {coinJustAwarded && <CoinAwardedBanner coins={coins} />}

      {/* Status message */}
      {!coinJustAwarded && (
        <View style={{ marginTop: 12 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: colors.ink,
              lineHeight: 20,
            }}
          >
            {getStatusMessage(status, percent, t)}
          </Text>
        </View>
      )}
    </View>
  );
}
