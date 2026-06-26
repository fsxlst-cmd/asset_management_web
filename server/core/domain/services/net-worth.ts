import { Money } from '../money'
import type { Asset, Holding } from '../entities'

/**
 * Net worth = sum of holding values across all accounts, in base currency.
 * (accounts-holdings spec: "Net worth is the sum of holding values".)
 *
 * A holding's value = quantity × asset.unitValue. For cash unitValue is 1, so
 * value === quantity; the multiplication keeps the formula correct for future assets.
 */
export function holdingValue(holding: Holding, asset: Asset): Money {
  // unitValue is expressed in minor units per one unit of the asset.
  // For cash (unitValue = 1) this is just the quantity.
  return holding.quantity.times(asset.unitValue.toInt())
}

export function netWorth(holdings: readonly Holding[], assetsById: ReadonlyMap<string, Asset>): Money {
  return Money.sum(
    holdings.map((h) => {
      const asset = assetsById.get(h.assetId)
      if (!asset) {
        throw new Error(`Holding ${h.id} references unknown asset ${h.assetId}`)
      }
      return holdingValue(h, asset)
    }),
  )
}
