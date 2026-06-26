import { Money } from '@core/domain/money'
import type {
  Account,
  AccountKind,
  Asset,
  AssetKind,
  Envelope,
  Holding,
  LedgerEntry,
  Snapshot,
  AccrualPeriod,
} from '@core/domain/entities'
import type { accounts, assets, envelopes, holdings, ledgerEntries, snapshots } from './schema'

/**
 * Translate between persisted rows (integers, epoch ms) and domain entities
 * (Money, Date). All conversion to/from the Money value object happens here, at
 * the infrastructure boundary — the domain never sees a raw number.
 */

type AssetRow = typeof assets.$inferSelect
type AccountRow = typeof accounts.$inferSelect
type HoldingRow = typeof holdings.$inferSelect
type EnvelopeRow = typeof envelopes.$inferSelect
type LedgerRow = typeof ledgerEntries.$inferSelect
type SnapshotRow = typeof snapshots.$inferSelect

export function toAsset(r: AssetRow): Asset {
  return { id: r.id, kind: r.kind as AssetKind, name: r.name, unit: r.unit, unitValue: Money.fromInt(r.unitValue) }
}

export function toAccount(r: AccountRow): Account {
  return { id: r.id, name: r.name, kind: r.kind as AccountKind, institution: r.institution ?? undefined }
}

export function toHolding(r: HoldingRow): Holding {
  return { id: r.id, accountId: r.accountId, assetId: r.assetId, quantity: Money.fromInt(r.quantity) }
}

export function toEnvelope(r: EnvelopeRow): Envelope {
  const hasAccrual = r.accrualAmount != null && r.accrualPeriod != null && r.accrualAnchor != null
  return {
    id: r.id,
    name: r.name,
    accrual: hasAccrual
      ? {
          amount: Money.fromInt(r.accrualAmount!),
          period: r.accrualPeriod as AccrualPeriod,
          anchor: new Date(r.accrualAnchor!),
          baseline: r.accrualBaseline != null ? Money.fromInt(r.accrualBaseline) : undefined,
        }
      : undefined,
  }
}

export function toLedgerEntry(r: LedgerRow): LedgerEntry {
  const base = { id: r.id, amount: Money.fromInt(r.amount), date: new Date(r.date), note: r.note ?? undefined }
  switch (r.type) {
    case 'expense':
      return { ...base, type: 'expense', envelopeId: r.envelopeId!, sourceAccountId: r.sourceAccountId ?? undefined }
    case 'income':
      return { ...base, type: 'income', destinationAccountId: r.destinationAccountId ?? undefined }
    case 'transfer':
      return { ...base, type: 'transfer', sourceAccountId: r.sourceAccountId!, destinationAccountId: r.destinationAccountId! }
    default:
      throw new Error(`Unknown ledger entry type: ${r.type}`)
  }
}

export function toSnapshot(r: SnapshotRow): Snapshot {
  return { id: r.id, holdingId: r.holdingId, value: Money.fromInt(r.value), takenAt: new Date(r.takenAt) }
}

// ── entity → row (insert shapes) ─────────────────────────────────────────────

export function fromLedgerEntry(e: LedgerEntry): LedgerRow {
  return {
    id: e.id,
    type: e.type,
    amount: e.amount.toInt(),
    date: e.date.getTime(),
    note: e.note ?? null,
    envelopeId: e.type === 'expense' ? e.envelopeId : null,
    sourceAccountId: e.type === 'expense' ? (e.sourceAccountId ?? null) : e.type === 'transfer' ? e.sourceAccountId : null,
    destinationAccountId:
      e.type === 'income' ? (e.destinationAccountId ?? null) : e.type === 'transfer' ? e.destinationAccountId : null,
  }
}
