import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { colors } from '@/design/tokens';
import { useSettingsStore } from '@/store/settingsStore';
import { useTransactionStore } from '@/store/transactionStore';
import { fetchAiAdvice } from '@/services/aiAdviceService';
import type { AiAdviceResponse } from 'shared';

/* ------------------------------------------------------------------ */
/*  Screens: Disabled / Not enough data                                */
/* ------------------------------------------------------------------ */

function DisabledScreen() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, color: colors.inkLight, textAlign: 'center', marginBottom: 16 }}>
        {t('ai.disabledBanner')}
      </Text>
      <Text style={{ fontSize: 16, color: colors.ink, textAlign: 'center' }}>
        {t('settings.aiToggle')}
      </Text>
    </View>
  );
}

function NeedMoreDataScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, color: colors.inkLight, textAlign: 'center', marginBottom: 16 }}>
        {t('ai.needMoreData')}
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: colors.coral,
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 8,
        }}
        onPress={() => router.push('/add')}
      >
        <Text style={{ color: colors.surface, fontWeight: '600' }}>{t('navigation.add')}</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading screen                                                     */
/* ------------------------------------------------------------------ */

function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.coral} />
      <Text
        style={{
          fontSize: 16,
          color: colors.inkLight,
          textAlign: 'center',
          marginTop: 20,
          lineHeight: 22,
        }}
      >
        {t('ai.analyzing')}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Error screen                                                       */
/* ------------------------------------------------------------------ */

function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>🤔</Text>
      <Text style={{ fontSize: 16, color: colors.inkLight, textAlign: 'center', marginBottom: 20 }}>
        {t('ai.error')}
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: colors.coral,
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 8,
        }}
        onPress={onRetry}
      >
        <Text style={{ color: colors.surface, fontWeight: '600' }}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Advice card                                                        */
/* ------------------------------------------------------------------ */

function AdviceCard({ item }: { item: AiAdviceResponse['advice'][number] }) {
  const bgColors = ['#E8F5E9', '#E3F2FD', '#FFF3E0', '#F3E5F5', '#E0F7FA'];
  const borderColors = ['#2E7D32', '#1565C0', '#E65100', '#7B1FA2', '#00838F'];

  // Pick color based on icon to keep it varied
  const colorIdx = item.icon.codePointAt(0) || 0;
  const bg = bgColors[colorIdx % bgColors.length];
  const borderColor = borderColors[colorIdx % borderColors.length];

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: borderColor,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 22, marginRight: 10 }}>{item.icon}</Text>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink, flex: 1 }}>
          {item.title}
        </Text>
      </View>
      <Text style={{ fontSize: 14, color: colors.ink, lineHeight: 21 }}>{item.detail}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                        */
/* ------------------------------------------------------------------ */

export default function AISuggestionsScreen() {
  const { t } = useTranslation();
  const { aiEnabled, currency, dailyBudget } = useSettingsStore();
  const transactions = useTransactionStore((s) => s.transactions);

  const [result, setResult] = useState<AiAdviceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadAdvice = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchAiAdvice(transactions, currency, dailyBudget);
      setResult(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [transactions, currency, dailyBudget]);

  useEffect(() => {
    if (!aiEnabled || transactions.length < 3) return;
    loadAdvice();
  }, [aiEnabled, transactions, currency, dailyBudget, loadAdvice]);

  // Guard screens
  if (!aiEnabled) return <DisabledScreen />;
  if (transactions.length < 3) return <NeedMoreDataScreen />;
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen onRetry={loadAdvice} />;
  if (!result) return <LoadingScreen />;

  const hasAdvice = result.advice && result.advice.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }}>
        <View style={{ padding: 24 }}>
          {/* Header */}
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: 6 }}>
            {t('ai.title')}
          </Text>
          <Text style={{ fontSize: 15, color: colors.inkLight, marginBottom: 24, lineHeight: 21 }}>
            {t('ai.adviceSubtitle')}
          </Text>

          {/* Analysis summary */}
          {result.analysis && (
            <View
              style={{
                backgroundColor: colors.surfaceAlt,
                borderRadius: 12,
                padding: 20,
                marginBottom: 24,
              }}
            >
              <Text style={{ fontSize: 15, color: colors.ink, lineHeight: 22 }}>
                {result.analysis}
              </Text>
            </View>
          )}

          {/* Advice items */}
          {hasAdvice ? (
            <>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '600',
                  color: colors.ink,
                  marginBottom: 16,
                }}
              >
                {t('ai.adviceTitle')}
              </Text>
              {result.advice.map((item, idx) => (
                <AdviceCard key={idx} item={item} />
              ))}
            </>
          ) : (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📝</Text>
              <Text style={{ color: colors.inkLight, textAlign: 'center', fontSize: 15 }}>
                {t('ai.needMoreData')}
              </Text>
            </View>
          )}

          {/* Motivation */}
          {result.motivation && hasAdvice && (
            <View
              style={{
                marginTop: 12,
                padding: 20,
                borderRadius: 12,
                backgroundColor: '#FFF8E1',
                borderLeftWidth: 4,
                borderLeftColor: '#F9A825',
              }}
            >
              <Text style={{ fontSize: 14, color: '#E65100', fontStyle: 'italic', lineHeight: 21 }}>
                💪 {result.motivation}
              </Text>
            </View>
          )}

          {/* Refresh hint */}
          <Text
            style={{
              fontSize: 12,
              color: colors.inkLight,
              textAlign: 'center',
              marginTop: 24,
            }}
          >
            {t('ai.refreshHint')}
          </Text>

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}
