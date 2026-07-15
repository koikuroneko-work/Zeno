import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/design/tokens';
import { useTransactionStore } from '@/store/transactionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatSignedCurrency } from '@/utils/currencyFormatter';
import { formatDate, formatTime } from '@/utils/dateFormat';
import { DEFAULT_LOCALE } from 'shared';
import type { Transaction } from 'shared';

// ── types ────────────────────────────────────────────

type DateGroup = {
  date: string;
  displayDate: string;
  transactions: Transaction[];
  expenses: number;
  incomes: number;
};

type ListItem =
  | { type: 'header'; group: DateGroup }
  | { type: 'transaction'; transaction: Transaction };

// ── helpers ──────────────────────────────────────────

function groupByDate(transactions: Transaction[], locale: string): DateGroup[] {
  const groups: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    // filter out deleted transactions
    if (t.deletedAt) continue;
    const dateKey = t.occurredAt.split('T')[0];
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(t);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a)) // newest first
    .map(([date, txs]) => {
      const sorted = [...txs].sort((a, b) =>
        b.occurredAt.localeCompare(a.occurredAt),
      );
      return {
        date,
        displayDate: formatDate(date, locale),
        transactions: sorted,
        expenses: sorted.filter((t) => t.type === 'expense').length,
        incomes: sorted.filter((t) => t.type === 'income').length,
      };
    });
}

// ── component ────────────────────────────────────────

export default function LedgerScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { transactions, deleteTransaction } = useTransactionStore();
  const { currency } = useSettingsStore();
  const appLocale = i18n.language || DEFAULT_LOCALE;

  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const groups = useMemo(() => groupByDate(transactions, appLocale), [transactions, appLocale]);

  const flatList = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    for (const group of groups) {
      items.push({ type: 'header', group });
      if (expandedDates.has(group.date)) {
        for (const t of group.transactions) {
          items.push({ type: 'transaction', transaction: t });
        }
      }
    }
    return items;
  }, [groups, expandedDates]);

  const toggleGroup = useCallback((date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }, []);

  const handleEdit = useCallback(
    (transaction: Transaction) => {
      router.navigate(`/edit/${transaction.id}`);
    },
    [router],
  );

  const handleDelete = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setModalVisible(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (selectedTransaction) {
      deleteTransaction(selectedTransaction.id);
      setModalVisible(false);
      setSelectedTransaction(null);
    }
  }, [selectedTransaction, deleteTransaction]);

  const goToAdd = useCallback(() => router.push('/add'), [router]);

  // ── renderers ─────────────────────────────────────

  const renderDateHeader = useCallback(
    (group: DateGroup) => {
      const isExpanded = expandedDates.has(group.date);
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => toggleGroup(group.date)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 12,
            marginTop: 12,
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.md,
            borderBottomLeftRadius: isExpanded ? 0 : radius.md,
            borderBottomRightRadius: isExpanded ? 0 : radius.md,
          }}
        >
          {/* Date label */}
          <Text
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: '600',
              color: colors.ink,
            }}
            numberOfLines={1}
          >
            {group.displayDate}
          </Text>

          {/* E / I counts */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 8 }}>
            {group.expenses > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: 11, color: colors.coral, fontWeight: '700' }}>E</Text>
                <Text style={{ fontSize: 13, color: colors.inkLight, fontWeight: '600' }}>
                  {group.expenses}
                </Text>
              </View>
            )}
            {group.incomes > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: 11, color: colors.mintDark, fontWeight: '700' }}>I</Text>
                <Text style={{ fontSize: 13, color: colors.inkLight, fontWeight: '600' }}>
                  {group.incomes}
                </Text>
              </View>
            )}
          </View>

          {/* Chevron */}
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.inkLight}
          />
        </TouchableOpacity>
      );
    },
    [expandedDates, toggleGroup],
  );

  const renderTransactionRow = useCallback(
    (item: Transaction) => {
      const hasNote = !!item.note;
      const categoryLabel = t(`transactions.${item.categoryId}`, {
        defaultValue: item.categoryId,
      });
      return (
        <View
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {/* Top row: title + amount + actions */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: '500',
                color: colors.ink,
              }}
              numberOfLines={1}
            >
              {hasNote ? item.note : categoryLabel}
            </Text>

            {/* Amount */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                marginRight: 10,
                color:
                  item.type === 'expense'
                    ? colors.coral
                    : item.type === 'income'
                      ? colors.mintDark
                      : colors.ink,
              }}
            >
              {formatSignedCurrency(item.amountMinor, item.type, currency)}
            </Text>

            <TouchableOpacity
              onPress={() => handleEdit(item)}
              style={{ paddingHorizontal: 5, paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 13, color: colors.inkLight }}>
                {t('common.edit')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              style={{ paddingHorizontal: 5, paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 13, color: colors.danger }}>
                {t('common.delete')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom row: category subtitle + time */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
            {hasNote && (
              <Text
                style={{
                  fontSize: 11,
                  color: colors.inkLight,
                }}
                numberOfLines={1}
              >
                {categoryLabel}
              </Text>
            )}
            <Text
              style={{
                fontSize: 11,
                color: colors.inkLight,
                marginLeft: hasNote ? 8 : 0,
              }}
            >
              {formatTime(item.occurredAt, appLocale)}
            </Text>
          </View>
        </View>
      );
    },
    [t, currency, appLocale, handleEdit, handleDelete],
  );

  const keyExtractor = useCallback((item: ListItem) => {
    if (item.type === 'header') return `header:${item.group.date}`;
    return `tx:${item.transaction.id}`;
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'header') return renderDateHeader(item.group);
      return renderTransactionRow(item.transaction);
    },
    [renderDateHeader, renderTransactionRow],
  );

  // ── main render ───────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: '600',
            color: colors.ink,
            marginBottom: 16,
          }}
        >
          {t('ledger.title')}
        </Text>

        {groups.length > 0 ? (
          <>
            <TouchableOpacity
              style={{
                backgroundColor: colors.coral,
                padding: 12,
                borderRadius: 8,
                alignItems: 'center',
                marginBottom: 4,
              }}
              onPress={goToAdd}
            >
              <Text style={{ color: colors.surface, fontWeight: '600' }}>
                {t('ledger.addTransaction')}
              </Text>
            </TouchableOpacity>

            <FlatList
              data={flatList}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            />
          </>
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingBottom: 80,
            }}
          >
            <Text
              style={{
                color: colors.inkLight,
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              {t('ledger.empty')}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.coral,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
              }}
              onPress={goToAdd}
            >
              <Text style={{ color: colors.surface, fontWeight: '600' }}>
                {t('ledger.addTransaction')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal transparent visible={modalVisible} animationType="fade">
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              padding: 24,
              borderRadius: 12,
              width: '80%',
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors.ink,
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              {t('transactions.deleteConfirm')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                marginTop: 20,
              }}
            >
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.ink,
                }}
                onPress={() => {
                  setModalVisible(false);
                  setSelectedTransaction(null);
                }}
              >
                <Text style={{ color: colors.ink }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  backgroundColor: colors.danger,
                }}
                onPress={confirmDelete}
              >
                <Text style={{ color: colors.surface, fontWeight: '600' }}>
                  {t('common.delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
