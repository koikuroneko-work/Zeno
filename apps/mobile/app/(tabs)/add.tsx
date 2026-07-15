import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors } from '@/design/tokens';
import { useTransactionStore } from '@/store/transactionStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { Transaction } from 'shared';

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

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function AddScreen() {
  const { t } = useTranslation();
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const { currency } = useSettingsStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState<string>('groceries');
  const [note, setNote] = useState('');

  const categoryKeys = type === 'income' ? INCOME_CATEGORY_KEYS : EXPENSE_CATEGORY_KEYS;

  function resetAndClose() {
    setAmount('');
    setNote('');
    setType('expense');
    setCategory('groceries');
    setModalOpen(false);
  }

  function handleSave() {
    const parsed = Number(amount.replace(',', '.'));
    if (!parsed || isNaN(parsed) || parsed <= 0) {
      Alert.alert(t('transactions.amount'), 'Please enter a valid amount.');
      return;
    }
    const now = new Date().toISOString();
    const tx = {
      id: newId(),
      householdId: 'local',
      accountId: 'cash',
      memberId: 'me',
      categoryId: category,
      type,
      amountMinor: Math.round(parsed * 100),
      currency: currency || 'USD',
      occurredAt: now,
      note,
      merchantName: '',
      locationLabel: '',
      createdAt: now,
      updatedAt: now,
    } as unknown as Transaction;

    addTransaction(tx);
    Alert.alert(t('common.success'), t('transactions.addTitle') + ' ✓');
    resetAndClose();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: '600',
            color: colors.ink,
            marginBottom: 24,
          }}
        >
          {t('navigation.add')}
       </Text>
        <TouchableOpacity
          style={{
            backgroundColor: colors.coral,
            paddingVertical: 14,
            paddingHorizontal: 32,
            borderRadius: 8,
          }}
          onPress={() => setModalOpen(true)}
        >
          <Text
            style={{
              color: colors.surface,
              fontWeight: '600',
              fontSize: 16,
            }}
          >
            {t('transactions.addTitle')}
         </Text>
       </TouchableOpacity>
     </View>

      {/* Add Transaction Modal */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={resetAndClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
            onPress={resetAndClose}
          >
            <View style={{ flex: 1 }} />
            <View
              style={{
                backgroundColor: colors.surfaceAlt,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                padding: 24,
                maxHeight: '85%',
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
                {t('transactions.addTitle')}
             </Text>

              <ScrollView keyboardShouldPersistTaps="handled">
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
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    marginBottom: 16,
                  }}
                >
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
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 16,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 8,
                      alignItems: 'center',
                      marginRight: 8,
                      backgroundColor: colors.surface,
                    }}
                    onPress={resetAndClose}
                  >
                    <Text style={{ color: colors.ink }}>
                      {t('common.cancel')}
                   </Text>
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
                      {t('transactions.save')}
                   </Text>
                 </TouchableOpacity>
               </View>
             </ScrollView>
           </View>
         </Pressable>
       </KeyboardAvoidingView>
     </Modal>
   </SafeAreaView>
  );
}

const labelStyle = {
  fontWeight: '600' as const,
  color: colors.ink,
  marginBottom: 8,
};

const inputStyle = {
  backgroundColor: colors.surface,
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
      <Text
        style={{
          color: selected ? colors.surface : colors.ink,
          fontWeight: '600',
        }}
      >
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
      <Text
        style={{
          color: selected ? colors.surface : colors.ink,
          fontSize: 12,
        }}
      >
        {label}
     </Text>
   </TouchableOpacity>
  );
}
