// Icon names for use with react-native-vector-icons or similar
export const categoryIcons = {
  food: 'restaurant' as const,
  breakfast: 'egg' as const,
  lunch: 'fastfood' as const,
  dinner: 'restaurant' as const,
  groceries: 'shopping-cart' as const,
  shopping: 'shopping-basket' as const,
  transport: 'directions-bus' as const,
  bills: 'receipt' as const,
  entertainment: 'movie' as const,
  health: 'local-hospital' as const,
  education: 'school' as const,
  other: 'widgets' as const,
  // Income categories
  salary: 'cash-multiple' as const,
  freelance: 'laptop' as const,
  investment: 'trending-up' as const,
  rental: 'home' as const,
  gift: 'gift' as const,
  refund: 'cash-refund' as const,
  allowance: 'wallet' as const,
  bonus: 'star' as const,
} as const;

export const tabIcons = {
  home: 'home' as const,
  ledger: 'list-box-outline' as const,
  add: 'plus-circle' as const,
  insights: 'chart-bar' as const,
  settings: 'cog' as const,
} as const;

// Extract value types for proper typing
export type TabIconName = typeof tabIcons[keyof typeof tabIcons];
export type CategoryIconName = typeof categoryIcons[keyof typeof categoryIcons];
