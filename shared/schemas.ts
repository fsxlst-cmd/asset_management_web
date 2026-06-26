import { z } from 'zod'

/**
 * Request validation schemas, shared between the Nitro routes and the client.
 * Enforced at every route boundary (design.md Decision 6) — malformed or oversized
 * input is rejected before it reaches a use-case. Amounts are integer rupiah.
 */

// A sane upper bound so a typo can't store an absurd value; ~1 quadrillion rupiah.
const MAX_AMOUNT = 1_000_000_000_000_000

const rupiah = z.number().int().nonnegative().max(MAX_AMOUNT)
const positiveRupiah = z.number().int().positive().max(MAX_AMOUNT)
const accountKind = z.enum(['bank', 'e-wallet', 'cash', 'prepaid-card'])
const note = z.string().trim().max(280).optional()
const isoDate = z.string().datetime().optional()

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: accountKind,
  institution: z.string().trim().max(80).optional(),
  initialBalance: rupiah.optional(),
})

export const logExpenseSchema = z.object({
  amount: positiveRupiah,
  envelopeId: z.string().min(1),
  sourceAccountId: z.string().min(1).optional(),
  date: isoDate,
  note,
})

export const logIncomeSchema = z.object({
  amount: positiveRupiah,
  destinationAccountId: z.string().min(1).optional(),
  date: isoDate,
  note,
})

export const recordTransferSchema = z.object({
  amount: positiveRupiah,
  sourceAccountId: z.string().min(1),
  destinationAccountId: z.string().min(1),
  date: isoDate,
  note,
})

export const accrualPeriod = z.enum(['day', 'week', 'month'])

export const editAccrualSchema = z.object({
  amount: positiveRupiah,
  period: accrualPeriod,
})

export const createEnvelopeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  // A recurring budget includes an accrual; omit it for a plain (non-accruing) envelope.
  accrual: z.object({ amount: positiveRupiah, period: accrualPeriod }).optional(),
})

export const reconciliationSchema = z.object({
  balances: z
    .array(z.object({ holdingId: z.string().min(1), value: rupiah }))
    .min(1)
    .max(100),
})

export const crossCheckQuerySchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
})

export type CreateAccountBody = z.infer<typeof createAccountSchema>
export type LogExpenseBody = z.infer<typeof logExpenseSchema>
export type LogIncomeBody = z.infer<typeof logIncomeSchema>
export type RecordTransferBody = z.infer<typeof recordTransferSchema>
export type ReconciliationBody = z.infer<typeof reconciliationSchema>
export type CreateEnvelopeBody = z.infer<typeof createEnvelopeSchema>
