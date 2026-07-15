import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '@/design/tokens';
import { useTransactionStore } from '@/store/transactionStore';

const EXPENSE_CATEGORY_KEYS = [
  'breakfast',
  'lunch',
  'dinner',
  'groceries',
  'shopping',
  'transport',
  'bills',
  'entertainment',
  'health',
  'education',
  'other',
] as const;

const INCOME_CATEGORY_KEYS = [
  'salary',
  'freelance',
  'investment',
  'rental',
  'gift',
  'refund',
  'allowance',
  'bonus',
  'other',
] as const;

export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { transactions, updateTransaction, deleteTransaction } = useTransactionStore();

  const transaction = transactions.find((t) => t.id === id);

  if (!transaction) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: colors.ink, fontSize: 18, marginBottom: 16 }}>
            Transaction not found
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.coral, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: colors.surface, fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // TypeScript narrowing: after the early return, transaction is guaranteed to exist
  // Use a const assertion to help TypeScript understand the narrowed type
  const tx = transaction as typeof transaction & { id: string; amountMinor: number; categoryId: string; note?: string | null };

  const initialType = tx.type === 'income' ? 'income' : 'expense';
  const initialAmount = (Math.abs(tx.amountMinor) / 100).toFixed(2);

  const [amount, setAmount] = useState(initialAmount);
  const [type, setType] = useState<'expense' | 'income'>(initialType);
  const [category, setCategory] = useState<string>(
    tx.categoryId || 'groceries'
  );
  const [note, setNote] = useState(tx.note || '');

  const categoryKeys = type === 'income' ? INCOME_CATEGORY_KEYS : EXPENSE_CATEGORY_KEYS;

  function handleSave() {
    const parsed = Number(amount.replace(',', '.'));
    if (!parsed || isNaN(parsed) || parsed <= 0) {
      Alert.alert(t('transactions.amount'), 'Please enter a valid amount.');
      return;
    }

    const amountMinor = Math.round(parsed * 100);

    updateTransaction(tx.id, {
      categoryId: category,
      type,
      amountMinor,
      note,
      updatedAt: new Date().toISOString(),
    });

    Alert.alert(t('common.success'), t('transactions.editTitle') + ' ✓');
    router.back();
  }

  function handleDelete() {
    Alert.alert(
      t('common.delete'),
      t('transactions.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            deleteTransaction(tx.id);
            router.back();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24 }}>
          <Text style={{ fontSize: 22, fontWeight: '600', color: colors.ink, marginBottom: 24 }}>
            {t('transactions.editTitle')}
          </Text>

          {/* Type toggle */}
          <Text style={labelStyle}>{t('transactions.type')}</Text>
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            <ChoiceButton
              label={t('transactions.expense')}
              selected={type === 'expense'}
              onPress={() => setType('expense')}
              color={colors.coral}
            />
            <ChoiceButton
              label={t('transactions.income')}
              selected={type === 'income'}
              onPress={() => setType('income')}
              color={colors.mint}
            />
          </View>

          {/* Amount */}
          <Text style={labelStyle}>{t('transactions.amount')}</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            style={inputStyle}
          />

          {/* Category */}
          <Text style={labelStyle}>{t('transactions.category')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
            {categoryKeys.map((key) => (
              <CategoryChip
                key={key}
                label={t(`transactions.${key}`)}
                selected={category === key}
                onPress={() => setCategory(key)}
                color={type === 'income' ? colors.mint : colors.coral}
              />
            ))}
          </View>

          {/* Note */}
          <Text style={labelStyle}>{t('transactions.note')}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder=""
            multiline
            style={[inputStyle, { height: 80, textAlignVertical: 'top' }]}
          />

          {/* Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                marginRight: 8,
                backgroundColor: colors.surface,
              }}
              onPress={() => router.back()}
            >
              <Text style={{ color: colors.ink }}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                marginLeft: 8,
                backgroundColor: colors.coral,
              }}
              onPress={handleSave}
            >
              <Text style={{ color: colors.surface, fontWeight: '600' }}>
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={{
              marginTop: 24,
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: 'center',
              backgroundColor: colors.danger,
            }}
            onPress={handleDelete}
          >
            <Text style={{ color: colors.surface, fontWeight: '600' }}>
              {t('common.delete')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const labelStyle = {
  fontWeight: '600' as const,
  color: colors.ink,
  marginBottom: 8,
};

const inputStyle = {
  backgroundColor: colors.surfaceAlt,
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 16,
  color: colors.ink,
  marginBottom: 16,
};

function ChoiceButton({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginRight: 8,
        backgroundColor: selected ? color : colors.surface,
      }}
    >
      <Text style={{ color: selected ? colors.surface : colors.ink, fontWeight: '600' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CategoryChip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: selected ? (color || colors.coral) : colors.surface,
      }}
    >
      <Text style={{ color: selected ? colors.surface : colors.ink, fontSize: 12 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}