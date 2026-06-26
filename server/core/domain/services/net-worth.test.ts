import { describe, it, expect } from 'vitest'
import { Money } from '../money'
import type { Asset, Holding } from '../entities'
import { netWorth, holdingValue } from './net-worth'

const cash: Asset = {
  id: 'cash',
  kind: 'cash',
  name: 'Cash',
  unit: 'IDR',
  unitValue: Money.fromRupiah(1),
}
const assets = new Map([[cash.id, cash]])

function holding(id: string, accountId: string, qty: number): Holding {
  return { id, accountId, assetId: 'cash', quantity: Money.fromRupiah(qty) }
}

describe('net worth', () => {
  it('cash holding value equals its quantity (unitValue = 1)', () => {
    expect(holdingValue(holding('h1', 'a1', 8_500_000), cash).amount).toBe(8_500_000)
  })

  it('sums holding values across accounts', () => {
    const holdings = [
      holding('h1', 'a1', 8_500_000),
      holding('h2', 'a2', 1_200_000),
      holding('h3', 'a3', 500_000),
    ]
    expect(netWorth(holdings, assets).amount).toBe(10_200_000)
  })

  it('is zero with no holdings', () => {
    expect(netWorth([], assets).amount).toBe(0)
  })

  it('throws on a holding referencing an unknown asset', () => {
    const bad: Holding = { id: 'x', accountId: 'a', assetId: 'gold', quantity: Money.fromRupiah(1) }
    expect(() => netWorth([bad], assets)).toThrow()
  })
})
