import { z } from 'zod';

export const TransactionTypeEnum = z.enum(['expense', 'income', 'transfer', 'adjustment']);
export type TransactionType = z.infer<typeof TransactionTypeEnum>;

export const AccountTypeEnum = z.enum(['cash', 'bank', 'ewallet', 'credit', 'other']);
export type AccountType = z.infer<typeof AccountTypeEnum>;

export const householdSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  defaultCurrency: z.string().default('USD'),
  monthStartDay: z.number().int().min(1).max(31).default(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Household = z.infer<typeof householdSchema>;

export const memberSchema = z.object({
  id: z.string().min(1),
  householdId: z.string().min(1),
  name: z.string().min(1),
  color: z.string().default('#000000'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Member = z.infer<typeof memberSchema>;

export const accountSchema = z.object({
  id: z.string().min(1),
  householdId: z.string().min(1),
  name: z.string().min(1),
  type: AccountTypeEnum.default('cash'),
  currency: z.string().default('USD'),
  openingBalanceMinor: z.number().int().default(0),
  archivedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Account = z.infer<typeof accountSchema>;

export const categorySchema = z.object({
  id: z.string().min(1),
  householdId: z.string().min(1),
  nameKey: z.string().min(1),
  icon: z.string().default('circle'),
  color: z.string().default('#FF8A65'),
  type: z.enum(['expense', 'income']).default('expense'),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  archivedAt: z.string().datetime().nullable().optional(),
});
export type Category = z.infer<typeof categorySchema>;

export const transactionSchema = z.object({
  id: z.string().min(1),
  householdId: z.string().min(1),
  accountId: z.string().min(1),
  memberId: z.string().nullable().optional(),
  categoryId: z.string().min(1),
  type: TransactionTypeEnum,
  amountMinor: z.number().int().nonnegative(),
  currency: z.string().default('USD'),
  occurredAt: z.string().datetime(),
  note: z.string().optional().default(''),
  merchantName: z.string().optional().default(''),
  locationLabel: z.string().optional().default(''),
  recurringRuleId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});
export type Transaction = z.infer<typeof transactionSchema>;

export const budgetSchema = z.object({
  id: z.string().min(1),
  householdId: z.string().min(1),
  categoryId: z.string().min(1),
  period: z.enum(['monthly']).default('monthly'),
  limitMinor: z.number().int().nonnegative(),
  currency: z.string().default('USD'),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/),
  endMonth: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Budget = z.infer<typeof budgetSchema>;

export const aiInsightSchema = z.object({
  id: z.string().min(1),
  householdId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  inputHash: z.string(),
  summary: z.string(),
  suggestionsJson: z.string(),
  createdAt: z.string().datetime(),
});
export type AiInsight = z.infer<typeof aiInsightSchema>;

export const appSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  updatedAt: z.string().datetime(),
});
export type AppSetting = z.infer<typeof appSettingSchema>;
