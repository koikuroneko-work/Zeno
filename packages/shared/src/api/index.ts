import { z } from 'zod';

export const aiMonthlyPayloadSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  currency: z.string(),
  totalIncomeMinor: z.number().int(),
  totalExpenseMinor: z.number().int(),
  categoryTotals: z.array(
    z.object({
      categoryId: z.string(),
      categoryName: z.string(),
      totalMinor: z.number().int(),
    })
  ),
  budgetLimits: z.array(
    z.object({
      categoryId: z.string(),
      limitMinor: z.number().int(),
    })
  ),
});

export const aiInsightResponseSchema = z.object({
  summary: z.string(),
  suggestions: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
});

/**
 * Enhanced AI advice payload with richer context for the AI to generate
 * truly personalized financial advice.
 */
export const aiAdvicePayloadSchema = z.object({
  currency: z.string(),
  language: z.string().optional(),
  totalIncomeMinor: z.number().int(),
  totalExpenseMinor: z.number().int(),
  categoryTotals: z.array(
    z.object({
      categoryId: z.string(),
      categoryName: z.string(),
      totalMinor: z.number().int(),
    })
  ),
  dailyAverageMinor: z.number(),
  transactionCount: z.number().int(),
  topCategoryName: z.string().optional(),
  topCategoryPercent: z.number().optional(),
  prevMonthExpenseMinor: z.number().int().optional(),
  hasBudget: z.boolean(),
  dailyBudgetMinor: z.number().int().optional(),
});
export type AiAdvicePayload = z.infer<typeof aiAdvicePayloadSchema>;

/**
 * Response from the AI advice endpoint.
 * The AI returns a conversational analysis with multiple advice points.
 */
export const aiAdviceResponseSchema = z.object({
  analysis: z.string(),
  advice: z.array(
    z.object({
      icon: z.string(),
      title: z.string(),
      detail: z.string(),
    })
  ),
  motivation: z.string(),
});
export type AiAdviceResponse = z.infer<typeof aiAdviceResponseSchema>;

export const nearbyPayloadSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  category: z.enum(['food', 'shopping', 'groceries']).default('food'),
  radiusMeters: z.number().int().max(5000).default(1500),
});

export const nearbyOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  rating: z.number().min(0).max(5).optional(),
  priceLevel: z.number().int().min(0).max(4).optional(),
  distanceMeters: z.number().int(),
  openNow: z.boolean().optional(),
  address: z.string().optional(),
});

export const nearbyResponseSchema = z.object({
  results: z.array(nearbyOptionSchema),
});
