import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { useTransactionStore } from '@/store/transactionStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/design/tokens';
import { formatSignedCurrency } from '../../../../apps/mobile/src/utils/currencyFormatter';
import { Transaction } from '../../../../packages/shared/src/schemas';

export default function TransactionDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const { transactions } = useTransactionStore();
  const transaction = transactions.find((t: Transaction) => t.id === id);

  if (!transaction) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, padding: 16 }}>
        <Text style={{ color: colors.ink, textAlign: 'center', marginTop: 40 }}>
          {t('transactions.notFound')}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
        <TouchableOpacity onPress={() => {
          // Go back
        }}>
          <MaterialCommunityIcons name='arrow-left' size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '600', color: colors.ink, marginLeft: 12, flex: 1 }}>
          {t('transactions.detailTitle')}
        </Text>
      </View>

      <View style={{ padding: 16, backgroundColor: colors.surfaceAlt, borderRadius: 8, marginBottom: 16 }}>
        <Text style={{ fontWeight: '600', color: colors.ink, marginBottom: 8 }}>
          {t('transactions.amount')}
        </Text>
        <Text style={{ fontSize: 24, fontWeight: '600', color: transaction.type === 'expense' ? colors.coral : transaction.type === 'income' ? colors.mint : colors.ink }}>
          {formatSignedCurrency(transaction.amountMinor, transaction.type, transaction.currency)}
        </Text>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontWeight: '600', color: colors.ink, marginBottom: 8 }}>
          {t('transactions.date')}
        </Text>
        <Text style={{ color: colors.ink }}>
          {new Date(transaction.occurredAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontWeight: '600', color: colors.ink, marginBottom: 8 }}>
          {t('transactions.type')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name={transaction.type === 'expense' ? 'cash' : transaction.type === 'income' ? 'cash-plus' : transaction.type === 'transfer' ? 'swap-horizontal' : 'checkbox-blank-circle-outline'} size={20} color={colors.ink} />
          <Text style={{ marginLeft: 8, color: colors.ink }}>
            {transaction.type}
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontWeight: '600', color: colors.ink, marginBottom: 8 }}>
          {t('transactions.category')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name='circle' size={20} color={colors.ink} /> {/* TODO: Use actual category icon */}
          <Text style={{ marginLeft: 8, color: colors.ink }}>
            {/* TODO: Map categoryId to name */}
            {transaction.categoryId}
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontWeight: '600', color: colors.ink, marginBottom: 8 }}>
          {t('transactions.note')}
        </Text>
        <Text style={{ color: colors.ink }}>
          {transaction.note}
        </Text>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontWeight: '600', color: colors.ink, marginBottom: 8 }}>
          {t('transactions.merchant')}
        </Text>
        <Text style={{ color: colors.ink }}>
          {transaction.merchantName}
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <TouchableOpacity
          style={{
            paddingVertical: 12,
            paddingHorizontal: 24,
            backgroundColor: colors.coral,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={() => {
            // Edit transaction
          }}
        >
          <Text style={{ color: colors.surface, fontWeight: '600' }}>
            {t('transactions.edit')}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={{
          paddingVertical: 12,
          paddingHorizontal: 24,
          backgroundColor: colors.danger,
          borderRadius: 8,
          alignItems: 'center',
        }}
        onPress={() => {
          // Delete transaction
        }}
      >
        <Text style={{ color: colors.surface, fontWeight: '600' }}>
          {t('transactions.delete')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}