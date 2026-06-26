import { describe, it, expect } from 'vitest'
import { Money } from './money'

describe('Money', () => {
  it('constructs from whole rupiah and exposes the integer amount', () => {
    expect(Money.fromRupiah(1_250_000).amount).toBe(1_250_000)
    expect(Money.ZERO.amount).toBe(0)
  })

  it('rejects non-integer amounts (no floats in a finance domain)', () => {
    expect(() => Money.fromRupiah(0.1)).toThrow(RangeError)
    expect(() => Money.fromRupiah(35_000.5)).toThrow(RangeError)
  })

  it('rejects amounts beyond the safe integer range', () => {
    expect(() => Money.fromRupiah(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError)
  })

  it('adds and subtracts exactly (the 0.1 + 0.2 case)', () => {
    // In rupiah these are whole numbers; the point is arithmetic stays exact.
    const a = Money.fromRupiah(100_000)
    const b = Money.fromRupiah(200_000)
    expect(a.plus(b).amount).toBe(300_000)
    expect(b.minus(a).amount).toBe(100_000)
  })

  it('multiplies by an integer scalar but rejects fractional scalars', () => {
    expect(Money.fromRupiah(100_000).times(7).amount).toBe(700_000)
    expect(() => Money.fromRupiah(100_000).times(1.5)).toThrow(RangeError)
  })

  it('supports negative balances (overspent envelopes)', () => {
    const balance = Money.fromRupiah(100_000).minus(Money.fromRupiah(120_000))
    expect(balance.amount).toBe(-20_000)
    expect(balance.isNegative()).toBe(true)
    expect(balance.isPositive()).toBe(false)
  })

  it('compares and checks equality by amount', () => {
    expect(Money.fromRupiah(500).equals(Money.fromRupiah(500))).toBe(true)
    expect(Money.fromRupiah(500).compare(Money.fromRupiah(900))).toBeLessThan(0)
  })

  it('sums a list, returning ZERO for an empty list', () => {
    expect(Money.sum([]).amount).toBe(0)
    expect(Money.sum([Money.fromRupiah(10), Money.fromRupiah(20), Money.fromRupiah(30)]).amount).toBe(60)
  })

  it('serialises to a plain integer for DTOs/DB', () => {
    expect(Money.fromRupiah(8_500_000).toInt()).toBe(8_500_000)
    expect(JSON.stringify({ v: Money.fromRupiah(42) })).toBe('{"v":42}')
  })

  it('is immutable — operations return new instances', () => {
    const a = Money.fromRupiah(100)
    const b = a.plus(Money.fromRupiah(50))
    expect(a.amount).toBe(100)
    expect(b.amount).toBe(150)
  })
})
