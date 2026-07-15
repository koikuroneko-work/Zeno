import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { colors } from '@/design/tokens';
import { useSettingsStore } from '@/store/settingsStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useMysticCoinStore } from '@/store/mysticCoinStore';
import { useLocationPermission } from '@/services/permissionService';
import { formatCurrency, CURRENCY_SYMBOLS } from '@/utils/currencyFormatter';
import { clearDb } from '@/data/db';

type LanguageCode = 'en' | 'ja' | 'ko' | 'ms' | 'th' | 'zh-Hans' | 'zh-Hant' | 'fr' | 'de' | 'es' | 'pt' | 'it' | 'nl';

const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pt', label: 'Português' },
  { code: 'th', label: 'ไทย' },
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'zh-Hant', label: '繁體中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
];

const CURRENCIES: { code: string; label: string }[] = [
  { code: 'AUD', label: 'AUD (A$)' },
  { code: 'CAD', label: 'CAD (C$)' },
  { code: 'CHF', label: 'CHF (Fr)' },
  { code: 'CNY', label: 'CNY (CN¥)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'HKD', label: 'HKD (HK$)' },
  { code: 'INR', label: 'INR (₹)' },
  { code: 'JPY', label: 'JPY (¥)' },
  { code: 'KRW', label: 'KRW (₩)' },
  { code: 'MYR', label: 'MYR (RM)' },
  { code: 'SGD', label: 'SGD (S$)' },
  { code: 'THB', label: 'THB (฿)' },
  { code: 'TWD', label: 'TWD (NT$)' },
  { code: 'USD', label: 'USD ($)' },
];

const MONTH_START_DAYS = [1, 7, 15, 25];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettingsStore();
  const { status, isGranted } = useLocationPermission();

  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetInputValue, setBudgetInputValue] = useState('');
  const coinCount = useMysticCoinStore((s) => s.coins);

  // Auto-open budget modal when navigated to from Daily Challenge card
  const params = useLocalSearchParams<{ openBudget?: string }>();
  const hasAutoOpened = useRef(false);
  useEffect(() => {
    if (params.openBudget === 'true' && !hasAutoOpened.current) {
      hasAutoOpened.current = true; // only auto-open once per navigation
      setBudgetInputValue(
        settings.dailyBudget > 0
          ? (settings.dailyBudget / 100).toFixed(2)
          : '',
      );
      setBudgetModalOpen(true);
    }
  }, [params.openBudget, settings.dailyBudget]);

  function changeLanguage(code: string) {
    settings.setLanguage(code as LanguageCode);
    setLangPickerOpen(false);
  }

  async function handleExportCsv() {
    Alert.alert(
      t('settings.exportCsv'),
      'Coming soon — this will export all your transactions to a CSV file.',
    );
  }

  async function handleDeleteData() {
    Alert.alert(
      t('settings.deleteData'),
      t('settings.resetConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all Zustand persisted stores
              useTransactionStore.getState().resetTransactions();
              useMysticCoinStore.getState().resetCoins();
              useSettingsStore.getState().resetSettings();

              // Clear SQLite database
              await clearDb();

              Alert.alert(
                t('common.done'),
                t('settings.resetComplete'),
              );
            } catch (error) {
              console.error('Failed to reset data:', error);
              Alert.alert(
                t('common.error'),
                'Failed to clear all data. Please try again.',
              );
            }
          },
        },
      ],
    );
  }

  function handlePrivacyPolicy() {
    const url = 'https://example.com/privacy';
    Alert.alert(t('settings.privacyPolicy'), url, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: 'Open',
        onPress: () => {
          Linking.openURL(url).catch(() =>
            Alert.alert('Error', 'Could not open the URL.'),
          );
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: '600',
            color: colors.ink,
            marginBottom: 24,
          }}
        >
          {t('settings.title')}
       </Text>

        {/* Language */}
        <SettingsRow
          label={t('settings.language')}
          value={
            LANGUAGES.find((l) => l.code === settings.language)?.label ?? 'English'
          }
          onPress={() => setLangPickerOpen(true)}
        />

        {/* Currency */}
        <SettingsRow
          label={t('settings.currency')}
          value={CURRENCY_SYMBOLS[settings.currency] || settings.currency}
          onPress={() => setCurrencyPickerOpen(true)}
        />

        {/* Month start day */}
        <SettingsRow
          label={t('settings.monthStart')}
          value={`${settings.monthStartDay}`}
          onPress={() => setDayPickerOpen(true)}
        />

        {/* Daily Budget */}
        <SettingsRow
          label={t('settings.dailyBudget')}
          value={
            settings.dailyBudget > 0
              ? formatCurrency(settings.dailyBudget, settings.currency)
              : t('settings.dailyBudgetNone')
          }
          onPress={() => {
            setBudgetInputValue(
              settings.dailyBudget > 0
                ? (settings.dailyBudget / 100).toFixed(2)
                : '',
            );
            setBudgetModalOpen(true);
          }}
        />

        {/* AI Toggle */}
        <View
          style={{
            marginBottom: 20,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: '600', color: colors.ink }}>
            {t('settings.aiToggle')}
         </Text>
          <Switch
            value={settings.aiEnabled}
            onValueChange={(v) => settings.setAiEnabled(v)}
            thumbColor={settings.aiEnabled ? colors.coral : colors.disabled}
            trackColor={{ false: colors.border, true: colors.inkLight }}
          />
       </View>

        {/* Reminder Toggle */}
        <View
          style={{
            marginBottom: 20,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: '600', color: colors.ink }}>
            {t('settings.reminderToggle')}
         </Text>
          <Switch
            value={settings.reminderEnabled}
            onValueChange={(v) => settings.setReminderEnabled(v)}
            thumbColor={settings.reminderEnabled ? colors.coral : colors.disabled}
            trackColor={{ false: colors.border, true: colors.inkLight }}
          />
       </View>

        {/* Nearby Toggle */}
        <View
          style={{
            marginBottom: 20,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: '600', color: colors.ink }}>
            {t('settings.nearbyToggle')}
         </Text>
          <Switch
            value={settings.nearbyEnabled}
            onValueChange={(v) => {
              // Only allow toggling if location permission is granted
              if (isGranted()) {
                settings.setNearbyEnabled(v);
              }
              // If permission not granted, do nothing (switch remains unchanged)
            }}
            thumbColor={
              settings.nearbyEnabled && isGranted()
                ? colors.coral
                : colors.disabled
            }
            trackColor={{
              false: colors.border,
              true: colors.inkLight,
            }}
            disabled={!isGranted()}
          />

          {/* Show permission status info when disabled */}
          {!isGranted() && (
            <Text style={{ fontSize: 12, color: colors.inkLight, marginTop: 4 }}>
              {status === 'undetermined' ? t('nearby.permissionNeeded') :
               status === 'denied' ? t('nearby.permissionDenied') :
               t('nearby.permissionDeniedForever')}
          </Text>
          )}
       </View>

        {/* Export CSV */}
        <ActionRow label={t('settings.exportCsv')} onPress={handleExportCsv} />

        {/* Delete Data */}
        <ActionRow
          label={t('settings.deleteData')}
          onPress={handleDeleteData}
          danger
        />

        {/* Privacy Policy */}
        <ActionRow
          label={t('settings.privacyPolicy')}
          onPress={handlePrivacyPolicy}
        />

        {/* Mystic Coins info */}
        <View style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: colors.surfaceAlt,
          borderRadius: 8,
        }}>
          <Text style={{ fontWeight: '600', color: colors.ink, marginBottom: 4 }}>
            🪙 {t('settings.mysticCoins')}
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: 4 }}>
            {coinCount}
          </Text>
          <Text style={{ fontSize: 13, color: colors.inkLight, lineHeight: 18 }}>
            {t('mysticCoins.description')}
          </Text>
        </View>
     </View>

      {/* Daily Budget input modal */}
      <Modal
        visible={budgetModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBudgetModalOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setBudgetModalOpen(false)}
        >
          <Pressable
            onPress={() => {}} // prevent close when tapping inside
            style={{
              backgroundColor: colors.surfaceAlt,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingTop: 16,
              paddingBottom: Platform.OS === 'ios' ? 32 : 16,
              paddingHorizontal: 20,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors.ink,
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              {t('settings.dailyBudget')}
            </Text>
            <Text style={{ fontSize: 14, color: colors.inkLight, marginBottom: 12 }}>
              {t('settings.dailyBudgetHint')}
            </Text>
            <TextInput
              value={budgetInputValue}
              onChangeText={setBudgetInputValue}
              placeholder={t('settings.dailyBudgetPlaceholder')}
              keyboardType="decimal-pad"
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 14,
                fontSize: 20,
                fontWeight: '600',
                color: colors.ink,
                textAlign: 'center',
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setBudgetModalOpen(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '600', color: colors.ink }}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const trimmed = budgetInputValue.trim();
                  if (trimmed === '') {
                    // Empty input = clear the budget (set to 0 / no budget)
                    settings.setDailyBudget(0);
                  } else {
                    const parsed = parseFloat(trimmed);
                    if (!isNaN(parsed) && parsed >= 0) {
                      // Convert from major units (e.g., 50.00) to minor units (5000)
                      const minorUnits = Math.round(parsed * 100);
                      settings.setDailyBudget(minorUnits);
                    }
                  }
                  setBudgetModalOpen(false);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: colors.coral,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '600', color: colors.surface }}>
                  {t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Language picker modal */}
      <PickerModal
        visible={langPickerOpen}
        title={t('settings.language')}
        data={LANGUAGES}
        selected={(item: { code: string; label: string }) =>
          settings.language === item.code
        }
        renderItem={(item: { code: string; label: string }) => item.label}
        onSelect={(item: { code: string; label: string }) =>
          changeLanguage(item.code)
        }
        onClose={() => setLangPickerOpen(false)}
      />

      {/* Currency picker modal */}
      <PickerModal
        visible={currencyPickerOpen}
        title={t('settings.currency')}
        data={CURRENCIES}
        selected={(item: { code: string; label: string }) =>
          settings.currency === item.code
        }
        renderItem={(item: { code: string; label: string }) => item.label}
        onSelect={(item: { code: string; label: string }) => {
          settings.setCurrency(item.code);
          setCurrencyPickerOpen(false);
        }}
        onClose={() => setCurrencyPickerOpen(false)}
      />

      {/* Month start day picker modal */}
      <PickerModal
        visible={dayPickerOpen}
        title={t('settings.monthStart')}
        data={MONTH_START_DAYS.map((d) => ({
          code: String(d),
          label: `${d}`,
        }))}
        selected={(item: { code: string; label: string }) =>
          settings.monthStartDay === Number(item.code)
        }
        renderItem={(item: { code: string; label: string }) => item.label}
        onSelect={(item: { code: string; label: string }) => {
          settings.setMonthStartDay(Number(item.code));
          setDayPickerOpen(false);
        }}
        onClose={() => setDayPickerOpen(false)}
      />
   </SafeAreaView>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{ fontWeight: '600', color: colors.ink, marginBottom: 8 }}
      >
        {label}
     </Text>
      <TouchableOpacity
        style={{
          padding: 12,
          backgroundColor: colors.surfaceAlt,
          borderRadius: 8,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        onPress={onPress}
      >
        <Text>{value}</Text>
        <Text style={{ color: colors.inkLight }}>→</Text>
     </TouchableOpacity>
   </View>
  );
}

function ActionRow({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <TouchableOpacity
        style={{
          padding: 12,
          backgroundColor: colors.surfaceAlt,
          borderRadius: 8,
        }}
        onPress={onPress}
      >
        <Text
          style={{
            fontWeight: '600',
            color: danger ? colors.danger : colors.ink,
          }}
        >
          {label}
       </Text>
     </TouchableOpacity>
   </View>
  );
}

function PickerModal<T>({
  visible,
  title,
  data,
  selected,
  renderItem,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  data: T[];
  selected: (item: T) => boolean;
  renderItem: (item: T) => string;
  onSelect: (item: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
        onPress={onClose}
      >
        <View style={{ flex: 1 }} />
        <View
          style={{
            backgroundColor: colors.surfaceAlt,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingTop: 16,
            paddingBottom: Platform.OS === 'ios' ? 32 : 16,
            maxHeight: '70%',
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.ink,
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            {title}
         </Text>
          <FlatList
            data={data}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => {
              const isSelected = selected(item);
              return (
                <TouchableOpacity
                  onPress={() => onSelect(item)}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 24,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: isSelected
                      ? colors.surface
                      : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: colors.ink,
                      fontWeight: isSelected ? '600' : '400',
                    }}
                  >
                    {renderItem(item)}
                 </Text>
                  {isSelected && (
                    <Text style={{ color: colors.coral, fontSize: 18 }}>
                      ✓
                   </Text>
                  )}
               </TouchableOpacity>
              );
            }}
          />
       </View>
     </Pressable>
   </Modal>
  );
}
