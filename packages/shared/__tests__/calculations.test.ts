// tests for calculation utilities
const calc = require('../dist/calculations');

// Mock transaction data matching the shared.Transaction schema
const mockTransactions = [
  {
    id: '1',
    householdId: 'h1',
    accountId: 'acc1',
    memberId: 'm1',
    categoryId: 'cat1',
    type: 'income' as const,
    amountMinor: 500000, // $5000.00
    currency: 'USD',
    occurredAt: '2026-07-15T10:30:00Z',
    note: 'Salary',
    merchantName: 'Company Inc',
    locationLabel: '',
    createdAt: '2026-07-15T10:30:00Z',
    updatedAt: '2026-07-15T10:30:00Z'
  },
  {
    id: '2',
    householdId: 'h1',
    accountId: 'acc1',
    memberId: 'm1',
    categoryId: 'cat2',
    type: 'expense' as const,
    amountMinor: 15000, // $150.00
    currency: 'USD',
    occurredAt: '2026-07-16T14:15:00Z',
    note: 'Groceries',
    merchantName: 'Super Market',
    locationLabel: '',
    createdAt: '2026-07-16T14:15:00Z',
    updatedAt: '2026-07-16T14:15:00Z'
  },
  {
    id: '3',
    householdId: 'h1',
    accountId: 'acc1',
    memberId: 'm1',
    categoryId: 'cat2',
    type: 'expense' as const,
    amountMinor: 25000, // $250.00
    currency: 'USD',
    occurredAt: '2026-07-16T16:30:00Z',
    note: 'Gas',
    merchantName: 'Gas Station',
    locationLabel: '',
    createdAt: '2026-07-16T16:30:00Z',
    updatedAt: '2026-07-16T16:30:00Z'
  },
  {
    id: '4',
    householdId: 'h1',
    accountId: 'acc1',
    memberId: null, // transfer
    categoryId: 'cat3',
    type: 'transfer' as const,
    amountMinor: 10000, // $100.00
    currency: 'USD',
    occurredAt: '2026-07-17T09:00:00Z',
    note: 'Transfer to savings',
    merchantName: '',
    locationLabel: '',
    createdAt: '2026-07-17T09:00:00Z',
    updatedAt: '2026-07-17T09:00:00Z'
  }
];

describe('calculations module', () => {
  describe('getMonthBounds', () => {
    it('should return correct start and end dates for month with day 1 start', () => {
      const { start, end } = calc.getMonthBounds('2026-07-15T10:30:00Z', 1);

      expect(start).toEqual(new Date(2026, 6, 1)); // July 1, 2026 (0-indexed month)
      expect(end).toEqual(new Date(2026, 7, 0, 23, 59, 59, 999)); // July 31, 2026 EOD
    });

    
    it('should handle monthStartDay > 1 correctly', () => {
      const { start, end } = calc.getMonthBounds('2026-07-15T10:30:00Z', 15);

      expect(start).toEqual(new Date(2026, 6, 15)); // July 15, 2026
      expect(end).toEqual(new Date(2026, 7, 14, 23, 59, 59, 999)); // August 14, 2026 EOD
    });
  });

  describe('isInMonth', () => {
    it('should return true for dates within the month (day 1 start)', () => {
      expect(calc.isInMonth('2026-07-15T10:30:00Z', '2026-07', 1)).toBe(true);
      expect(calc.isInMonth('2026-07-01T00:00:00Z', '2026-07', 1)).toBe(true);
      expect(calc.isInMonth('2026-07-31T23:59:59Z', '2026-07', 1)).toBe(true);
    });

    it('should return false for dates outside the month', () => {
      expect(calc.isInMonth('2026-06-30T23:59:59Z', '2026-07', 1)).toBe(false);
      expect(calc.isInMonth('2026-08-01T00:00:00Z', '2026-07', 1)).toBe(false);
    });

    it('should work with custom monthStartDay', () => {
      expect(calc.isInMonth('2026-07-20T10:30:00Z', '2026-07', 15)).toBe(true);
      expect(calc.isInMonth('2026-07-10T10:30:00Z', '2026-07', 15)).toBe(false); // Before 15th
      expect(calc.isInMonth('2026-08-10T10:30:00Z', '2026-07', 15)).toBe(true); // Period spans Jul 15 - Aug 14
    });
  });

  describe('calculateMonthlySummary', () => {
    it('should calculate correct totals for July 2026', () => {
      const result = calc.calculateMonthlySummary(mockTransactions, '2026-07', 1);

      // Income: $5000.00
      expect(result.totalIncomeMinor).toBe(500000);

      // Expenses: $150 + $250 = $400
      expect(result.totalExpenseMinor).toBe(40000);

      // Transfers: $100.00
      expect(result.totalTransferMinor).toBe(10000);

      // Remaining: Income - Expenses = $5000 - $400 = $4600
      expect(result.remainingMinor).toBe(460000);

      // Top category: groceries+gas = cat2 with $400
      expect(result.topCategories.length).toBe(1);
      expect(result.topCategories[0].categoryId).toBe('cat2');
      expect(result.topCategories[0].totalMinor).toBe(40000);
    });

    it('should filter out deleted transactions', () => {
      const transactionsWithDeleted = [
        ...mockTransactions,
        {
          id: '5',
          householdId: 'h1',
          accountId: 'acc1',
          memberId: 'm1',
          categoryId: 'cat1',
          type: 'expense' as const,
          amountMinor: 10000, // $100.00
          currency: 'USD',
          occurredAt: '2026-07-18T12:00:00Z',
          note: 'Should be ignored',
          deletedAt: '2026-07-18T12:01:00Z', // soft deleted
          createdAt: '2026-07-18T12:00:00Z',
          updatedAt: '2026-07-18T12:01:00Z',
          locationLabel: '',
          merchantName: ''
        }
      ];

      const result = calc.calculateMonthlySummary(transactionsWithDeleted, '2026-07', 1);

      // Should still be $400 expenses, not $500
      expect(result.totalExpenseMinor).toBe(40000);
    });
  });

  describe('calculateBudgetStatus', () => {
    const mockBudgets = [
      { categoryId: 'cat1', limitMinor: 100000 }, // $1000 for income category (should be 0 spent)
      { categoryId: 'cat2', limitMinor: 50000 },  // $500 for groceries/gas category
      { categoryId: 'cat3', limitMinor: 20000 }   // $200 for transfer category (expenses only)
    ];

    it('should calculate budget status correctly', () => {
      const result = calc.calculateBudgetStatus(mockTransactions, mockBudgets, '2026-07', 1);

      expect(result.length).toBe(3);

      // cat1: income category, spent $0, limit $1000 -> 0% -> safe
      expect(result[0].categoryId).toBe('cat1');
      expect(result[0].spentMinor).toBe(0);
      expect(result[0].limitMinor).toBe(100000);
      expect(result[0].percentage).toBe(0);
      expect(result[0].level).toBe('safe');

      // cat2: groceries+gas = $400 spent, limit $500 -> 80% -> high
      expect(result[1].categoryId).toBe('cat2');
      expect(result[1].spentMinor).toBe(40000);
      expect(result[1].limitMinor).toBe(50000);
      expect(result[1].percentage).toBeCloseTo(80);
      expect(result[1].level).toBe('high');

      // cat3: transfer category, spent $0 (transfers not expenses), limit $200 -> 0% -> safe
      expect(result[2].categoryId).toBe('cat3');
      expect(result[2].spentMinor).toBe(0);
      expect(result[2].limitMinor).toBe(20000);
      expect(result[2].percentage).toBe(0);
      expect(result[2].level).toBe('safe');
    });

    it('should handle over budget scenarios', () => {
      const overBudgetBudgets = [
        { categoryId: 'cat2', limitMinor: 30000 } // $300 limit, but we spent $400
      ];

      const result = calc.calculateBudgetStatus(mockTransactions, overBudgetBudgets, '2026-07', 1);

      expect(result[0].percentage).toBeCloseTo(133.33); // 400/300 * 100
      expect(result[0].level).toBe('over');
    });
  });
});