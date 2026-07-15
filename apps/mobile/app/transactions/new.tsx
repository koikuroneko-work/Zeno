import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, FlatList, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/design/tokens';
import { categoryIcons, CategoryIconName } from '@/design/icons';
import { useTransactionStore } from '@/store/transactionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { v4 as uuidv4 } from 'uuid';
import { TransactionType, Transaction } from 'shared';

export default function NewTransactionScreen() {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [merchant, setMerchant] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('food');
  const [date, setDate] = useState(new Date().toISOString());
  const [type, setType] = useState<TransactionType>('expense');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isCategoryPickerVisible, setIsCategoryPickerVisible] = useState(false);
  const [isTypePickerVisible, setIsTypePickerVisible] = useState(false);

  const { addTransaction } = useTransactionStore();
  const { currency } = useSettingsStore();

  const types: Array<{ value: TransactionType; label: string }> = [
    { value: 'expense', label: t('transactions.expense') },
    { value: 'income', label: t('transactions.income') },
    { value: 'transfer', label: t('transactions.transfer') },
    { value: 'adjustment', label: t('transactions.adjustment') },
  ];

  const handleSave = () => {
    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const amountValue = parseFloat(amount);
    const amountMinor = Math.round(amountValue * 100);

    const transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
      householdId: 'default-household-id',
      accountId: 'default-account-id',
      memberId: undefined,
      categoryId: selectedCategory,
      type,
      amountMinor,
      currency: currency || 'USD',
      occurredAt: date,
      note,
      merchantName: merchant,
      locationLabel: '',
      recurringRuleId: undefined,
    };

    // Add ID and timestamps
    const newTransaction: Transaction = {
      ...transaction,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addTransaction(newTransaction);

    // Reset form
    setAmount('');
    setNote('');
    setMerchant('');
    setSelectedCategory('food');
    setDate(new Date().toISOString());
    setType('expense');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ padding: 16, backgroundColor: colors.surfaceAlt, borderBottomWidth: 1, borderColor: colors.border }}>
        <Text style={{ fontSize: 20, fontWeight: '600', color: colors.ink }}>
          {t('transactions.addTitle')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Type */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontWeight: '600', color: colors.ink, marginBottom: 8 }}>
            {t('transactions.type')}
          </Text>
          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            onPress={() => setIsTypePickerVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name={type === 'expense' ? 'cash' : type === 'income' ? 'cash-plus' : type === 'transfer' ? 'swap-horizontal' : 'checkbox-blank-circle-outline'} size={24} color={colors.ink} />
              <Text style={{ marginLeft: 12, color: colors.ink }}>
                {types.find(t => t.value === type)?.label}
              </Text>
            </View>
            <MaterialCommunityIcons name='chevron-down' size={20} color={colors.inkLight} />
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontWeight: '600', color: colors.ink, marginBottom: 8 }}>
            {t('transactions.amount')}
          </Text>
          <TextInput
            placeholder={t('transactions.amountPlaceholder')}
            keyboardType='numeric'
            value={amount}
            onChangeText={setAmount}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 12,
              fontSize: 18,
            }}
          />
        </View>

        {/* Category */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontWeight: '600', color: colors.ink, marginBottom: 8 }}>
            {t('transactions.category')}
          </Text>
          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            onPress={() => setIsCategoryPickerVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name={(categoryIcons as any)[selectedCategory] ?? 'restaurant' as any} size={24} color={colors.ink} />
              <Text style={{ marginLeft: 12, color: colors.ink }}>
                {t(`transactions.${selectedCategory}`)}
              </Text>
            </View>
            <MaterialCommunityIcons name='chevron-down' size={20} color={colors.inkLight} />
          </TouchableOpacity>
        </View>

        {/* Date */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontWeight: '600', color: colors.ink, marginBottom: 8 }}>
            {t('transactions.date')}
          </Text>
          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            onPress={() => setIsDatePickerVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name='calendar' size={24} color={colors.ink} />
              <Text style={{ marginLeft: 12, color: colors.ink }}>
                {new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <MaterialCommunityIcons name='chevron-down' size={20} color={colors.inkLight} />
          </TouchableOpacity>
        </View>

        {/* Note */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontWeight: '600', color: colors.ink, marginBottom: 8 }}>
            {t('transactions.note')}
          </Text>
          <TextInput
            placeholder={t('transactions.notePlaceholder')}
            value={note}
            onChangeText={setNote}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 12,
              height: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* Merchant */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontWeight: '600', color: colors.ink, marginBottom: 8 }}>
            {t('transactions.merchant')}
          </Text>
          <TextInput
            placeholder={t('transactions.merchantPlaceholder')}
            value={merchant}
            onChangeText={setMerchant}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 12,
            }}
          />
        </View>

        <TouchableOpacity
          style={{
            marginTop: 32,
            paddingVertical: 16,
            backgroundColor: colors.coral,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={handleSave}
        >
          <Text style={{ color: colors.surface, fontWeight: '600', fontSize: 16 }}>
            {t('transactions.save')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Type Picker Modal */}
      <Modal
        transparent={true}
        visible={isTypePickerVisible}
        onRequestClose={() => setIsTypePickerVisible(false)}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}
      >
        <View style={{ backgroundColor: colors.surface, padding: 24, borderRadius: 12, width: '80%', alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontWeight: '600', color: colors.ink }}>{t('transactions.type')}</Text>
            <TouchableOpacity onPress={() => setIsTypePickerVisible(false)}>
              <MaterialCommunityIcons name='close' size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={types}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
                onPress={() => {
                  setType(item.value);
                  setIsTypePickerVisible(false);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name={item.value === 'expense' ? 'cash' : item.value === 'income' ? 'cash-plus' : item.value === 'transfer' ? 'swap-horizontal' : 'checkbox-blank-circle-outline'} size={24} color={colors.ink} />
                  <Text style={{ marginLeft: 12, color: colors.ink }}>
                    {item.label}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        transparent={true}
        visible={isDatePickerVisible}
        onRequestClose={() => setIsDatePickerVisible(false)}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}
      >
        <View style={{ backgroundColor: colors.surface, padding: 24, borderRadius: 12, width: '80%', alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontWeight: '600', color: colors.ink }}>{t('transactions.date')}</Text>
            <TouchableOpacity onPress={() => setIsDatePickerVisible(false)}>
              <MaterialCommunityIcons name='close' size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>

          {/* Simple date picker - in a real app, use a date picker library */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.inkLight, marginBottom: 8 }}>
              {t('transactions.datePlaceholder')}
            </Text>
            <TextInput
              editable={false}
              value={new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 12,
                fontSize: 18,
              }}
            />
          </View>

          <TouchableOpacity
            style={{
              paddingVertical: 12,
              backgroundColor: colors.coral,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={() => {
              // For demo: setIsDatePickerVisible(false);
            }}
          >
            <Text style={{ color: colors.surface, fontWeight: '600' }}>
              {t('transactions.confirm')}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        transparent={true}
        visible={isCategoryPickerVisible}
        onRequestClose={() => setIsCategoryPickerVisible(false)}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}
      >
        <View style={{ backgroundColor: colors.surface, padding: 24, borderRadius: 12, width: '80%', alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontWeight: '600', color: colors.ink }}>{t('transactions.category')}</Text>
            <TouchableOpacity onPress={() => setIsCategoryPickerVisible(false)}>
              <MaterialCommunityIcons name='close' size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={type === 'income' ? (
              [
                { id: 'salary', nameKey: 'salary', icon: categoryIcons.salary },
                { id: 'freelance', nameKey: 'freelance', icon: categoryIcons.freelance },
                { id: 'investment', nameKey: 'investment', icon: categoryIcons.investment },
                { id: 'rental', nameKey: 'rental', icon: categoryIcons.rental },
                { id: 'gift', nameKey: 'gift', icon: categoryIcons.gift },
                { id: 'refund', nameKey: 'refund', icon: categoryIcons.refund },
                { id: 'allowance', nameKey: 'allowance', icon: categoryIcons.allowance },
                { id: 'bonus', nameKey: 'bonus', icon: categoryIcons.bonus },
                { id: 'other', nameKey: 'other', icon: categoryIcons.other },
              ] as Array<{ id: string; nameKey: string; icon: CategoryIconName }>
            ) : (
              [
                { id: 'food', nameKey: 'food', icon: categoryIcons.food },
                { id: 'breakfast', nameKey: 'breakfast', icon: categoryIcons.breakfast },
                { id: 'lunch', nameKey: 'lunch', icon: categoryIcons.lunch },
                { id: 'dinner', nameKey: 'dinner', icon: categoryIcons.dinner },
                { id: 'groceries', nameKey: 'groceries', icon: categoryIcons.groceries },
                { id: 'shopping', nameKey: 'shopping', icon: categoryIcons.shopping },
                { id: 'transport', nameKey: 'transport', icon: categoryIcons.transport },
                { id: 'bills', nameKey: 'bills', icon: categoryIcons.bills },
                { id: 'entertainment', nameKey: 'entertainment', icon: categoryIcons.entertainment },
                { id: 'health', nameKey: 'health', icon: categoryIcons.health },
                { id: 'education', nameKey: 'education', icon: categoryIcons.education },
                { id: 'other', nameKey: 'other', icon: categoryIcons.other },
              ] as Array<{ id: string; nameKey: string; icon: CategoryIconName }>
            )}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
                onPress={() => {
                  setSelectedCategory(item.id as keyof typeof categoryIcons);
                  setIsCategoryPickerVisible(false);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name={item.icon as any} size={24} color={colors.ink} />
                  <Text style={{ marginLeft: 12, color: colors.ink }}>
                    {t(`transactions.${item.nameKey}`)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}